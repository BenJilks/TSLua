import { Chunk, IfElseBlock } from './ast'
import { Expression, ExpressionKind } from './ast'
import { Statement, StatementKind } from './ast'
import { Value, ValueKind } from './ast'
import { Token, TokenKind, TokenStream, token_kind_to_string } from './lexer'

const UNARY = [
    TokenKind.Not,
    TokenKind.Subtract,
    TokenKind.Hash,
]

const ORDERS = [
    [TokenKind.And, TokenKind.Or],
    [TokenKind.Equals, TokenKind.NotEquals],
    [TokenKind.LessThen, TokenKind.LessThenEquals, TokenKind.GreaterThen, TokenKind.GreaterThenEquals],
    [TokenKind.Concat],
    [TokenKind.Addition, TokenKind.Subtract],
    [TokenKind.Multiply, TokenKind.Division],
]

function error(token: Token, message: string): Error
{
    return new Error(
        `${ token.debug.line }:${ token.debug.column }: ${ message }`)
}

function expect(stream: TokenStream, kind: TokenKind): Token | Error
{
    const token = stream.peek()
    if (token.kind != kind)
    {
        return error(token, 
            `expected '${ token_kind_to_string(kind) }', ` +
            `got '${ token_kind_to_string(token.kind) }' instead`)
    }

    return stream.next()
}

function consume(stream: TokenStream, kind: TokenKind): boolean
{
    const token = stream.peek()
    if (token.kind != kind)
        return false

    stream.next()
    return true
}

function parse_table(stream: TokenStream): Value | Error
{
    const squigly_open = expect(stream, TokenKind.SquiglyOpen)
    if (squigly_open instanceof Error)
        return squigly_open

    const elements: Map<Token, Expression> = new Map()
    let current_numeric_key = 1
    while (stream.peek().kind != TokenKind.SquiglyClose)
    {
        const element = parse_expression(stream)
        if (element instanceof Error)
            return element

        if (consume(stream, TokenKind.Assign))
        {
            const value = parse_expression(stream)
            if (value instanceof Error)
                return value

            if (element.kind != ExpressionKind.Value)
                throw new Error()
            elements.set(element.token, value)
        }
        else
        {
            const key = {
                kind: TokenKind.NumberLiteral,
                data: current_numeric_key.toString(),
                debug: element.token.debug,
            }

            current_numeric_key += 1
            elements.set(key, element)
        }

        if (!consume(stream, TokenKind.Comma))
            break
    }

    const close_squigly = expect(stream, TokenKind.SquiglyClose)
    if (close_squigly instanceof Error)
        return close_squigly

    return {
        kind: ValueKind.TableLiteral,
        token: squigly_open,
        table: elements,
    }
}

function parse_value(stream: TokenStream): Value | Error
{
    const token = stream.peek()
    switch (token.kind)
    {
        case TokenKind.NumberLiteral: 
            return { kind: ValueKind.NumberLiteral, token: stream.next(), number: parseFloat(token.data) } 
        case TokenKind.BooleanLiteral:
            return { kind: ValueKind.BooleanLiteral, token: stream.next(), boolean: token.data == 'true' } 
        case TokenKind.StringLiteral:
            return { kind: ValueKind.StringLiteral, token: stream.next(), string: token.data } 
        case TokenKind.NilLiteral:
            return { kind: ValueKind.NilLiteral, token: stream.next() } 
        case TokenKind.Identifier:
            return { kind: ValueKind.Variable, token: stream.next(), identifier: token.data }
        
        case TokenKind.SquiglyOpen:
            return parse_table(stream)
        case TokenKind.Function: 
            return parse_function_value(stream.next(), stream)

        default:
            return error(token, `Expected value, got ${ token_kind_to_string(token.kind) } instead`)
    }
}

function unary_type_to_expression_kind(kind: TokenKind): ExpressionKind
{
    switch (kind)
    {
        case TokenKind.Not: return ExpressionKind.Not
        case TokenKind.Subtract: return ExpressionKind.Negate
        case TokenKind.Hash: return ExpressionKind.Length
        default:
            throw new Error()
    }
}

function parse_unary_operator(stream: TokenStream): Expression | Error
{
    const operator_token = stream.next()
    const operator = unary_type_to_expression_kind(operator_token.kind)

    const expression = parse_expression(stream)
    if (expression instanceof Error)
        return expression

    return {
        kind: operator,
        token: operator_token,
        expression: expression,
    }
}

function parse_value_expression(stream: TokenStream): Expression | Error
{
    if (consume(stream, TokenKind.OpenBrace))
    {
        const sub_expression = parse_expression(stream)
        if (sub_expression instanceof Error)
            return sub_expression

        const close_brace = expect(stream, TokenKind.CloseBrace)
        if (close_brace instanceof Error)
            return close_brace

        return sub_expression
    }

    if (UNARY.includes(stream.peek().kind))
        return parse_unary_operator(stream)

    const value = parse_value(stream)
    if (value instanceof Error)
        return value

    const expression_value = {
        kind: ExpressionKind.Value,
        token: value.token,
        value: value,
    }

    return parse_access_expression(expression_value, stream)
}

function parse_call(func: Expression, stream: TokenStream): Expression | Error
{
    const open_brace = stream.next()
    const args: Expression[] = []
    while (stream.peek().kind != TokenKind.CloseBrace)
    {
        const argument = parse_expression(stream)
        if (argument instanceof Error)
            break

        args.push(argument)
        if (!consume(stream, TokenKind.Comma))
            break
    }

    const close_brace = expect(stream, TokenKind.CloseBrace) 
    if (close_brace instanceof Error)
        return close_brace

    return parse_access_expression({
        kind: ExpressionKind.Call,
        token: open_brace,
        expression: func,
        arguments: args,
    }, stream)
}

function parse_index(table: Expression, stream: TokenStream): Expression | Error
{
    const open_square = stream.next()
    const index = parse_expression(stream)
    if (index instanceof Error)
        return index

    const close_square = expect(stream, TokenKind.CloseSquare)
    if (close_square instanceof Error)
        return close_square

    return parse_access_expression({
        kind: ExpressionKind.Index,
        token: open_square,
        expression: table,
        index: index,
    }, stream)
}

function parse_dot(table: Expression, stream: TokenStream): Expression | Error
{
    const dot = stream.next()
    const index = expect(stream, TokenKind.Identifier)
    if (index instanceof Error)
        return index

    return parse_access_expression({
        kind: ExpressionKind.Index,
        expression: table,
        token: dot,
        index: {
            kind: ExpressionKind.Value,
            token: index,
            value: {
                kind: ValueKind.StringLiteral,
                token: index,
                string: index.data,
            },
        },
    }, stream)
}

function parse_single_argument_call(func: Expression, stream: TokenStream): Expression | Error
{
    const argument = parse_expression(stream)
    if (argument instanceof Error)
        return argument

    return {
        kind: ExpressionKind.Call,
        token: func.token,
        expression: func,
        arguments: [argument],
    }
}

function parse_access_expression(expression: Expression, stream: TokenStream): Expression | Error
{
    switch (stream.peek().kind)
    {
        case TokenKind.OpenBrace:
            return parse_call(expression, stream)

        case TokenKind.OpenSquare:
            return parse_index(expression, stream)
        
        case TokenKind.Dot:
            return parse_dot(expression, stream)

        case TokenKind.SquiglyOpen:
        case TokenKind.StringLiteral:
            return parse_single_argument_call(expression, stream)
    }

    return expression
}

function operation_type_to_expression_kind(
    operation_type: TokenKind): ExpressionKind
{
    switch (operation_type)
    {
        case TokenKind.Addition: return ExpressionKind.Addition
        case TokenKind.Subtract: return ExpressionKind.Subtract
        case TokenKind.Multiply: return ExpressionKind.Multiplication
        case TokenKind.Division: return ExpressionKind.Division
        case TokenKind.Concat: return ExpressionKind.Concat
        case TokenKind.LessThen: return ExpressionKind.LessThen
        case TokenKind.LessThenEquals: return ExpressionKind.LessThenEquals
        case TokenKind.GreaterThen: return ExpressionKind.GreaterThen
        case TokenKind.GreaterThenEquals: return ExpressionKind.GreaterThenEquals
        case TokenKind.Equals: return ExpressionKind.Equals
        case TokenKind.NotEquals: return ExpressionKind.NotEquals
        case TokenKind.And: return ExpressionKind.And
        case TokenKind.Or: return ExpressionKind.Or
        default:
            throw new Error()
    }
}

function parse_operation(stream: TokenStream,
                         order: number): Expression | Error
{
    if (order >= ORDERS.length)
        return parse_value_expression(stream)

    let lhs = parse_operation(stream, order + 1)
    if (lhs instanceof Error)
        return lhs

    while (ORDERS[order].includes(stream.peek().kind))
    {
        const operation_type = stream.next()
        const rhs = parse_operation(stream, order + 1)
        if (rhs instanceof Error)
            return rhs

        const expression_kind = operation_type_to_expression_kind(operation_type.kind)
        lhs = {
            kind: expression_kind,
            token: operation_type,
            lhs: lhs,
            rhs: rhs,
        }
    }

    return lhs
}

function parse_expression(stream: TokenStream): Expression | Error
{
    return parse_operation(stream, 0)
}

function parse_local_statement(local: Token, values: Expression[]): Statement | Error
{
    const names: Token[] = []
    for (const expression of values)
    {
        const value = expression.value
        if (value == undefined || value.kind != ValueKind.Variable)
            return error(expression.token, 'Invalid local name')
        names.push(value.token)
    }

    return { 
        kind: StatementKind.Local,
        local: {
            token: local,
            names: names,
        },
    }
}

function parse_assign_or_expression(stream: TokenStream): Statement | Error
{
    const local = expect(stream, TokenKind.Local)
    const lhs: Expression[] = []
    while (lhs.length == 0 || consume(stream, TokenKind.Comma))
    {
        const lvalue = parse_expression(stream)
        if (lvalue instanceof Error)
            return lvalue
        lhs.push(lvalue)
    }

    const assign = expect(stream, TokenKind.Assign)
    if (assign instanceof Error)
    {
        if (!(local instanceof Error))
            return parse_local_statement(local, lhs)
        else
            return { kind: StatementKind.Expression, expression: lhs[0] }
    }

    const rhs: Expression[] = []
    while (rhs.length == 0 || consume(stream, TokenKind.Comma))
    {
        const rvalue = parse_expression(stream)
        if (rvalue instanceof Error)
            return rvalue
        rhs.push(rvalue)
    }

    return {
        kind: StatementKind.Assignment,
        assignment: {
            local: !(local instanceof Error),
            lhs: lhs.reverse(),
            rhs: rhs,
            token: assign,
        },
    }
}

function parse_return(stream: TokenStream): Statement | Error
{
    const ret = expect(stream, TokenKind.Return)
    if (ret instanceof Error)
        return ret

    const values: Expression[] = []
    while (values.length == 0 || consume(stream, TokenKind.Comma))
    {
        const value = parse_expression(stream)
        if (value instanceof Error)
        {
            if (values.length > 0)
                return value
            break
        }

        values.push(value)
    }

    if (values.length == 0)
    {
        values.push({
            kind: ExpressionKind.Value,
            token: ret,
            value: {
                kind: ValueKind.NilLiteral,
                token: ret,
            },
        })
    }

    return {
        kind: StatementKind.Return,
        return: {
            values: values,
            token: ret,
        },
    }
}

function parse_break(stream: TokenStream): Statement | Error
{
    const break_token = expect(stream, TokenKind.Break)
    if (break_token instanceof Error)
        return break_token

    return {
        kind: StatementKind.Break,
    }
}

function parse_if(stream: TokenStream): Statement | Error
{
    const if_token = expect(stream, TokenKind.If)
    if (if_token instanceof Error)
        return if_token

    const condition = parse_expression(stream)
    if (condition instanceof Error)
        return condition

    const then = expect(stream, TokenKind.Then)
    if (then instanceof Error)
        return then
    
    const body = parse(stream, TokenKind.Else, TokenKind.ElseIf, TokenKind.End)
    if (body instanceof Error)
        return body

    const else_if_bodies: IfElseBlock[] = []
    let else_body: Chunk | undefined = undefined
    while (consume(stream, TokenKind.ElseIf))
    {
        const condition = parse_expression(stream)
        if (condition instanceof Error)
            return condition
        
        const then = expect(stream, TokenKind.Then)
        if (then instanceof Error)
            return then

        const chunk = parse(stream, TokenKind.End, TokenKind.ElseIf, TokenKind.Else)
        if (chunk instanceof Error)
            return chunk

        else_if_bodies.push({
            body: chunk,
            condition: condition,
            token: then,
        })
    }

    if (consume(stream, TokenKind.Else))
    {
        const chunk = parse(stream, TokenKind.End)
        if (chunk instanceof Error)
            return chunk
        else_body = chunk
    }
    
    const end = expect(stream, TokenKind.End)
    if (end instanceof Error)
        return end

    return {
        kind: StatementKind.If,
        if: {
            condition: condition,
            body: body,
            else_if_bodies: else_if_bodies,
            else_body: else_body,
            token: if_token,
        },
    }
}

function parse_while(stream: TokenStream): Statement | Error
{
    const while_token = expect(stream, TokenKind.While)
    if (while_token instanceof Error)
        return while_token

    const condition = parse_expression(stream)
    if (condition instanceof Error)
        return condition

    const do_token = expect(stream, TokenKind.Do)
    if (do_token instanceof Error)
        return do_token
    
    const body = parse(stream, TokenKind.End)
    if (body instanceof Error)
        return body

    consume(stream, TokenKind.End)
    return {
        kind: StatementKind.While,
        while: {
            condition: condition,
            body: body,
            token: while_token,
        },
    }
}

function parse_numeric_for(index: Token, stream: TokenStream): Statement | Error
{
    const start = parse_expression(stream)
    if (start instanceof Error)
        return start

    const comma = expect(stream, TokenKind.Comma)
    if (comma instanceof Error)
        return comma

    const end = parse_expression(stream)
    if (end instanceof Error)
        return end

    let step: Expression | undefined = undefined
    if (consume(stream, TokenKind.Comma))
    {
        const expression = parse_expression(stream)
        if (expression instanceof Error)
            return expression

        step = expression
    }

    const do_token = expect(stream, TokenKind.Do)
    if (do_token instanceof Error)
        return do_token

    const body = parse(stream, TokenKind.End)
    if (body instanceof Error)
        return body

    consume(stream, TokenKind.End)
    return {
        kind: StatementKind.NumericFor,
        numeric_for: {
            index: index,
            start: start,
            end: end,
            step: step,
            body: body,
        },
    }
}

function parse_for(stream: TokenStream): Statement | Error
{
    const for_token = expect(stream, TokenKind.For)
    if (for_token instanceof Error)
        return for_token

    const items: Token[] = []
    while (items.length == 0 || consume(stream, TokenKind.Comma))
    {
        const item = expect(stream, TokenKind.Identifier)
        if (item instanceof Error)
            return item
        items.push(item)
    }

    if (consume(stream, TokenKind.Assign))
        return parse_numeric_for(items[0], stream)
    
    const in_token = expect(stream, TokenKind.In)
    if (in_token instanceof Error)
        return in_token

    const itorator = parse_expression(stream)
    if (itorator instanceof Error)
        return itorator

    const do_token = expect(stream, TokenKind.Do)
    if (do_token instanceof Error)
        return do_token

    const body = parse(stream, TokenKind.End)
    if (body instanceof Error)
        return body

    consume(stream, TokenKind.End)
    return {
        kind: StatementKind.For,
        for: {
            items: items,
            itorator: itorator,
            body: body,
            token: for_token,
        },
    }
}

function parse_function_params(stream: TokenStream): Token[] | Error
{
    const open_brace = expect(stream, TokenKind.OpenBrace)
    if (open_brace instanceof Error)
        return open_brace

    const params: Token[] = []
    while (stream.peek().kind != TokenKind.CloseBrace)
    {
        const param = expect(stream, TokenKind.Identifier)
        if (param instanceof Error)
            break

        params.push(param)
        if (!consume(stream, TokenKind.Comma))
            break
    }

    const close_brace = expect(stream, TokenKind.CloseBrace)
    if (close_brace instanceof Error)
        return close_brace

    return params
}

function parse_function_value(function_token: Token, stream: TokenStream): Value | Error
{
    const params = parse_function_params(stream)
    if (params instanceof Error)
        return params

    const body = parse(stream, TokenKind.End)
    if (body instanceof Error)
        return body

    consume(stream, TokenKind.End)
    return {
        kind: ValueKind.Function,
        token: function_token,
        function: {
            parameters: params,
            body: body,
        },
    }
}

function parse_local_function(table_name: Token, stream: TokenStream): Statement | Error
{
    const local_name = expect(stream, TokenKind.Identifier)
    if (local_name instanceof Error)
        return local_name

    const function_value = parse_function_value(local_name, stream)
    if (function_value instanceof Error)
        return function_value

    return {
        kind: StatementKind.Assignment,
        assignment: {
            token: table_name,
            local: false,
            lhs: [{
                kind: ExpressionKind.Index,
                token: table_name,
                expression: {
                    kind: ExpressionKind.Value,
                    token: table_name,
                    value: {
                        kind: ValueKind.Variable,
                        token: table_name,
                        identifier: table_name.data,
                    },
                },
                index: {
                    kind: ExpressionKind.Value,
                    token: local_name,
                    value: {
                        kind: ValueKind.StringLiteral,
                        token: local_name,
                        string: local_name.data,
                    },
                },
            }],
            rhs: [{
                kind: ExpressionKind.Value,
                token: local_name,
                value: function_value,
            }],
        },
    }
}

function parse_function(stream: TokenStream): Statement | Error
{
    const function_token = expect(stream, TokenKind.Function)
    if (function_token instanceof Error)
        return function_token

    const name = expect(stream, TokenKind.Identifier)
    if (name instanceof Error)
        return name

    if (consume(stream, TokenKind.Dot))
        return parse_local_function(name, stream)
    
    const function_value = parse_function_value(name, stream)
    if (function_value instanceof Error)
        return function_value

    return {
        kind: StatementKind.Assignment,
        assignment: {
            token: name,
            local: false,
            lhs: [{
                kind: ExpressionKind.Value,
                token: name,
                value: {
                    kind: ValueKind.Variable,
                    token: name,
                    identifier: name.data,
                },
            }],
            rhs: [{
                kind: ExpressionKind.Value,
                token: name,
                value: function_value,
            }],
        },
    }
}

function parse_statement(stream: TokenStream, end_tokens: TokenKind[]): Statement | Error | undefined
{
    const token = stream.peek()
    switch (token.kind)
    {
        case TokenKind.Identifier:
        case TokenKind.Local:
            return parse_assign_or_expression(stream)
        case TokenKind.Return:
            return parse_return(stream)
        case TokenKind.Break:
            return parse_break(stream)
        case TokenKind.If:
            return parse_if(stream)
        case TokenKind.While:
            return parse_while(stream)
        case TokenKind.For:
            return parse_for(stream)
        case TokenKind.Function:
            return parse_function(stream)
        default:
            if (end_tokens.includes(token.kind))
                return undefined
            return error(token, `Missing '${ token_kind_to_string(end_tokens[0]) }'`)
    }
}

export function parse(stream: TokenStream, ...end_tokens: TokenKind[]): Chunk | Error
{
    const chunk: Chunk = { statements: [] }
    if (end_tokens.length == 0)
        end_tokens.push(TokenKind.EOF)

    while (true)
    {
        const statement = parse_statement(stream, end_tokens)
        if (statement == undefined)
            break
        if (statement instanceof Error)
            return statement

        chunk.statements.push(statement)
    }

    return chunk
}


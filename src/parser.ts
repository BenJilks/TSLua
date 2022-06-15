import { Chunk } from './ast'
import { Expression, ExpressionKind } from './ast'
import { Statement, StatementKind } from './ast'
import { Value, ValueKind } from './ast'
import { Token, TokenKind, TokenStream } from './lexer'

const ORDERS = [
    [TokenKind.Multiply, TokenKind.Division],
    [TokenKind.Addition, TokenKind.Subtract],
    [TokenKind.LessThen, TokenKind.GreaterThen],
    [TokenKind.And, TokenKind.Or],
]

function expect(stream: TokenStream, kind: TokenKind): Token | undefined
{
    const token = stream.peek()
    if (token.kind != kind)
        return undefined
    return stream.next()
}

function parse_table(stream: TokenStream): Value | undefined
{
    const squigly_open = expect(stream, TokenKind.SquiglyOpen)
    if (squigly_open == undefined)
        return undefined

    const elements: Map<string|number, Expression> = new Map()
    let current_numeric_key = 1
    while (stream.peek().kind != TokenKind.SquiglyClose)
    {
        let key: string | number

        if (stream.peek(1).kind == TokenKind.Identifier &&
            stream.peek(2).kind == TokenKind.Assign)
        {
            key = stream.next().data
            expect(stream, TokenKind.Assign)
        }
        else
        {
            key = current_numeric_key
            current_numeric_key += 1
        }

        const element = parse_expression(stream)
        if (element == undefined)
            return undefined
        elements.set(key, element)

        if (expect(stream, TokenKind.Comma) == undefined)
            break
    }

    if (expect(stream, TokenKind.SquiglyClose) == undefined)
        return undefined

    return {
        kind: ValueKind.TableLiteral,
        token: squigly_open,
        table: elements,
    }
}

function parse_value(stream: TokenStream): Value | undefined
{
    const token = stream.peek()
    switch (token.kind)
    {
        case TokenKind.NumberLiteral: 
            return { kind: ValueKind.NumberLiteral, token: stream.next(), number: parseFloat(token.data) } 
        case TokenKind.BooleanLiteral:
            stream.next()
            return { kind: ValueKind.BooleanLiteral, token: stream.next(), boolean: token.data == 'true' } 
        case TokenKind.StringLiteral:
            stream.next()
            return { kind: ValueKind.StringLiteral, token: stream.next(), string: token.data } 
        case TokenKind.NilLiteral:
            stream.next()
            return { kind: ValueKind.NilLiteral, token: stream.next() } 
        case TokenKind.Identifier:
            stream.next()
            return { kind: ValueKind.Variable, token: stream.next(), identifier: token.data }
        
        case TokenKind.SquiglyOpen:
            return parse_table(stream)
        case TokenKind.Function: 
            return parse_function_value(stream.next(), stream)

        default:
            return undefined
    }
}

function parse_unary_operation(stream: TokenStream): Expression | undefined
{
    const not = expect(stream, TokenKind.Not)
    if (not == undefined)
        return undefined

    const expression = parse_expression(stream)
    if (expression == undefined)
        return undefined

    return {
        kind: ExpressionKind.Not,
        token: not,
        lhs: expression,
    }
}

function parse_expression_value(stream: TokenStream): Expression | undefined
{
    if (stream.peek().kind == TokenKind.Not)
        return parse_unary_operation(stream)

    const value = parse_value(stream)
    if (value == undefined)
        return undefined

    let result: Expression = {
        kind: ExpressionKind.Value,
        token: value.token,
        value: value,
    }

    while ([TokenKind.OpenBrace, TokenKind.OpenSquare, TokenKind.Dot].includes(stream.peek().kind))
    {
        const open_brace = expect(stream, TokenKind.OpenBrace)
        if (open_brace != undefined)
        {
            const args: Expression[] = []
            while (stream.peek().kind != TokenKind.CloseBrace)
            {
                const argument = parse_expression(stream)
                if (argument == undefined)
                    return undefined

                args.push(argument)
                if (expect(stream, TokenKind.Comma) == undefined)
                    break
            }

            if (expect(stream, TokenKind.CloseBrace) == undefined)
                return undefined

            result = { 
                kind: ExpressionKind.Call,
                token: open_brace,
                expression: result,
                arguments: args,
            }
        }

        const open_square = expect(stream, TokenKind.OpenSquare)
        if (open_square != undefined)
        {
            const index = parse_expression(stream)
            if (index == undefined)
                return undefined

            if (expect(stream, TokenKind.CloseSquare) == undefined)
                return undefined

            result = { 
                kind: ExpressionKind.Index,
                token: open_square,
                expression: result,
                index: index,
            }
        }

        const dot = expect(stream, TokenKind.OpenSquare)
        if (dot != undefined)
        {
            const index = expect(stream, TokenKind.Identifier)
            if (index == undefined)
                return undefined

            result = { 
                kind: ExpressionKind.Index,
                expression: result,
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
            }
        }
    }

    return result
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
        case TokenKind.LessThen: return ExpressionKind.LessThen
        case TokenKind.GreaterThen: return ExpressionKind.GreaterThen
        case TokenKind.And: return ExpressionKind.And
        case TokenKind.Or: return ExpressionKind.Or
        default:
            throw new Error()
    }
}

function parse_operation(stream: TokenStream,
                         lhs: Expression,
                         order: number): Expression | undefined
{
    let result = lhs
    while (ORDERS[order].includes(stream.peek().kind))
    {
        const operation_type = stream.next()
        const rhs = parse_expression(stream, order)
        if (rhs == undefined)
            return undefined

        const expression_kind = operation_type_to_expression_kind(operation_type.kind)
        result = {
            kind: expression_kind,
            token: operation_type,
            lhs: result,
            rhs: rhs,
        }
    }

    if (order + 1 >= ORDERS.length)
        return result
    else
        return parse_operation(stream, result, order + 1)
}

function parse_expression(stream: TokenStream, order = 0): Expression | undefined
{
    const lhs = parse_expression_value(stream)
    if (lhs == undefined)
        return undefined

    return parse_operation(stream, lhs, order)
}

function parse_local_statement(local: Token, values: Expression[]): Statement
{
    return { 
        kind: StatementKind.Local,
        local: {
            token: local,
            names: values
                .filter(x => x?.value?.identifier != undefined)
                .map(x => x?.value?.token!)
        },
    }
}

function parse_assign_or_expression(stream: TokenStream): Statement | undefined
{
    const local = expect(stream, TokenKind.Local)
    const lhs: Expression[] = []
    while (lhs.length == 0 || expect(stream, TokenKind.Comma) != undefined)
    {
        const lvalue = parse_expression(stream)
        if (lvalue == undefined)
            return undefined
        lhs.push(lvalue)
    }

    const assign = expect(stream, TokenKind.Assign)
    if (assign == undefined)
    {
        if (local != undefined)
            return parse_local_statement(local, lhs)
        else
            return { kind: StatementKind.Expression, expression: lhs[0] }
    }

    const rhs: Expression[] = []
    while (rhs.length == 0 || expect(stream, TokenKind.Comma) != undefined)
    {
        const rvalue = parse_expression(stream)
        if (rvalue == undefined)
            return undefined
        rhs.push(rvalue)
    }

    return {
        kind: StatementKind.Assignment,
        assignment: {
            local: local != undefined,
            lhs: lhs.reverse(),
            rhs: rhs,
            token: assign,
        },
    }
}

function parse_return(stream: TokenStream): Statement | undefined
{
    const ret = expect(stream, TokenKind.Return)
    if (ret == undefined)
        return undefined

    const values: Expression[] = []
    while (values.length == 0 || expect(stream, TokenKind.Comma) != undefined)
    {
        const value = parse_expression(stream)
        if (value == undefined)
        {
            if (values.length == 0)
                break
            else
                return undefined
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

function parse_if(stream: TokenStream): Statement | undefined
{
    const if_token = expect(stream, TokenKind.If)
    if (if_token == undefined)
        return undefined

    const condition = parse_expression(stream)
    if (condition == undefined)
        return undefined

    if (expect(stream, TokenKind.Then) == undefined)
        return undefined
    
    const body = parse(stream)
    let else_body: Chunk | undefined = undefined
    if (expect(stream, TokenKind.Else) != undefined)
        else_body = parse(stream)
    
    return {
        kind: StatementKind.If,
        if: {
            condition: condition,
            body: body,
            else_body: else_body,
            token: if_token,
        },
    }
}

function parse_while(stream: TokenStream): Statement | undefined
{
    const while_token = expect(stream, TokenKind.While)
    if (while_token == undefined)
        return undefined

    const condition = parse_expression(stream)
    if (condition == undefined)
        return undefined

    if (expect(stream, TokenKind.Do) == undefined)
        return undefined
    
    const body = parse(stream)
    return {
        kind: StatementKind.While,
        while: {
            condition: condition,
            body: body,
            token: while_token,
        },
    }
}

function parse_for(stream: TokenStream): Statement | undefined
{
    const for_token = expect(stream, TokenKind.For)
    if (for_token == undefined)
        return undefined

    const items: Token[] = []
    while (items.length == 0 || expect(stream, TokenKind.Comma) != undefined)
    {
        const item = expect(stream, TokenKind.Identifier)
        if (item == undefined)
            return undefined
        items.push(item)
    }

    if (expect(stream, TokenKind.In) == undefined)
        return undefined

    const itorator = parse_expression(stream)
    if (itorator == undefined)
        return undefined

    if (expect(stream, TokenKind.Do) == undefined)
        return undefined

    const body = parse(stream)
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

function parse_function_params(stream: TokenStream): Token[] | undefined
{
    if (expect(stream, TokenKind.OpenBrace) == undefined)
        return undefined

    const params: Token[] = []
    while (true)
    {
        const param = expect(stream, TokenKind.Identifier)
        if (param == undefined)
            break

        params.push(param)
        if (expect(stream, TokenKind.Comma) == undefined)
            break
    }

    if (expect(stream, TokenKind.CloseBrace) == undefined)
        return undefined

    return params
}

function parse_function_value(function_token: Token, stream: TokenStream): Value | undefined
{
    const params = parse_function_params(stream)
    if (params == undefined)
        return undefined

    const body = parse(stream)
    return {
        kind: ValueKind.Function,
        token: function_token,
        function: {
            parameters: params,
            body: body,
        },
    }
}

function parse_function(stream: TokenStream): Statement | undefined
{
    if (expect(stream, TokenKind.Function) == undefined)
        return undefined

    const name = expect(stream, TokenKind.Identifier)
    if (name == undefined)
        return undefined
    
    const function_value = parse_function_value(name, stream)
    if (function_value == undefined)
        return undefined

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

function parse_statement(stream: TokenStream): Statement | undefined
{
    const token = stream.peek()
    switch (token.kind)
    {
        case TokenKind.Identifier:
        case TokenKind.Local:
            return parse_assign_or_expression(stream)
        case TokenKind.Return:
            return parse_return(stream)
        case TokenKind.If:
            return parse_if(stream)
        case TokenKind.While:
            return parse_while(stream)
        case TokenKind.For:
            return parse_for(stream)
        case TokenKind.Function:
            return parse_function(stream)
        case TokenKind.End:
            stream.next()
        case TokenKind.Else:
        case TokenKind.EOF:
            return undefined
    }

    return undefined
}

export function parse(stream: TokenStream): Chunk
{
    const chunk: Chunk = { statements: [] }

    while (true)
    {
        const statement = parse_statement(stream)
        if (statement == undefined)
            break

        chunk.statements.push(statement)
    }

    return chunk
}


import { Chunk } from './ast'
import { Expression, ExpressionKind } from './ast'
import { Statement, StatementKind } from './ast'
import { Value, ValueKind } from './ast'
import { Token, TokenKind, TokenStream } from './lexer'

const ORDERS = [
    [TokenKind.Multiply, TokenKind.Division],
    [TokenKind.Addition, TokenKind.Subtract],
    [TokenKind.LessThen, TokenKind.GreaterThen],
]

function expect(stream: TokenStream, kind: TokenKind): Token | undefined
{
    const token = stream.peek();
    if (token.kind != kind)
        return undefined
    return stream.next()
}

function parse_table(stream: TokenStream): Value | undefined
{
    const elements: Map<string|number, Expression> = new Map()
    let current_numeric_key = 1
    while (stream.peek().kind != TokenKind.SquiglyClose)
    {
        let key: string | number;

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
        table: elements,
    }
}

function parse_value(stream: TokenStream): Value | undefined
{
    const token = stream.next();
    switch (token.kind)
    {
        case TokenKind.NumberLiteral:
            return { kind: ValueKind.NumberLiteral, number: parseFloat(token.data) } 
        case TokenKind.BooleanLiteral:
            return { kind: ValueKind.BooleanLiteral, boolean: token.data == "true" } 
        case TokenKind.StringLiteral:
            return { kind: ValueKind.StringLiteral, string: token.data } 
        case TokenKind.NilLiteral:
            return { kind: ValueKind.NilLiteral } 
        case TokenKind.Identifier:
            return { kind: ValueKind.Variable, identifier: token.data }
        
        case TokenKind.SquiglyOpen:
            return parse_table(stream)
        case TokenKind.Function:
            return parse_function_value(stream)

        default:
            return undefined
    }
}

function parse_expression_value(stream: TokenStream): Expression | undefined
{
    let value = parse_value(stream)
    if (value == undefined)
        return undefined

    let result: Expression = {
        kind: ExpressionKind.Value,
        value: value,
    }

    while ([TokenKind.OpenBrace, TokenKind.OpenSquare].includes(stream.peek().kind))
    {
        if (expect(stream, TokenKind.OpenBrace) != undefined)
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
                expression: result,
                arguments: args,
            }
        }

        if (expect(stream, TokenKind.OpenSquare) != undefined)
        {
            const index = parse_expression(stream)
            if (index == undefined)
                return undefined

            if (expect(stream, TokenKind.CloseSquare) == undefined)
                return undefined

            result = { 
                kind: ExpressionKind.Index,
                expression: result,
                index: index,
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
            lhs: result,
            rhs: rhs,
        }
    }

    if (order + 1 >= ORDERS.length)
        return result
    else
        return parse_operation(stream, result, order + 1)
}

function parse_expression(stream: TokenStream, order: number = 0): Expression | undefined
{
    const lhs = parse_expression_value(stream);
    if (lhs == undefined)
        return undefined

    return parse_operation(stream, lhs, order)
}

function parse_assign_or_expression(stream: TokenStream): Statement | undefined
{
    const is_local = expect(stream, TokenKind.Local) != undefined
    const assign_to = parse_expression(stream)
    if (assign_to == undefined)
        return undefined

    if (expect(stream, TokenKind.Assign) == undefined)
    {
        return {
            kind: StatementKind.Expression,
            expression: assign_to,
        }
    }

    const value = parse_expression(stream)
    if (value == undefined)
        return undefined

    return {
        kind: StatementKind.Assignment,
        assignment: {
            local: is_local,
            lhs: [assign_to],
            rhs: [value],
        },
    }
}

function parse_return(stream: TokenStream): Statement | undefined
{
    if (expect(stream, TokenKind.Return) == undefined)
        return undefined

    const value = parse_expression(stream)
    if (value == undefined)
        return undefined

    return {
        kind: StatementKind.Return,
        expression: value,
    }
}

function parse_if(stream: TokenStream): Statement | undefined
{
    if (expect(stream, TokenKind.If) == undefined)
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
        }
    }
}

function parse_while(stream: TokenStream): Statement | undefined
{
    if (expect(stream, TokenKind.While) == undefined)
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
        }
    }
}

function parse_function_params(stream: TokenStream): string[] | undefined
{
    if (expect(stream, TokenKind.OpenBrace) == undefined)
        return undefined

    const params: string[] = []
    while (true)
    {
        const param = expect(stream, TokenKind.Identifier)
        if (param == undefined)
            break

        params.push(param.data)
        if (expect(stream, TokenKind.Comma) == undefined)
            break
    }

    if (expect(stream, TokenKind.CloseBrace) == undefined)
        return undefined

    return params
}

function parse_function_value(stream: TokenStream): Value | undefined
{
    const params = parse_function_params(stream)
    if (params == undefined)
        return undefined

    const body = parse(stream)
    return {
        kind: ValueKind.Function,
        function: {
            parameters: params,
            body: body,
        }
    }
}

function parse_function(stream: TokenStream): Statement | undefined
{
    if (expect(stream, TokenKind.Function) == undefined)
        return undefined

    const name = expect(stream, TokenKind.Identifier)
    if (name == undefined)
        return undefined
    
    const function_value = parse_function_value(stream)
    if (function_value == undefined)
        return undefined

    return {
        kind: StatementKind.Assignment,
        assignment: {
            local: false,
            lhs: [{
                kind: ExpressionKind.Value,
                value: {
                    kind: ValueKind.Variable,
                    identifier: name.data,
                },
            }],
            rhs: [{
                kind: ExpressionKind.Value,
                value: function_value,
            }],
        }
    }
}

function parse_statement(stream: TokenStream): Statement | undefined
{
    const token = stream.peek();
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
    let chunk: Chunk = { statements: [] }

    while (true)
    {
        const statement = parse_statement(stream)
        if (statement == undefined)
            break

        chunk.statements.push(statement)
    }

    return chunk
}


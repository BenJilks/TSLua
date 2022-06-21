import { StatementKind, Assignment, IfBlock, While, ExpressionKind, Expression, Chunk, For, Return, Local, NumericFor } from './ast'
import { Value, ValueKind } from './ast'
import { Op, OpCode } from './opcode'
import { DataType, make_boolean, make_number, make_string, nil } from './runtime'
import { Token } from './lexer'

function compile_function(chunk: Chunk, token: Token, parameters: Token[], functions: Op[][]): number
{
    const ops: Op[] = []
    ops.push({ code: OpCode.ArgumentCount, arg: make_number(parameters.length), debug: token.debug })
    for (const parameter of parameters.reverse())
    {
        ops.push({ code: OpCode.MakeLocal, arg: make_string(parameter.data), debug: parameter.debug })
        ops.push({ code: OpCode.Store, arg: make_string(parameter.data), debug: parameter.debug })
    }
    ops.push(...compile_chunk(chunk, functions))
    ops.push({ code: OpCode.Push, arg: nil, debug: token.debug })
    ops.push({ code: OpCode.Return, arg: make_number(0), debug: token.debug })

    functions.push(ops)
    return functions.length - 1
}

function compile_value(value: Value | undefined, functions: Op[][]): Op[]
{
    if (value == undefined)
        throw new Error()

    const debug = value.token.debug
    switch (value.kind)
    {
        case ValueKind.NilLiteral:
            return [{ code: OpCode.Push, arg: nil, debug: debug }]
        case ValueKind.BooleanLiteral:
            return [{ code: OpCode.Push, arg: make_boolean(value.boolean ?? false), debug: debug }]
        case ValueKind.NumberLiteral:
            return [{ code: OpCode.Push, arg: make_number(value.number ?? 0), debug: debug }]
        case ValueKind.StringLiteral:
            return [{ code: OpCode.Push, arg: make_string(value.string ?? ''), debug: debug }]

        case ValueKind.Function:
        {
            return [{
                code: OpCode.Push, arg: {
                    data_type: DataType.Function,
                    function_id: compile_function(
                        value.function?.body ?? { statements: [] },
                        value.token,
                        value.function?.parameters ?? [],
                        functions),
                },
                debug: debug,
            }]
        }

        case ValueKind.TableLiteral:
        {
            const output: Op[] = []
            output.push({ code: OpCode.NewTable, debug: debug })

            for (const [key, expression] of [...value.table?.entries() ?? []].reverse())
            {
                output.push(...compile_expression(expression, functions))
                output.push(...compile_expression(key, functions))
            }

            output.push({ code: OpCode.StoreIndex, arg: make_number(value.table?.size ?? 0), debug: debug })
            return output
        }

        case ValueKind.Variable:
        {
            return [{
                code: OpCode.Load,
                arg: { data_type: DataType.String, string: value.identifier ?? '' },
                debug: debug,
            }]
        }
        
        default:
            throw new Error()
    }
}

function compile_operation(expression: Expression,
                           operation: OpCode,
                           functions: Op[][]): Op[]
{
    const { lhs, rhs } = expression
    if (lhs == undefined || rhs == undefined)
        throw new Error()

    const ops: Op[] = []
    ops.push(...compile_expression(rhs, functions))
    ops.push(...compile_expression(lhs, functions))
    ops.push({ code: operation, debug: expression.token.debug })
    return ops
}

function compile_call(func: Expression | undefined,
                      args: Expression[] | undefined,
                      functions: Op[][]): Op[]
{
    if (func == undefined || args == undefined)
        throw new Error()
    
    const debug = func.token.debug
    const ops: Op[] = []
    for (const arg of args)
        ops.push(...compile_expression(arg, functions))
    ops.push(...compile_expression(func, functions))
    ops.push({ code: OpCode.Push, arg: make_number(args.length), debug: debug })
    ops.push({ code: OpCode.Call, debug: debug })
    return ops
}

function compile_index(target: Expression | undefined,
                       index: Expression | undefined,
                       functions: Op[][]): Op[]
{
    if (target == undefined || index == undefined)
        throw new Error()
    
    const ops: Op[] = []
    ops.push(...compile_expression(index, functions))
    ops.push(...compile_expression(target, functions))
    ops.push({ code: OpCode.LoadIndex, debug: target.token.debug })
    return ops
}

function compile_unary_operation(expression: Expression | undefined,
                                 operation: OpCode,
                                 functions: Op[][]): Op[]

{
    if (expression == undefined || expression.expression == undefined)
        throw new Error()

    const ops: Op[] = []
    ops.push(...compile_expression(expression.expression, functions))
    ops.push({ code: operation, debug: expression.token.debug })
    return ops
}

function compile_expression(expression: Expression | undefined, functions: Op[][]): Op[]
{
    if (expression == undefined)
        throw new Error()

    switch (expression.kind)
    {
        case ExpressionKind.Value:
            return compile_value(expression.value, functions)
        case ExpressionKind.Call:
            return compile_call(expression.expression, expression.arguments, functions)
        case ExpressionKind.Index:
            return compile_index(expression.expression, expression.index, functions)

        case ExpressionKind.Addition:
            return compile_operation(expression, OpCode.Add, functions)
        case ExpressionKind.Subtract:
            return compile_operation(expression, OpCode.Subtract, functions)
        case ExpressionKind.Multiplication:
            return compile_operation(expression, OpCode.Multiply, functions)
        case ExpressionKind.Division:
            return compile_operation(expression, OpCode.Divide, functions)
        case ExpressionKind.FloorDivision:
            return compile_operation(expression, OpCode.FloorDivide, functions)
        case ExpressionKind.Modulo:
            return compile_operation(expression, OpCode.Modulo, functions)
        case ExpressionKind.Exponent:
            return compile_operation(expression, OpCode.Exponent, functions)
        case ExpressionKind.Concat:
            return compile_operation(expression, OpCode.Concat, functions)

        case ExpressionKind.BitAnd:
            return compile_operation(expression, OpCode.BitAnd, functions)
        case ExpressionKind.BitOr:
            return compile_operation(expression, OpCode.BitOr, functions)
        case ExpressionKind.BitXOr:
            return compile_operation(expression, OpCode.BitXOr, functions)
        case ExpressionKind.BitShiftLeft:
            return compile_operation(expression, OpCode.BitShiftLeft, functions)
        case ExpressionKind.BitShiftRight:
            return compile_operation(expression, OpCode.BitShiftRight, functions)

        case ExpressionKind.Equals:
            return compile_operation(expression, OpCode.Equals, functions)
        case ExpressionKind.NotEquals:
            return compile_operation(expression, OpCode.NotEquals, functions)
        case ExpressionKind.LessThen:
            return compile_operation(expression, OpCode.LessThen, functions)
        case ExpressionKind.LessThenEquals:
            return compile_operation(expression, OpCode.LessThenEquals, functions)
        case ExpressionKind.GreaterThen:
            return compile_operation(expression, OpCode.GreaterThen, functions)
        case ExpressionKind.GreaterThenEquals:
            return compile_operation(expression, OpCode.GreaterThenEquals, functions)
        case ExpressionKind.And:
            return compile_operation(expression, OpCode.And, functions)
        case ExpressionKind.Or:
            return compile_operation(expression, OpCode.Or, functions)

        case ExpressionKind.Not:
            return compile_unary_operation(expression, OpCode.Not, functions)
        case ExpressionKind.Negate:
            return compile_unary_operation(expression, OpCode.Negate, functions)
        case ExpressionKind.Length:
            return compile_unary_operation(expression, OpCode.Length, functions)
        case ExpressionKind.BitNot:
            return compile_unary_operation(expression, OpCode.BitNot, functions)

        default:
            throw new Error()
    }
}

function compile_assignment(assignment: Assignment | undefined, functions: Op[][]): Op[]
{
    if (assignment == undefined)
        throw new Error()
    
    const ops: Op[] = []
    for (const lhs of assignment.lhs)
    {
        if (lhs.kind != ExpressionKind.Value)
            continue

        const identifier = lhs.value?.identifier ?? ''
        if (assignment.local)
        {
            ops.push({
                code: OpCode.MakeLocal,
                arg: make_string(identifier),
                debug: lhs.token.debug,
            })
        }
    }

    const debug = assignment.token.debug
    ops.push({ code: OpCode.AssignPush, debug: debug })
    for (const rhs of assignment.rhs)
        ops.push(...compile_expression(rhs, functions))
    ops.push({ code: OpCode.AssignSet, arg: make_number(assignment.lhs.length), debug: debug })

    for (const lhs of assignment.lhs)
    {
        const debug = lhs.token.debug
        switch (lhs.kind)
        {
            case ExpressionKind.Value:
            {
                if (lhs.value?.kind != ValueKind.Variable)
                    throw new Error()
             
                const identifier = lhs.value?.identifier ?? ''
                ops.push({ code: OpCode.Store, arg: make_string(identifier), debug: debug })
                break
            }    

            case ExpressionKind.Index:
            {
                ops.push(...compile_expression(lhs.expression, functions))
                ops.push({ code: OpCode.Swap, debug: debug })
                ops.push(...compile_expression(lhs.index, functions))
                ops.push({ code: OpCode.StoreIndex, debug: debug })
                ops.push({ code: OpCode.Pop, debug: debug })
                break
            }

            default:
                throw new Error()
        }
    }

    return ops
}

function compile_local(local: Local | undefined): Op[]
{
    if (local == undefined)
        throw new Error()

    return local.names
        .map(name => ({
            code: OpCode.MakeLocal,
            arg: {
                data_type: DataType.String,
                string: name.data,
            },
            debug: name.debug,
        }))
}

function compile_if(if_block: IfBlock | undefined, functions: Op[][]): Op[]
{
    if (if_block == undefined)
        throw new Error()

    const else_chunk: Op[] = []
    if (if_block.else_body != undefined)
        else_chunk.push(...compile_chunk(if_block.else_body, functions))

    const if_else_chunks: Op[][] = []
    for (const { body, condition, token } of if_block.else_if_bodies.reverse())
    {
        const ops: Op[] = []
        const if_else_body = compile_chunk(body, functions)
        ops.push(...compile_expression(condition, functions))
        ops.push({ code: OpCode.JumpIfNot, arg: make_number(if_else_body.length + 1), debug: token.debug })
        ops.push(...if_else_body)

        const offset = if_else_chunks.reduce((acc, chunk) => chunk.length + acc, 0) + else_chunk.length
        ops.push({ code: OpCode.Jump, arg: make_number(offset), debug: token.debug })
        if_else_chunks.push(ops)
    }

    const debug = if_block.token.debug
    const ops: Op[] = []
    const body = compile_chunk(if_block.body, functions)
    ops.push({ code: OpCode.StartBlock, debug: debug })
    ops.push(...compile_expression(if_block.condition, functions))
    ops.push({ code: OpCode.JumpIfNot, arg: make_number(body.length + 1), debug: debug })
    ops.push(...body)

    const offset = if_else_chunks.reduce((acc, chunk) => chunk.length + acc, 0) + else_chunk.length
    ops.push({ code: OpCode.Jump, arg: make_number(offset), debug: debug })
    for (const if_else_chunk of if_else_chunks)
        ops.push(...if_else_chunk)
    ops.push(...else_chunk)
    ops.push({ code: OpCode.EndBlock, debug: debug })

    return ops
}

function replace_breaks(code: Op[], offset_from_end: number)
{
    for (const [i, op] of code.entries())
    {
        if (op.code == OpCode.Break)
        {
            const offset = code.length - i - 1 + offset_from_end
            op.code = OpCode.Jump
            op.arg = make_number(offset)
        }
    }
}

function compile_while(while_block: While | undefined, functions: Op[][]): Op[]
{
    if (while_block == undefined)
        throw new Error()

    const debug = while_block.token.debug
    const ops: Op[] = []
    const body = compile_chunk(while_block.body, functions)
    replace_breaks(body, 1)

    ops.push({ code: OpCode.StartBlock, debug: debug })
    ops.push(...compile_expression(while_block.condition, functions))
    ops.push({ code: OpCode.JumpIfNot, arg: make_number(body.length + 1), debug: debug })
    ops.push(...body)
    ops.push({ code: OpCode.Jump, arg: make_number(-ops.length - 1), debug: debug })
    ops.push({ code: OpCode.EndBlock, debug: debug })
    return ops
}

function compile_for(for_block: For | undefined, functions: Op[][]): Op[]
{
    if (for_block == undefined)
        throw new Error()

    const ops: Op[] = []
    const body = compile_chunk(for_block.body, functions)
    replace_breaks(body, 1)

    const debug = for_block.token.debug
    ops.push({ code: OpCode.StartBlock, debug: debug })
    ops.push(...compile_expression(for_block.itorator, functions))

    const after_creating_itorator = ops.length
    ops.push({ code: OpCode.AssignPush, debug: debug })
    ops.push({ code: OpCode.Dup, debug: debug })
    ops.push({ code: OpCode.Push, arg: make_number(0), debug: debug })
    ops.push({ code: OpCode.Call, debug: debug })

    ops.push({ code: OpCode.Dup, debug: debug })
    ops.push({ code: OpCode.IsNil, debug: debug })
    ops.push({ code: OpCode.Not, debug: debug })
    ops.push({ code: OpCode.JumpIfNot, arg: make_number(body.length + for_block.items.length + 2), debug: debug })
    ops.push({ code: OpCode.AssignSet, arg: make_number(for_block.items.length), debug: debug })

    for (const item of for_block.items.reverse())
        ops.push({ code: OpCode.Store, arg: make_string(item.data), debug: item.debug })
    ops.push(...body)
    ops.push({ code: OpCode.Jump, arg: make_number(-ops.length + after_creating_itorator - 1), debug: debug })
    ops.push({ code: OpCode.Pop, debug: debug })
    ops.push({ code: OpCode.Pop, debug: debug })
    ops.push({ code: OpCode.EndBlock, debug: debug })
    return ops
}

function compile_step(step: Expression | undefined, functions: Op[][]): Op[]
{
    if (step == undefined)
        return [{ code: OpCode.Push, arg: make_number(1), debug: { line: 0, column: 0 } }]

    return compile_expression(step, functions)
}

function compile_numeric_for(numeric_for_block: NumericFor | undefined, functions: Op[][]): Op[]
{
    if (numeric_for_block == undefined)
        throw new Error()

    const ops: Op[] = []
    const body = compile_chunk(numeric_for_block.body, functions)
    const step = compile_step(numeric_for_block.step, functions)
    const index = numeric_for_block.index.data
    const debug = numeric_for_block.index.debug
    replace_breaks(body, step.length + 4)

    ops.push({ code: OpCode.StartBlock, debug: debug })
    ops.push(...compile_expression(numeric_for_block.start, functions))

    const after_creating_itorator = ops.length
    ops.push({ code: OpCode.Dup, debug: debug })
    ops.push(...compile_expression(numeric_for_block.end, functions))
    ops.push({ code: OpCode.NotEquals, debug: debug })
    ops.push({ code: OpCode.JumpIfNot, arg: make_number(body.length + step.length + 4), debug: debug })

    ops.push({ code: OpCode.Store, arg: make_string(index), debug: debug })
    ops.push(...body)
    ops.push({ code: OpCode.Load, arg: make_string(index), debug: debug })
    ops.push(...step)
    ops.push({ code: OpCode.Add, debug: debug })
    ops.push({ code: OpCode.Jump, arg: make_number(-ops.length + after_creating_itorator - 1), debug: debug })

    ops.push({ code: OpCode.Pop, debug: debug })
    ops.push({ code: OpCode.EndBlock, debug: debug })
    return ops
}

function compile_return(return_block: Return | undefined, functions: Op[][]): Op[]
{
    if (return_block == undefined)
        throw new Error()

    const ops: Op[] = []
    for (const value of return_block.values)
        ops.push(...compile_expression(value, functions))

    const debug = return_block.token.debug
    const return_count = return_block.values.length
    ops.push({ code: OpCode.Return, arg: make_number(return_count), debug: debug })
    return ops
}

function compile_chunk(chunk: Chunk, functions: Op[][]): Op[]
{
    const ops = []

    for (const statement of chunk.statements)
    {
        switch (statement.kind)
        {
            case StatementKind.Empty:
                break
            case StatementKind.Expression:
                ops.push(...compile_expression(statement.expression, functions))
                if (statement.expression != undefined)
                    ops.push({ code: OpCode.Pop, debug: statement.expression.token.debug })
                break
            case StatementKind.Assignment:
                ops.push(...compile_assignment(statement.assignment, functions))
                break
            case StatementKind.Local:
                ops.push(...compile_local(statement.local))
                break
            case StatementKind.If:
                ops.push(...compile_if(statement.if, functions))
                break
            case StatementKind.While:
                ops.push(...compile_while(statement.while, functions))
                break
            case StatementKind.For:
                ops.push(...compile_for(statement.for, functions))
                break
            case StatementKind.NumericFor:
                ops.push(...compile_numeric_for(statement.numeric_for, functions))
                break
            case StatementKind.Return:
                ops.push(...compile_return(statement.return, functions))
                break
            case StatementKind.Break:
                ops.push({ code: OpCode.Break, debug: { line: 0, column: 0 } })
                break
        }
    }

    return ops
}

function link(code: Op[], function_id: number, location: number)
{
    for (const op of code)
    {
        if (op.arg?.data_type == DataType.Function &&
            op.arg?.function_id == function_id)
        {
            op.arg.function_id = location
        }
    }
}

export function compile(chunk: Chunk): Op[]
{
    const functions: Op[][] = []
    const code = compile_chunk(chunk, functions)
    code.push({ code: OpCode.Return, arg: make_number(1), debug: { line: 0, column: 0 } })

    const function_locations: number[] = []
    for (const func of functions)
    {
        function_locations.push(code.length)
        code.push(...func)
    }

    for (const [id, location] of function_locations.entries())
        link(code, id, location)

    return code
}


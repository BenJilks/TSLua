import { StatementKind, Assignment, IfBlock, While, ExpressionKind, Expression, Chunk } from './ast'
import { Value, ValueKind } from './ast'
import { CompiledFunction, Op, OpCode } from './opcode'
import { DataType, nil,} from './runtime'

export function compile_function(chunk: Chunk, parameters: string[]): CompiledFunction
{
    return {
        parameters: parameters,
        locals: new Map(),
        ops: compile_chunk(chunk),
    }
}

function compile_value(value: Value | undefined): Op[]
{
    if (value == undefined)
        throw new Error()

    switch (value.kind)
    {
        case ValueKind.NilLiteral:
            return [{ code: OpCode.Push, arg: nil }]
        case ValueKind.BooleanLiteral:
            return [{ code: OpCode.Push, arg: { data_type: DataType.Boolean, boolean: value.boolean } }]
        case ValueKind.NumberLiteral:
            return [{ code: OpCode.Push, arg: { data_type: DataType.Number, number: value.number } }]
        case ValueKind.StringLiteral:
            return [{ code: OpCode.Push, arg: { data_type: DataType.String, string: value.string } }]
        case ValueKind.Function:
            return [{ code: OpCode.Push, arg: { data_type: DataType.Function, function: compile_function(value.function?.body!, value.function?.parameters!) } }]

        case ValueKind.TableLiteral:
        {
            const output: Op[] = [{ code: OpCode.Push, arg: { data_type: DataType.Table, table: new Map() } }]
            for (const [key, expression] of value.table!.entries())
            {
                output.push(...compile_expression(expression))
                if (typeof(key) === "number")
                    output.push({ code: OpCode.Push, arg: { data_type: DataType.Number, number: key } })
                else 
                    output.push({ code: OpCode.Push, arg: { data_type: DataType.String, string: key } })
            }

            output.push({ code: OpCode.StoreIndex, arg: { data_type: DataType.Number, number: value.table!.size } })
            return output
        }

        case ValueKind.Variable:
            return [{ code: OpCode.Load, arg: { data_type: DataType.String, string: value.identifier } }]
        
        default:
            throw new Error()
    }
}

function compile_operation(expression: Expression,
                           operation: OpCode): Op[]
{
    const { lhs, rhs } = expression
    if (lhs == undefined || rhs == undefined)
        throw new Error()

    const ops: Op[] = []
    ops.push(...compile_expression(lhs))
    ops.push(...compile_expression(rhs))
    ops.push({ code: operation })
    return ops
}

function compile_call(func: Expression | undefined,
                      args: Expression[] | undefined): Op[]
{
    if (func == undefined || args == undefined)
        throw new Error()
    
    const ops: Op[] = []
    for (const arg of args)
        ops.push(...compile_expression(arg))
    ops.push(...compile_expression(func))
    ops.push({ code: OpCode.Push, arg: { data_type: DataType.Number, number: args.length } })
    ops.push({ code: OpCode.Call })
    return ops
}

function compile_index(target: Expression | undefined,
                       index: Expression | undefined): Op[]
{
    if (target == undefined || index == undefined)
        throw new Error()
    
    const ops: Op[] = []
    ops.push(...compile_expression(index))
    ops.push(...compile_expression(target))
    ops.push({ code: OpCode.LoadIndex })
    return ops
}

function compile_expression(expression: Expression | undefined): Op[]
{
    if (expression == undefined)
        throw new Error()

    switch (expression.kind)
    {
        case ExpressionKind.Value:
            return compile_value(expression.value)
        case ExpressionKind.Call:
            return compile_call(expression.expression, expression.arguments)
        case ExpressionKind.Index:
            return compile_index(expression.expression, expression.index)

        case ExpressionKind.Addition:
            return compile_operation(expression, OpCode.Add)
        case ExpressionKind.Subtract:
            return compile_operation(expression, OpCode.Subtract)
        case ExpressionKind.Multiplication:
            return compile_operation(expression, OpCode.Multiply)
        case ExpressionKind.Division:
            return compile_operation(expression, OpCode.Divide)

        case ExpressionKind.LessThen:
            return compile_operation(expression, OpCode.LessThen)
        case ExpressionKind.GreaterThen:
            return compile_operation(expression, OpCode.GreaterThen)

        default:
            throw new Error()
    }
}

function compile_assignment(assignment: Assignment | undefined): Op[]
{
    if (assignment == undefined)
        throw new Error()
    
    const ops: Op[] = []
    const rhs = assignment.rhs[0]

    const lhs = assignment.lhs[0]
    switch (lhs.kind)
    {
        case ExpressionKind.Value:
        {
            if (lhs.value?.kind != ValueKind.Variable)
                throw new Error()
         
            const identifier = lhs.value?.identifier ?? ''
            ops.push(...compile_expression(rhs))
            if (assignment.local)
                ops.push({ code: OpCode.MakeLocal, arg: { data_type: DataType.String, string: identifier } })
            ops.push({ code: OpCode.Store, arg: { data_type: DataType.String, string: identifier } })
            break
        }    

        case ExpressionKind.Index:
        {
            ops.push(...compile_expression(lhs.expression))
            ops.push(...compile_expression(rhs))
            ops.push(...compile_expression(lhs.index))
            ops.push({ code: OpCode.StoreIndex })
            break
        }

        default:
            throw new Error()
    }

    return ops
}

function compile_if(if_block: IfBlock | undefined): Op[]
{
    if (if_block == undefined)
        throw new Error()

    const ops: Op[] = []
    const body = compile_chunk(if_block.body)
    const offset = body.length + (if_block.else_body == undefined ? 1 : 0)
    ops.push(...compile_expression(if_block.condition))
    ops.push({ code: OpCode.JumpIfNot, arg: { data_type: DataType.Number, number: offset } })
    ops.push(...body)

    if (if_block.else_body != undefined)
    {
        const else_body = compile_chunk(if_block.else_body)
        ops.push({ code: OpCode.Jump, arg: { data_type: DataType.Number, number: else_body.length } })
        ops.push(...else_body)
    }

    return ops
}

function compile_while(while_block: While | undefined): Op[]
{
    if (while_block == undefined)
        throw new Error()

    const ops: Op[] = []
    const body = compile_chunk(while_block.body)
    ops.push({ code: OpCode.JumpIfNot, arg: { data_type: DataType.Number, number: body.length + 1 } })
    ops.push(...body)
    ops.push({ code: OpCode.Jump, arg: { data_type: DataType.Number, number: -ops.length - 1 } })
    return ops
}

function compile_return(return_expression: Expression | undefined): Op[]
{
    if (return_expression == undefined)
        throw new Error()

    const ops: Op[] = []
    ops.push(...compile_expression(return_expression))
    ops.push({ code: OpCode.Return })
    return ops
}

function compile_chunk(chunk: Chunk): Op[]
{
    const ops = []

    for (const statement of chunk.statements)
    {
        switch (statement.kind)
        {
            case StatementKind.Expression:
                ops.push(...compile_expression(statement.expression))
                break
            case StatementKind.Assignment:
                ops.push(...compile_assignment(statement.assignment))
                break
            case StatementKind.If:
                ops.push(...compile_if(statement.if))
                break
            case StatementKind.While:
                ops.push(...compile_while(statement.while))
                break
            case StatementKind.Return:
                ops.push(...compile_return(statement.expression))
        }
    }

    return ops
}


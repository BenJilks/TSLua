import { StatementKind, Chunk } from './ast'
import { Expression, ExpressionKind } from './ast'
import { IfBlock, While, For, NumericFor, Repeat } from './ast'
import { Assignment, Value, ValueKind } from './ast'

const CONSTANT_VALUES = [
    ValueKind.NilLiteral,
    ValueKind.NumberLiteral,
    ValueKind.BooleanLiteral,
    ValueKind.StringLiteral,
]

function compule_arithmatic_operation(expression: Expression,
                                      operation: (a: number, b: number) => number,
                                      constants: Map<string, Value>): Value | undefined
{
    const lhs = compute_constant_expression(expression.lhs, constants)
    const rhs = compute_constant_expression(expression.rhs, constants)
    if (lhs == undefined || rhs == undefined)
        return undefined

    return {
        kind: ValueKind.NumberLiteral,
        number: operation((lhs?.number ?? 0), (rhs?.number ?? 0)),
        token: expression.token,
    }
}

function compule_comparison_operation(expression: Expression,
                                      operation: (a: number, b: number) => boolean,
                                      constants: Map<string, Value>): Value | undefined
{
    const lhs = compute_constant_expression(expression.lhs, constants)
    const rhs = compute_constant_expression(expression.rhs, constants)
    if (lhs == undefined || rhs == undefined)
        return undefined

    return {
        kind: ValueKind.BooleanLiteral,
        boolean: operation((lhs?.number ?? 0), (rhs?.number ?? 0)),
        token: expression.token,
    }
}

function compule_logical_operation(expression: Expression,
                                   operation: (a: boolean, b: boolean) => boolean,
                                   constants: Map<string, Value>): Value | undefined
{
    const lhs = compute_constant_expression(expression.lhs, constants)
    const rhs = compute_constant_expression(expression.rhs, constants)
    if (lhs == undefined || rhs == undefined)
        return undefined

    return {
        kind: ValueKind.BooleanLiteral,
        boolean: operation((lhs?.boolean ?? false), (rhs?.boolean ?? false)),
        token: expression.token,
    }
}

function compute_constant_expression(expression: Expression | undefined,
                                     constants: Map<string, Value>): Value | undefined
{
    if (expression == undefined)
        return undefined

    switch (expression.kind)
    {
        case ExpressionKind.Value:
        {
            if (expression.value == undefined)
                return undefined

            const value = expression.value
            if (CONSTANT_VALUES.includes(value.kind))
                return value
            if (value.kind == ValueKind.Variable && constants.has(value.identifier ?? ''))
                return constants.get(value.identifier ?? '')
            return undefined
        }

        case ExpressionKind.Addition: return compule_arithmatic_operation(expression, (a, b) => a + b, constants)
        case ExpressionKind.Subtract: return compule_arithmatic_operation(expression, (a, b) => a - b, constants)
        case ExpressionKind.Multiplication: return compule_arithmatic_operation(expression, (a, b) => a * b, constants)
        case ExpressionKind.Division: return compule_arithmatic_operation(expression, (a, b) => a / b, constants)
        case ExpressionKind.FloorDivision: return compule_arithmatic_operation(expression, (a, b) => Math.floor(a / b), constants)
        case ExpressionKind.Modulo: return compule_arithmatic_operation(expression, (a, b) => a % b, constants)
        case ExpressionKind.Exponent: return compule_arithmatic_operation(expression, (a, b) => Math.pow(a, b), constants)
        case ExpressionKind.Concat: return undefined

        case ExpressionKind.BitAnd: return compule_arithmatic_operation(expression, (a, b) => a & b, constants)
        case ExpressionKind.BitOr: return compule_arithmatic_operation(expression, (a, b) => a | b, constants)
        case ExpressionKind.BitXOr: return compule_arithmatic_operation(expression, (a, b) => a ^ b, constants)
        case ExpressionKind.BitShiftLeft: return compule_arithmatic_operation(expression, (a, b) => a << b, constants)
        case ExpressionKind.BitShiftRight: return compule_arithmatic_operation(expression, (a, b) => a >> b, constants)
        case ExpressionKind.BitNot: return undefined

        case ExpressionKind.Equals: return compule_comparison_operation(expression, (a, b) => a == b, constants)
        case ExpressionKind.NotEquals: return compule_comparison_operation(expression, (a, b) => a != b, constants)
        case ExpressionKind.LessThen: return compule_comparison_operation(expression, (a, b) => a < b, constants)
        case ExpressionKind.LessThenEquals: return compule_comparison_operation(expression, (a, b) => a <= b, constants)
        case ExpressionKind.GreaterThen: return compule_comparison_operation(expression, (a, b) => a > b, constants)
        case ExpressionKind.GreaterThenEquals: return compule_comparison_operation(expression, (a, b) => a >= b, constants)
        case ExpressionKind.And: return compule_logical_operation(expression, (a, b) => a && b, constants)
        case ExpressionKind.Or: return compule_logical_operation(expression, (a, b) => a || b, constants)

        case ExpressionKind.Not:
        {
            const lhs = compute_constant_expression(expression.lhs, constants)
            if (lhs == undefined)
                return undefined

            return {
                kind: ValueKind.BooleanLiteral,
                boolean: !(lhs.boolean ?? false),
                token: expression.token,
            }
        }

        case ExpressionKind.Negate:
        {
            const lhs = compute_constant_expression(expression.lhs, constants)
            if (lhs == undefined)
                return undefined

            return {
                kind: ValueKind.NumberLiteral,
                number: -(lhs.number ?? false),
                token: expression.token,
            }
        }

        case ExpressionKind.Length:
            return undefined
    }
}

function optimize_expression(expression: Expression | undefined,
                             constants: Map<string, Value>)
{
    if (expression == undefined)
        return

    if (expression.value?.function != undefined)
    {
        optimize_chunk(expression.value.function.body, constants)
        return
    }

    const value = compute_constant_expression(expression, constants)
    if (value != undefined)
    {
        expression.kind = ExpressionKind.Value
        expression.value = value
        return
    }

    optimize_expression(expression.lhs, constants)
    optimize_expression(expression.rhs, constants)
    optimize_expression(expression.expression, constants)
    optimize_expression(expression.index, constants)

    for (const argument of expression.arguments ?? [])
        optimize_expression(argument, constants)
}

function mark_local_constants(assignment: Assignment, constants: Map<string, Value>)
{
    for (const [index, rhs] of assignment.rhs.entries())
    {
        if (index >= assignment.lhs.length)
            continue

        const lhs = assignment.lhs[index]
        if (lhs.kind != ExpressionKind.Value)
            continue
        if (lhs.value?.identifier == undefined)
            continue

        const name = lhs.value.identifier
        const value = compute_constant_expression(rhs, constants)
        if (value == undefined)
            continue

        constants.set(name, value)
    }
}

function unmark_constants_if_reassigned(assignment: Assignment, constants: Map<string, Value>)
{
    for (const lhs of assignment.lhs)
    {
        if (lhs.kind != ExpressionKind.Value)
            continue
        if (lhs.value?.identifier == undefined)
            continue

        const name = lhs.value.identifier
        constants.delete(name)
    }
}

function optimize_assignment(assignment: Assignment | undefined,
                             constants: Map<string, Value>)
{
    if (assignment == undefined)
        return

    if (assignment.local)
        mark_local_constants(assignment, constants)
    else
        unmark_constants_if_reassigned(assignment, constants)

    for (const rhs of assignment.rhs)
        optimize_expression(rhs, constants)
}

function remove_constant_local_assignments(chunk: Chunk,
                                           constants: Map<string, Value>)
{
    for (const statement of chunk.statements)
    {
        if (statement.assignment == undefined || !statement.assignment.local)
            continue

        const assignment = statement.assignment
        for (const name of constants.keys())
        {
            const index = assignment.lhs.findIndex(
                x => x.value?.identifier == name)

            if (index < 0)
                continue
            assignment.lhs.splice(index, 1)
            assignment.rhs.splice(index, 1)
        }
    }

    chunk.statements = chunk.statements
        .filter(x => x.assignment == undefined || x.assignment.lhs.length > 0)
}

function optimize_if(if_block: IfBlock | undefined, constants: Map<string, Value>)
{
    if (if_block == undefined)
        return

    optimize_expression(if_block.condition, constants)
    optimize_chunk(if_block.body, constants)
}

function optimize_while(while_block: While | undefined, constants: Map<string, Value>)
{
    if (while_block == undefined)
        return

    optimize_expression(while_block.condition, constants)
    optimize_chunk(while_block.body, constants)
}

function optimize_for(for_block: For | undefined, constants: Map<string, Value>)
{
    if (for_block == undefined)
        return

    optimize_expression(for_block.itorator, constants)
    optimize_chunk(for_block.body, constants)
}

function optimize_numeric_for(numeric_for_block: NumericFor | undefined, constants: Map<string, Value>)
{
    if (numeric_for_block == undefined)
        return

    optimize_expression(numeric_for_block.start, constants)
    optimize_expression(numeric_for_block.end, constants)
    optimize_expression(numeric_for_block.step, constants)
    optimize_chunk(numeric_for_block.body, constants)
}

function optimize_repeat(repeat_block: Repeat | undefined, constants: Map<string, Value>)
{
    if (repeat_block == undefined)
        return

    optimize_expression(repeat_block.condition, constants)
    optimize_chunk(repeat_block.body, constants)
}

export function optimize_chunk(chunk: Chunk, constants?: Map<string, Value>)
{
    constants = constants ?? new Map()
    for (const statement of chunk.statements)
    {
        switch (statement.kind)
        {
            case StatementKind.Assignment:
                optimize_assignment(statement.assignment, constants)
                break

            case StatementKind.Expression:
                optimize_expression(statement.expression, constants)
                break

            case StatementKind.If:
                optimize_if(statement.if, constants)
                break

            case StatementKind.While:
                optimize_while(statement.if, constants)
                break

            case StatementKind.For:
                optimize_for(statement.for, constants)
                break

            case StatementKind.NumericFor:
                optimize_numeric_for(statement.numeric_for, constants)
                break

            case StatementKind.Repeat:
                optimize_repeat(statement.repeat, constants)
                break

            case StatementKind.Do:
                if (statement.do != undefined)
                    optimize_chunk(statement.do.body, constants)
                break

            case StatementKind.Return:
                for (const expression of statement.return?.values ?? [])
                    optimize_expression(expression, constants)
                break

            case StatementKind.Local:
            case StatementKind.Break:
                break
        }
    }

    remove_constant_local_assignments(chunk, constants)
}


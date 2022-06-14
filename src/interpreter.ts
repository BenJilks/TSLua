import { Chunk } from './ast'
import { Expression, ExpressionKind } from './ast'
import { StatementKind, Function, Assignment, IfBlock, While } from './ast'
import { Value, ValueKind } from './ast'

enum DataType {
    Nil,
    Boolean,
    Number,
    String,
    Function,
    NativeFunction,
    Table,
}

type NativeFunction = (...args: Variable[]) => Variable

interface Variable {
    data_type: DataType,
    boolean?: boolean,
    number?: number,
    string?: string,
    function?: Function,
    native_function?: NativeFunction,
    table?: Map<string|number, Variable>,
}

interface Environment {
    globals: Map<string, Variable>,
    locals: Map<string, Variable>,
}

const nil = { data_type: DataType.Nil }

function lookup(name: string | undefined, environment: Environment): Variable
{
    if (name == undefined)
        return nil
     
    const local = environment.locals.get(name)
    if (local != undefined)
        return local

    const global = environment.globals.get(name)
    if (global != undefined)
        return global

    return nil
}

function run_value(value: Value, environment: Environment): Variable
{
    switch (value.kind)
    {
        case ValueKind.NilLiteral:
            return nil
        case ValueKind.BooleanLiteral:
            return { data_type: DataType.Boolean, boolean: value.boolean }
        case ValueKind.NumberLiteral:
            return { data_type: DataType.Number, number: value.number }
        case ValueKind.StringLiteral:
            return { data_type: DataType.String, string: value.string }
        case ValueKind.Function:
            return { data_type: DataType.Function, function: value.function }

        case ValueKind.TableLiteral:
        {
            if (value.table == undefined)
                return nil

            const table: Map<string|number, Variable> = new Map()
            for (const [key, expression] of value.table.entries())
                table.set(key, run_expression(expression, environment))

            return {
                data_type: DataType.Table,
                table: table,
            }
        }

        case ValueKind.Variable:
            return lookup(value.identifier, environment)
        
        default:
            throw new Error()
    }
}

function run_operation(lhs: Expression | undefined,
                       rhs: Expression | undefined,
                       result: (a: number, b: number) => number,
                       environment: Environment,): Variable
{
    const lhs_value = run_expression(<Expression> lhs, environment)
    const rhs_value = run_expression(<Expression> rhs, environment)
    if (lhs_value.data_type != DataType.Number || rhs_value.data_type != DataType.Number)
        throw new Error()

    return {
        data_type: DataType.Number,
        number: result(lhs_value.number ?? 0, rhs_value.number ?? 0)
    }
}

function run_compair(lhs: Expression | undefined,
                     rhs: Expression | undefined,
                     result: (a: number, b: number) => boolean,
                     environment: Environment,): Variable
{
    const lhs_value = run_expression(<Expression> lhs, environment)
    const rhs_value = run_expression(<Expression> rhs, environment)
    if (lhs_value.data_type != DataType.Number || rhs_value.data_type != DataType.Number)
        throw new Error()

    return {
        data_type: DataType.Boolean,
        boolean: result(lhs_value.number ?? 0, rhs_value.number ?? 0)
    }
}

function run_call(func_name: Expression | undefined,
                  args: Expression[] | undefined,
                  environment: Environment): Variable
{
    if (func_name == undefined || args == undefined)
        throw new Error()

    const func = run_expression(func_name, environment)
    const arg_values = args?.map(x => run_expression(x, environment))
    
    if (func.data_type == DataType.NativeFunction && func.native_function != undefined)
        return func.native_function(...arg_values)

    if (func.data_type == DataType.Function && func.function != undefined)
    {
        const local = {
            globals: environment.globals,
            locals: new Map(),
        }

        for (const [i, name] of func.function.parameters.entries())
            local.locals.set(name, arg_values[i])

        return run(func.function.body, local)
    }

    throw new Error()
}

function run_index(value: Expression | undefined,
                   index: Expression | undefined,
                   environment: Environment): Variable
{
    if (value == undefined || index == undefined)
        throw new Error()

    const value_var = run_expression(value, environment)
    if (value_var.data_type != DataType.Table || value_var.table == undefined)
        throw new Error()

    const index_var = run_expression(index, environment)
    if (index_var.data_type == DataType.String && index_var.string != undefined)
        return value_var.table.get(index_var.string) ?? nil

    if (index_var.data_type == DataType.Number && index_var.number != undefined)
        return value_var.table.get(index_var.number) ?? nil

    throw new Error()
}

function run_expression(expression: Expression | undefined,
                        environment: Environment): Variable
{
    if (expression == undefined)
        throw new Error()

    switch (expression.kind)
    {
        case ExpressionKind.Value:
            return run_value(<Value> expression.value, environment)
        case ExpressionKind.Call:
            return run_call(expression.expression, expression.arguments, environment)
        case ExpressionKind.Index:
            return run_index(expression.expression, expression.index, environment)

        case ExpressionKind.Addition:
            return run_operation(expression.lhs, expression.rhs, (a, b) => a + b, environment)
        case ExpressionKind.Subtract:
            return run_operation(expression.lhs, expression.rhs, (a, b) => a - b, environment)
        case ExpressionKind.Multiplication:
            return run_operation(expression.lhs, expression.rhs, (a, b) => a * b, environment)
        case ExpressionKind.Division:
            return run_operation(expression.lhs, expression.rhs, (a, b) => a / b, environment)

        case ExpressionKind.LessThen:
            return run_compair(expression.lhs, expression.rhs, (a, b) => a < b, environment)
        case ExpressionKind.GreaterThen:
            return run_compair(expression.lhs, expression.rhs, (a, b) => a > b, environment)

        default:
            throw new Error()
    }
}

function run_assignment(assignment: Assignment, environment: Environment)
{
    const rhs = assignment.rhs[0]
    const value = run_expression(rhs, environment)

    const lhs = assignment.lhs[0]
    switch (lhs.kind)
    {
        case ExpressionKind.Value:
        {
            if (lhs.value?.kind != ValueKind.Variable)
                throw new Error()
         
            const identifier = lhs.value?.identifier ?? ''
            if (assignment.local)
                environment.locals.set(identifier, value)
            else
                environment.globals.set(identifier, value)
            break
        }    

        case ExpressionKind.Index:
        {
            const table = run_expression(lhs.expression, environment)
            if (table.data_type != DataType.Table || table.table == undefined)
                throw new Error()

            const index = run_expression(lhs.index, environment)
            if (index.data_type == DataType.String && index.string != undefined)
                table.table.set(index.string, value)
            if (index.data_type == DataType.Number && index.number != undefined)
                table.table.set(index.number, value)
            break
        }

        default:
            throw new Error()
    }
}

function to_string(variable: Variable): string
{
    switch (variable.data_type)
    {
        case DataType.Nil: return "Nil"
        case DataType.Number: return variable.number?.toString() ?? "0"
        case DataType.Boolean: return variable.boolean ? "true" : "false"
        case DataType.String: return `"${ variable.string ?? '' }"`

        case DataType.Table:
        {
            const values = variable.table?.entries() ?? []
            return `{ ${ [...values].map(([i, v]) => `${ i } = ${ to_string(v) }`).join(', ') } }`
        }
        case DataType.Nil: return "Nil"
        default: return JSON.stringify(variable)
    }
}

export function new_environment(): Environment
{
    const environment = {
        globals: new Map(),
        locals: new Map(),
    }

    environment.globals.set('print', {
        data_type: DataType.NativeFunction,
        native_function: (...args: Variable[]) => {
            console.log(...args.map(to_string))
            return nil
        }
    })

    return environment
}

function is_true(variable: Variable): boolean
{
    if (variable.data_type != DataType.Boolean)
        return false
    return variable.boolean ?? false
}

function run_if(if_block: IfBlock | undefined,
                environment: Environment)
{
    if (if_block == undefined)
        throw new Error()

    const condition = run_expression(if_block.condition, environment)
    if (is_true(condition))
        run(if_block.body, environment)
    else if (if_block.else_body != undefined)
        run(if_block.else_body, environment)
}

function run_while(while_block: While | undefined,
                   environment: Environment)
{
    if (while_block == undefined)
        throw new Error()

    while (is_true(run_expression(while_block.condition, environment)))
        run(while_block.body, environment)
}

export function run(chunk: Chunk, environment: Environment): Variable
{
    for (const statement of chunk.statements)
    {
        switch (statement.kind)
        {
            case StatementKind.Assignment:
                run_assignment(<Assignment> statement.assignment, environment)
                break
            case StatementKind.Expression:
                run_expression(statement.expression, environment)
                break
            case StatementKind.If:
                run_if(statement.if, environment)
                break
            case StatementKind.While:
                run_while(statement.while, environment)
                break
            case StatementKind.Return:
                return run_expression(statement.expression, environment)
        }
    }

    return nil
}


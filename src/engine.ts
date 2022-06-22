import { Op, OpCode, op_code_name } from './opcode'
import { DataType, NativeFunction, Variable, nil, make_number, make_boolean, make_string } from './runtime'
import * as std from './lib'
import { TokenStream } from './lexer'
import { parse } from './parser'
import { compile } from './compiler'

function index(val: Variable | undefined): string | number | undefined
{
    if (val == undefined)
        return undefined
    else if (val.data_type == DataType.String)
        return val.string
    else if (val.data_type == DataType.Number)
        return val.number
    else
        return undefined
}

function is_true(val: Variable | undefined): boolean
{
    if (val == undefined)
        return false

    switch (val.data_type)
    {
        case DataType.Number: return val.number != 0
        case DataType.String: return val.string != ''
        case DataType.Boolean: return val.boolean ?? false
        case DataType.Function: return true
        case DataType.NativeFunction: return true
        default:
            return false
    }
}

function equals(a: Variable | undefined, b: Variable | undefined): boolean
{
    if (a == undefined && b == undefined)
        return true
    if (a == undefined || b == undefined)
        return false

    if (a.data_type != b.data_type)
        return false

    switch (a.data_type)
    {
        case DataType.Nil: return true
        case DataType.Boolean: return a.boolean == b.boolean
        case DataType.Number: return a.number == b.number
        case DataType.String: return a.string == b.string
        case DataType.Function: return a.function_id == b.function_id
        case DataType.NativeFunction: return a.native_function == b.native_function
        case DataType.Table:
        {
            if (a.table?.keys() != b.table?.keys())
                return false

            for (const key of a.table?.keys() ?? [])
            {
                if (!equals(a.table?.get(key), b.table?.get(key)))
                    return false
            }

            return true
        }
    }
}

export interface LuaOptions
{
    trace?: boolean
    trace_instructions?: boolean
    trace_stack?: boolean
    locals?: Map<string, Variable>,
}

export class Engine
{

    private program: Op[]
    private globals: Map<string, Variable>

    private ip: number
    private stack: Variable[]
    private locals_stack: Map<string, Variable>[]
    private call_stack: number[]
    private locals: Map<string, Variable>

    private error: Error | undefined
    private assign_stack_heigth: number

    constructor(script?: string,
                globals?: Map<string, Variable>)
    {
        this.program = []
        this.globals = globals ?? std.std_lib()
        this.error = undefined
        this.reset()

        if (script != undefined)
        {
            const result = this.load(script)
            if (result != undefined)
                this.error = result
        }
    }

    load(chunk: string): undefined | Error
    {
        const stream = new TokenStream()
        stream.feed(chunk)

        const ast = parse(stream)
        if (ast instanceof Error)
            return ast

        const program = compile(ast, this.program)
        this.program = program.code
        this.ip = program.start
    }

    dump_bytecode()
    {
        if (this.error != undefined)
        {
            console.log(this.error)
            return
        }

        for (const [i, op] of this.program.entries())
        {
            const arg = op.arg != undefined ? std.variable_to_string(op.arg) : ''
            if (i == this.ip)
                console.log('*', i, op_code_name(op.code), arg)
            else
                console.log(i, op_code_name(op.code), arg)
        }
    }

    global(name: string): Variable | undefined
    {
        return this.globals.get(name)
    }

    define(name: string, func: NativeFunction)
    {
        this.globals.set(name, {
            data_type: DataType.NativeFunction,
            native_function: func,
        })
    }

    define_table(name: string, table: Map<string|number, Variable>)
    {
        this.globals.set(name, {
            data_type: DataType.Table,
            table: table,
        })
    }

    reset()
    {
        this.assign_stack_heigth = 0
        this.ip = 0
        this.stack = []
        this.locals_stack = []
        this.call_stack = []
        this.locals = new Map()
    }

    run(options?: LuaOptions): Variable | Error
    {
        if (this.error != undefined)
            return this.error

        if (options?.locals != undefined)
            this.locals = options.locals

        let step_count = 0
        while (this.ip < this.program.length)
        {
            const result = this.step(options)
            if (result != undefined)
                return result

            step_count += 1
            if (step_count > 1000)
                return new Error('Program ran for too long')
        }

        return this.stack[0] ?? nil
    }

    private operation(op: (x: number, y: number) => number)
    {
        const x = this.stack.pop()?.number ?? 0
        const y = this.stack.pop()?.number ?? 0
        this.stack.push(make_number(op(x, y)))
    }

    private compair(op: (x: number, y: number) => boolean)
    {
        const x = this.stack.pop()?.number ?? 0
        const y = this.stack.pop()?.number ?? 0
        this.stack.push(make_boolean(op(x, y)))
    }

    private capture_locals(): Map<string, Variable>
    {
        const captured = new Map()
        for (const locals of this.locals_stack.reverse())
        {
            for (const [name, value] of locals.entries())
                captured.set(name, value)
        }

        for (const [name, value] of this.locals.entries())
            captured.set(name, value)
        return captured
    }

    private runtime_error(op: Op, message: string): Error
    {
        return new Error(`${ op.debug.line }:${ op.debug.column }: ${ message }`)
    }

    private run_instruction(op: Op): undefined | Error
    {
        const { code, arg } = op
        switch(code)
        {
            case OpCode.Pop:
                this.stack.pop()
                break

            case OpCode.Dup:
            { 
                const x = this.stack.pop() ?? nil
                this.stack.push(x, x)
                break
            }

            case OpCode.Swap:
            { 
                const x = this.stack.pop() ?? nil
                const y = this.stack.pop() ?? nil
                this.stack.push(x, y)
                break
            }

            case OpCode.LoadIndex:
            {
                const table = this.stack.pop()
                if (table?.data_type == DataType.Nil)
                {
                    this.stack.pop() // Pop index
                    this.stack.push(nil)
                    break
                }

                if (table == undefined || table.table == undefined)
                    return this.runtime_error(op, 'Can only index on tables')

                const i_var = this.stack.pop()
                if (i_var?.data_type == DataType.Nil)
                {
                    this.stack.push(nil)
                    break
                }

                const i = index(i_var)
                if (i == undefined)
                    return this.runtime_error(op, 'Invalid index, must be a number or string')

                this.stack.push(table.table.get(i) ?? nil)
                break
            }

            case OpCode.Add: this.operation((x, y) => x + y); break
            case OpCode.Subtract: this.operation((x, y) => x - y); break
            case OpCode.Multiply: this.operation((x, y) => x * y); break
            case OpCode.Divide: this.operation((x, y) => x / y); break
            case OpCode.FloorDivide: this.operation((x, y) => Math.floor(x / y)); break
            case OpCode.Modulo: this.operation((x, y) => x % y); break
            case OpCode.Exponent: this.operation((x, y) => Math.pow(x, y)); break
            case OpCode.LessThen: this.compair((x, y) => x < y); break
            case OpCode.LessThenEquals: this.compair((x, y) => x <= y); break
            case OpCode.GreaterThen: this.compair((x, y) => x > y); break
            case OpCode.GreaterThenEquals: this.compair((x, y) => x >= y); break

            case OpCode.BitAnd: this.operation((x, y) => x & y); break
            case OpCode.BitOr: this.operation((x, y) => x | y); break
            case OpCode.BitXOr: this.operation((x, y) => x ^ y); break
            case OpCode.BitShiftLeft: this.operation((x, y) => x << y); break
            case OpCode.BitShiftRight: this.operation((x, y) => x >> y); break

            case OpCode.Concat:
            {
                const x = std.variable_to_string(this.stack.pop() ?? nil)
                const y = std.variable_to_string(this.stack.pop() ?? nil)
                this.stack.push(make_string(x + y))
                break
            }

            case OpCode.Equals:
            {
                const [x, y] = [this.stack.pop(), this.stack.pop()]
                this.stack.push(make_boolean(equals(x, y)))
                break
            }

            case OpCode.NotEquals:
            {
                const [x, y] = [this.stack.pop(), this.stack.pop()]
                this.stack.push(make_boolean(!equals(x, y)))
                break
            }

            case OpCode.And:
            {
                const [x, y] = [this.stack.pop(), this.stack.pop()]
                this.stack.push(make_boolean(is_true(x) && is_true(y)))
                break
            } 

            case OpCode.Or:
            {
                const [x, y] = [this.stack.pop(), this.stack.pop()]
                this.stack.push(make_boolean(is_true(x) || is_true(y)))
                break
            }

            case OpCode.Not: this.stack.push(make_boolean(!is_true(this.stack.pop()))); break
            case OpCode.BitNot: this.stack.push(make_number(~(this.stack.pop()?.number ?? 0))); break
            case OpCode.Negate: this.stack.push(make_number(-(this.stack.pop()?.number ?? 0))); break
            case OpCode.IsNil: this.stack.push(make_boolean((this.stack.pop() ?? nil) == nil)); break
            case OpCode.Jump: this.ip += arg?.number ?? 0; break
            case OpCode.JumpIfNot: if (!is_true(this.stack.pop())) { this.ip += arg?.number ?? 0 } break
            case OpCode.MakeLocal: this.locals.set(arg?.string ?? '', nil); break
            case OpCode.NewTable: this.stack.push({ data_type: DataType.Table, table: new Map() }); break

            case OpCode.StartBlock:
                this.locals_stack.push(this.locals)
                this.locals = new Map()
                break

            case OpCode.EndBlock:
                this.locals = this.locals_stack.pop() ?? new Map()
                break

            case OpCode.Length:
            {
                const value = this.stack.pop() ?? nil
                switch (value.data_type)
                {
                    case DataType.Table: this.stack.push(make_number(value.table?.size ?? 0)); break
                    case DataType.String: this.stack.push(make_number(value.string?.length ?? 0)); break
                    default: this.stack.push(nil)
                }
                break
            }

            case OpCode.Return:
            {
                if (this.call_stack.length == 0)
                {
                    this.ip = this.program.length
                    break
                }

                this.ip = this.call_stack.pop() ?? this.program.length
                this.locals = this.locals_stack.pop() ?? new Map()
                break
            }

            case OpCode.StoreIndex:
            {
                const count = arg?.number ?? 1
                const table = this.stack[this.stack.length - count*2 - 1] ?? nil
                if (table.table == undefined)
                    return this.runtime_error(op, 'Can only index tables')

                for (let i = 0; i < count; i++)
                {
                    const key = index(this.stack.pop())
                    const value = this.stack.pop() ?? nil
                    if (key == undefined)
                        return this.runtime_error(op, 'Invalid key, must be a number or string')

                    table.table.set(key, value)
                }
                break
            }

            case OpCode.Store:
            {
                const name = arg?.string ?? ''
                const value = this.stack.pop() ?? nil
                if (this.locals.has(name))
                {
                    this.locals.set(name, value)
                    break
                }


                let did_find = false
                for (const locals of this.locals_stack)
                {
                    if (locals.has(name))
                    {
                        did_find = true
                        locals.set(name, value)
                        break
                    }
                }

                if (did_find)
                    break

                this.globals.set(name, value)
                break
            }

            case OpCode.Push:
            {
                if (this.locals_stack.length > 0 && arg?.data_type == DataType.Function)
                    arg.locals = this.capture_locals()
                this.stack.push(arg ?? nil)
                break
            }

            case OpCode.Load:
            {
                const name = arg?.string ?? ''
                const local = this.locals.get(name)
                if (local != undefined)
                {
                    this.stack.push(local)
                    break
                }

                let did_find = false
                for (const locals of this.locals_stack)
                {
                    const local = locals.get(name)
                    if (local != undefined)
                    {
                        did_find = true
                        this.stack.push(local)
                        break
                    }
                }

                if (did_find)
                    break

                const global = this.globals.get(name)
                if (global != undefined)
                {
                    this.stack.push(global)
                    break
                }

                this.stack.push(nil)
                break
            }

            case OpCode.Call:
            {
                const count = this.stack.pop()?.number ?? 0
                const func_var = this.stack.pop() ?? nil

                if (func_var.native_function != undefined)
                {
                    const args = this.stack.splice(this.stack.length - count, count)
                    this.stack.push(...func_var.native_function(...args))
                    break
                }

                this.stack.push(make_number(count))
                this.call_stack.push(this.ip)
                this.locals_stack.push(this.locals)
                this.locals = func_var.locals ?? new Map()
                this.ip = func_var.function_id ?? this.ip
                break
            }

            case OpCode.ArgumentCount:
            {
                const got = this.stack.pop()?.number ?? 0
                const expected = arg?.number ?? 0
                if (got == expected)
                    break

                return this.runtime_error(op,
                    `Execpect ${ expected } ` +
                    `argument(s), got ${ got }`)
            }

            case OpCode.AssignPush: this.assign_stack_heigth = this.stack.length; break
            case OpCode.AssignSet:
            {
                const value_count = this.stack.length - this.assign_stack_heigth
                const expected = arg?.number ?? 0
                if (value_count == expected)
                    break

                return this.runtime_error(op,
                    `Execpect to assign ${ expected } ` +
                    `value(s), got ${ value_count } instead`)
            }
        }
    }

    step(options?: LuaOptions): undefined | Error
    {
        if (this.error != undefined)
            return this.error

        if (this.ip >= this.program.length)
            return

        const op = this.program[this.ip++] 
        if (options?.trace || options?.trace_instructions)
        {
            const arg = op.arg != undefined ? std.variable_to_string(op.arg) : ''
            console.log(this.ip - 1, op_code_name(op.code), arg)
        }

        const result = this.run_instruction(op)
        if (result != undefined)
            return result

        if (options?.trace || options?.trace_stack)
            console.log(this.ip - 1, ...this.stack.map(std.variable_to_string))
    }

}


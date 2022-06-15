import { Op, OpCode, op_code_name } from './opcode'
import { DataType, NativeFunction, Variable, nil, make_number, make_boolean } from './runtime'
import * as std from './lib'
import { Lexer } from './lexer'
import { parse } from './parser'
import { compile } from './compiler'

function index(val: Variable | undefined): string | number
{
    if (val == undefined)
        return 0
    else if (val.data_type == DataType.String)
        return val.string!
    else if (val.data_type == DataType.Number)
        return val.number!
    else
        return 0
}

function is_true(val: Variable | undefined): boolean
{
    if (val == undefined)
        return false

    switch (val.data_type)
    {
        case DataType.Number: return val.number! != 0
        case DataType.String: return val.string! != ''
        case DataType.Boolean: return val.boolean!
        case DataType.Function: return true
        case DataType.NativeFunction: return true
        default:
            return false
    }
}

export class Lua
{

    private program: Op[]
    private globals: Map<string, Variable>
    private debug: boolean

    private ip: number
    private stack: Variable[]
    private locals_stack: Map<string, Variable>[]
    private call_stack: number[]
    private locals: Map<string, Variable>

    private assign_stack_heigth: number

    constructor(script: string,
                globals?: Map<string, Variable>,
                debug?: boolean)
    {
        const lexer = new Lexer()
        const ast = parse(lexer.feed(script))
        console.log(JSON.stringify(ast, undefined, 4))

        this.program = compile(ast)
        for (const { code, arg } of this.program)
            console.log(op_code_name(code), arg)

        this.globals = globals ?? std.std_lib()
        this.debug = debug ?? false
        this.reset()
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
        this.ip = 0
        this.stack = []
        this.locals_stack = []
        this.call_stack = []
        this.locals = new Map()

        this.assign_stack_heigth = 0
    }

    run()
    {
        let step_count = 0
        while (this.step())
        {
            step_count += 1
            if (step_count > 1000)
                throw new Error()
        }
    }

    step(): boolean
    {
        if (this.ip >= this.program.length)
            return false

        const { code, arg } = this.program[this.ip++]
        if (this.debug)
            console.log(this.ip - 1, op_code_name(code), arg)

        switch(code)
        {
            case OpCode.Pop: this.stack.pop(); break
            case OpCode.Dup: { const x = this.stack.pop()!; this.stack.push(x, x); break }
            case OpCode.Swap: { const [x, y] = [this.stack.pop()!, this.stack.pop()!]; this.stack.push(x, y); break }
            case OpCode.LoadIndex: this.stack.push(this.stack.pop()!.table?.get(index(this.stack.pop()!)) ?? nil); break
            case OpCode.Add: this.stack.push(make_number((this.stack.pop()!.number ?? 0) + (this.stack.pop()!.number ?? 0))); break
            case OpCode.Subtract: this.stack.push(make_number((this.stack.pop()!.number ?? 0) - (this.stack.pop()!.number ?? 0))); break
            case OpCode.Multiply: this.stack.push(make_number((this.stack.pop()!.number ?? 0) * (this.stack.pop()!.number ?? 0))); break
            case OpCode.Divide: this.stack.push(make_number((this.stack.pop()!.number ?? 0) / (this.stack.pop()!.number ?? 0))); break
            case OpCode.LessThen: this.stack.push(make_boolean((this.stack.pop()!.number ?? 0) < (this.stack.pop()!.number ?? 0))); break
            case OpCode.GreaterThen: this.stack.push(make_boolean((this.stack.pop()!.number ?? 0) > (this.stack.pop()!.number ?? 0))); break
            case OpCode.And: this.stack.push(make_boolean(is_true(this.stack.pop()) && is_true(this.stack.pop()))); break
            case OpCode.Or: this.stack.push(make_boolean(is_true(this.stack.pop()) || is_true(this.stack.pop()))); break
            case OpCode.Not: this.stack.push(make_boolean(!is_true(this.stack.pop()))); break
            case OpCode.IsNil: this.stack.push(make_boolean(this.stack.pop()!.data_type == DataType.Nil)); break
            case OpCode.Jump: this.ip += arg!.number!; break
            case OpCode.JumpIfNot: if (!is_true(this.stack.pop())) { this.ip += arg!.number! } break
            case OpCode.MakeLocal: this.locals.set(arg!.string!, nil); break

            case OpCode.Return:
            {
                if (this.call_stack.length == 0)
                    return false
                this.ip = this.call_stack.pop()!
                this.locals = this.locals_stack.pop()!
                break
            }

            case OpCode.StoreIndex:
            {
                const count = arg?.number ?? 1
                const table = this.stack[this.stack.length - count*2 - 1]!.table!
                for (let i = 0; i < count; i++)
                    table.set(index(this.stack.pop()!), this.stack.pop()!)
                break
            }

            case OpCode.Store:
            {
                const name = arg!.string!
                if (this.locals.has(name))
                    this.locals.set(name, this.stack.pop()!)
                else
                    this.globals.set(name, this.stack.pop()!)
                break
            }

            case OpCode.Push:
            {
                if (this.locals_stack.length > 0 && arg!.data_type! == DataType.Function)
                    arg!.locals! = this.locals
                this.stack.push(arg!)
                break
            }

            case OpCode.Load:
            {
                const name = arg!.string!
                const local = this.locals.get(name)
                if (local != undefined)
                {
                    this.stack.push(local)
                    break
                }

                const global = this.globals.get(name)
                if (global != undefined)
                {
                    this.stack.push(global)
                    break
                }

                throw new Error(`Lua value '${ name }' not defined`)
            }

            case OpCode.Call:
            {
                const count = this.stack.pop()!.number!
                const func_var = this.stack.pop()!

                if (func_var.data_type == DataType.NativeFunction)
                {
                    const args = this.stack.splice(this.stack.length - count, count)
                    this.stack.push(...func_var.native_function!(...args))
                    break
                }

                this.stack.push(make_number(count))
                this.call_stack.push(this.ip)
                this.locals_stack.push(this.locals)
                this.locals = func_var.locals ?? new Map()
                this.ip = func_var.function_id!
                break
            }

            case OpCode.ArgumentCount:
            {
                const got = this.stack.pop()!.number!
                const expected = arg!.number!
                if (got == expected)
                    break
                throw new Error(
                    `Execpect ${ expected } ` +
                    `argument(s), got ${ got }`)
            }

            case OpCode.AssignPush: this.assign_stack_heigth = this.stack.length; break
            case OpCode.AssignSet:
            {
                const value_count = this.stack.length - this.assign_stack_heigth
                const expected = arg!.number!
                if (value_count == expected)
                    break
                throw new Error(
                    `Execpect to assign ${ expected } ` +
                    `value(s), got ${ value_count } instead`)
            }
        }

        if (this.debug)
            console.log('this.stack:', ...this.stack.map(std.variable_to_string))
        return true
    }

}


import { CompiledFunction, OpCode, op_code_name } from './opcode'
import {DataType, nil, Variable} from './runtime'
import * as std from './lib'

function index(val: Variable): string | number
{
    return val.string ?? val.number ?? 0
}

export function call(func: CompiledFunction,
                     globals?: Map<string, Variable>,
                     args?: Variable[],
                     debug?: boolean): Variable[]
{
    if (func.parameters.length != (args?.length ?? 0))
    {
        console.log(`Error: Expected ${ func.parameters.length } ` + 
                    `argument(s), got ${ args?.length ?? 0 } instead.`)
        return [nil]
    }

    const bytecode = func.ops
    globals = globals ?? new Map()
    args = args ?? []
    debug = debug ?? false

    let ip = 0
    let stack: Variable[] = []
    for (const [i, param] of func.parameters.entries())
        func.locals.set(param, args[i])

    let assign_stack_heigth = 0

    while (ip < bytecode.length)
    {
        const { code, arg } = bytecode[ip++]
        if (debug)
            console.log(ip - 1, op_code_name(code), arg)

        switch(code)
        {
            case OpCode.Pop: stack.pop(); break
            case OpCode.Dup: { const x = stack.pop()!; stack.push(x, x); break }
            case OpCode.Swap: { const [x, y] = [stack.pop()!, stack.pop()!]; stack.push(x, y); break }
            case OpCode.LoadIndex: stack.push(stack.pop()!.table?.get(index(stack.pop()!)) ?? nil); break
            case OpCode.Add: stack.push({ data_type: DataType.Number, number: (stack.pop()!.number ?? 0) + (stack.pop()!.number ?? 0) }); break
            case OpCode.Subtract: stack.push({ data_type: DataType.Number, number: (stack.pop()!.number ?? 0) - (stack.pop()!.number ?? 0) }); break
            case OpCode.Multiply: stack.push({ data_type: DataType.Number, number: (stack.pop()!.number ?? 0) * (stack.pop()!.number ?? 0) }); break
            case OpCode.Divide: stack.push({ data_type: DataType.Number, number: (stack.pop()!.number ?? 0) / (stack.pop()!.number ?? 0) }); break
            case OpCode.LessThen: stack.push({ data_type: DataType.Boolean, boolean: (stack.pop()!.number ?? 0) < (stack.pop()!.number ?? 0) }); break
            case OpCode.GreaterThen: stack.push({ data_type: DataType.Boolean, boolean: (stack.pop()!.number ?? 0) > (stack.pop()!.number ?? 0) }); break
            case OpCode.IsNil: stack.push({ data_type: DataType.Boolean, boolean: stack.pop()!.data_type == DataType.Nil}); break
            case OpCode.Jump: ip += arg?.number!; break
            case OpCode.JumpIfNot: ip += stack.pop()?.boolean! ? arg?.number! : 0; break
            case OpCode.MakeLocal: func.locals.set(arg?.string!, nil); break

            case OpCode.Return:
            {
                if (stack.length != arg?.number!)
                {
                    console.log(`Error: Expected to end with ${ arg?.number! } ` +
                                `value(s) on the stack, got ${ stack.length } instead`)
                    return [nil]
                }
                return stack
            }

            case OpCode.StoreIndex:
            {
                const count = arg?.number ?? 1
                const table = stack[stack.length - count*2 - 1]?.table!
                for (let i = 0; i < count; i++)
                    table.set(index(stack.pop()!), stack.pop()!)
                break
            }

            case OpCode.Store:
            {
                const name = arg?.string!
                if (func.locals.has(name))
                    func.locals.set(name, stack.pop()!)
                else
                    globals.set(name, stack.pop()!)
                break
            }

            case OpCode.Push:
            {
                if (arg?.data_type! == DataType.Function)
                    arg!.function!.locals = func.locals
                stack.push(arg!)
                break
            }

            case OpCode.Load:
            {
                const name = arg?.string!
                const local = func.locals.get(name)
                if (local != undefined)
                {
                    stack.push(local)
                    break
                }

                const global = globals.get(name)
                if (global != undefined)
                {
                    stack.push(global)
                    break
                }

                console.log(`Error: lua value '${ name }' not defined`)
                stack.push(nil)
                break
            }

            case OpCode.Call:
            {
                const count = stack.pop()?.number!
                const func_var = stack.pop()!
                const args = stack.splice(stack.length - count, count)

                if (func_var.data_type == DataType.NativeFunction)
                    stack.push(...func_var.native_function!(...args))
                else
                    stack.push(...call(func_var.function!, globals, args, debug))
                break
            }

            case OpCode.AssignPush: assign_stack_heigth = stack.length; break
            case OpCode.AssignSet:
            {
                const value_count = stack.length - assign_stack_heigth
                const expected = arg?.number!
                if (value_count == expected)
                    break
                console.log(`Error: Execpect to assign ${ expected } value(s), got ${ value_count } instead`)
                return [nil]
            }
        }

        if (debug)
            console.log('stack:', ...stack.map(std.to_string))
    }

    if (stack.length != 0)
    {
        console.log(`Error: Expected to end with ${ 0 } ` +
                    `values on the stack, got ${ stack.length } instead`)
    }
    return [nil]
}


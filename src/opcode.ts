import {Variable} from "./runtime"

export enum OpCode {
    Load,
    Store,
    Push,
    Dup,

    LoadIndex,
    StoreIndex,

    Add,
    Subtract,
    Multiply,
    Divide,

    LessThen,
    GreaterThen,

    MakeLocal,
    Call,
    Return,
    Jump,
    JumpIfNot,
}

export function op_code_name(op_code: OpCode): string
{
    switch (op_code)
    {
        case OpCode.Load: return 'Load'
        case OpCode.Store: return 'StoreGlobal'
        case OpCode.Push: return 'Push'
        case OpCode.Dup: return 'Dup'
        case OpCode.LoadIndex: return 'LoadIndex'
        case OpCode.StoreIndex: return 'StoreIndex'
        case OpCode.Add: return 'Add'
        case OpCode.Subtract: return 'Subtract'
        case OpCode.Multiply: return 'Multiply'
        case OpCode.Divide: return 'Divide'
        case OpCode.LessThen: return 'LessThen'
        case OpCode.GreaterThen: return 'GreaterThen'
        case OpCode.MakeLocal: return 'MakeLocal'
        case OpCode.Call: return 'Call'
        case OpCode.Return: return 'Return'
        case OpCode.Jump: return 'Jump'
        case OpCode.JumpIfNot: return 'JumpIfNot'
    }
}

export interface Op {
    code: OpCode,
    arg?: Variable,
}

export interface CompiledFunction {
    parameters: string[],
    locals: Map<string, Variable>,
    ops: Op[]
}


import {Variable} from "./runtime"

export enum OpCode {
    Load,
    Store,
    Push,
    Pop,
    Dup,
    Swap,

    LoadIndex,
    StoreIndex,

    Add,
    Subtract,
    Multiply,
    Divide,

    LessThen,
    GreaterThen,
    IsNil,

    MakeLocal,
    Call,
    Return,
    Jump,
    JumpIfNot,

    // NOTE: Debug opcode, not needed for operation.
    AssignPush,
    AssignSet,
}

export function op_code_name(op_code: OpCode): string
{
    switch (op_code)
    {
        case OpCode.Load: return 'Load'
        case OpCode.Store: return 'StoreGlobal'
        case OpCode.Push: return 'Push'
        case OpCode.Pop: return 'Pop'
        case OpCode.Dup: return 'Dup'
        case OpCode.Swap: return 'Swap'
        case OpCode.LoadIndex: return 'LoadIndex'
        case OpCode.StoreIndex: return 'StoreIndex'
        case OpCode.Add: return 'Add'
        case OpCode.Subtract: return 'Subtract'
        case OpCode.Multiply: return 'Multiply'
        case OpCode.Divide: return 'Divide'
        case OpCode.LessThen: return 'LessThen'
        case OpCode.GreaterThen: return 'GreaterThen'
        case OpCode.IsNil: return "IsNil"
        case OpCode.MakeLocal: return 'MakeLocal'
        case OpCode.Call: return 'Call'
        case OpCode.Return: return 'Return'
        case OpCode.Jump: return 'Jump'
        case OpCode.JumpIfNot: return 'JumpIfNot'

        case OpCode.AssignPush: return 'AssignPush'
        case OpCode.AssignSet: return 'AssignSet'
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


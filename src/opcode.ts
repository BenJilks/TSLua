import { Variable } from './runtime'
import { Debug } from './lexer'

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
    And,
    Or,
    Not,
    IsNil,

    MakeLocal,
    Call,
    Return,
    Jump,
    JumpIfNot,

    // NOTE: Debug opcode, not needed for operation.
    AssignPush,
    AssignSet,
    ArgumentCount,
}

export function op_code_name(op_code: OpCode): string
{
    switch (op_code)
    {
        case OpCode.Load: return 'Load'
        case OpCode.Store: return 'Store'
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
        case OpCode.And: return 'And'
        case OpCode.Or: return 'Or'
        case OpCode.Not: return 'Not'
        case OpCode.IsNil: return 'IsNil'
        case OpCode.MakeLocal: return 'MakeLocal'
        case OpCode.Call: return 'Call'
        case OpCode.Return: return 'Return'
        case OpCode.Jump: return 'Jump'
        case OpCode.JumpIfNot: return 'JumpIfNot'

        case OpCode.AssignPush: return 'AssignPush[Debug]'
        case OpCode.AssignSet: return 'AssignSet[Debug]'
        case OpCode.ArgumentCount: return 'ArgumentCount[Debug]'
        default:
            throw new Error()
    }
}

export interface Op {
    code: OpCode,
    arg?: Variable,
    debug: Debug,
}


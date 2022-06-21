import { Variable } from './runtime'
import { Debug } from './lexer'

export enum OpCode {
    Load,
    Store,
    Push,
    Pop,
    Dup,
    Swap,

    NewTable,
    LoadIndex,
    StoreIndex,

    Add,
    Subtract,
    Multiply,
    Divide,
    FloorDivide,
    Modulo,
    Exponent,
    Concat,

    Equals,
    NotEquals,
    LessThen,
    LessThenEquals,
    GreaterThen,
    GreaterThenEquals,
    And,
    Or,

    Not,
    Negate,
    Length,
    IsNil,

    StartBlock,
    EndBlock,
    MakeLocal,
    Call,
    Return,
    Jump,
    JumpIfNot,

    // NOTE: Debug opcode, not needed for operation.
    AssignPush,
    AssignSet,
    ArgumentCount,
    Break,
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
        case OpCode.NewTable: return 'NewTable'
        case OpCode.LoadIndex: return 'LoadIndex'
        case OpCode.StoreIndex: return 'StoreIndex'
        case OpCode.Add: return 'Add'
        case OpCode.Subtract: return 'Subtract'
        case OpCode.Multiply: return 'Multiply'
        case OpCode.Divide: return 'Divide'
        case OpCode.FloorDivide: return 'FloorDivide'
        case OpCode.Modulo: return 'Modulo'
        case OpCode.Exponent: return 'Exponent'
        case OpCode.Concat: return 'Concat'
        case OpCode.Equals: return 'Equals'
        case OpCode.NotEquals: return 'NotEquals'
        case OpCode.LessThen: return 'LessThen'
        case OpCode.LessThenEquals: return 'LessThenEquals'
        case OpCode.GreaterThen: return 'GreaterThen'
        case OpCode.GreaterThenEquals: return 'GreaterThenEquals'
        case OpCode.And: return 'And'
        case OpCode.Or: return 'Or'
        case OpCode.Not: return 'Not'
        case OpCode.Negate: return 'Negate'
        case OpCode.Length: return 'Length'
        case OpCode.IsNil: return 'IsNil'
        case OpCode.StartBlock: return 'StartBlock'
        case OpCode.EndBlock: return 'EndBlock'
        case OpCode.MakeLocal: return 'MakeLocal'
        case OpCode.Call: return 'Call'
        case OpCode.Return: return 'Return'
        case OpCode.Jump: return 'Jump'
        case OpCode.JumpIfNot: return 'JumpIfNot'

        case OpCode.AssignPush: return 'AssignPush[Debug]'
        case OpCode.AssignSet: return 'AssignSet[Debug]'
        case OpCode.ArgumentCount: return 'ArgumentCount[Debug]'
        case OpCode.Break: return 'Break[Debug]'
        default:
            throw new Error()
    }
}

export interface Op {
    code: OpCode,
    arg?: Variable,
    debug: Debug,
}


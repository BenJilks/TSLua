import { Variable } from './runtime'
import { Debug } from './lexer'

export enum OpCode {
    Load,
    Store,
    Push,
    Pop,
    Dup,
    Swap,

    IterUpdateState,
    IterNext,
    IterJumpIfDone,

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

    BitAnd,
    BitOr,
    BitXOr,
    BitNot,
    BitShiftLeft,
    BitShiftRight,

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
    IsNotNil,

    StartBlock,
    EndBlock,
    MakeLocal,
    Call,
    Return,
    Jump,
    JumpIfNot,

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
        case OpCode.IterUpdateState: return 'IterUpdateState'
        case OpCode.IterNext: return 'IterNext'
        case OpCode.IterJumpIfDone: return 'IterJumpIfDone'
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
        case OpCode.BitAnd: return 'BitAnd'
        case OpCode.BitOr: return 'BitOr'
        case OpCode.BitXOr: return 'BitXOr'
        case OpCode.BitNot: return 'BitNot'
        case OpCode.BitShiftLeft: return 'BitShiftLeft'
        case OpCode.BitShiftRight: return 'BitShiftRight'
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
        case OpCode.IsNotNil: return 'IsNotNil'
        case OpCode.StartBlock: return 'StartBlock'
        case OpCode.EndBlock: return 'EndBlock'
        case OpCode.MakeLocal: return 'MakeLocal'
        case OpCode.Call: return 'Call'
        case OpCode.Return: return 'Return'
        case OpCode.Jump: return 'Jump'
        case OpCode.JumpIfNot: return 'JumpIfNot'
        case OpCode.AssignPush: return 'AssignPush'
        case OpCode.AssignSet: return 'AssignSet'
        case OpCode.ArgumentCount: return 'ArgumentCount'
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

export interface Program {
    code: Op[],
    start: number,
}


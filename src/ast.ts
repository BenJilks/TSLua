import { Token } from './lexer'

export enum ValueKind {
    NilLiteral,
    NumberLiteral,
    BooleanLiteral,
    StringLiteral,
    TableLiteral,
    Function,
    Variable,
}

export interface LuaFunction {
    parameters: Token[],
    body: Chunk,
}

export interface Value {
    kind: ValueKind,
    token: Token,

    number?: number,
    boolean?: boolean,
    string?: string,
    table?: Map<Expression, Expression>,
    function?: LuaFunction,
    identifier?: string,
}

export enum ExpressionKind {
    Value,
    Call,
    Index,

    Addition,
    Subtract,
    Multiplication,
    Division,
    FloorDivision,
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
}

export interface Expression {
    kind: ExpressionKind,
    token: Token,

    lhs?: Expression,
    rhs?: Expression,
    value?: Value,
    expression?: Expression,
    index?: Expression,
    arguments?: Expression[],
}

export interface Assignment {
    local: boolean,
    lhs: Expression[],
    rhs: Expression[],
    token: Token,
}

export interface Local {
    names: Token[],
    token: Token,
}

export interface IfElseBlock {
    body: Chunk,
    condition: Expression,
    token: Token,
}

export interface IfBlock {
    condition: Expression,
    body: Chunk,
    else_if_bodies: IfElseBlock[],
    else_body?: Chunk,
    token: Token,
}

export interface While {
    condition: Expression,
    body: Chunk,
    token: Token,
}

export interface For {
    items: Token[],
    itorator: Expression,
    body: Chunk,
    token: Token,
}

export interface NumericFor {
    index: Token,
    start: Expression,
    end: Expression,
    step: Expression | undefined,
    body: Chunk,
}

export interface Return {
    values: Expression[],
    token: Token,
}

export enum StatementKind {
    Invalid,
    Empty,
    Expression,
    Assignment,
    Local,
    If,
    While,
    For,
    NumericFor,
    Return,
    Break,
}

export interface Statement {
    kind: StatementKind,
    expression?: Expression,
    assignment?: Assignment,
    local?: Local,
    if?: IfBlock,
    while?: While,
    for?: For,
    numeric_for?: NumericFor,
    return?: Return,
}

export interface Chunk {
    statements: Statement[],
}


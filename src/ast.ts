
export enum ValueKind {
    NilLiteral,
    NumberLiteral,
    BooleanLiteral,
    StringLiteral,
    TableLiteral,
    Function,
    Variable,
}

export interface Function {
    parameters: string[],
    body: Chunk,
}

export interface Value {
    kind: ValueKind,
    number?: number,
    boolean?: boolean,
    string?: string,
    table?: Map<string|number, Expression>,
    function?: Function,
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
    
    LessThen,
    GreaterThen,
}

export interface Expression {
    kind: ExpressionKind,
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
}

export interface IfBlock {
    condition: Expression,
    body: Chunk,
    else_body?: Chunk,
}

export interface While {
    condition: Expression,
    body: Chunk,
}

export interface For {
    item: string,
    itorator: Expression,
    body: Chunk,
}

export interface Return {
    value: Expression,
}

export enum StatementKind {
    Invalid,
    Expression,
    Assignment,
    If,
    While,
    For,
    Return,
}

export interface Statement {
    kind: StatementKind,
    expression?: Expression,
    assignment?: Assignment,
    if?: IfBlock,
    while?: While,
    for?: For,
    return?: Return,
}

export interface Chunk {
    statements: Statement[],
}


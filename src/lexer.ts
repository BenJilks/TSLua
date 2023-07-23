/*
 * Copyright (c) 2022, Ben Jilks <benjyjilks@gmail.com>
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

export enum State {
    Initial,
    Identifier,
    StringLiteral,
    StringLiteralEscape,
    MultiLineString,
    NumberLiteral,
    NumberLiteralDot,
    NumberLiteralExpSign,
    NumberLiteralExp,
    NumberHex,
    Comment,
}

export enum TokenKind {
    EOF,
    NotFinished,

    Identifier,
    StringLiteral,
    BooleanLiteral,
    NumberLiteral,
    NilLiteral,

    OpenBrace,
    CloseBrace,
    OpenSquare,
    CloseSquare,
    SquiglyOpen,
    SquiglyClose,

    Addition,
    Subtract,
    Multiply,
    Division,
    FloorDivision,
    Modulo,
    Exponent,
    Concat,
    Hash,

    BitAnd,
    BitOr,
    BitXOrNot,
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

    Assign,
    Semicolon,
    Comma,
    Dot,

    Function,
    If,
    While,
    For,
    Repeat,
    In,
    Do,
    Then,
    ElseIf,
    Else,
    Until,
    End,
    Return,
    Break,
    Local,
}

export function token_kind_to_string(kind: TokenKind)
{
    switch(kind)
    {
        case TokenKind.EOF: return 'EOF'
        case TokenKind.NotFinished: return 'NotFinished'
        case TokenKind.Identifier: return 'Identifier'
        case TokenKind.StringLiteral: return 'StringLiteral'
        case TokenKind.BooleanLiteral: return 'BooleanLiteral'
        case TokenKind.NumberLiteral: return 'NumberLiteral'
        case TokenKind.NilLiteral: return 'nil'
        case TokenKind.OpenBrace: return '('
        case TokenKind.CloseBrace: return ')'
        case TokenKind.OpenSquare: return '['
        case TokenKind.CloseSquare: return ']'
        case TokenKind.SquiglyOpen: return '{'
        case TokenKind.SquiglyClose: return '}'
        case TokenKind.Addition: return '+'
        case TokenKind.Subtract: return '-'
        case TokenKind.Multiply: return '*'
        case TokenKind.Division: return '/'
        case TokenKind.FloorDivision: return '//'
        case TokenKind.Modulo: return '%'
        case TokenKind.Exponent: return '^'
        case TokenKind.BitAnd: return '&'
        case TokenKind.BitOr: return '|'
        case TokenKind.BitXOrNot: return '~'
        case TokenKind.BitShiftLeft: return '<<'
        case TokenKind.BitShiftRight: return '>>'
        case TokenKind.LessThen: return '<'
        case TokenKind.GreaterThen: return '>'
        case TokenKind.And: return 'and'
        case TokenKind.Or: return 'or'
        case TokenKind.Not: return 'not'
        case TokenKind.Assign: return '='
        case TokenKind.Semicolon: return ';'
        case TokenKind.Comma: return ','
        case TokenKind.Dot: return '.'
        case TokenKind.Function: return 'function'
        case TokenKind.If: return 'if'
        case TokenKind.While: return 'while'
        case TokenKind.For: return 'for'
        case TokenKind.Repeat: return 'repeat'
        case TokenKind.In: return 'in'
        case TokenKind.Do: return 'do'
        case TokenKind.Then: return 'then'
        case TokenKind.ElseIf: return 'elseif'
        case TokenKind.Else: return 'else'
        case TokenKind.Until: return 'until'
        case TokenKind.End: return 'end'
        case TokenKind.Return: return 'return'
        case TokenKind.Break: return 'break'
        case TokenKind.Local: return 'local'
    }
}

export interface Debug {
    line: number
    column: number
}

export interface Token {
    data: string
    kind: TokenKind
    debug: Debug
}

const single_token_map: Map<string, TokenKind> = new Map([
    ['(', TokenKind.OpenBrace],
    [')', TokenKind.CloseBrace],
    ['[', TokenKind.OpenSquare],
    [']', TokenKind.CloseSquare],
    ['{', TokenKind.SquiglyOpen],
    ['}', TokenKind.SquiglyClose],

    ['+', TokenKind.Addition],
    ['-', TokenKind.Subtract],
    ['*', TokenKind.Multiply],
    ['/', TokenKind.Division],
    ['%', TokenKind.Modulo],
    ['^', TokenKind.Exponent],
    ['&', TokenKind.BitAnd],
    ['|', TokenKind.BitOr],
    ['~', TokenKind.BitXOrNot],

    ['<', TokenKind.LessThen],
    ['>', TokenKind.GreaterThen],

    ['=', TokenKind.Assign],
    [';', TokenKind.Semicolon],
    [',', TokenKind.Comma],
    ['.', TokenKind.Dot],
    ['#', TokenKind.Hash],
])

const double_token_map: Map<string, TokenKind> = new Map([
    ['==', TokenKind.Equals],
    ['<=', TokenKind.LessThenEquals],
    ['>=', TokenKind.GreaterThenEquals],
    ['~=', TokenKind.NotEquals],
    ['..', TokenKind.Concat],
    ['//', TokenKind.FloorDivision],
    ['<<', TokenKind.BitShiftLeft],
    ['>>', TokenKind.BitShiftRight],
])

const keyword_map: Map<string, TokenKind> = new Map([
    ['function', TokenKind.Function],
    ['if', TokenKind.If],
    ['while', TokenKind.While],
    ['for', TokenKind.For],
    ['repeat', TokenKind.Repeat],
    ['in', TokenKind.In],
    ['do', TokenKind.Do],
    ['then', TokenKind.Then],
    ['elseif', TokenKind.ElseIf],
    ['else', TokenKind.Else],
    ['until', TokenKind.Until],
    ['end', TokenKind.End],
    ['return', TokenKind.Return],
    ['break', TokenKind.Break],

    ['and', TokenKind.And],
    ['or', TokenKind.Or],
    ['not', TokenKind.Not],

    ['true', TokenKind.BooleanLiteral],
    ['false', TokenKind.BooleanLiteral],
    ['nil', TokenKind.NilLiteral],
    ['local', TokenKind.Local],
])

export class TokenStream
{

    private readonly processing_stream: string[]
    private readonly peek_queue: Token[]

    private state: State
    private end_of_stream: boolean = false
    private buffer: string
    private token_start_debug: Debug

    private line: number
    private column: number

    constructor() 
    {
        this.state = State.Initial
        this.processing_stream = []
        this.buffer = ''
        this.token_start_debug = { line: 0, column: 0 }

        this.line = 1
        this.column = 1
        this.peek_queue = []
    }

    private current(): string | undefined
    {
        if (this.processing_stream.length > 0)
            return this.processing_stream[0]

        if (this.end_of_stream)
            return undefined

        this.end_of_stream = true
        return '\0'
    }

    private consume() 
    {
        if (this.processing_stream.length <= 0)
            return

        this.column += 1
        if (this.processing_stream.shift() == '\n')
        {
            this.line += 1
            this.column = 1
        }
    }

    private start_token()
    {
        this.token_start_debug = {
            line: this.line,
            column: this.column,
        }
        this.buffer = ''
    }

    private initial() 
    {
        if (this.processing_stream.length == 0)
        {
            this.peek_queue.push({
                data: '',
                kind: TokenKind.EOF,
                debug: {
                    line: this.line,
                    column: this.column,
                },
            })

            return
        }

        const c = this.current() ?? '\0'
        if (/\s/.test(c))
            return this.consume()

        if (this.processing_stream.length > 1)
        {
            const double = c + this.processing_stream[1]
            if (double == '--')
            {
                this.state = State.Comment
                return
            }

            if (double == '[[')
            {
                this.state = State.MultiLineString
                this.start_token()
                this.consume()
                this.consume()
                return
            }

            const dobule_token_type = double_token_map.get(double)
            if (dobule_token_type != undefined)
            {
                this.peek_queue.push({
                    data: double,
                    kind: dobule_token_type,
                    debug: {
                        line: this.line,
                        column: this.column,
                    },
                })
                this.consume()
                this.consume()
                return
            }
        }
        
        const single_token_type = single_token_map.get(c)
        if (single_token_type != undefined)
        {
            this.peek_queue.push({
                data: c,
                kind: single_token_type,
                debug: {
                    line: this.line,
                    column: this.column,
                },
            })
            this.consume()
            return
        }

        if (c == '"')
        {
            this.start_token()
            this.consume()
            this.state = State.StringLiteral
            return
        }

        if (/[a-zA-Z_]/.test(c))
        {
            this.start_token()
            this.state = State.Identifier
            return
        }

        if (/[0-9]/.test(c))
        {
            this.start_token()
            this.state = State.NumberLiteral
            return
        }
    }

    private read_string()
    {
        const c = this.current()
        this.consume()

        if (c == '"')
        {
            this.peek_queue.push({
                data: this.buffer,
                kind: TokenKind.StringLiteral,
                debug: this.token_start_debug,
            })

            this.state = State.Initial
            return
        }

        if (c == '\\')
        {
            this.state = State.StringLiteralEscape
            return
        }

        this.buffer += c
    }

    private read_string_escape()
    {
        const c = this.current()
        this.consume()
        this.state = State.StringLiteral

        switch (c)
        {
            case 'n': this.buffer += '\n'; break
            case '0': this.buffer += '\0'; break
            case 'r': this.buffer += '\r'; break
            case 't': this.buffer += '\t'; break
            default:
                this.buffer += c
                break
        }
    }

    private read_multi_line_string()
    {
        const c = this.current() ?? '\0'
        this.consume()

        if (c + this.current() == ']]')
        {
            this.peek_queue.push({
                data: this.buffer,
                kind: TokenKind.StringLiteral,
                debug: this.token_start_debug,
            })

            this.consume()
            this.state = State.Initial
            return
        }

        this.buffer += c
    }

    private read_identifier()
    {
        const c = this.current() ?? '\0'
        if (!/[a-zA-Z0-9_]/.test(c))
        {
            const kind = keyword_map.get(this.buffer)
            this.peek_queue.push({
                data: this.buffer,
                kind: kind ?? TokenKind.Identifier,
                debug: this.token_start_debug,
            })

            this.state = State.Initial
            return
        }

        this.buffer += c
        this.consume()
    }

    private number()
    {
        const c = this.current() ?? '\0'
        if (/[0-9]/.test(c))
        {
            this.buffer += c
            this.consume()
            return
        }

        if (c == '.')
        {
            this.buffer += c
            this.consume()
            this.state = State.NumberLiteralDot
            return
        }

        if (c == 'e' || c == 'E')
        {
            this.buffer += c
            this.consume()
            this.state = State.NumberLiteralExp
            return
        }

        if (c == 'x')
        {
            if (this.buffer != '0')
            {
                this.peek_queue.push({
                    data: this.buffer,
                    kind: TokenKind.NumberLiteral,
                    debug: this.token_start_debug,
                })
                this.state = State.Initial
                return
            }

            this.buffer += c
            this.state = State.NumberHex
            this.consume()
            return
        }

        this.peek_queue.push({
            data: this.buffer,
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private number_dot()
    {
        const c = this.current() ?? '\0'
        if (/[0-9]/.test(c))
        {
            this.buffer += c
            this.consume()
            return
        }

        if (c == 'e' || c == 'E')
        {
            this.buffer += c
            this.state = State.NumberLiteralExpSign
            this.consume()
            return
        }

        this.peek_queue.push({
            data: this.buffer,
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private number_exp_sign()
    {
        const c = this.current() ?? '\0'
        if (/[0-9+-]/.test(c))
        {
            this.buffer += c
            this.consume()
            this.state = State.NumberLiteralExp
            return
        }

        this.peek_queue.push({
            data: this.buffer,
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private number_exp()
    {
        const c = this.current() ?? '\0'
        if (/[0-9]/.test(c))
        {
            this.buffer += c
            this.consume()
            return
        }
        
        this.peek_queue.push({
            data: this.buffer,
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private number_hex()
    {
        const c = this.current() ?? '\0'
        if (/[0-9a-fA-F]/.test(c))
        {
            this.buffer += c
            this.consume()
            return
        }
        
        this.peek_queue.push({
            data: parseInt(this.buffer.slice(2), 16).toString(),
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private comment()
    {
        const c = this.current()
        this.consume()
        
        if (c == '\n')
            this.state = State.Initial
    }
    
    private on_char()
    {
        if (this.current() == undefined)
        {
            this.peek_queue.push({
                data: '',
                kind: this.state == State.Initial
                    ? TokenKind.EOF
                    : TokenKind.NotFinished,
                debug: {
                    line: this.line,
                    column: this.column,
                },
            })

            return
        }

        switch (this.state)
        {
            case State.Initial:
                this.initial()
                break
            case State.Identifier:
                this.read_identifier()
                break
            case State.StringLiteral:
                this.read_string()
                break
            case State.StringLiteralEscape:
                this.read_string_escape()
                break
            case State.MultiLineString:
                this.read_multi_line_string()
                break
            case State.NumberLiteral:
                this.number()
                break
            case State.NumberLiteralDot:
                this.number_dot()
                break
            case State.NumberLiteralExpSign:
                this.number_exp_sign()
                break
            case State.NumberLiteralExp:
                this.number_exp()
                break
            case State.NumberHex:
                this.number_hex()
                break
            case State.Comment:
                this.comment()
                break
        }
    }

    feed(stream: string)
    {
        this.processing_stream.push(...stream.split(''))
        this.end_of_stream = false
    }

    next(): Token
    {
        if (this.peek_queue.length == 0)
            this.peek()
        return <Token> this.peek_queue.shift()
    }

    peek(count = 1): Token
    {
        while (this.peek_queue.length < count)
            this.on_char()
        return this.peek_queue[count - 1]
    }

}


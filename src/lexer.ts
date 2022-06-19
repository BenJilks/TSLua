
export enum State {
    Initial,
    Identifier,
    StringLiteral,
    NumberLiteral,
    NumberLiteralDot,
    NumberLiteralExpSign,
    NumberLiteralExp,
    Comment,
}

export enum TokenKind {
    EOF,

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
    Concat,
    Hash,

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
    In,
    Do,
    Then,
    ElseIf,
    Else,
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
        case TokenKind.LessThen: return '-'
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
        case TokenKind.In: return 'in'
        case TokenKind.Do: return 'do'
        case TokenKind.Then: return 'then'
        case TokenKind.ElseIf: return 'elseif'
        case TokenKind.Else: return 'else'
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
    ['>=', TokenKind.LessThenEquals],
    ['<=', TokenKind.GreaterThenEquals],
    ['~=', TokenKind.NotEquals],
    ['..', TokenKind.Concat],
])

const keyword_map: Map<string, TokenKind> = new Map([
    ['function', TokenKind.Function],
    ['if', TokenKind.If],
    ['while', TokenKind.While],
    ['for', TokenKind.For],
    ['in', TokenKind.In],
    ['do', TokenKind.Do],
    ['then', TokenKind.Then],
    ['elseif', TokenKind.ElseIf],
    ['else', TokenKind.Else],
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

    private genorator: Generator<Token, Token, void>
    private peek_queue: Token[]
    
    constructor(genorator: Generator<Token, Token, void>) 
    {
        this.genorator = genorator
        this.peek_queue = []
    }

    next(): Token
    {
        const token = this.peek_queue.shift()
        if (token != undefined)
            return token
        return this.genorator.next().value
    }

    peek(count = 1): Token
    {
        while (this.peek_queue.length < count)
            this.peek_queue.push(this.genorator.next().value)
        return this.peek_queue[count - 1]
    }

}

export class Lexer 
{

    private state: State
    private processing_stream: string[]
    private buffer: string

    private line: number
    private column: number

    private token_start_debug: Debug

    constructor() 
    {
        this.state = State.Initial
        this.processing_stream = []
        this.buffer = ''
        this.line = 1
        this.column = 1
        this.token_start_debug = { line: 0, column: 0 }
    }

    private token(token: Token): Token
    {
        const kind = keyword_map.get(token.data)
        if (kind != undefined)
            token.kind = kind
        return token
    }

    private current(): string 
    {
        if (this.processing_stream.length == 0)
            return '\0'
        else
            return this.processing_stream[0]
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

    private *initial() 
    {
        if (this.processing_stream.length == 0)
        {
            yield {
                kind: TokenKind.EOF,
                data: '',
                debug: {
                    line: this.line,
                    column: this.column,
                },
            }
            return
        }

        const c = this.current()
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

            const dobule_token_type = double_token_map.get(double)
            if (dobule_token_type != undefined)
            {
                yield this.token({
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
            yield this.token({
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

    private *read_until(condition: (c: string) => boolean,
                        kind: TokenKind,
                        should_consume_last: boolean)
    {
        const c = this.current()
        if (!condition(c))
        {
            this.buffer += c
            this.consume()
            return
        }

        yield this.token({
            data: this.buffer,
            kind: kind,
            debug: this.token_start_debug,
        })

        if (should_consume_last)
            this.consume()

        this.state = State.Initial
    }

    private *number()
    {
        const c = this.current()
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

        yield this.token({
            data: this.buffer,
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private *number_dot()
    {
        const c = this.current()
        if (/[0-9]/.test(c))
        {
            this.buffer += c
            this.consume()
            return
        }

        if (c == 'e' || c == 'E')
        {
            this.buffer += c
            this.state = State.NumberLiteralExp
            this.consume()
            return
        }

        yield this.token({
            data: this.buffer,
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private *number_exp_sign()
    {
        const c = this.current()
        if (/[0-9+\-]/.test(c))
        {
            this.buffer += c
            this.consume()
            this.state = State.NumberLiteralExp
            return
        }

        yield this.token({
            data: this.buffer,
            kind: TokenKind.NumberLiteral,
            debug: this.token_start_debug,
        })
        this.state = State.Initial
    }

    private *number_exp()
    {
        const c = this.current()
        if (/[0-9]/.test(c))
        {
            this.buffer += c
            this.consume()
            return
        }
        
        yield this.token({
            data: this.buffer,
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
    
    private *on_char()
    {
        switch (this.state)
        {
            case State.Initial:
                yield* this.initial()
                break
            case State.Identifier:
                yield* this.read_until(c => !/[a-zA-Z0-9_]/.test(c), TokenKind.Identifier, false)
                break
            case State.StringLiteral:
                yield* this.read_until(c => c == '"', TokenKind.StringLiteral, true)
                break
            case State.NumberLiteral:
			    yield* this.number()
			    break
            case State.NumberLiteralDot:
			    yield* this.number_dot()
			    break
            case State.NumberLiteralExpSign:
			    yield* this.number_exp_sign()
			    break
            case State.NumberLiteralExp:
			    yield* this.number_exp()
			    break
            case State.Comment:
			    this.comment()
			    break
        }
    }

    private *feed_genorator(stream: string): Generator<Token, Token, void>
    {
        this.processing_stream.push(...stream.split(''))
        while (true)
            yield* this.on_char()
    }

    feed(stream: string): TokenStream
    {
        return new TokenStream(this.feed_genorator(stream))
    }

}


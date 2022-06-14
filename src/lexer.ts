
export enum State {
    Initial,
    Identifier,
    StringLiteral,
    NumberLiteral,
    NumberLiteralDot,
    NumberLiteralExpSign,
    NumberLiteralExp,
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

    LessThen,
    GreaterThen,
    And,
    Or,
    Not,

    Assign,
    Semicolon,
    Comma,

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

export interface Token {
    data: string
    kind: TokenKind
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

export class TokenStream {

    private genorator: Generator<Token, Token, void>
    private peek_queue: Token[]
    
    constructor(genorator: Generator<Token, Token, void>) {
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

    peek(count: number = 1): Token
    {
        while (this.peek_queue.length < count)
            this.peek_queue.push(this.genorator.next().value)
        return this.peek_queue[count - 1]
    }

}

export class Lexer {

    private state: State
    private processing_stream: string[]
    private buffer: string

    constructor() {
        this.state = State.Initial
        this.processing_stream = []
        this.buffer = ''
    }

    private token(token: Token): Token
    {
        const kind = keyword_map.get(token.data)
        if (kind != undefined)
            token.kind = kind
        return token
    }

    private current(): string {
        if (this.processing_stream.length == 0)
            return '\0'
        else
            return this.processing_stream[0]
    }

    private consume() {
        if (this.processing_stream.length > 0)
            this.processing_stream.shift()
    }

    private *initial() {
        if (this.processing_stream.length == 0)
        {
            yield { kind: TokenKind.EOF, data: '' }
            return
        }

        const c = this.current()
        if (/\s/.test(c))
            return this.consume()

        const single_token_type = single_token_map.get(c)
        if (single_token_type != undefined)
        {
            yield this.token({
                data: c,
                kind: single_token_type,
            })
            this.consume()
            return
        }

        if (c == '"')
        {
            this.consume()
            this.state = State.StringLiteral
            return
        }

        if (/[a-zA-Z_]/.test(c))
        {
            this.state = State.Identifier
            return
        }

        if (/[0-9]/.test(c))
        {
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
        })

        if (should_consume_last)
            this.consume()

        this.buffer = ''
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

        yield this.token({ data: this.buffer, kind: TokenKind.NumberLiteral })
        this.buffer = ''
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

        yield this.token({ data: this.buffer, kind: TokenKind.NumberLiteral })
        this.buffer = ''
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

        yield this.token({ data: this.buffer, kind: TokenKind.NumberLiteral })
        this.buffer = ''
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
        
        yield this.token({ data: this.buffer, kind: TokenKind.NumberLiteral })
        this.buffer = ''
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


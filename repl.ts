/*
 * Copyright (c) 2022, Ben Jilks <benjyjilks@gmail.com>
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

import * as lua from './index'
import fs from 'fs/promises'
import readline from 'readline'

type TokenStream = lua.lexer.TokenStream
type TokenKind = lua.lexer.TokenKind
const { TokenKind, TokenStream } = lua.lexer

const repl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

async function question(query: string): Promise<string>
{
    return new Promise((resolve) =>
        repl.question(query, resolve))
}

function prompt(length: number): string
{
    return '>'.repeat(length + 1) + ' '.repeat(length + 1)
}

enum Flags
{
    None         = 0 << 0,
    ContainsElse = 1 << 0,
}

function scan_line(stream: TokenStream, close_stack: TokenKind[]): Flags
{
    let flags = Flags.None
    for (let token = stream.next(); token.kind != TokenKind.EOF; token = stream.next())
    {
        if (close_stack.length > 0)
        {
            const closer = close_stack[close_stack.length - 1]
            if (token.kind == closer || closer == TokenKind.NotFinished)
                close_stack.pop()
        }

        switch (token.kind)
        {
            case TokenKind.Function:
            case TokenKind.While:
            case TokenKind.Do:
                close_stack.push(TokenKind.End)
                break
            case TokenKind.For:
                close_stack.push(TokenKind.Do)
                break
            case TokenKind.If:
                close_stack.push(TokenKind.End)
                close_stack.push(TokenKind.Then)
                break
            case TokenKind.Repeat:
                close_stack.push(TokenKind.Until)
                break
            case TokenKind.Else:
            case TokenKind.ElseIf:
                flags |= Flags.ContainsElse
                break
            case TokenKind.NotFinished:
                close_stack.push(TokenKind.NotFinished)
                break
        }

        if (close_stack.length > 0 && close_stack[0] == TokenKind.NotFinished)
            break
    }

    return flags
}

async function read_chunk(): Promise<string>
{
    const line = (await question('> ')) + '\n'
    const stream = new TokenStream()
    const close_stack: TokenKind[] = []
    let chunk = line

    stream.feed(line)
    scan_line(stream, close_stack)
    while (close_stack.length > 0)
    {
        const line = (await question(prompt(close_stack.length))) + '\n'
        stream.feed(line)

        const start_stack_height = close_stack.length
        const flags = scan_line(stream, close_stack)
        if (close_stack.length < start_stack_height)
            console.log(`\r\x1b[A\x1b[K${ prompt(close_stack.length) }${ line }`)
        else if ((flags & Flags.ContainsElse) != 0)
            console.log(`\r\x1b[A\x1b[K${ prompt(close_stack.length - 1) }${ line }`)
        chunk += line
    }

    return chunk
}

async function run_repl(bytecode: boolean, trace: boolean)
{
    console.log('TSLua repl <https://github.com/BenJilks/TSLua>')

    const engine = new lua.Engine()
    while (true)
    {
        const result = engine.load(await read_chunk())
        if (result != undefined)
        {
            console.error(result)
            continue
        }

        if (bytecode)
        {
            for (const bytecode of engine.bytecode())
                console.log(bytecode)
            continue
        }

        const value = engine.run({
            trace: trace,
        })

        if (value instanceof Error)
        {
            console.error(value)
            continue
        }

        console.log(lua.to_string(value))
    }
}

async function main()
{
    let script: string | undefined = undefined
    let trace = false
    let bytecode = false

    for (let i = 1; i < process.argv.length; i++)
    {
        const arg = process.argv[i]
        if (arg.startsWith('--'))
        {
            const long = arg.slice(2)
            switch (long)
            {
                case 'script': script = process.argv.at(++i); break
                case 'trace': trace = true; break
                case 'bytecode': bytecode = true; break
            }
        }
        else if (arg.startsWith('-'))
        {
            for (const short of arg.slice(1))
            {
                switch (short)
                {
                    case 's': script = process.argv.at(++i); break
                    case 't': trace = true; break
                    case 'b': bytecode = true; break
                }
            }
        }
    }

    if (script != undefined)
    {
        console.log(`Running script '${ script }'`)

        const source = await fs.readFile(script)
        const engine = new lua.Engine(source.toString('utf8'))
        if (bytecode)
        {
            for (const bytecode of engine.bytecode())
                console.log(bytecode)
            process.exit(0)
        }

        const result = engine.run({
            trace: trace,
        })

        if (result instanceof Error)
        {
            console.error(result)
            process.exit(1)
        }

        process.exit(0)
    }

    await run_repl(bytecode, trace)
}

main()


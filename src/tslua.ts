import { Lexer } from './lexer'
import { parse } from './parser'
import { compile_function } from './compiler'
import { call } from './interpreter'
import { std_lib } from './lib'

const source = `

test = {
    foo = function()
        return 21
    end
}

print(test.foo())

`

const lexer = new Lexer()
const chunk = parse(lexer.feed(source))
const compiled = compile_function(chunk)
call(compiled, std_lib())


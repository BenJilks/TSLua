import { Lexer } from './lexer'
import { parse } from './parser'
import { compile_function } from './compiler'
import { call } from './interpreter'
import { std_lib } from './lib'

const source = `

function iter(count)
    local i = 0
    return function()
        i = i + 1
        if i < count then
            return i
        end
    end
end

for it in iter(10) do
    print(it)
end

`

const lexer = new Lexer()
const chunk = parse(lexer.feed(source))
const compiled = compile_function(chunk)
call(compiled, std_lib())


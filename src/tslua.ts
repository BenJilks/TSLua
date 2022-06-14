import { Lexer } from './lexer'
import { parse } from './parser'
import { run, new_environment } from './interpreter'

const source = `

states = {
    "inital",
    "download",
    "done",
}

i = 0
while i < 10 do
    print(i)
    i = i + 1
end

`

const lexer = new Lexer()
const chunk = parse(lexer.feed(source))
const environment = new_environment()
run(chunk, environment)


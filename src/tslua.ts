import { Lexer } from './lexer'
import { parse } from './parser'
import { compile_function } from './compiler'
import { call } from './interpreter'
import { std_lib } from './lib'

const source = `

table = { x = 1, y = 2, z = { w = 3 } }
print(table["x"], table["y"])
print(table.x, table.y, table.z.w)

`

const lexer = new Lexer()
const chunk = parse(lexer.feed(source))
const compiled = compile_function(chunk)
call(compiled, std_lib(), [], true)


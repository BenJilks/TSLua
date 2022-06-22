import { Engine } from './src/engine'
import { DataType, nil } from './src/runtime'
import { make_boolean, make_number, make_string } from './src/runtime'
import { compile } from './src/compiler'
import { std_lib, variable_to_string } from './src/lib'
import * as lexer from './src/lexer'
import * as parser from './src/parser'
import * as ast from './src/ast'
import * as opcode from './src/opcode'
import * as runtime from './src/runtime'

export type NativeFunction = (engine: Engine, ...args: Variable[]) => Variable[]
export interface Variable {
    data_type: DataType,
    boolean?: boolean,
    number?: number,
    string?: string,
    native_function?: NativeFunction,
    table?: Map<string|number, Variable>,

    function_id?: number,
    locals?: Map<string, Variable>,
}

export const Nil = DataType.Nil
export const Boolean = DataType.Boolean
export const Number = DataType.Number
export const String = DataType.String
export const Function = DataType.Function
export const NativeFunction = DataType.NativeFunction
export const Table = DataType.Table

export
{
    std_lib as std_global,
    nil,
    make_boolean as boolean,
    make_number as number,
    make_string as string,
    variable_to_string as to_string,
    Engine, DataType,
    lexer, parser, ast, compile, opcode, runtime,
}


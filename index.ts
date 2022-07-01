/*
 * Copyright (c) 2022, Ben Jilks <benjyjilks@gmail.com>
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

import { Engine } from './src/engine'
import { DataType, Variable, NativeFunction, nil } from './src/runtime'
import { make_boolean, make_number, make_string } from './src/runtime'
import { compile } from './src/compiler'
import { std_lib, variable_to_string } from './src/lib'
import * as lexer from './src/lexer'
import * as parser from './src/parser'
import * as ast from './src/ast'
import * as opcode from './src/opcode'
import * as runtime from './src/runtime'

export const Nil = DataType.Nil
export const Boolean = DataType.Boolean
export const Number = DataType.Number
export const String = DataType.String
export const Function = DataType.Function
export const NativeFunctionType = DataType.NativeFunction
export const Table = DataType.Table

export
{
    std_lib as std_global,
    nil,
    make_boolean as boolean,
    make_number as number,
    make_string as string,
    variable_to_string as to_string,
    Engine, DataType, Variable, NativeFunction,
    lexer, parser, ast, compile, opcode, runtime,
}


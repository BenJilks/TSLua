/*
 * Copyright (c) 2022, Ben Jilks <benjyjilks@gmail.com>
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

import { Engine } from './engine'

export enum DataType {
    Nil,
    Boolean,
    Number,
    String,
    Function,
    NativeFunction,
    Table,
}

export type NativeFunction = (engine: Engine, ...args: Variable[]) => Variable[]
export interface Variable {
    data_type: DataType,
    boolean?: boolean,
    number?: number,
    string?: string,
    native_function?: NativeFunction,
    table?: Map<string|number, Variable>,

    function_id?: number,
    locals?: Map<string, Variable>[],
}

export const nil: Variable = { data_type: DataType.Nil }

export function make_boolean(boolean: boolean): Variable
{
    return { data_type: DataType.Boolean, boolean: boolean }
}

export function make_number(number: number): Variable
{
    return { data_type: DataType.Number, number: number }
}

export function make_string(string: string): Variable
{
    return { data_type: DataType.String, string: string }
}


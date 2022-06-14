import {CompiledFunction} from "./opcode"

export enum DataType {
    Nil,
    Boolean,
    Number,
    String,
    Function,
    NativeFunction,
    Table,
}

export type NativeFunction = (...args: Variable[]) => Variable[]

export interface Variable {
    data_type: DataType,
    boolean?: boolean,
    number?: number,
    string?: string,
    function?: CompiledFunction,
    native_function?: NativeFunction,
    table?: Map<string|number, Variable>,
}

export interface Environment {
    globals: Map<string, Variable>,
    locals: Map<string, Variable>,
}

export const nil = { data_type: DataType.Nil }


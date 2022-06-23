import { Engine } from './engine'
import { DataType, make_number, make_string, nil, Variable } from './runtime'

export function variable_to_string(variable: Variable): string
{
    switch (variable.data_type)
    {
        case DataType.Nil: return 'nil'
        case DataType.Boolean: return variable.boolean ? 'true' : 'false'
        case DataType.Number: return variable.number?.toString() ?? '0'
        case DataType.String: return variable.string ?? ''
        case DataType.Function: return `<Function ${ variable.function_id ?? 'nil' }>`
        case DataType.NativeFunction: return `<Function ${ variable.native_function?.name ?? 'nil' }>`
        case DataType.Table: 
        {
            return `{ ${ [...variable.table?.entries() ?? []]
                .map(([i, v]) => `${ i } = ${ variable_to_string(v) }`).join(', ') } }`
        }
        default: return '<Lua Object>'
    }
}

function print(_: Engine, ...args: Variable[]): Variable[]
{
    console.log(...args.map(variable_to_string))
    return [nil]
}

function ipairs(_: Engine, table: Variable): Variable[]
{
    if (table.data_type != DataType.Table || table.table == undefined)
        return [nil]

    const entries = [...table.table.entries()]
    let index = 0
    return [{
        data_type: DataType.NativeFunction,
        native_function: () =>
        {
            if (index >= entries.length)
                return [nil]

            const [i, v] = entries[index++]
            if (typeof(i) === 'number') 
            {
                return [{ data_type: DataType.Number, number: i }, v] 
            }
            else 
            {
                return [{ data_type: DataType.String, string: i }, v] 
            }
        },
    }]
}

function range(_: Engine, count: Variable): Variable[]
{
    let index = 0
    return [{
        data_type: DataType.NativeFunction,
        native_function: () =>
        {
            index += 1
            if (index >= (count.number ?? 0))
                return [nil]
            return [{ data_type: DataType.Number, number: index }]
        },
    }]
}

function random(_: Engine): Variable[]
{
    return [{ data_type: DataType.Number, number: Math.random() }]
}

function len(_: Engine, table: Variable): Variable[]
{
    const len = table.table?.size ?? 1
    return [{ data_type: DataType.Number, number: len }]
}

function is_empty(_: Engine, table: Variable): Variable[]
{
    const len = table.table?.size ?? 0
    return [{ data_type: DataType.Boolean, boolean: len == 0 }]
}

function key_variable(key: number | string): Variable
{
    if (typeof key == 'number')
        return make_number(key)
    else if (typeof key == 'string')
        return make_string(key)
    else
        return nil
}

function sort(engine: Engine, table: Variable, by: Variable): Variable[]
{
    const entries: [string | number, Variable][] = [...table.table?.entries() ?? []]
    entries.sort(([_, a], [__, b]) =>
    {
        const result = engine.call(by, a, b)
        if (result instanceof Error)
            return 0

        return result.at(0)?.number ?? 0
    })

    const numbered_entries = entries.map(([key, _], i) => [i + 1, key_variable(key)] as const)
    return [{ data_type: DataType.Table, table: new Map(numbered_entries) }]
}

function find(engine: Engine, table: Variable, matches: Variable): Variable[]
{
    const entries: [string | number, Variable][] = [...table.table?.entries() ?? []]
    const found = entries.find(([_, a]) =>
    {
        const result = engine.call(matches, a)
        if (result instanceof Error)
            return 0

        return result.at(0)?.boolean ?? 0
    })

    if (found == undefined)
        return [nil]

    const [key, _] = found
    if (typeof key == 'number')
        return [make_number(key)]
    else if (typeof key == 'string')
        return [make_string(key)]
    else
        return [nil]
}

function first(_: Engine, table: Variable): Variable[]
{
    if (table.table == undefined)
        return [nil]

    const key = table.table.keys().next().value
    if (typeof key == 'string')
        return [make_string(key)]
    else if (typeof key == 'number')
        return [make_number(key)]
    else
        return [nil]
}

function keys(_: Engine, table: Variable): Variable[]
{
    if (table.table == undefined)
        return [nil]

    const keys = [...table.table.keys()]
    const entries = keys.map((key, i) => [i + 1, key_variable(key)] as const)
    return [{ data_type: DataType.Table, table: new Map(entries) }]
}

function values(_: Engine, table: Variable): Variable[]
{
    if (table.table == undefined)
        return [nil]

    const values = [...table.table.values()]
    const entries = values.map((value, i) => [i + 1, value] as const)
    return [{ data_type: DataType.Table, table: new Map(entries) }]
}

export function std_lib(): Map<string, Variable>
{
    return new Map([
        ['print', { data_type: DataType.NativeFunction, native_function: print }],
        ['ipairs', { data_type: DataType.NativeFunction, native_function: ipairs }],
        ['range', { data_type: DataType.NativeFunction, native_function: range }],
        ['random', { data_type: DataType.NativeFunction, native_function: random }],
        ['len', { data_type: DataType.NativeFunction, native_function: len }],
        ['is_empty', { data_type: DataType.NativeFunction, native_function: is_empty }],
        ['sort', { data_type: DataType.NativeFunction, native_function: sort }],
        ['find', { data_type: DataType.NativeFunction, native_function: find }],
        ['first', { data_type: DataType.NativeFunction, native_function: first }],
        ['keys', { data_type: DataType.NativeFunction, native_function: keys }],
        ['values', { data_type: DataType.NativeFunction, native_function: values }],
    ])
}


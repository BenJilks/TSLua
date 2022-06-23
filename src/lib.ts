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

function to_number(_: Engine, arg: Variable): Variable[]
{
    switch (arg.data_type)
    {
        case DataType.Number:
            return [arg]
        case DataType.String:
            return [make_number(parseFloat(arg.string ?? '0'))]
        default:
            return [nil]
    }
}

function to_string(_: Engine, arg: Variable): Variable[]
{
    return [make_string(variable_to_string(arg))]
}

function string_byte(_: Engine, s: Variable, i?: Variable, j?: Variable): Variable[]
{
    if (s.string == undefined)
        return [nil]

    const start = i?.number ?? 1
    const end = j?.number ?? start
    const bytes: Variable[] = []
    for (let index = start - 1; index <= end - 1; index++)
        bytes.push(make_number(s.string.charCodeAt(index)))
    return bytes
}

function string_char(_: Engine, ...chars: Variable[]): Variable[]
{
    const s = String.fromCharCode(...chars
        .filter(x => x.number != undefined)
        .map(c => c.number ?? 0))
    return [make_string(s)]
}

function string_format(_: Engine, format: Variable, ...args: Variable[]): Variable[]
{
    if (format.string == undefined)
        return [nil]

    let result = ''
    let is_format = false
    let arg_index = 0
    for (const char of format.string)
    {
        if (is_format)
        {
            switch (char)
            {
                case 'd': result += Math.floor(args[arg_index++].number ?? 0).toString(); break
                case 'f': result += args[arg_index++].number?.toString(); break
                case 's': result += variable_to_string(args[arg_index++]); break
                default:
                    result += `%${ char }`
            }
            is_format = false
        }
        else
        {
            if (char == '%')
                is_format = true
            else
                result += char
        }
    }

    return [make_string(result)]
}

function string_find(_: Engine, s: Variable, pattern: Variable, init?: Variable, plain?: Variable): Variable[]
{
    if (s.string == undefined || pattern.string == undefined)
        return [nil]

    const offset = init?.number ?? 1
    const str = s.string.slice(offset - 1)

    if (plain?.boolean == true)
        return [make_number(str.indexOf(pattern.string) + 1)]

    const results = RegExp(pattern.string).exec(str)
    if (results == null || results.length == 0)
        return [nil]

    const index = s.string.indexOf(results[0])
    return [make_number(index + 1)]
}

function string_len(_: Engine, s: Variable): Variable[]
{
    return [s.string == undefined ? nil : make_number(s.string.length)]
}

function string_lower(_: Engine, s: Variable): Variable[]
{
    return [s.string == undefined ? nil : make_string(s.string.toLowerCase())]
}

function string_upper(_: Engine, s: Variable): Variable[]
{
    return [s.string == undefined ? nil : make_string(s.string.toUpperCase())]
}

function string_reverse(_: Engine, s: Variable): Variable[]
{
    return [s.string == undefined ? nil :
        make_string(s.string.split('').reverse().join(''))]
}

export function std_lib(): Map<string, Variable>
{
    return new Map([
        ['print', { data_type: DataType.NativeFunction, native_function: print }],
        ['ipairs', { data_type: DataType.NativeFunction, native_function: ipairs }],
        ['pairs', { data_type: DataType.NativeFunction, native_function: ipairs }],
        ['range', { data_type: DataType.NativeFunction, native_function: range }],
        ['random', { data_type: DataType.NativeFunction, native_function: random }],
        ['isempty', { data_type: DataType.NativeFunction, native_function: is_empty }],
        ['sort', { data_type: DataType.NativeFunction, native_function: sort }],
        ['find', { data_type: DataType.NativeFunction, native_function: find }],
        ['first', { data_type: DataType.NativeFunction, native_function: first }],
        ['keys', { data_type: DataType.NativeFunction, native_function: keys }],
        ['values', { data_type: DataType.NativeFunction, native_function: values }],
        ['tonumber', { data_type: DataType.NativeFunction, native_function: to_number }],
        ['tostring', { data_type: DataType.NativeFunction, native_function: to_string }],
        ['string', { data_type: DataType.Table, table: new Map([
            ['byte', { data_type: DataType.NativeFunction, native_function: string_byte }],
            ['char', { data_type: DataType.NativeFunction, native_function: string_char }],
            ['format', { data_type: DataType.NativeFunction, native_function: string_format }],
            ['find', { data_type: DataType.NativeFunction, native_function: string_find }],
            ['len', { data_type: DataType.NativeFunction, native_function: string_len }],
            ['lower', { data_type: DataType.NativeFunction, native_function: string_lower }],
            ['upper', { data_type: DataType.NativeFunction, native_function: string_upper }],
            ['reverse', { data_type: DataType.NativeFunction, native_function: string_reverse }],
        ]) }],
    ])
}


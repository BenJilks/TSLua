import { DataType, nil, Variable } from './runtime'

export function variable_to_string(variable: Variable): string
{
    switch (variable.data_type)
    {
        case DataType.Nil: return 'nil'
        case DataType.Boolean: return variable.boolean ? 'true' : 'false'
        case DataType.Number: return variable.number?.toString() ?? '0'
        case DataType.String: return variable.string ?? ''
        case DataType.Table: 
        {
            return `{ ${ [...variable.table?.entries() ?? []]
                .map(([i, v]) => `${ i } = ${ variable_to_string(v) }`).join(', ') } }`
        }
        default: return '<Lua Object>'
    }
}

function print(...args: Variable[]): Variable[]
{
    console.log(...args.map(variable_to_string))
    return [nil]
}

function ipairs(table: Variable): Variable[]
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

function range(count: Variable): Variable[]
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

function random(): Variable[]
{
    return [{ data_type: DataType.Number, number: Math.random() }]
}

function len(table: Variable): Variable[]
{
    const len = table.table?.size ?? 1
    return [{ data_type: DataType.Number, number: len }]
}

function is_empty(table: Variable): Variable[]
{
    const len = table.table?.size ?? 0
    return [{ data_type: DataType.Boolean, boolean: len == 0 }]
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
    ])
}


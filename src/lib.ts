import { DataType, nil, Variable } from './runtime'

export function to_string(variable: Variable): string
{
    switch (variable.data_type)
    {
        case DataType.Nil: return "nil"
        case DataType.Boolean: return (variable.boolean ?? false) ? "true" : "false"
        case DataType.Number: return variable.number?.toString() ?? '0'
        case DataType.String: return variable.string ?? ''
        case DataType.Table: 
            return `{ ${ [...variable.table?.entries() ?? []].map(([i, v]) => `${ i } = ${ to_string(v) }`).join(', ') } }`
        default: return '<Lua Object>'
    }
}

function print(...args: Variable[]): Variable[]
{
    console.log(...args.map(to_string))
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
            if (typeof(i) === "number") {
                return [{ data_type: DataType.Number, number: i }, v] 
            } else {
                return [{ data_type: DataType.String, string: i }, v] 
            }
        }
    }]
}

export function std_lib(): Map<string, Variable>
{
    return new Map([
        ['print', { data_type: DataType.NativeFunction, native_function: print }],
        ['ipairs', { data_type: DataType.NativeFunction, native_function: ipairs }],
    ])
}


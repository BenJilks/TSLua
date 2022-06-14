import { DataType, nil, Variable } from './runtime'

function to_string(variable: Variable): string
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

function print(...args: Variable[]): Variable
{
    console.log(...args.map(to_string))
    return nil
}

export function std_lib(): Map<string, Variable>
{
    return new Map([
        ['print', { data_type: DataType.NativeFunction, native_function: print }],
    ])
}


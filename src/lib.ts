import { Engine } from './engine'
import { DataType, make_boolean, make_number, make_string, nil, Variable } from './runtime'

let rand = xoroshiro([0, 0, 0, 0].map(_ => BigInt(Math.floor(Math.random() * 100))))

export function variable_size(value: Variable): number | undefined
{
    switch (value.data_type)
    {
        case DataType.String: return value.string?.length ?? 0
        case DataType.Table:
            return ([...value.table?.keys() ?? []]
                .filter(key => typeof key == 'number') as number[])
                .reduce((acc, key) => Math.max(acc, key), 0)
        default:
            return undefined
    }
}

export function variable_to_string(variable: Variable, tables_done: Variable[] = []): string
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
            if (tables_done.includes(variable))
                return '...'

            tables_done.push(variable)
            return `{ ${ [...variable.table?.entries() ?? []]
                .map(([i, v]) =>
                    `${ i } = ${ variable_to_string(v, tables_done) }`)
                .join(', ') } }`
        }
        default: return '<Lua Object>'
    }
}

function print(_: Engine, ...args: Variable[]): Variable[]
{
    console.log(...args.map(arg => variable_to_string(arg)))
    return [nil]
}

function type(_: Engine, v: Variable): Variable[]
{
    switch (v.data_type)
    {
        case DataType.Nil: return [make_string('nil')]
        case DataType.Boolean: return [make_string('boolean')]
        case DataType.Number: return [make_string('number')]
        case DataType.String: return [make_string('string')]
        case DataType.Function: return [make_string('function')]
        case DataType.NativeFunction: return [make_string('function')]
        case DataType.Table: return [make_string('table')]
    }
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

function string_rep(_: Engine, s: Variable, n: Variable, sep?: Variable): Variable[]
{
    if (s.string == undefined)
        return [nil]

    return [make_string(new Array(n.number ?? 0)
        .fill(s.string)
        .join(sep?.string ?? ''))]
}

function string_sub(_: Engine, s: Variable, i: Variable, j?: Variable): Variable[]
{
    if (s.string == undefined)
        return [nil]

    const start = i.number ?? 1
    return [make_string(s.string.slice(start - 1, j?.number))]
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

function table_concat(_: Engine, list: Variable, sep?: Variable, i?: Variable, j?: Variable): Variable[]
{
    if (list.table == undefined)
        return [nil]

    const seporator = sep?.string ?? ''
    const start = i?.number ?? 1
    const result = [...list.table.values()]
        .slice(start - 1, j?.number)
        .map(item => variable_to_string(item))
        .join(seporator)
    return [make_string(result)]
}

function table_insert(_: Engine, list: Variable, arg_a?: Variable, arg_b?: Variable): Variable[]
{
    if (list.table == undefined)
        return [nil]

    const size = variable_size(list) ?? 0
    let pos = size + 1
    let value = arg_a ?? nil
    if (arg_b != undefined)
    {
        pos = arg_a?.number ?? pos
        value = arg_b ?? nil
    }

    for (let i = size + 1; i > pos; --i)
        list.table.set(i, list.table.get(i - 1) ?? nil)
    list.table.set(pos, value)
    return [nil]
}

function table_move(_: Engine, a1: Variable, f: Variable, e: Variable, t: Variable, a2?: Variable): Variable[]
{
    a2 = a2 ?? a1
    if (a1.table == undefined || a2.table == undefined)
        return [nil]

    if (f.number == undefined || e.number == undefined || t.number == undefined)
        return [nil]

    const src_start = f.number
    const src_end = e.number
    const dest_start = t.number
    const count = src_end - src_start
    for (let index = 0; index <= count; index++)
        a2.table.set(dest_start + index, a1.table.get(src_start + index) ?? nil)

    return [a2]
}

function table_pack(_: Engine, ...args: Variable[]): Variable[]
{
    const elements = args
        .map((item, i) => [i + 1, item] as [number | string, Variable])

    return [{
        data_type: DataType.Table,
        table: new Map([...elements, ['n', make_number(args.length)]]),
    }]
}

function table_remove(_: Engine, list: Variable, pos?: Variable): Variable[]
{
    if (list.table == undefined)
        return [nil]

    const size = variable_size(list) ?? 0
    const remove_index = pos?.number ?? (size + 1)
    const deleted_value = list.table.get(remove_index) ?? nil

    for (let index = remove_index; index < size; index++)
        list.table.set(index, list.table.get(index + 1) ?? nil)
    list.table.delete(size)

    return [deleted_value]
}

function table_unpack(_: Engine, list: Variable, i?: Variable, j?: Variable): Variable[]
{
    if (list.table == undefined)
        return [nil]

    const size = variable_size(list) ?? 0
    const start = i?.number ?? 1
    const end = j?.number ?? size
    return [...list.table.values()].splice(start - 1, end)
}

function math_abs(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.abs(x.number ?? 0))]
}

function math_acos(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.acos(x.number ?? 0))]
}

function math_asin(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.asin(x.number ?? 0))]
}

function math_atan(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.atan(x.number ?? 0))]
}

function math_ceil(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.ceil(x.number ?? 0))]
}

function math_cos(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.cos(x.number ?? 0))]
}

function math_deg(_: Engine, x: Variable): Variable[]
{
    return [make_number((x.number ?? 0.0) * (180.0/Math.PI))]
}

function math_exp(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.exp(x.number ?? 0.0))]
}

function math_floor(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.floor(x.number ?? 0.0))]
}

function math_fmod(_: Engine, x: Variable, y: Variable): Variable[]
{
    return [make_number((x.number ?? 0) % (y.number ?? 0))]
}

function math_log(_: Engine, x: Variable, base: Variable): Variable[]
{
    return [make_number(Math.log(x.number ?? 0) / Math.log(base.number ?? 0))]
}

function math_max(_: Engine, ...args: Variable[]): Variable[]
{
    const max = args.reduce((acc, x) =>
        x.number == undefined ? acc : Math.max(acc, x.number), -Infinity)
    return [make_number(max)]
}

function math_min(_: Engine, ...args: Variable[]): Variable[]
{
    const min = args.reduce((acc, x) =>
        x.number == undefined ? acc : Math.min(acc, x.number), Infinity)
    return [make_number(min)]
}

function math_modf(_: Engine, x: Variable): Variable[]
{
    const n = x.number ?? 0
    const integral = Math.trunc(n)
    return [make_number(integral), make_number(n - integral)]
}

function math_rad(_: Engine, x: Variable): Variable[]
{
    return [make_number((x.number ?? 0.0) * (Math.PI/180.0))]
}

function math_random(_: Engine, m?: Variable, n?: Variable): Variable[]
{
    if (m == undefined && n == undefined)
        return [make_number(rand() / 0xFFFFFFFF)]

    if (n == undefined)
    {
        const max = m?.number ?? 0
        if (max == 0)
            return [make_number(rand())]

        return [make_number(Math.floor(rand() % max) + 1)]
    }

    const min = m?.number ?? 1
    const max = (n?.number ?? 1) - min
    return [make_number(Math.floor(rand() % max) + min)]
}

function xoroshiro(s: bigint[])
{
    const rotl = (x: bigint, k: bigint) =>
        BigInt.asUintN(64, (x << k) | (x >> (BigInt(64) - k)))

    return () =>
    {
        const result = rotl(BigInt.asUintN(64, s[0] + s[3]), BigInt(23)) + s[0]
        const t = BigInt.asUintN(64, s[1] << BigInt(17))
        s[2] ^= s[0]
        s[3] ^= s[1]
        s[1] ^= s[2]
        s[0] ^= s[3]
        s[2] ^= t
        s[3] = rotl(s[3], BigInt(45))

        return Number(BigInt.asUintN(64, result) & BigInt(0xFFFFFFFF))
    }
}

function math_randomseed(_: Engine, x?: Variable, y?: Variable): Variable[]
{
    const seed = [0, 0, 0, 0].map(_ => BigInt(Math.floor(Math.random() * 100)))
    if (x?.number != undefined)
    {
        seed[0] = BigInt(x.number & 0xFFFFFFFF)
        seed[1] = BigInt((x.number << 32) & 0xFFFFFFFF)
    }
    
    if (y?.number != undefined)
    {
        seed[2] = BigInt(y.number & 0xFFFFFFFF)
        seed[3] = BigInt((y.number << 32) & 0xFFFFFFFF)
    }
    
    rand = xoroshiro(seed)
    return [nil]
}

function math_sin(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.sin(x.number ?? 0))]
}

function math_sqrt(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.sqrt(x.number ?? 0))]
}

function math_tan(_: Engine, x: Variable): Variable[]
{
    return [make_number(Math.tan(x.number ?? 0))]
}

function math_tointeger(_: Engine, x: Variable): Variable[]
{
    switch (x.data_type)
    {
        case DataType.Number:
            return [make_number(Math.floor(x.number ?? 0))]
        case DataType.String:
            return [make_number(Math.floor(parseFloat(x.string ?? '0')))]
        default:
            return [nil]
    }
}

function math_type(_: Engine, x: Variable): Variable[]
{
    if (x.number == undefined)
        return [nil]

    if (Math.floor(x.number) == x.number)
        return [make_string('integer')]
    else
        return [make_string('float')]
}

function math_ult(_: Engine, m: Variable, n: Variable): Variable[]
{
    const buffer = Buffer.from(new ArrayBuffer(8))
    buffer.writeInt32LE(m.number ?? 0)
    buffer.writeInt32LE(n.number ?? 0, 4)

    const m_unsigned = buffer.readUInt32LE()
    const n_unsigned = buffer.readUInt32LE(4)
    return [make_boolean(m_unsigned < n_unsigned)]
}

export function std_lib(): Map<string, Variable>
{
    const global: Map<string, Variable> = new Map([
        ['print', { data_type: DataType.NativeFunction, native_function: print }],
        ['type', { data_type: DataType.NativeFunction, native_function: type }],
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
            ['rep', { data_type: DataType.NativeFunction, native_function: string_rep }],
            ['reverse', { data_type: DataType.NativeFunction, native_function: string_reverse }],
            ['sub', { data_type: DataType.NativeFunction, native_function: string_sub }],
            ['upper', { data_type: DataType.NativeFunction, native_function: string_upper }],
        ]) }],
        ['table', { data_type: DataType.Table, table: new Map([
            ['concat', { data_type: DataType.NativeFunction, native_function: table_concat }],
            ['insert', { data_type: DataType.NativeFunction, native_function: table_insert }],
            ['move', { data_type: DataType.NativeFunction, native_function: table_move }],
            ['pack', { data_type: DataType.NativeFunction, native_function: table_pack }],
            ['remove', { data_type: DataType.NativeFunction, native_function: table_remove }],
            ['unpack', { data_type: DataType.NativeFunction, native_function: table_unpack }],
        ]) }],
        ['math', { data_type: DataType.Table, table: new Map([
            ['abs', { data_type: DataType.NativeFunction, native_function: math_abs }],
            ['acos', { data_type: DataType.NativeFunction, native_function: math_acos }],
            ['asin', { data_type: DataType.NativeFunction, native_function: math_asin }],
            ['atan', { data_type: DataType.NativeFunction, native_function: math_atan }],
            ['ceil', { data_type: DataType.NativeFunction, native_function: math_ceil }],
            ['cos', { data_type: DataType.NativeFunction, native_function: math_cos }],
            ['deg', { data_type: DataType.NativeFunction, native_function: math_deg }],
            ['exp', { data_type: DataType.NativeFunction, native_function: math_exp }],
            ['floor', { data_type: DataType.NativeFunction, native_function: math_floor }],
            ['fmod', { data_type: DataType.NativeFunction, native_function: math_fmod }],
            ['log', { data_type: DataType.NativeFunction, native_function: math_log }],
            ['max', { data_type: DataType.NativeFunction, native_function: math_max }],
            ['min', { data_type: DataType.NativeFunction, native_function: math_min }],
            ['modf', { data_type: DataType.NativeFunction, native_function: math_modf }],
            ['rad', { data_type: DataType.NativeFunction, native_function: math_rad }],
            ['random', { data_type: DataType.NativeFunction, native_function: math_random }],
            ['randomseed', { data_type: DataType.NativeFunction, native_function: math_randomseed }],
            ['sin', { data_type: DataType.NativeFunction, native_function: math_sin }],
            ['sqrt', { data_type: DataType.NativeFunction, native_function: math_sqrt }],
            ['tan', { data_type: DataType.NativeFunction, native_function: math_tan }],
            ['tointeger', { data_type: DataType.NativeFunction, native_function: math_tointeger }],
            ['type', { data_type: DataType.NativeFunction, native_function: math_type }],
            ['ult', { data_type: DataType.NativeFunction, native_function: math_ult }],
            
            ['pi', { data_type: DataType.Number, number: Math.PI }],
            ['maxinteger', { data_type: DataType.Number, number: 0xFFFFFFFF }],
            ['mininteger', { data_type: DataType.Number, number: -(0xFFFFFFFF - 1) }],
            ['huge', { data_type: DataType.Number, number: Infinity }],
        ]) }],
    ])

    global.set('_G', { data_type: DataType.Table, table: global })
    return global
}


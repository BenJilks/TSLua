
const lua_signature = '\x1bLua'
const luac_data = [0x19, 0x93, 0x0d, 0x0a, 0x1a, 0x0a]

function read_header(bytes: Buffer): number
{
    let index = 0

    const signature = bytes.subarray(0, lua_signature.length)
    index += lua_signature.length

    const version = bytes.at(index)!
    index += 1

    const format = bytes.at(index)!
    index += 1

    const data = bytes.subarray(index, index + luac_data.length)
    index += luac_data.length

    const instruction_size = bytes.at(index)!
    index += 1

    const integer_size = bytes.at(index)!
    index += 1

    const number_size = bytes.at(index)!
    index += 1

    // FIXME: Check these values are correct instead of skipping them.
    index += integer_size + number_size

    if (signature.toString('ascii') != lua_signature)
    {
        console.log('Binary signature did not match lua')
        return -1
    }

    if (data.compare(Buffer.from(luac_data)) != 0)
    {
        console.log('Data incorrect, possible conversion error')
        return -1
    }
    
    console.log('Loading lua binary')
    console.log(`    version: ${ version }`)
    console.log(`    format: ${ format }`)
    console.log(`    instruction_size: ${ instruction_size }`)
    console.log(`    integer_size: ${ integer_size }`)
    console.log(`    number_size: ${ number_size }`)
    return index
}

function read_string(bytes: Buffer, index: number): [string, number]
{
    let length = 0
    while (bytes.at(index + length) != 0)
        length += 1

    const str = bytes.subarray(index, index + length).toString('utf8')
    return [str, index + length + 1]
}

function read_int(bytes: Buffer, index: number): [number, number]
{
    const int = bytes.subarray(index, index + 4).readInt32BE(0)
    return [int, index + 4]
}

function read_function(bytes: Buffer, index: number)
{
    let debug_info
    let line_defined
    let last_line_defined

    [debug_info, index] = read_string(bytes, index);
    [line_defined, index] = read_int(bytes, index);
    [last_line_defined, index] = read_int(bytes, index);

    console.log(debug_info)
    console.log(line_defined)
    console.log(last_line_defined)
}

export function read_bin(bytes: Buffer)
{
    let index = read_header(bytes)
    if (index < 0)
        return

    const size_up_values = bytes.at(index)!
    index += 1

    read_function(bytes, index)
}


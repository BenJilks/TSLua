import { Engine, DataType } from '../index'
import { make_number, make_string } from '../src/runtime'

test('Sort', () =>
{
    const lua = new Engine(`
        x = { "a" = 3, "b" = 1, "c" = 4 }
        y = sort(x, function(a, b) return a - b end)
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const y = lua.global('y')
    expect(y).toBeDefined()
    expect(y?.data_type).toBe(DataType.Table)
    expect(y?.table?.get(1)).toEqual(make_string('b'))
    expect(y?.table?.get(2)).toEqual(make_string('a'))
    expect(y?.table?.get(3)).toEqual(make_string('c'))
})

test('Find', () =>
{
    const lua = new Engine(`
        x = { "a" = 3, "b" = 1, "c" = 4 }
        y = find(x, function(x) return x < 2 end)
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const y = lua.global('y')
    expect(y).toBeDefined()
    expect(y?.data_type).toBe(DataType.String)
    expect(y?.string).toBe('b')
})

test('First', () =>
{
    const lua = new Engine(`
        x = { "a" = 3, "b" = 1, "c" = 4 }
        y = first(x)
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const y = lua.global('y')
    expect(y).toBeDefined()
    expect(y?.data_type).toBe(DataType.String)
    expect(y?.string).toBe('a')
})

test('Keys', () =>
{
    const lua = new Engine(`
        x = { "a" = 3, "b" = 1, "c" = 4 }
        y = keys(x)
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const y = lua.global('y')
    expect(y).toBeDefined()
    expect(y?.data_type).toBe(DataType.Table)
    expect(y?.table?.get(1)).toEqual(make_string('a'))
    expect(y?.table?.get(2)).toEqual(make_string('b'))
    expect(y?.table?.get(3)).toEqual(make_string('c'))
})

test('Values', () =>
{
    const lua = new Engine(`
        x = { "a" = 3, "b" = 1, "c" = 4 }
        y = values(x)
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const y = lua.global('y')
    expect(y).toBeDefined()
    expect(y?.data_type).toBe(DataType.Table)
    expect(y?.table?.get(1)).toEqual(make_number(3))
    expect(y?.table?.get(2)).toEqual(make_number(1))
    expect(y?.table?.get(3)).toEqual(make_number(4))
})

test('String functions', () =>
{
    const lua = new Engine(`
        a = tonumber("42")
        b = tostring(42)

        c = string.byte("Test")
        d = string.find("Test", "e.")
        e = string.len("Test")
        f = string.upper("Test")
        g = string.lower("Test")
        h = string.reverse("Test")
        i = string.char(97, 98, 99)
        j = string.format("Test %d formatting %s", 2, "args")
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    expect(lua.global('a')).toEqual(make_number(42))
    expect(lua.global('b')).toEqual(make_string('42'))

    expect(lua.global('c')).toEqual(make_number('T'.charCodeAt(0)))
    expect(lua.global('d')).toEqual(make_number(2))
    expect(lua.global('e')).toEqual(make_number(4))
    expect(lua.global('f')).toEqual(make_string('TEST'))
    expect(lua.global('g')).toEqual(make_string('test'))
    expect(lua.global('h')).toEqual(make_string('tseT'))
    expect(lua.global('i')).toEqual(make_string('abc'))
    expect(lua.global('j')).toEqual(make_string('Test 2 formatting args'))
})

test('Table functions', () =>
{
    const lua = new Engine(`
        x = { 1 = "a", 2 = "b", 3 = "c" }
        a = table.concat(x, ",")
        table.insert(x, 2, "-")
        table.move(x, 2, 2, 4)
        table.insert(x, "c")

        b = table.pack("a", "b", "c")
        table.remove(b, 2)
        c, d = table.unpack(b)
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    expect(lua.global('a')).toEqual(make_string('a,b,c'))
    expect([...lua.global('x')?.table?.values() ?? []].map(x => x.string)).toEqual(['a', '-', 'b', '-', 'c'])
    expect([...lua.global('b')?.table?.values() ?? []].map(x => x.string)).toEqual(['a', 'c'])
    expect(lua.global('c')).toEqual(make_string('a'))
    expect(lua.global('d')).toEqual(make_string('c'))
})


import { Engine, DataType } from '../index'
import { make_string } from '../src/runtime'

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


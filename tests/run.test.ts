import { Lua, DataType } from '../index'

test('Can run a basic script', () =>
{
    const lua = new Lua('a = 1')
    lua.run()

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(1)
})

test('Can create and call function', () =>
{
    const lua = new Lua(`
        function foo(a, b)
            return a + b
        end

        a = foo(1, 2)
    `)
    lua.run()

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(3)

    const foo = lua.global('foo')
    expect(foo).not.toBeUndefined()
    expect(foo?.data_type).toBe(DataType.Function)
})

test('Locals are kept local', () =>
{
    const lua = new Lua(`
        function foo(a, b)
            local x, z
            local y = 3
            x = 2
            return a + b
        end

        local w = 4
        a = foo(1, 2)
    `)
    lua.run()

    expect(lua.global('x')).toBeUndefined()
    expect(lua.global('y')).toBeUndefined()
    expect(lua.global('z')).toBeUndefined()
    expect(lua.global('w')).toBeUndefined()
})

test('General itorators', () =>
{
    const lua = new Lua(`
        function iter(count)
            local i = 0
            return function()
                i = i + 1
                if i < count then
                    return i
                end
            end
        end

        total = 0
        for i in iter(10) do
            total = total + 1
        end
    `)
    lua.run()

    const total = lua.global('total')
    expect(total).not.toBeUndefined()
    expect(total?.data_type).toBe(DataType.Number)
    expect(total?.number).toBe(9)
})

test('Multiple values', () =>
{
    const lua = new Lua(`
        function foo()
            return 1, 2
        end

        a, b = foo()
    `)
    lua.run()

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(1)

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.Number)
    expect(b?.number).toBe(2)

    {
        const lua = new Lua(`
            function foo()
                return 1, 2
            end

            a = foo()
        `)
        expect(lua.run()).toBeInstanceOf(Error)
    }

    {
        const lua = new Lua(`
            function foo()
                return 1
            end

            a, b = foo()
        `)
        expect(lua.run()).toBeInstanceOf(Error)
    }
})

test('All operators', () =>
{
    const lua = new Lua(`
        a = 1 + 2
        b = 2 - 1
        c = 2 * 2
        d = 4 / 2

        e = 2 > 1
        f = 2 < 1
        g = e and f
        h = e or f
        i = not f
    `)
    lua.run()

    const is_number = (name: string, value: number) =>
    {
        const val = lua.global(name)
        expect(val).not.toBeUndefined()
        expect(val?.data_type).toBe(DataType.Number)
        expect(val?.number).toBe(value)
    }

    const is_boolean = (name: string, value: boolean) =>
    {
        const val = lua.global(name)
        expect(val).not.toBeUndefined()
        expect(val?.data_type).toBe(DataType.Boolean)
        expect(val?.boolean).toBe(value)
    }

    is_number('a', 3)
    is_number('b', 1)
    is_number('c', 4)
    is_number('d', 2)
    is_boolean('e', true)
    is_boolean('f', false)
    is_boolean('g', false)
    is_boolean('h', true)
    is_boolean('i', true)
})

test('Tables', () =>
{
    const lua = new Lua(`
        table = { "a", "b", c = false }
        
        b = table[2]
        table["test"] = 42
        table.d = true
    `)
    lua.run()

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.String)
    expect(b?.string).toBe('b')

    const table = lua.global('table')
    expect(table).not.toBeUndefined()
    expect(table?.data_type).toBe(DataType.Table)
    expect(table?.table?.has(1)).toBeTruthy()
    expect(table?.table?.has(2)).toBeTruthy()
    expect(table?.table?.has(3)).toBeFalsy()
    expect(table?.table?.has('c')).toBeTruthy()
    expect(table?.table?.has('test')).toBeTruthy()
    expect(table?.table?.has('d')).toBeTruthy()
})


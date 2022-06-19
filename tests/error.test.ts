import { Lua, DataType } from '../index'

test('Basic error reporting', () =>
{
    const lua = new Lua(`
        function foo()
            return a
        end

        a = foo()
    `)
    
    expect(lua.run()).toBeUndefined()

    const a = lua.global('a')
    expect(a).toBeDefined()
    expect(a?.data_type).toBe(DataType.Nil)
})

test('Parsing errors', () =>
{
    const lua = new Lua(`
        function foo()
            return a
        end

        foo(
    `)
    
    expect(lua.run()).toEqual(new Error('7:5: expected \')\', got \'EOF\' instead'))
})

test('Matching end tokens', () =>
{
    const lua = new Lua(`
        function foo()
            return a
        done

        foo()
    `)
    
    expect(lua.run()).toEqual(new Error('7:5: Missing \'end\''))
})


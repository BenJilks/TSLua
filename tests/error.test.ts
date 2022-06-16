import { Lua } from '../index'

test('Basic error reporting', () =>
{
    const lua = new Lua(`
        function foo()
            return a
        end

        foo()
    `)
    
    expect(lua.run()).toEqual(new Error('3:20: Lua value \'a\' is not defined'))
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


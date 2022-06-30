import { Engine, DataType } from '../index'

test('Short circuiting', () =>
{
    const lua = new Engine(`
        i = 0
        function foo()
            i = i + 1
            return true
        end

        if foo() or foo() then
            i = i + 1
        end

        if foo() and foo() then
            i = i + 1
        end

        if true or not (false or true) and true then
            i = i + 1
        end
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const i = lua.global('i')
    expect(i).toBeDefined()
    expect(i?.data_type).toBe(DataType.Number)
    expect(i?.number).toEqual(2 + 3 + 1)
})

test('Constant locals', () =>
{
    const lua = new Engine(`
        local a = 1

        function foo()
            a = 2
        end

        foo()
        c = a + 1
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const c = lua.global('c')
    expect(c).toBeDefined()
    expect(c?.data_type).toBe(DataType.Number)
    expect(c?.number).toEqual(3)
})

test('Constant locals don\'t leak out of blocks', () =>
{
    const lua = new Engine(`
        function foo()
            local a = 1
        end

        c = a
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const c = lua.global('c')
    expect(c).toBeDefined()
    expect(c?.data_type).toBe(DataType.Nil)
})


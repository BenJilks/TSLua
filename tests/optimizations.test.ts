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


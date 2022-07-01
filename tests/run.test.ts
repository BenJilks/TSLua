/*
 * Copyright (c) 2022, Ben Jilks <benjyjilks@gmail.com>
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

import { Engine, DataType } from '../index'

test('Can run a basic script', () =>
{
    const lua = new Engine('a = 1')
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(1)
})

test('Literals', () =>
{
    const lua = new Engine(`
        a = "hello!"
        b = 1
        c = 5.6
        d = 4.2e-2
        e = 0x4Fd
        f = true
        g = false

        h = 42x = 1
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    expect(lua.global('a')?.string).toBe('hello!')
    expect(lua.global('b')?.number).toBe(1)
    expect(lua.global('c')?.number).toBe(5.6)
    expect(lua.global('d')?.number).toBe(4.2e-2)
    expect(lua.global('e')?.number).toBe(0x4Fd)
    expect(lua.global('f')?.boolean).toBe(true)
    expect(lua.global('g')?.boolean).toBe(false)

    expect(lua.global('h')?.number).toBe(42)
    expect(lua.global('x')?.number).toBe(1)
})

test('Can create and call function', () =>
{
    const lua = new Engine(`
        function foo(a, b)
            return a + b
        end

        a = foo(1, 2)

        function bar(single)
            return 42
        end

        b = bar{ 1, 2 }
        c = bar"Single Argument"
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(3)

    const foo = lua.global('foo')
    expect(foo).not.toBeUndefined()
    expect(foo?.data_type).toBe(DataType.Function)

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.Number)
    expect(b?.number).toBe(42)

    const c = lua.global('c')
    expect(c).not.toBeUndefined()
    expect(c?.data_type).toBe(DataType.Number)
    expect(c?.number).toBe(42)
})

test('Locals are kept local', () =>
{
    const lua = new Engine(`
        function foo(a, b)
            local x, z
            local y = 3
            x = 2
            return a + b
        end

        local w = 4
        a = foo(1, 2)

        do
            local x
            x = 1
        end
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    expect(lua.global('x')).toBeUndefined()
    expect(lua.global('y')).toBeUndefined()
    expect(lua.global('z')).toBeUndefined()
    expect(lua.global('w')).toBeUndefined()
})

test('General itorators', () =>
{
    const lua = new Engine(`
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

        for k, v in ipairs({}) do
            total = total + 1
        end
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const total = lua.global('total')
    expect(total).not.toBeUndefined()
    expect(total?.data_type).toBe(DataType.Number)
    expect(total?.number).toBe(9)
})

test('Numeric itorators', () =>
{
    const lua = new Engine(`
        total = 0
        for i = 0, 10 do
            total = total + 1
        end

        nums = ""
        for i = 10, 0, -1 do
            nums = nums .. i
        end
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const total = lua.global('total')
    expect(total).not.toBeUndefined()
    expect(total?.data_type).toBe(DataType.Number)
    expect(total?.number).toBe(10)

    const nums = lua.global('nums')
    expect(nums).not.toBeUndefined()
    expect(nums?.data_type).toBe(DataType.String)
    expect(nums?.string).toBe('10987654321')
})

test('Multiple values', () =>
{
    const lua = new Engine(`
        function foo()
            return 1, 2
        end

        a, b = foo()
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(1)

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.Number)
    expect(b?.number).toBe(2)

    {
        const lua = new Engine(`
            function foo()
                return 1, 2
            end

            a = foo()
        `)
        expect(lua.run()).not.toBeInstanceOf(Error)

        const a = lua.global('a')
        expect(a).not.toBeUndefined()
        expect(a?.data_type).toBe(DataType.Number)
        expect(a?.number).toBe(1)
    }

    {
        const lua = new Engine(`
            function foo()
                return 1
            end

            a, b = foo()
        `)
        expect(lua.run()).not.toBeInstanceOf(Error)

        const a = lua.global('a')
        expect(a).not.toBeUndefined()
        expect(a?.data_type).toBe(DataType.Number)
        expect(a?.number).toBe(1)

        const b = lua.global('b')
        expect(b).not.toBeUndefined()
        expect(b?.data_type).toBe(DataType.Nil)
    }
})

test('All operators', () =>
{
    const lua = new Engine(`
        a = 1 + 2
        b = 2 - 1
        c = 2 * 2
        d = 4 / 2

        e = 2 > 1
        f = 2 < 1
        g = e and f
        h = e or f
        i = not f

        j = "test" == "test"
        k = "test" ~= "test"
        l = "test" .. "test"

        m = 3 // 2
        n = 6 % 3
        o = 4 ^ 2

        p = 2 & 3
        q = 2 | 3
        r = 2 ~ 3
        s = 2 >> 1
        t = 2 << 1
        u = ~2
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

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
    is_boolean('j', true)
    is_boolean('k', false)

    const l = lua.global('l')
    expect(l).not.toBeUndefined()
    expect(l?.data_type).toBe(DataType.String)
    expect(l?.string).toBe('testtest')

    is_number('m', 1)
    is_number('n', 0)
    is_number('o', 16)

    is_number('p', 2)
    is_number('q', 3)
    is_number('r', 1)
    is_number('s', 1)
    is_number('t', 4)
    is_number('u', -3)
})

test('Tables', () =>
{
    const lua = new Engine(`
        x = { "a", "b", c = false, ["x" .. "y"] = "expr" }
        
        b = x[2]
        c = x["xy"]
        x["test"] = 42
        x.d = true
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.String)
    expect(b?.string).toBe('b')

    const c = lua.global('c')
    expect(c).not.toBeUndefined()
    expect(c?.data_type).toBe(DataType.String)
    expect(c?.string).toBe('expr')

    const x = lua.global('x')
    expect(x).not.toBeUndefined()
    expect(x?.data_type).toBe(DataType.Table)
    expect(x?.table?.has(1)).toBeTruthy()
    expect(x?.table?.has(2)).toBeTruthy()
    expect(x?.table?.has(3)).toBeFalsy()
    expect(x?.table?.has('c')).toBeTruthy()
    expect(x?.table?.has('test')).toBeTruthy()
    expect(x?.table?.has('d')).toBeTruthy()
})

test('Sub-expressions', () =>
{
    const lua = new Engine(`
        a = 1 + 2 * 2
        b = 2 * 2 + 1
        c = 1 + 2 * 2 == 2 * 2 + 1 and true
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(5)

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.Number)
    expect(b?.number).toBe(5)

    const c = lua.global('c')
    expect(c).not.toBeUndefined()
    expect(c?.data_type).toBe(DataType.Boolean)
    expect(c?.boolean).toBe(true)
})

test('Break', () =>
{
    const lua = new Engine(`
        i = 0
        while i < 1 do
            break
            i = i + 1
        end

        for k, v in ipairs({ 1, 2 }) do
            break
            i = i + 1
        end
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const i = lua.global('i')
    expect(i).not.toBeUndefined()
    expect(i?.data_type).toBe(DataType.Number)
    expect(i?.number).toBe(0)
})

test('Local functions', () =>
{
    const lua = new Engine(`
        package = {}

        function package.new()
            return 42
        end

        a = package.new()
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(42)
})

test('Comments', () =>
{
    const lua = new Engine(`
        -- This is a comment
        a = 1 -- A different comment
        -- More comments
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(1)
})

test('If, ElseIf and Else', () =>
{
    const lua = new Engine(`
        if true then
            a = 1
        else
            a = 2
        end

        if false then
            b = 1
        else
            b = 2
        end

        if 1 > 2 then
            c = 1
        elseif 1 < 2 then
            c = 2
        elseif true then
            c = 3
        else
            c = 4
        end
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(1)

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.Number)
    expect(b?.number).toBe(2)
})

test('Length operator', () =>
{
    const lua = new Engine(`
        a = #"Hello, world!"
        b = #{ "a", "b", "c" }
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(13)

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.Number)
    expect(b?.number).toBe(3)
})

test('Local to block', () =>
{
    const lua = new Engine(`
        function foo()
            local y, bar
            y = 1

            if true then
                local x
                x = y
                bar = function() return x end
            end

            if x ~= nil then
                return nil
            end
            return bar
        end

        a = foo()()
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.Number)
    expect(a?.number).toBe(1)
})

test('String escapes', () =>
{
    const lua = new Engine(`
        a = "This\\nString\\tContains\\"escapes\\""
        b = [[
            Multi-line strings
        ]]
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.String)
    expect(a?.string).toBe('This\nString\tContains"escapes"')

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.String)
    expect(b?.string).toContain('Multi-line strings')
})

test('Semi-colon seperation', () =>
{
    const lua = new Engine(`
        function foo(arg)
            return arg
        end

        a = foo "a"
        b = foo ; "b"
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).not.toBeUndefined()
    expect(a?.data_type).toBe(DataType.String)
    expect(a?.string).toBe('a')

    const b = lua.global('b')
    expect(b).not.toBeUndefined()
    expect(b?.data_type).toBe(DataType.Function)
})

test('Repeat statement', () =>
{
    const lua = new Engine(`
        i = 0
        repeat
            i = i + 1
        until i > 2

        repeat
            i = i - 1
        until true
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const i = lua.global('i')
    expect(i).not.toBeUndefined()
    expect(i?.data_type).toBe(DataType.Number)
    expect(i?.number).toBe(2)
})


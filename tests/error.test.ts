/*
 * Copyright (c) 2022, Ben Jilks <benjyjilks@gmail.com>
 *
 * SPDX-License-Identifier: BSD-2-Clause
 */

import { Engine, DataType } from '../index'

test('Basic error reporting', () =>
{
    const lua = new Engine(`
        function foo()
            return a
        end

        a = foo()
    `)
    
    expect(lua.run()).not.toBeInstanceOf(Error)

    const a = lua.global('a')
    expect(a).toBeDefined()
    expect(a?.data_type).toBe(DataType.Nil)
})

test('Parsing errors', () =>
{
    const lua = new Engine(`
        function foo()
            return a
        end

        foo(
    `)
    
    expect(lua.run()).toEqual(new Error('7:5: expected \')\', got \'EOF\' instead'))
})

test('Matching end tokens', () =>
{
    const lua = new Engine(`
        function foo()
            return a
        done

        foo()
    `)
    
    expect(lua.run()).toEqual(new Error('7:5: Missing \'end\''))
})


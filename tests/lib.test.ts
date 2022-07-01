import { Engine, DataType } from '../index'
import { make_boolean, make_number, make_string, nil } from '../src/runtime'

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

        k = string.rep("r", 3, ",")
        l = string.sub("Hello, Lua!", 8, 10)
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

    expect(lua.global('k')).toEqual(make_string('r,r,r'))
    expect(lua.global('l')).toEqual(make_string('Lua'))
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

test('Math functions', () =>
{
    const lua = new Engine(`
        a = math.abs(-2)
        b = math.acos(3)
        c = math.asin(3)
        d = math.atan(3)
        e = math.ceil(1.1)
        f = math.cos(3)
        g = math.deg(3)
        h = math.exp(3)
        i = math.floor(1.9)
        j = math.fmod(1, 2)
        k = math.log(2, 4)
        l = math.max(1, 3, 2)
        m = math.min(9, 3, -3)
        n, nn = math.modf(3.442)
        p = math.rad(3)
        r = math.randomseed(1, 2)
        q = math.random()
        s = math.sin(3)
        t = math.sqrt(4)
        u = math.tan(3)
        v = math.tointeger(4.6)
        w = math.type(2)
        x = math.ult(1, -1)

        pi = math.pi
        maxinteger = math.maxinteger
        mininteger = math.mininteger
        huge = math.huge
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    expect(lua.global('a')).toEqual(make_number(2))
    expect(lua.global('b')).toEqual(make_number(Math.acos(3)))
    expect(lua.global('c')).toEqual(make_number(Math.asin(3)))
    expect(lua.global('d')).toEqual(make_number(Math.atan(3)))
    expect(lua.global('e')).toEqual(make_number(2))
    expect(lua.global('f')).toEqual(make_number(Math.cos(3)))
    expect(lua.global('g')?.number).toBeCloseTo(171.88733853924697, 5)
    expect(lua.global('h')).toEqual(make_number(Math.exp(3)))
    expect(lua.global('i')).toEqual(make_number(1))
    expect(lua.global('j')).toEqual(make_number(1))
    expect(lua.global('k')).toEqual(make_number(0.5))
    expect(lua.global('l')).toEqual(make_number(3))
    expect(lua.global('m')).toEqual(make_number(-3))
    expect(lua.global('n')).toEqual(make_number(3))
    expect(lua.global('nn')?.number).toBeCloseTo(0.442, 3)
    expect(lua.global('p')?.number).toBeCloseTo(0.05235987755982989, 5)
    expect(lua.global('r')).toBe(nil)
    expect(lua.global('q')?.number).toBeCloseTo(0.005859375234194886, 5)
    expect(lua.global('s')).toEqual(make_number(Math.sin(3)))
    expect(lua.global('t')).toEqual(make_number(Math.sqrt(4)))
    expect(lua.global('u')).toEqual(make_number(Math.tan(3)))
    expect(lua.global('v')).toEqual(make_number(4))
    expect(lua.global('w')).toEqual(make_string('integer'))
    expect(lua.global('x')).toEqual(make_boolean(true))

    expect(lua.global('pi')).toEqual(make_number(Math.PI))
    expect(lua.global('maxinteger')).toEqual(make_number(0xFFFFFFFF))
    expect(lua.global('mininteger')).toEqual(make_number(-(0xFFFFFFFF - 1)))
    expect(lua.global('huge')).toEqual(make_number(Infinity))
})

test('Itorator functions', () =>
{
    const lua = new Engine(`
        arr = table.pack("a", "b", "c")

        pair_output = ""
        for k, v in pairs(arr) do
            pair_output = pair_output .. k .. "=" .. v .. ","
        end

        ipair_output = ""
        for i, v in ipairs(arr) do
            ipair_output = ipair_output .. i .. "=" .. v .. ","
        end
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    const pair_output = lua.global('pair_output')
    expect(pair_output).toBeDefined()
    expect(pair_output?.data_type).toBe(DataType.String)
    expect(pair_output?.string).toBe('1=a,2=b,3=c,n=3,')

    const ipair_output = lua.global('ipair_output')
    expect(ipair_output).toBeDefined()
    expect(ipair_output?.data_type).toBe(DataType.String)
    expect(ipair_output?.string).toBe('1=a,2=b,3=c,')
})

test('Error functions', () =>
{
    {
        const lua = new Engine(`
            assert(true, "This should be fine")
            assert(false, "Nope")
        `)
        expect(lua.run()).toEqual(new Error('3:13: Nope'))
    }

    {
        const lua = new Engine(`
            error "This is an error"
        `)
        expect(lua.run()).toEqual(new Error('2:13: This is an error'))
    }
})

test('Select function', () =>
{
    const lua = new Engine(`
        a, b = select(2, 1, 2, 3)
        c, d = select(-1, 1, 2, 3)
        e = select("#", 1, 2, 3)
    `)
    expect(lua.run()).not.toBeInstanceOf(Error)

    expect(lua.global('a')?.number).toBe(2)
    expect(lua.global('b')?.number).toBe(3)

    expect(lua.global('c')?.number).toBe(2)
    expect(lua.global('d')?.number).toBe(3)

    expect(lua.global('e')?.number).toBe(3)
})


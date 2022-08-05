import { Engine, Variable, nil, to_string } from 'tslua'

function run_program(engine: Engine): Promise<Error | Variable>
{
    return new Promise(resolve =>
    {
        const interval = setInterval(() =>
        {
            const result = engine.run_for_steps(100)
            if (result != undefined)
            {
                clearInterval(interval)
                resolve(result)
            }
        })
    })
}

function create_next_input(input: HTMLTextAreaElement, output: HTMLElement)
{
    input.readOnly = true
    input.id = ''
    output.id = ''
    input.rows = input.value.split('\n').length
    input.style.height = 'fit-content'

    const new_input = document.createElement('textarea')
    const new_output = document.createElement('p')
    new_input.id = 'input'
    new_input.rows = 10
    new_output.id = 'output'
    output.after(new_input, new_output)
}

async function run(engine: Engine)
{
    const input = <HTMLTextAreaElement> document.getElementById('input')!
    const output = <HTMLElement> document.getElementById('output')!
    output.innerHTML = ''

    const compiler_result = engine.load(input.value)
    if (compiler_result != undefined)
    {
        output.innerHTML += `<text class="error">${ compiler_result.message }</text><br>`
        return
    }

    engine.define('print', (_: Engine, ...args: Variable[]) =>
    {
        output.innerHTML +=
            `<text>${ args.map(x => to_string(x)).join(' ') }</text><br>`
        return [nil]
    })

    const runtime_result = await run_program(engine)
    if (runtime_result instanceof Error)
    {
        output.innerHTML += `<text class="error">${ runtime_result.message }</text><br>`
        return
    }

    output.innerHTML += `<text>Result: ${ to_string(runtime_result) }</text><br>`
    create_next_input(input, output)
}

function bytecode()
{
    const input = <HTMLTextAreaElement> document.getElementById('input')!
    const output = <HTMLTextAreaElement> document.getElementById('output')!
    const engine = new Engine(input.value)
    output.innerHTML = engine.bytecode().join('<br>')
}

function input(event: KeyboardEvent)
{
    const input = <HTMLTextAreaElement> document.getElementById('input')!
    const cursor = input.selectionStart
    if (cursor != input.selectionEnd)
        return

    switch(event.code)
    {
        case 'Tab':
        {
            input.value =
                input.value.slice(0, cursor) +
                '    ' +
                input.value.slice(cursor)
            input.selectionStart = cursor + 4
            input.selectionEnd = input.selectionStart
            event.preventDefault()
            break
        }

        case 'Backspace':
        {
            const is_indent = input.value
                .slice(cursor - 4, cursor)
                .split('')
                .map(c => c.charCodeAt(0))
                .every(c => c == 32 || c == 160)

            let back_count = 1
            if (cursor >= 4 && is_indent)
                back_count = 4

            input.value = 
                input.value.slice(0, cursor - back_count) +
                input.value.slice(cursor)
            
            input.selectionStart = cursor - back_count
            input.selectionEnd = input.selectionStart
            event.preventDefault()
            break
        }
    }
}

function init()
{
    const engine = new Engine()
    document.getElementById('run')!.onclick = () => run(engine)
    document.getElementById('bytecode')!.onclick = bytecode
    document.getElementById('input')!.onkeydown = input
}

init()


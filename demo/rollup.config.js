import typescript from 'rollup-plugin-typescript2'

export default
[
    {
        input: 'demo.ts',

        output:
        {
            file: 'demo.js',
            format: 'cjs',
        },

        plugins:
        [
            typescript(),
        ],
    }
]



# TSLua

A pure TypeScript reimplementation of the Lua programming language.

This implementation is designed to be as close as possible to the original C implementation, while providing seamless TypeScript/JavaScript interoperability. All 'native' functions are implemented in TypeScript and objects are represented using standard JavaScript object. Meaning garbage collection is left as the responsibility of the JavaScript engine.

To create a Lua runtime environment, simply instantiate the `Engine` object within the `lua` module. It's constructor accepts a Lua script, that can be executed with the `run` method. Additional code can be loaded using the `load` method.

Global state is maintained for the whole lifetime of the `Engine` object. Lua variables can be queried by name using the `global` method. `define` and `define_table` can also be used to interact with the global object. An example is shown below:

```ts
    const engine = lua.Engine('a = 1 + 2')
    engine.run()

    const a = engine.global('a')?.number
    console.log(a) // --> 3
```

# Lua Reference Manual

Below is the full Lua reference manual, adapted to reflect the changes make in this implementation. It's mostly the same but with the C specific details and functions removed.

To see the full source material, see the official [Lua Reference Manual](https://www.lua.org/manual/5.4/manual.html). All official Lua material is distributed under the [Lua Licence](http://www.lua.org/license.html)

# Introduction

Lua is a powerful, efficient, lightweight, embeddable scripting language. It supports procedural programming, object-oriented programming, functional programming, data-driven programming, and data description.

Lua combines simple procedural syntax with powerful data description constructs based on associative arrays and extensible semantics. Lua is dynamically typed, runs by interpreting bytecode with a register-based virtual machine, and has automatic memory management with a generational garbage collection, making it ideal for configuration, scripting, and rapid prototyping.

Lua is free software, and is provided as usual with no guarantees, as stated in its license. The implementation described in this manual is available at Lua's official web site, [www.lua.org](https://www.lua.org/).

Like any other reference manual, this document is dry in places. For a discussion of the decisions behind the design of Lua, see the technical papers available at Lua's web site. For a detailed introduction to programming in Lua, see Roberto's book, [*Programming in Lua*](https://www.lua.org/pil/).

# Basic Concepts

This section describes the basic concepts of the language.

## Values and Types

Lua is a dynamically typed language. This means that variables do not have types; only values do. There are no type definitions in the language. All values carry their own type.

All values in Lua are first-class values. This means that all values can be stored in variables, passed as arguments to other functions, and returned as results.

There are eight basic types in Lua: *nil*, *boolean*, *number*,*string*, *function*, *userdata*, *thread*, and *table*. The type *nil* has one single value, **nil**, whose main property is to be different from any other value; it often represents the absence of a useful value. The type *boolean* has two values, **false** and **true**. Both **nil** and **false** make a condition false; they are collectively called*false values*. Any other value makes a condition true. Despite its name, **false** is frequently used as an alternative to **nil**, with the key difference that **false** behaves like a regular value in a table, while a **nil** in a table represents an absent key.

The type *number* represents both integer numbers and real(floating-point) numbers, using two subtypes: *integer* and *float*. Standard Lua uses 64-bit integers and double-precision (64-bit) floats.

Unless stated otherwise, any overflow when manipulating integer values *wrap around*, according to the usual rules of two-complement arithmetic. (In other words, the actual result is the unique representable integer that is equal modulo *2^n^* to the mathematical result, where *n* is the number of bits of the integer type.)

Lua has explicit rules about when each subtype is used, but it also converts between them automatically as needed. Therefore, the programmer may choose to mostly ignore the difference between integers and floats or to assume complete control over the representation of each number.

The type *string* represents immutable sequences of bytes. Lua is 8-bit clean: strings can contain any 8-bit value, including embedded zeros('`\0`'). Lua is also encoding-agnostic; it makes no assumptions about the contents of a string. The length of any string in Lua must fit in a Lua integer.

The type *table* implements associative arrays, that is, arrays that can have as indices not only numbers, but any Lua value except **nil** and NaN. (*Not a Number* is a special floating-point value used by the IEEE754 standard to represent undefined numerical results, such as `0/0`.)Tables can be *heterogeneous*; that is, they can contain values of all types (except **nil**). Any key associated to the value **nil** is not considered part of the table. Conversely, any key that is not part of a table has an associated value **nil**.

Tables are the sole data-structuring mechanism in Lua; they can be used to represent ordinary arrays, lists, symbol tables, sets, records,graphs, trees, etc. To represent records, Lua uses the field name as an index. The language supports this representation by providing `a.name`as syntactic sugar for `a["name"]`. There are several convenient ways tocreate tables in Lua.

Like indices, the values of table fields can be of any type. In particular, because functions are first-class values, table fields can contain functions. Thus tables can also carry *methods*.

The indexing of tables follows the definition of raw equality in the language. The expressions `a[i]` and `a[j]` denote the same table element if and only if `i` and `j` are raw equal (that is, equal without meta methods). In particular, floats with integral values are equal to their respective integers (e.g., `1.0 == 1`). To avoid ambiguities, any float used as a key that is equal to an integer is converted to that integer. For instance, if you write `a[2.0] = true`, the actual key inserted into the table will be the integer `2`.

Tables values are *objects*: variables do not actually *contain* these values, only *references* to them. Assignment, parameter passing, and function returns always manipulate references to such values; these operations do not imply any kind of copy.

The library function `type` returns a string describing the type of a given value.

# The Language

This section describes the lexis, the syntax, and the semantics of Lua. In other words, this section describes which tokens are valid, how they can be combined, and what their combinations mean.

Language constructs will be explained using the usual extended BNF notation, in which {*a*} means 0 or more *a*'s, and [*a*] means an optional *a*. Non-terminals are shown like non-terminal, keywords are shown like **kword**, and other terminal symbols are shown like '**=**'.

## Lexical Conventions

Lua is a free-form language. It ignores spaces and comments between lexical elements (tokens), except as delimiters between two tokens. In source code, Lua recognizes as spaces the standard ASCII whitespace characters space, form feed, newline, carriage return, horizontal tab,and vertical tab.

*Names* (also called *identifiers*) in Lua can be any string of Latin letters, Arabic-Indic digits, and underscores, not beginning with a digit and not being a reserved word. Identifiers are used to name variables, table fields, and labels.

The following *keywords* are reserved and cannot be used as names:

```lua
    and     break   do      else        elseif
    end     false   for     function    goto
    if      in      local   nil         not 
    or      repeat  return  then        true 
    until   while
```

Lua is a case-sensitive language: `and` is a reserved word, but `And`and `AND` are two different, valid names. As a convention, programs should avoid creating names that start with an underscore followed by one or more uppercase letters (such as `_VERSION`).

The following strings denote other tokens:

```lua
    +     -     *     /     %     ^     #
    &     ~     |     <<    >>    //
    ==    ~=    <=    >=    <     >     =
    (     )     {     }     [     ]     ::
    ;     :     ,     .     ..    ...
```

A *short literal string* can be delimited by matching single or double quotes, and can contain the following C-like escape sequences: '`\a`'(bell), '`\b`' (backspace), '`\f`' (form feed), '`\n`' (newline),'`\r`' (carriage return), '`\t`' (horizontal tab), '`\v`' (vertical tab), '`\\`' (backslash), '`\"`' (quotation mark [doublequote]), and '`\'`' (apostrophe [single quote]). A backslash followed by a line break results in a newline in the string. The escape sequence '`\z`' skips the following span of whitespace characters,including line breaks; it is particularly useful to break and indent along literal string into multiple lines without adding the newlines and spaces into the string contents. A short literal string cannot contain unescaped line breaks nor escapes not forming a valid escape sequence.

We can specify any byte in a short literal string, including embedded zeros, by its numeric value. This can be done with the escape sequence`\xXX`, where *XX* is a sequence of exactly two hexadecimal digits, or with the escape sequence `\ddd`, where *ddd* is a sequence of up to three decimal digits. (Note that if a decimal escape sequence is to be followed by a digit, it must be expressed using exactly three digits.)

The UTF-8 encoding of a Unicode character can be inserted in a literal string with the escape sequence `\u{XXX}` (with mandatory enclosing braces), where *XXX* is a sequence of one or more hexadecimal digits representing the character code point. This code point can be any valueless than *2^31^*. (Lua uses the original UTF-8 specification here,which is not restricted to valid Unicode code points.)

Literal strings can also be defined using a long format enclosed by*long brackets*. We define an *opening long bracket of level *n** as an opening square bracket followed by *n* equal signs followed by another opening square bracket. So, an opening long bracket of level 0 is written as `[[`, an opening long bracket of level 1 is written as `[=[`,and so on. A *closing long bracket* is defined similarly; for instance,a closing long bracket of level 4 is written as `]====]`. A *long literal* starts with an opening long bracket of any level and ends at the first closing long bracket of the same level. It can contain any text except a closing bracket of the same level. Literals in this bracketed form can run for several lines, do not interpret any escape sequences, and ignore long brackets of any other level. Any kind of end-of-line sequence (carriage return, newline, carriage return followed by newline, or newline followed by carriage return) is converted to a simple newline. When the opening long bracket is immediately followed by a newline, the newline is not included in the string.

As an example, in a system using ASCII (in which '`a`' is coded as 97,newline is coded as 10, and '`1`' is coded as 49), the five literalstrings below denote the same string:

```lua
    a = 'alo\n123"'
    a = "alo\n123\""
    a = '\97lo\10\04923"'
    a = [[alo         123"]]
    a = [==[         alo         123"]==]
```

Any byte in a literal string not explicitly affected by the previous rules represents itself. However, Lua opens files for parsing in text mode, and the system's file functions may have problems with some control characters. So, it is safer to represent binary data as a quoted literal with explicit escape sequences for the non-text characters.

A *numeric constant* (or *numeral*) can be written with an optional fractional part and an optional decimal exponent, marked by a letter'`e`' or '`E`'. Lua also accepts hexadecimal constants, which start with `0x` or `0X`. Hexadecimal constants also accept an optional fractional part plus an optional binary exponent, marked by a letter'`p`' or '`P`'.

A numeric constant with a radix point or an exponent denotes a float;otherwise, if its value fits in an integer or it is a hexadecimal constant, it denotes an integer; otherwise (that is, a decimal integer numeral that overflows), it denotes a float. Hexadecimal numerals with neither a radix point nor an exponent always denote an integer value; if the value overflows, it *wraps around* to fit into a valid integer.

Examples of valid integer constants are

```lua
    3
    345 
    0xff
    0xBEBADA
```

Examples of valid float constants are

```lua
    3.0 
    3.1416
    314.16e-2
    0.31416E1
    34e1
    0x0.1E
    0xA23p-4
    0X1.921FB54442D18P+1
```

A *comment* starts with a double hyphen (`--`) anywhere outside a string. If the text immediately after `--` is not an opening long bracket, the comment is a *short comment*, which runs until the end of the line. Otherwise, it is a *long comment*, which runs until the corresponding closing long bracket.

## Variables

Variables are places that store values. There are three kinds of variables in Lua: global variables, local variables, and table fields.

A single name can denote a global variable or a local variable (or a function's formal parameter, which is a particular kind of local variable):

```lua
    var ::= Name
```

Name denotes identifiers.

Any variable name is assumed to be global unless explicitly declared as a local. Local variables are *lexically scoped*: local variables can be freely accessed by functions defined inside their scope.

Before the first assignment to a variable, its value is **nil**.

Square brackets are used to index a table:

```lua
    var ::= prefixexp ‘[’ exp ‘]’
```

The syntax `var.Name` is just syntactic sugar for `var["Name"]`:

```lua
    var ::= prefixexp ‘.’ Name
```

## Statements

Lua supports an almost conventional set of statements, similar to those in other conventional languages. This set includes blocks, assignments,control structures, function calls, and variable declarations.

### Blocks

A block is a list of statements, which are executed sequentially:

```lua
    block ::= {stat}
```

Lua has *empty statements* that allow you to separate statements with semicolons, start a block with a semicolon or write two semicolons in sequence:

```lua
    stat ::= ‘;’
```

Both function calls and assignments can start with an open parenthesis. This possibility leads to an ambiguity in Lua's grammar. Consider the following fragment:

```lua
    a = b + c         (print or io.write)('done')
```

The grammar could see this fragment in two ways:

```lua
    a = b + c(print or io.write)('done')
    a = b + c; (print or io.write)('done')
```

The current parser always sees such constructions in the first way,interpreting the open parenthesis as the start of the arguments to a call. To avoid this ambiguity, it is a good practice to always precede with a semicolon statements that start with a parenthesis:

```lua
    ;(print or io.write)('done')
```

A block can be explicitly delimited to produce a single statement:

```lua
    stat ::= do block end
```

Explicit blocks are useful to control the scope of variable declarations. Explicit blocks are also sometimes used to add a **return** statement in the middle of another block.

### Chunks

The unit of compilation of Lua is called a *chunk*. Syntactically, a chunk is simply a block:

```lua
    chunk ::= block
```

Lua handles a chunk as the body of an anonymous function with a variable number of arguments. As such, chunks can define local variables, receive arguments, and return values. Moreover, such anonymous function is compiled as in the scope of an external local variable called `_ENV`. The resulting function always has `_ENV` as its only external variable, even if it does not use that variable.

A chunk can be stored in a file or in a string inside the host program. To execute a chunk, Lua first *loads* it, precompiling the chunk's code into instructions for a virtual machine, and then Lua executes the compiled code with an interpreter for the virtual machine.

### Assignment

Lua allows multiple assignments. Therefore, the syntax for assignment defines a list of variables on the left side and a list of expressions on the right side. The elements in both lists are separated by commas:

```lua
    stat ::= varlist ‘=’ explist
    varlist ::= var {‘,’ var}
    explist ::= exp {‘,’ exp}
```

Before the assignment, the list of values is *adjusted* to the length of the list of variables. If there are more values than needed, the excess values are thrown away. If there are fewer values than needed, the list is extended with **nil**'s. If the list of expressions ends with a function call, then all values returned by that call enter the list of values, before the adjustment (except when the call is enclosed in parentheses.

The assignment statement first evaluates all its expressions and only then the assignments are performed. Thus the code

```lua
    i = 3
    i, a[i] = i+1, 20
```

sets `a[3]` to 20, without affecting `a[4]` because the `i` in `a[i]` is evaluated (to 3) before it is assigned 4. Similarly, the line

```lua
    x, y = y, x
```

exchanges the values of `x` and `y`, and

```lua
    x, y, z = y, z, x
```

cyclically permutes the values of `x`, `y`, and `z`.

An assignment to a global name `x = val` is equivalent to the assignment`_ENV.x = val`.

### Control Structures

The control structures **if**, **while**, and **repeat** have the usual meaning and familiar syntax:

```lua
    stat ::= while exp do block end
    stat ::= repeat block until exp
    stat ::= if exp then block {elseif exp then block} [else block] end
```

Lua also has a **for** statement, in two flavors.

The condition expression of a control structure can return any value. Both **false** and **nil** test false. All values different from **nil** and **false** test true. In particular, the number 0 and the empty string also test true.

In the **repeat**--**until** loop, the inner block does not end at the **until** keyword, but only after the condition. So, the condition can refer to local variables declared inside the loop block.

The **break** statement terminates the execution of a **while**,**repeat**, or **for** loop, skipping to the next statement after the loop:

```lua
    stat ::= break
```

A **break** ends the innermost enclosing loop.

The **return** statement is used to return values from a function or a chunk (which is handled as an anonymous function). Functions can return more than one value, so the syntax for the **return** statement is

```lua
    stat ::= return [explist] [‘;’]
```

The **return** statement can only be written as the last statement of a block. If it is necessary to **return** in the middle of a block, thenan explicit inner block can be used, as in the idiom `do return end`, because now **return** is the last statement in its (inner) block.

### For Statement

The **for** statement has two forms: one numerical and one generic.

#### The numerical **for** loop

The numerical **for** loop repeats a block of code while a control variable goes through an arithmetic progression. It has the following syntax:

```lua
    stat ::= for Name ‘=’ exp ‘,’ exp [‘,’ exp] do block end
```

The given identifier (Name) defines the control variable, which is a new variable local to the loop body (*block*).

The loop starts by evaluating once the three control expressions. Their values are called respectively the *initial value*, the *limit*, and the *step*. If the step is absent, it defaults to 1.

If both the initial value and the step are integers, the loop is done with integers; note that the limit may not be an integer. Otherwise, the three values are converted to floats and the loop is done with floats. Beware of floating-point accuracy in this case.

After that initialization, the loop body is repeated with the value of the control variable going through an arithmetic progression, starting at the initial value, with a common difference given by the step. A negative step makes a decreasing sequence; a step equal to zero raises an error. The loop continues while the value is less than or equal to the limit (greater than or equal to for a negative step). If the initial value is already greater than the limit (or less than, if the step is negative), the body is not executed.

For integer loops, the control variable never wraps around; instead, the loop ends in case of an overflow.

You should not change the value of the control variable during the loop. If you need its value after the loop, assign it to another variable before exiting the loop.

#### The generic **for** loop

The generic **for** statement works over functions, called *iterators*. On each iteration, the iterator function is called to produce a new value, stopping when this new value is **nil**. The generic **for** loop has the following syntax:

```lua
    stat ::= for namelist in explist do block end
    namelist ::= Name {‘,’ Name}
```

A **for** statement like

```lua
    for var_1, ···, var_n in explist do body end
```

Works as follows.

The names *var_i* declare loop variables local to the loop body. The first of these variables is the *control variable*.

The loop starts by evaluating *explist* to produce four values: an*iterator function*, a *state*, an initial value for the control variable, and a *closing value*.

Then, at each iteration, Lua calls the iterator function with two arguments: the state and the control variable. The results from this call are then assigned to the loop variables, following the rules of multiple assignments. If the control variable becomes **nil**, the loop terminates. Otherwise, the body is executed and the loop goes to the next iteration.

The closing value behaves like a to-be-closed variable, which can be used to release resources when the loop ends. Otherwise, it does not interfere with the loop.

You should not change the value of the control variable during the loop.

### Function Calls as Statements

To allow possible side-effects, function calls can be executed as statements:

```lua
    stat ::= functioncall
```

In this case, all returned values are thrown away.

### Local Declarations

Local variables can be declared anywhere inside a block. The declaration can include an initialization:

```lua
    stat ::= local attnamelist [‘=’ explist]
    attnamelist ::=  Name attrib {‘,’ Name attrib}
```

If present, an initial assignment has the same semantics of a multiple assignment. Otherwise, all variables are initialized with **nil**.

Each variable name may be post fixed by an attribute (a name between angle brackets):

```lua
    attrib ::= [‘<’ Name ‘>’]
```

There are two possible attributes: `const`, which declares a constant variable, that is, a variable that cannot be assigned to after its initialization; and `close`, which declares a to-be-closed variable. A list of variables can contain at most one to-be-closed variable.

A chunk is also a block, and so local variable scan be declared in a chunk outside any explicit block.

### To-be-closed Variables

A to-be-closed variable behaves like a constant local variable, except that its value is *closed* whenever the variable goes out of scope,including normal block termination, exiting its block by**break**/**goto**/**return**, or exiting by an error.

Here, to *close* a value means to call its `__close` metamethod. When calling the metamethod, the value itself is passed as the first argument and the error object that caused the exit (if any) is passed as a second argument; if there was no error, the second argument is **nil**.

The value assigned to a to-be-closed variable must have a `__close`metamethod or be a false value. (**nil** and **false** are ignored as to-be-closed values.)

If several to-be-closed variables go out of scope at the same event,they are closed in the reverse order that they were declared.

If there is any error while running a closing method, that error is handled like an error in the regular code where the variable was defined. After an error, the other pending closing methods will still be called.

If a coroutine yields and is never resumed again, some variables may never go out of scope, and therefore they will never be closed. (These variables are the ones created inside the coroutine and in scope at the point where the coroutine yielded.) Similarly, if a coroutine ends with an error, it does not unwind its stack, so it does not close any variable. In both cases, you can either use finalizers or call `coroutine.close` to close the variables. However, if the coroutine was created through `coroutine.wrap`, then its corresponding function will close the coroutine in case of errors.

## Expressions

The basic expressions in Lua are the following:

```lua
    exp ::= prefixexp
    exp ::= nil | false | true
    exp ::= Numeral
    exp ::= LiteralString
    exp ::= functiondef
    exp ::= tableconstructor
    exp ::= ‘...’
    exp ::= exp binop exp
    exp ::= unop exp
    prefixexp ::= var | functioncall | ‘(’ exp ‘)’
```

Both function calls and var arg expressions can result in multiple values. If a function call is used as a statement, then its return list is adjusted to zero elements, thus discarding all returned values. If an expression is used as the last (or the only) element of a list of expressions, then no adjustment is made (unless the expression is enclosed in parentheses). In all other contexts, Lua adjusts the result list to one element, either discarding all values except the first one or adding a single **nil** if there are no values.

Here are some examples:

```lua
    f()                -- adjusted to 0 results
    g(f(), x)          -- f() is adjusted to 1 result
    g(x, f())          -- g gets x plus all results from f()
    a,b,c = f(), x     -- f() is adjusted to 1 result (c gets nil)
    a,b = ...          -- a gets the first vararg argument, b gets
                       -- the second (both a and b can get nil if there
                       -- is no corresponding vararg argument)

    a,b,c = x, f()     -- f() is adjusted to 2 results
    a,b,c = f()        -- f() is adjusted to 3 results
    return f()         -- returns all results from f()
    return ...         -- returns all received vararg arguments
    return x,y,f()     -- returns x, y, and all results from f()
    {f()}              -- creates a list with all results from f()
    {...}              -- creates a list with all vararg arguments
    {f(), nil}         -- f() is adjusted to 1 result
```

Any expression enclosed in parentheses always results in only one value. Thus, `(f(x,y,z))` is always a single value, even if `f` returns several values. (The value of `(f(x,y,z))` is the first value returned by `f` or**nil** if `f` does not return any values.)

### Arithmetic Operators

Lua supports the following arithmetic operators:

 - **`+`:** addition
 - **`-`:** subtraction
 - **`*`:** multiplication
 - **`/`:** float division
 - **`//`:** floor division
 - **`%`:** modulo
 - **`^`:** exponentiation
 - **`-`:** unary minus

With the exception of exponentiation and float division, the arithmetic operators work as follows: If both operands are integers, the operation is performed over integers and the result is an integer. Otherwise, if both operands are numbers, then they are converted to floats, the operation is performed following the machine's rules for floating-point arithmetic (usually the IEEE 754 standard), and the result is a float. (The string library coerces strings to numbers in arithmetic operations)

Exponentiation and float division (`/`) always convert their operands to floats and the result is always a float. Exponentiation uses the ISO C function `pow`, so that it works for non-integer exponents too.

Floor division (`//`) is a division that rounds the quotient towards minus infinity, resulting in the floor of the division of its operands.

Modulo is defined as the remainder of a division that rounds the quotient towards minus infinity (floor division).

In case of overflows in integer arithmetic, all operations *wraparound*.

### Bitwise Operators

Lua supports the following bitwise operators:

 - **`&`:** bitwise AND
 - **`|`:** bitwise OR
 - **`~`:** bitwise exclusive OR
 - **`>>`:** right shift
 - **`<<`:** left shift
 - **`~`:** unary bitwise NOT

All bitwise operations convert its operands to integers, operate on all bits of those integers, and result inan integer.

Both right and left shifts fill the vacant bits with zeros. Negative displacements shift to the other direction; displacements with absolute values equal to or higher than the number of bits in an integer result in zero (as all bits are shifted out).

### Coercions and Conversions

Lua provides some automatic conversions between some types and representations at run time. Bitwise operators always convert float operands to integers. Exponentiation and float division always convert integer operands to floats. All other arithmetic operations applied to mixed numbers (integers and floats) convert the integer operand to afloat. The C API also converts both integers to floats and floats to integers, as needed. Moreover, string concatenation accepts numbers as arguments, besides strings.

In a conversion from integer to float, if the integer value has an exact representation as a float, that is the result. Otherwise, the conversion gets the nearest higher or the nearest lower representable value. This kind of conversion never fails.

The conversion from float to integer checks whether the float has an exact representation as an integer (that is, the float has an integral value and it is in the range of integer representation). If it does,that representation is the result. Otherwise, the conversion fails.

Several places in Lua coerce strings to numbers when necessary. In particular, the string library sets metamethods that try to coerce strings to numbers in all arithmetic operations. If the conversion fails, the library calls the metamethod of the other operand (if present) or it raises an error. Note that bitwise operators do not do this coercion.

Nonetheless, it is always a good practice not to rely on these implicit coercions, as they are not always applied; in particular, `"1"==1` is false and `"1"<1` raises an error. These coercions exist mainly for compatibility and may be removed in future versions of the language.

A string is converted to an integer or a float following its syntax and the rules of the Lua lexer. The string may have also leading and trailing white spaces and a sign. All conversions from strings to numbers accept both a dot and the current locale mark as the radix character.(The Lua lexer, however, accepts only a dot.) If the string is not a valid numeral, the conversion fails. If necessary, the result of this first step is then converted to a specific number subtype following the previous rules for conversions between floats and integers.

The conversion from numbers to strings uses a non-specified human-readable format. To convert numbers to strings in any specific way, use the function `string.format`.

### Relational Operators

Lua supports the following relational operators:

 - **`==`:** equality
 - **`~=`:** inequality
 - **`<`:** less than
 - **`>`:** greater than
 - **`<=`:** less or equal
 - **`>=`:** greater or equal

These operators always result in **false** or **true**.

Equality (`==`) first compares the type of its operands. If the types are different, then the result is **false**. Otherwise, the values of the operands are compared. Strings are equal if they have the same byte content. Numbers are equal if they denote the same mathematical value.

Tables, user data, and threads are compared by reference: two objects are considered equal only if they are the same object. Every time you create a new object (a table), this new object is different from any previously existing object. A function is always equal to itself. Functions with any detectable difference (different behavior, different definition) are always different. Functions created at different times but with no detectable differences may be classified as equal or not (depending on internal caching details).

You can change the way that Lua compares tables and userdata by using the `__eq` metamethod.

Equality comparisons do not convert strings to numbers or vice versa. Thus, `"0"==0` evaluates to **false**, and `t[0]` and `t["0"]` denote different entries in a table.

The operator `~=` is exactly the negation of equality (`==`).

The order operators work as follows. If both arguments are numbers, then they are compared according to their mathematical values, regardless of their subtypes. Otherwise, if both arguments are strings, then their values are compared according to the current locale. Otherwise, Lua tries to call the `__lt` or the `__le` metamethod. A comparison `a > b` is translated to `b < a` and `a >= b` is translated to `b <= a`.

Following the IEEE 754 standard, the special value NaN is considered neither less than, nor equal to, nor greater than any value, including itself.

### Logical Operators

The logical operators in Lua are **and**, **or**, and **not**. Like the control structures, all logical operators consider both **false** and **nil** as false and anything else as true.

The negation operator **not** always returns **false** or **true**. The conjunction operator **and** returns its first argument if this value is**false** or **nil**; otherwise, **and** returns its second argument. The disjunction operator **or** returns its first argument if this value is different from **nil** and **false**; otherwise, **or** returns its second argument. Both **and** and **or** use short-circuit evaluation;that is, the second operand is evaluated only if necessary. Here are some examples:

```lua
    10 or 20            --> 10
    10 or error()       --> 10
    nil or "a"          --> "a"
    nil and 10          --> nil
    false and error()   --> false
    false and nil       --> false
    false or nil        --> nil
    10 and 20           --> 20
```

### Concatenation

The string concatenation operator in Lua is denoted by two dots('`..`'). If both operands are strings or numbers, then the numbers are converted to strings in a non-specified format. Otherwise, the `__concat` metamethod is called.

### The Length Operator

The length operator is denoted by the unary prefix operator `#`.

The length of a string is its number of bytes. (That is the usual meaning of string length when each character is one byte.)

The length operator applied on a table returns a border in that table. A *border* in a table `t` is any natural number that satisfies the following condition:

```lua
    (border == 0 or t[border] ~= nil) and t[border + 1] == nil
```

In words, a border is any (natural) index present in the table that is followed by an absent index (or zero, when index 1 is absent).

A table with exactly one border is called a *sequence*. For instance,the table `{10, 20, 30, 40, 50}` is a sequence, as it has only one border (5). The table `{10, 20, 30, nil, 50}` has two borders (3 and 5),and therefore it is not a sequence. (The **nil** at index 4 is called a*hole*.) The table `{nil, 20, 30, nil, nil, 60, nil}` has three borders(0, 3, and 6) and three holes (at indices 1, 4, and 5), so it is not a sequence, too. The table `{}` is a sequence with border 0. Note that non-natural keys do not interfere with whether a table is a sequence.

When `t` is a sequence, `#t` returns its only border, which corresponds to the intuitive notion of the length of the sequence. When `t` is not a sequence, `#t` can return any of its borders. (The exact one depends on details of the internal representation of the table, which in turn can depend on how the table was populated and the memory addresses of its non-numeric keys.)

The computation of the length of a table has a guaranteed worst time of*O(log n)*, where *n* is the largest natural key in the table.

A program can modify the behavior of the length operator for any value but strings through the `__len` metamethod.

### Precedence

Operator precedence in Lua follows the table below, from lower to higher priority:

```lua
    or
    and
    <     >     <=    >=    ~=    ==
    |         ~         &         <<    >>
    ..
    +     -
    *     /     //    %
    unary operators (not   #     -     ~)
    ^
```

As usual, you can use parentheses to change the precedences of an expression. The concatenation ('`..`') and exponentiation ('`^`')operators are right associative. All other binary operators are left associative.

### Table Constructors

Table constructors are expressions that create tables. Every time a constructor is evaluated, a new table is created. A constructor can be used to create an empty table or to create a table and initialize some of its fields. The general syntax for constructors is

```lua
    tableconstructor ::= ‘{’ [fieldlist] ‘}’        
    fieldlist ::= field {fieldsep field} [fieldsep]        
    field ::= ‘[’ exp ‘]’ ‘=’ exp | Name ‘=’ exp | exp        
    fieldsep ::= ‘,’ | ‘;’
```

Each field of the form `[exp1] = exp2` adds to the new table an entry with key `exp1` and value `exp2`. A field of the form `name = exp` is equivalent to `["name"] = exp`. Fields of the form `exp` are equivalent to `[i] = exp`, where `i` are consecutive integers starting with 1; fields in the other formats do not affect this counting. For example,

```lua
    a = { [f(1)] = g; "x", "y"; x = 1, f(x), [30] = 23; 45 }
```

is equivalent to

```lua
    do
        local t = {}
        t[f(1)] = g
        t[1] = "x"         -- 1st exp
        t[2] = "y"         -- 2nd exp
        t.x = 1            -- t["x"] = 1
        t[3] = f(x)        -- 3rd exp
        t[30] = 23
        t[4] = 45          -- 4th exp
        a = t
    end
```

The order of the assignments in a constructor is undefined. (This order would be relevant only when there are repeated keys.)

If the last field in the list has the form `exp` and the expression is a function call or a vararg expression, then all values returned by this expression enter the list consecutively.

The field list can have an optional trailing separator, as a convenience for machine-generated code.

### Function Calls

A function call in Lua has the following syntax:

```lua
    functioncall ::= prefixexp args
```

In a function call, first prefixexp and args are evaluated. If the value of prefixexp has type *function*, then this function is called with the given arguments. Otherwise, if present, the prefixexp `__call`metamethod is called: its first argument is the value of prefixexp, followed by the original call arguments.

The form

```lua
    functioncall ::= prefixexp ‘:’ Name args
```

can be used to emulate methods. A call `v:name(args)` is syntactic sugar for `v.name(v,args)`, except that `v` is evaluated only once.

Arguments have the following syntax:

```lua
    args ::= ‘(’ [explist] ‘)’
    args ::= tableconstructor
    args ::= LiteralString
```

All argument expressions are evaluated before the call. A call of the form `f{fields}` is syntactic sugar for `f({fields})`; that is, the argument list is a single new table. A call of the form `f'string'` (or`f"string"` or `f[[string]]`) is syntactic sugar for `f('string')`; that is, the argument list is a single literal string.

A call of the form `return functioncall` not in the scope of a to-be-closed variable is called a *tail call*. Lua implements *propertail calls* (or *proper tail recursion*): in a tail call, the called function reuses the stack entry of the calling function. Therefore,there is no limit on the number of nested tail calls that a program can execute. However, a tail call erases any debug information about the calling function. Note that a tail call only happens with a particular syntax, where the **return** has one single function call as argument,and it is outside the scope of any to-be-closed variable. This syntax makes the calling function return exactly the returns of the called function, without any intervening action. So, none of the following examples are tail calls:

```lua
    return (f(x))        -- results adjusted to 1
    return 2 * f(x)      -- result multiplied by 2
    return x, f(x)       -- additional results
    f(x); return         -- results discarded
    return x or f(x)     -- results adjusted to 1
```

### Function Definitions

The syntax for function definition is

```lua
    functiondef ::= function funcbody
    funcbody ::= ‘(’ [parlist] ‘)’ block end
```

The following syntactic sugar simplifies function definitions:

```lua
    stat ::= function funcname funcbody
    stat ::= local function Name funcbody
    funcname ::= Name {‘.’ Name} [‘:’ Name]
```

The statement

```lua
    function f () body end
```

translates to

```lua
    f = function () body end
```

The statement

```lua
    function t.a.b.c.f () body end
```

translates to

```lua
    t.a.b.c.f = function () body end
```

The statement

```lua
    local function f () body end
```

translates to

```lua
    local f; f = function () body end
```

not to

```lua
    local f = function () body end
```

(This only makes a difference when the body of the function contains references to `f`.)

A function definition is an executable expression, whose value has type*function*. When Lua precompiles a chunk, all its function bodies are precompiled too, but they are not created yet. Then, whenever Lua executes the function definition, the function is *instantiated* (or*closed*). This function instance, or *closure*, is the final value ofthe expression.

Parameters act as local variables that are initialized with the argument values:

```lua
    parlist ::= namelist [‘,’ ‘...’] | ‘...’
```

When a Lua function is called, it adjusts its list of arguments to the length of its list of parameters, unless the function is a *varargfunction*, which is indicated by three dots ('`...`') at the end of its parameter list. A vararg function does not adjust its argument list;instead, it collects all extra arguments and supplies them to the function through a *vararg expression*, which is also written as threedots. The value of this expression is a list of all actual extra arguments, similar to a function with multiple results. If a vararg expression is used inside another expression or in the middle of a list of expressions, then its return list is adjusted to one element. If the expression is used as the last element of a list of expressions, then no adjustment is made (unless that last expression is enclosed in parentheses).

As an example, consider the following definitions:

```lua
    function f(a, b) end
    function g(a, b, ...) end
    function r() return 1,2,3 end
```

Then, we have the following mapping from arguments to parameters and to the vararg expression:

```lua
    CALL             PARAMETERS

    f(3)             a=3, b=nil
    f(3, 4)          a=3, b=4
    f(3, 4, 5)       a=3, b=4
    f(r(), 10)       a=1, b=10
    f(r())           a=1, b=2

    g(3)             a=3, b=nil, ... -->  (nothing)
    g(3, 4)          a=3, b=4,   ... -->  (nothing)
    g(3, 4, 5, 8)    a=3, b=4,   ... -->  5  8
    g(5, r())        a=5, b=1,   ... -->  2  3
```

Results are returned using the **return** statement. If control reaches the end of a function without encountering a **return** statement, then the function returns with no results.

There is a system-dependent limit on the number of values that a function may return. This limit is guaranteed to be greater than 1000.

The *colon* syntax is used to emulate *methods*, adding an implicit extra parameter `self` to the function. Thus, the statement

```lua
    function t.a.b.c:f (params) body end
```

is syntactic sugar for

```lua
    t.a.b.c.f = function (self, params) body end
```

## Visibility Rules

Lua is a lexically scoped language. The scope of a local variable begin sat the first statement after its declaration and lasts until the last non-void statement of the innermost block that includes the declaration. Consider the following example:

```lua
    x = 10                  -- global variable
    do                      -- new block
        local x = x         -- new 'x', with value 10
        print(x)            --> 10

        x = x+1
        do                  -- another block
            local x = x+1   -- another 'x'
            print(x)        --> 12
        end

        print(x)            --> 11
    end

    print(x)                --> 10  (the global one)
```

Notice that, in a declaration like `local x = x`, the new `x` being declared is not in scope yet, and so the second `x` refers to the outside variable.

Because of the lexical scoping rules, local variables can be freely accessed by functions defined inside their scope. A local variable used by an inner function is called an *upvalue* (or *external localvariable*, or simply *external variable*) inside the inner function.

Notice that each execution of a **local** statement defines new local variables. Consider the following example:

```lua
    a = {}
    local x = 20
    for i = 1, 10 do
       local y = 0
       a[i] = function ()
           y = y + 1
           return x + y
       end
    end
```

The loop creates ten closures (that is, ten instances of the anonymous function). Each of these closures uses a different `y` variable, while all of them share the same `x`.

# The Standard Libraries

The standard Lua libraries provide useful functions that are implemented in C through the C API. Some of these functions provide essential services to the language (e.g., `type`); others provide access to outside services (e.g., I/O); and others could be implemented in Lua itself, but that for different reasons deserve an implementation in C (e.g., `table.sort`).

All libraries are implemented through the official C API and are provided as separate C modules. Unless otherwise noted, these library functions do not adjust its number of arguments to its expected parameters. For instance, a function documented as `foo(arg)` should not be called without an argument.

The notation **fail** means a false value representing some kind of failure. (Currently, **fail** is equal to **nil**, but that may change in future versions. The recommendation is to always test the success of these functions with `(not status)`, instead of `(status == nil)`.)

Currently, Lua has the following standard libraries:

 - Basic Library
 - String Manipulation
 - Table Manipulation
 - Mathematical Functions

Except for the basic and the package libraries, each library provides all its functions as fields of a global table or as methods of its objects.

## Basic Functions

The basic library provides core functions to Lua. If you do not include this library in your application, you should check carefully whether you need to provide implementations for some of its facilities.

------------------------------------------------------------------------

### assert (v [, message])

Raises an error if the value of its argument `v` is false (i.e., **nil** or **false**); otherwise, returns all its arguments. In case of error, `message` is the error object; when absent, it defaults to "`assertion failed!`"

------------------------------------------------------------------------

### error (message [, level])

Raises an error with @{message} as the error object. This function never returns.

Usually, `error` adds some information about the error position at the beginning of the message, if the message is a string. The `level` argument specifies how to get the error position. With level 1 (the default), the error position is where the `error` function was called. Level 2 points the error to where the function that called `error` was called; and so on. Passing a level 0 avoids the addition of error position information to the message.

------------------------------------------------------------------------

### _G

A global variable (not a function) that holds the global environment. Lua itself does not use this variable; changing its value does not affect any environment, nor vice versa.

------------------------------------------------------------------------

### ipairs (t)

Returns three values (an iterator function, the table `t`, and 0) so that the construction

```lua
    for i,v in ipairs(t) do body end
```

will iterate over the key--value pairs (`1,t[1]`), (`2,t[2]`), ..., up to the first absent index.

------------------------------------------------------------------------

### next (table [, index])

Allows a program to traverse all fields of a table. Its first argument is a table and its second argument is an index in this table. A call to`next` returns the next index of the table and its associated value. When called with **nil** as its second argument, `next` returns an initial index and its associated value. When called with the last index,or with **nil** in an empty table, `next` returns **nil**. If the second argument is absent, then it is interpreted as **nil**. In particular,you can use `next(t)` to check whether a table is empty.

The order in which the indices are enumerated is not specified, *evenfor numeric indices*. (To traverse a table in numerical order, use a numerical **for**.)

The behavior of `next` is undefined if, during the traversal, you assign any value to a non-existent field in the table. You may however modify existing fields. In particular, you may set existing fields to nil.

------------------------------------------------------------------------

### pairs (t)

If `t` has a metamethod `__pairs`, calls it with `t` as argument and returns the first three results from the call.

Otherwise, returns three values: the `next` function, the table `t`, and **nil**, so that the construction

```lua
    for k,v in pairs(t) do body end
```

will iterate over all key--value pairs of table `t`.

See function `next` for the caveats of modifying the table during its traversal.

------------------------------------------------------------------------

### print (···)

Receives any number of arguments and prints their values to `stdout`,converting each argument to a string following the same rules `tostring`.

The function `print` is not intended for formatted output, but only as a quick way to show a value, for instance for debugging. For complete control over the output, use `string.format`.

------------------------------------------------------------------------

### select (index, ···)

If `index` is a number, returns all arguments after argument number `index`; a negative number indexes from the end (-1 is the last argument). Otherwise, `index` must be the string `"#"`, and `select` returns the total number of extra arguments it received.

------------------------------------------------------------------------

### tonumber (e [, base])

When called with no `base`, `tonumber` tries to convert its argument to a number. If the argument is already a number or a string convertible to a number, then `tonumber` returns this number; otherwise, it returns **fail**.

The conversion of strings can result in integers or floats, according to the lexical conventions of Lua. The string may have leading and trailing spaces and a sign.

When called with `base`, then `e` must be a string to be interpreted as an integer numeral in that base. The base may be any integer between 2 and 36, inclusive. In bases above 10, the letter '`A`' (in either upper or lower case) represents 10, '`B`' represents 11, and so forth,with '`Z`' representing 35. If the string `e` is not a valid numeral in the given base, the function returns **fail**.

------------------------------------------------------------------------

### tostring (v)

Receives a value of any type and converts it to a string in a human-readable format.
For complete control of how numbers are converted, `string.format`.

------------------------------------------------------------------------

### type (v)

Returns the type of its only argument, coded as a string. The possible results of this function are "`nil`" (a string, not the value**nil**), "`number`", "`string`", "`boolean`", "`table`","`function`", "`thread`", and "`userdata`".

------------------------------------------------------------------------

### warn (msg1, ···)

Emits a warning with a message composed by the concatenation of all its arguments (which should be strings).

By convention, a one-piece message starting with '`@`' is intended to be a *control message*, which is a message to the warning system itself. In particular, the standard warning function in Lua recognizes the control messages "`@off`", to stop the emission of warnings, and "`@on`", to (re)start the emission; it ignores unknown control messages.

## String Manipulation

This library provides generic functions for string manipulation, such as finding and extracting substrings, and pattern matching. When indexing a string in Lua, the first character is at position 1 (not at 0, as in C).Indices are allowed to be negative and are interpreted as indexing backwards, from the end of the string. Thus, the last character is at position -1, and so on.

The string library provides all its functions inside the `string`, and assumes one-byte character encodings.

------------------------------------------------------------------------

### string.byte (s [, i [, j]])

Returns the internal numeric codes of the characters `s[i]`, `s[i+1]`, ..., `s[j]`. The default value for `i` is 1; the default value for `j`is `i`. These indices are corrected following the same rules of function `string.sub`.

Numeric codes are not necessarily portable across platforms.

------------------------------------------------------------------------

### string.char (···)

Receives zero or more integers. Returns a string with length equal to the number of arguments, in which each character has the internal numeric code equal to its corresponding argument.

Numeric codes are not necessarily portable across platforms.

------------------------------------------------------------------------

### string.find (s, pattern [, init [, plain]])

Looks for the first match of `pattern` in the string `s`. If it finds a match, then `find` returns the indices of `s`where this occurrence starts and ends; otherwise, it returns **fail**. A third, optional numeric argument `init` specifies where to start the search; its default value is 1 and can be negative. A value of **true**as a fourth, optional argument `plain` turns off the pattern matching facilities, so the function does a plain "find substring" operation,with no characters in `pattern` being considered magic.

If the pattern has captures, then in a successful match the captured values are also returned, after the two indices.

------------------------------------------------------------------------

### string.format (formatstring, ···)

Returns a formatted version of its variable number of arguments following the description given in its first argument, which must be a string. The format string follows the same rules as the ISO C function`sprintf`. The only differences are that the conversion specifiers and modifiers `*`, `h`, `L`, `l`, and `n` are not supported and that there is an extra specifier, `q`.

The specifier `q` formats booleans, nil, numbers, and strings in a way that the result is a valid constant in Lua source code. Booleans and nil are written in the obvious way (`true`, `false`, `nil`). Floats are written in hexadecimal, to preserve full precision. A string is written between double quotes, using escape sequences when necessary to ensure that it can safely be read back by the Lua interpreter. For instance,the call

```lua
    string.format('%q', 'a string with "quotes" and \n new line')
```

may produce the string:

```lua
    "a string with \"quotes\" and \          new line"
```

This specifier does not support modifiers (flags, width, length).

The conversion specifiers `A`, `a`, `E`, `e`, `f`, `G`, and `g` all expect a number as argument. The specifiers `c`, `d`, `i`, `o`, `u`,`X`, and `x` expect an integer. When Lua is compiled with a C89 compiler, the specifiers `A` and `a` (hexadecimal floats) do not support modifiers.

The specifier `s` expects a string; if its argument is not a string, it is converted to one following the same rules of `tostring`. If the specifier has any modifier, the corresponding string argument should not contain embedded zeros.

------------------------------------------------------------------------

### string.gmatch (s, pattern [, init])

Returns an iterator function that, each time it is called, returns the next captures from `pattern` over the string `s`.If `pattern` specifies no captures, then the whole match is produced in each call. A third, optional numeric argument `init` specifies where to start the search; its default value is 1 and can be negative.

As an example, the following loop will iterate over all the words from string `s`, printing one per line:

```lua
    s = "hello world from Lua"
    for w in string.gmatch(s, "%a+") do
        print(w)
    end
```

The next example collects all pairs `key=value` from the given string into a table:

```lua
    t = {}
    s = "from=world, to=Lua"
    for k, v in string.gmatch(s, "(%w+)=(%w+)") do
        t[k] = v
    end
```

For this function, a caret '`^`' at the start of a pattern does notwork as an anchor, as this would prevent the iteration.

------------------------------------------------------------------------

### string.gsub (s, pattern, repl [, n])

Returns a copy of `s` in which all (or the first `n`, if given)occurrences of the `pattern` have been replaced by a replacement string specified by `repl`, which can be a string, a table, or a function. `gsub` also returns, as its second value, the total number of matches that occurred. The name `gsub` comes from*Global SUBstitution*.

If `repl` is a string, then its value is used for replacement. The character `%` works as an escape character: any sequence in `repl` of the form `%d`, with *d* between 1 and 9, stands for the value of the*d*-th captured substring; the sequence `%0` stands for the whole match;the sequence `%%` stands for a single `%`.

If `repl` is a table, then the table is queried for every match, using the first capture as the key.

If `repl` is a function, then this function is called every time a match occurs, with all captured substrings passed as arguments, in order.

In any case, if the pattern specifies no captures, then it behaves as if the whole pattern was inside a capture.

If the value returned by the table query or by the function call is a string or a number, then it is used as the replacement string;otherwise, if it is **false** or **nil**, then there is no replacement(that is, the original match is kept in the string).

Here are some examples:

```lua
    x = string.gsub("hello world", "(%w+)", "%1 %1")                     --> x="hello hello world world"
    x = string.gsub("hello world", "%w+", "%0 %0", 1)                    --> x="hello hello world"
    x = string.gsub("hello world from Lua", "(%w+)%s*(%w+)", "%2 %1")    --> x="world hello Lua from"
    x = string.gsub("home = $HOME, user = $USER", "%$(%w+)", os.getenv)  --> x="home = /home/roberto, user = roberto"
    x = string.gsub("4+5 = $return 4+5$", "%$(.-)%$", function (s)
        return load(s)()
    end)                                                                 --> x="4+5 = 9"

    local t = { name="lua", version="5.4" }
    x = string.gsub("$name-$version.tar.gz", "%$(%w+)", t)               --> x="lua-5.4.tar.gz"
```

------------------------------------------------------------------------

### string.len (s)

Receives a string and returns its length. The empty string `""` has length 0. Embedded zeros are counted, so `"a\000bc\000"` has length 5.

------------------------------------------------------------------------

### string.lower (s)

Receives a string and returns a copy of this string with all upper case letters changed to lowercase. All other characters are left unchanged. The definition of what an uppercase letter is depends on the current locale.

------------------------------------------------------------------------

### string.match (s, pattern [, init])

Looks for the first *match* of the `pattern` in the string `s`. If it finds one, then `match` returns the captures from the pattern; otherwise it returns **fail**. If `pattern` specifies no captures, then the whole match is returned. A third, optional numeric argument `init` specifies where to start the search; its default value is 1 and can be negative.

------------------------------------------------------------------------

### string.pack (fmt, v1, v2, ···)

Returns a binary string containing the values `v1`, `v2`, etc. serialized in binary form (packed) according to the format string `fmt`.

------------------------------------------------------------------------

### string.rep (s, n [, sep])

Returns a string that is the concatenation of `n` copies of the string`s` separated by the string `sep`. The default value for `sep` is the empty string (that is, no separator). Returns the empty string if `n` is not positive.

(Note that it is very easy to exhaust the memory of your machine with a single call to this function.)

------------------------------------------------------------------------

### string.reverse (s)

Returns a string that is the string `s` reversed.

------------------------------------------------------------------------

### string.sub (s, i [, j])

Returns the substring of `s` that starts at `i` and continues until `j`;`i` and `j` can be negative. If `j` is absent, then it is assumed to be equal to -1 (which is the same as the string length). In particular, the call `string.sub(s,1,j)` returns a prefix of `s` with length `j`, and `string.sub(s, -i)` (for a positive `i`) returns a suffix of `s` with length `i`.

If, after the translation of negative indices, `i` is less than 1, it is corrected to 1. If `j` is greater than the string length, it is corrected to that length. If, after these corrections, `i` is greater than `j`, the function returns the empty string.

------------------------------------------------------------------------

### string.unpack (fmt, s [, pos])

Returns the values packed in string `s` (see `string.pack`) according to the format string `fmt`. An optional `pos` marks where to start reading in `s` (default is 1). After the read values, this function also returns the index of the first unread byte in `s`.

------------------------------------------------------------------------

### string.upper (s)

Receives a string and returns a copy of this string with all lowercase letters changed to uppercase. All other characters are left unchanged. The definition of what a lowercase letter is depends on the current locale.

### Patterns

Patterns in Lua are described by regular strings, which are interpreted as patterns by the pattern-matching functions `string.find`, `string.gmatch`, `string.gsub`, and `string.match`. This section describes the syntax and the meaning (that is, what they match) of these strings.

#### Character Class:

A *character class* is used to represent a set of characters. The following combinations are allowed in describing a character class:

 - ***x*:** (where *x* is not one of the *magic characters*    `^$()%.[]*+-?`) represents the character *x* itself.
 - **`.`:** (a dot) represents all characters.
 - **`%a`:** represents all letters.
 - **`%c`:** represents all control characters.
 - **`%d`:** represents all digits.
 - **`%g`:** represents all printable characters except space.
 - **`%l`:** represents all lowercase letters.
 - **`%p`:** represents all punctuation characters.
 - **`%s`:** represents all space characters.
 - **`%u`:** represents all uppercase letters.
 - **`%w`:** represents all alphanumeric characters.
 - **`%x`:** represents all hexadecimal digits.
 - **`%x`:** (where *x* is any non-alphanumeric character) represents    the character *x*. This is the standard way to escape the magic    characters. Any non-alphanumeric character (including all    punctuation characters, even the non-magical) can be preceded by a    '`%`' to represent itself in a pattern.
 - **`[set]`:** represents the class which is the union of all    characters in *set*. A range of characters can be specified by    separating the end characters of the range, in ascending order, with    a '`-`'. All classes `%`*x* described above can also be used as    components in *set*. All other characters in *set* represent    themselves. For example, `[%w_]` (or `[_%w]`) represents all    alphanumeric characters plus the underscore, `[0-7]` represents the    octal digits, and `[0-7%l%-]` represents the octal digits plus the    lowercase letters plus the '`-`' character.
 
   You can put a closing square bracket in a set by positioning it as    the first character in the set. You can put a hyphen in a set by    positioning it as the first or the last character in the set. (You    can also use an escape for both cases.)
 
   The interaction between ranges and classes is not defined.    Therefore, patterns like `[%a-z]` or `[a-%%]` have no meaning.
 
 - **`[^set]`:** represents the complement of *set*, where *set* is    interpreted as above.

For all classes represented by single letters (`%a`, `%c`, etc.), the corresponding uppercase letter represents the complement of the class. For instance, `%S` represents all non-space characters.

The definitions of letter, space, and other character groups depend on the current locale. In particular, the class `[a-z]` may not be equivalent to `%l`.

#### Pattern Item:

A *pattern item* can be

 - a single character class, which matches any single character in the    class;-   a single character class followed by '`*`', which matches    sequences of zero or more characters in the class. These repetition    items will always match the longest possible sequence;-   a single character class followed by '`+`', which matches    sequences of one or more characters in the class. These repetition    items will always match the longest possible sequence;-   a single character class followed by '`-`', which also matches    sequences of zero or more characters in the class. Unlike '`*`',    these repetition items will always match the shortest possible    sequence;-   a single character class followed by '`?`', which matches zero or    one occurrence of a character in the class. It always matches one    occurrence if possible;-   `%n`, for *n* between 1 and 9; such item matches a substring equal    to the *n*-th captured string (see below);-   `%bxy`, where *x* and *y* are two distinct characters; such item    matches strings that start with *x*, end with *y*, and where the *x*    and *y* are *balanced*. This means that, if one reads the string    from left to right, counting *+1* for an *x* and *-1* for a *y*, the    ending *y* is the first *y* where the count reaches 0. For instance,    the item `%b()` matches expressions with balanced parentheses.-   `%f[set]`, a *frontier pattern*; such item matches an empty string    at any position such that the next character belongs to *set* and    the previous character does not belong to *set*. The set *set* is    interpreted as previously described. The beginning and the end of    the subject are handled as if they were the character '`\0`'.

#### Pattern:

A *pattern* is a sequence of pattern items. A caret '`^`' at the beginning of a pattern anchors the match at the beginning of the subject string. A '`$`' at the end of a pattern anchors the match at the end of the subject string. At other positions, '`^`' and '`$`' have no special meaning and represent themselves.

#### Captures:

A pattern can contain sub-patterns enclosed in parentheses; they describe *captures*. When a match succeeds, the substrings of the subject string that match captures are stored (*captured*) for future use. Captures are numbered according to their left parentheses. For instance, in the pattern `"(a*(.)%w(%s*))"`, the part of the string matching `"a*(.)%w(%s*)"` is stored as the first capture, and therefore has number 1; the character matching "`.`" is captured with number 2,and the part matching "`%s*`" has number 3.

As a special case, the capture `()` captures the current string position(a number). For instance, if we apply the pattern `"()aa()"` on the string `"flaaap"`, there will be two captures: 3 and 5.

#### Multiple matches:

The function `string.gsub` and the iterator `string.gmatch` match multiple occurrences of the given pattern in the subject. For these functions, a new match is considered valid only if it ends at least one byte after the end of the previous match. In other words, the pattern machine never accepts the empty string as a match immediately after another match. As an example,consider the results of the following code:

```lua
    > string.gsub("abc", "()a*()", print);         --> 1   2         --> 3   3         --> 4   4
```

The second and third results come from Lua matching an empty string after '`b`' and another one after '`c`'. Lua does not match an empty string after '`a`', because it would end at the same position of the previous match.

### Format Strings for Pack and Unpack

The first argument to `string.pack`, `string.packsize`, and `string.unpack` is a format string, which describes the layout of the structure being created or read.

A format string is a sequence of conversion options. The conversion options are as follows:

 - **`<`:** sets little endian-   **`>`:** sets big endian-   **`=`:** sets native endian-   **`![n]`:** sets maximum alignment to `n` (default is native    alignment)-   **`b`:** a signed byte (`char`)-   **`B`:** an unsigned byte (`char`)-   **`h`:** a signed `short` (native size)-   **`H`:** an unsigned `short` (native size)-   **`l`:** a signed `long` (native size)-   **`L`:** an unsigned `long` (native size)-   **`j`:** a `lua_Integer`-   **`J`:** a `lua_Unsigned`-   **`T`:** a `size_t` (native size)-   **`i[n]`:** a signed `int` with `n` bytes (default is native size)-   **`I[n]`:** an unsigned `int` with `n` bytes (default is native    size)-   **`f`:** a `float` (native size)-   **`d`:** a `double` (native size)-   **`n`:** a `lua_Number`-   **`cn`:** a fixed-sized string with `n` bytes-   **`z`:** a zero-terminated string-   **`s[n]`:** a string preceded by its length coded as an unsigned    integer with `n` bytes (default is a `size_t`)-   **`x`:** one byte of padding-   **`Xop`:** an empty item that aligns according to option `op` (which    is otherwise ignored)-   **'` `':** (space) ignored

(A "`[n]`" means an optional integral numeral.) Except for padding,spaces, and configurations (options "`xX <=>!`"), each option corresponds to an argument in `string.pack` or a result in `string.unpack`.

For options "`!n`", "`sn`", "`in`", and "`In`", `n` can be any integer between 1 and 16. All integral options check overflows; `string.pack` checks whether the given value fits in the given size; `string.unpack` checks whether the read value fits in a Lua integer. For the unsigned options, Lua integers are treated as unsigned values too.

Any format string starts as if prefixed by "`!1=`", that is, with maximum alignment of 1 (no alignment) and native endianness.

Native endianness assumes that the whole system is either big or little endian. The packing functions will not emulate correctly the behavior of mixed-endian formats.

Alignment works as follows: For each option, the format gets extra padding until the data starts at an offset that is a multiple of the minimum between the option size and the maximum alignment; this minimum must be a power of 2. Options "`c`" and "`z`" are not aligned;option "`s`" follows the alignment of its starting integer.

All padding is filled with zeros by  `string.pack` and ignored by `string.unpack`.

## Table Manipulation

This library provides generic functions for table manipulation. It provides all its functions inside the table `table`.

Remember that, whenever an operation needs the length of a table, all caveats about the length operator apply. All functions ignore non-numeric keys in the tables given as arguments.

------------------------------------------------------------------------

### table.concat (list [, sep [, i [, j]]])

Given a list where all elements are strings or numbers, returns thestring `list[i]..sep..list[i+1] ··· sep..list[j]`. The default value for`sep` is the empty string, the default for `i` is 1, and the default for`j` is `#list`. If `i` is greater than `j`, returns the empty string.

------------------------------------------------------------------------

### table.insert (list, [pos,] value)

Inserts element `value` at position `pos` in `list`, shifting up the elements `list[pos], list[pos+1], ···, list[#list]`. The default value for `pos` is `#list+1`, so that a call `table.insert(t,x)` inserts `x`at the end of the list `t`.

------------------------------------------------------------------------

### table.move (a1, f, e, t [,a2])

Moves elements from the table `a1` to the table `a2`, performing the equivalent to the following multiple assignment:`a2[t],··· = a1[f],···,a1[e]`. The default for `a2` is `a1`. The destination range can overlap with the source range. The number of elements to be moved must fit in a Lua integer.

Returns the destination table `a2`.

------------------------------------------------------------------------

### table.pack (···)

Returns a new table with all arguments stored into keys 1, 2, etc. and with a field "`n`" with the total number of arguments. Note that the resulting table may not be a sequence, if some arguments are **nil**.

------------------------------------------------------------------------

### table.remove (list [, pos])

Removes from `list` the element at position `pos`, returning the value of the removed element. When `pos` is an integer between 1 and `#list`,it shifts down the elements `list[pos+1], list[pos+2], ···, list[#list]`and erases element `list[#list]`; The index `pos` can also be 0 when`#list` is 0, or `#list + 1`.

The default value for `pos` is `#list`, so that a call `table.remove(l)`removes the last element of the list `l`.

------------------------------------------------------------------------

### table.sort (list [, comp])

Sorts the list elements in a given order, *in-place*, from `list[1]` to`list[#list]`. If `comp` is given, then it must be a function that receives two list elements and returns true when the first element must come before the second in the final order, so that, after the sort,`i <= j` implies `not comp(list[j],list[i])`. If `comp` is not given,then the standard Lua operator `<` is used instead.

The `comp` function must define a consistent order; more formally, the function must define a strict weak order. (A weak order is similar to a total order, but it can equate different elements for comparison purposes.)

The sort algorithm is not stable: Different elements considered equal by the given order may have their relative positions changed by the sort.

------------------------------------------------------------------------

### table.unpack (list [, i [, j]])

Returns the elements from the given list. This function is equivalent to

```
    return list[i], list[i+1], ···, list[j]
```

By default, `i` is 1 and `j` is `#list`.

## Mathematical Functions

This library provides basic mathematical functions. It provides all its functions and constants inside the table `math`. Functions with the annotation "`integer/float`" give integer results for integer arguments and float results for non-integer arguments. The rounding functions `math.ceil`, `math.floor`, and  `math.modf` return an integer when the result fits in the range of an integer, or afloat otherwise.

------------------------------------------------------------------------

### math.abs (x)

Returns the maximum value between `x` and `-x`. (integer/float)

------------------------------------------------------------------------

### math.acos (x)

Returns the arc cosine of `x` (in radians).

------------------------------------------------------------------------

### math.asin (x)

Returns the arc sine of `x` (in radians).

------------------------------------------------------------------------

### math.atan (y [, x])

Returns the arc tangent of `y/x` (in radians), but uses the signs of both arguments to find the quadrant of the result. It also handles correctly the case of `x` being zero.

The default value for `x` is 1, so that the call `math.atan(y)` returns the arc tangent of `y`.

------------------------------------------------------------------------

### math.ceil (x)

Returns the smallest integral value greater than or equal to `x`.

------------------------------------------------------------------------

### math.cos (x)

Returns the cosine of `x` (assumed to be in radians).

------------------------------------------------------------------------

### math.deg (x)

Converts the angle `x` from radians to degrees.

------------------------------------------------------------------------

### math.exp (x)

Returns the value *e^x^* (where `e` is the base of natural logarithms).

------------------------------------------------------------------------

### math.floor (x)

Returns the largest integral value less than or equal to `x`.

------------------------------------------------------------------------

### math.fmod (x, y)

Returns the remainder of the division of `x` by `y` that rounds the quotient towards zero. (integer/float)

------------------------------------------------------------------------

### math.huge

The float value `HUGE_VAL`, a value greater than any other numeric value.

------------------------------------------------------------------------

### math.log (x [, base])

Returns the logarithm of `x` in the given base. The default for `base`is *e* (so that the function returns the natural logarithm of `x`).

------------------------------------------------------------------------

### math.max (x, ···)

Returns the argument with the maximum value, according to the Lua operator `<`.

------------------------------------------------------------------------

### math.maxinteger

An integer with the maximum value for an integer.

------------------------------------------------------------------------

### math.min (x, ···)

Returns the argument with the minimum value, according to the Lua operator `<`.

------------------------------------------------------------------------

### math.mininteger

An integer with the minimum value for an integer.

------------------------------------------------------------------------

### math.modf (x)

Returns the integral part of `x` and the fractional part of `x`. Its second result is always a float.

------------------------------------------------------------------------

### math.pi

The value of *π*.

------------------------------------------------------------------------

### math.rad (x)

Converts the angle `x` from degrees to radians.

------------------------------------------------------------------------

### math.random ([m [, n]])

When called without arguments, returns a pseudo-random float with uniform distribution in the range *[0,1]*. When called with two integers `m` and `n`, `math.random` returns a pseudo-random integer with uniform distribution in the range *[m, n]*. The call `math.random(n)`,for a positive `n`, is equivalent to `math.random(1,n)`. The call`math.random(0)` produces an integer with all bits (pseudo)random.

This function uses the `xoshiro256**` algorithm to produce pseudo-random64-bit integers, which are the results of calls with argument 0. Other results (ranges and floats) are unbiased extracted from these integers.

Lua initializes its pseudo-random generator with the equivalent of a call to  `math.randomseed` with no arguments, so that `math.random` should generate different sequences of results each time the program runs.

------------------------------------------------------------------------

### math.randomseed ([x [, y]])

When called with at least one argument, the integer parameters `x` and`y` are joined into a 128-bit *seed* that is used to reinitialize the pseudo-random generator; equal seeds produce equal sequences of numbers. The default for `y` is zero.

When called with no arguments, Lua generates a seed with a weak attempt for randomness.

This function returns the two seed components that were effectively used, so that setting them again repeats the sequence.

To ensure a required level of randomness to the initial state (or contrarily, to have a deterministic sequence, for instance when debugging a program), you should call `math.randomseed` with explicit arguments.

------------------------------------------------------------------------

### math.sin (x)

Returns the sine of `x` (assumed to be in radians).

------------------------------------------------------------------------

### math.sqrt (x)

Returns the square root of `x`. (You can also use the expression `x^0.5`to compute this value.)

------------------------------------------------------------------------

### math.tan (x)

Returns the tangent of `x` (assumed to be in radians).

------------------------------------------------------------------------

### math.tointeger (x)

If the value `x` is convertible to an integer, returns that integer. Otherwise, returns **fail**.

------------------------------------------------------------------------

### math.type (x)

Returns "`integer`" if `x` is an integer, "`float`" if it is afloat, or **fail** if `x` is not a number.

------------------------------------------------------------------------

### math.ult (m, n)

Returns a boolean, true if and only if integer `m` is below integer `n`when they are compared as unsigned integers.

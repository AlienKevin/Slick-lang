import {Runner} from "../Runner";

let source =
// `print(3e-10)`
// `var my simple name of a variable: 'a string 📆🤞🌈'`
// `
// # comments line 1
// # comments line 2

// f exit (final value)
// 	element nr: 0
// 	return final value
// `

// `while element nr >= 0
// element nr: element nr - 1
// reduction: callback function(
//     reduction
//     array[element nr]
//     element nr
//     exit
// )`

// `var if: 3
// if   : 4
//    if`

// `if my hero = 'monster'
// 	call blood curdling scream()
// elif my hero = 'butterfly'
// 	do not make a sound()
// else
// 	sing like a rainbow()`

// `3 / 2 + 3.23980e-329 % 0.320`

// `# lalala
// #waieowe
// #weipawe f  weiowpe
// f f()
//     print('f')
// f()`

// `3 + 2`
// `3 + 2 / -1.0e9 + 1000000000`
// `if a
//     print('a')`

// `if a
//     'a'
// elif b
//     'b'
// elif c
//     'c'
// elif d
//     'd'
// else
//     z`

// `while element nr ≥ 0
//     element nr: element nr - 1
//     reduction: callback function(
//         reduction
//         array[element nr]
//         element nr
//         exit
//     )`

// `f (final value)
//     element nr: 0
//     return final value`

// `var n: 3`

// `obj.a: -0.3839e25 / 1.2389e100`

`a = b 
    ? print(a % b)
    ! print(-a + !b)`

;

const runner = new Runner(true);
runner.run(source);
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

`# lalala
#waieowe
#weipawe f  weiowpe
f f()
    print('f')
f()`
;

const runner = new Runner(true);
runner.run(source);
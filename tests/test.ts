const source = new Map([
// text functions
[
`a :
    Text.length '⭐🐮🎃🎡👩‍💻🎌'
`,

"6"
],
// list functions
[
`a :
    List.sum [0, -2, 3, -0.4]`,

"0.6"
],
[
`a :
    List.sum [0.1e-10]`,

"1e-11"
],
[
`a :
    List.sum []`,

"0"
],
// case expression
[
`
a :
    case 'something else' of
        'a' →
            'a'
        'b' →
            'b'
        _ →
            'else'
`,

"else"
],
[
`
foo :
    case if False then 'a' else 'b' of
        'a' →
            'fail'
        _ →
            'success'
`,

"success"
],
// function expression
[
`
foo : ƒ a
    let
        b :
            3
    in
    if a % 2 = 0 then
        a / 2
    else
        a * 3 + 1

load = Text
load :
    'abc'

_ :
    print (foo 10)
`,

"5"
],
[
`
foo :
    let
        c :
            3
    in
    ƒ a
        let
            c :
                a * 2
        in
        c

_ :
    print (foo 3)
`,

"6"
],
[
`
foo = Num → Num → Num
foo : ƒ a
    ƒ b
        a * b

_ :
    print (foo 3 4)
`,

"12"
],
// function call
[
`
foo : ƒ a b
    a + b
a :
    foo
    2
    3
`,

"5"
],
[
`
foo : ƒ a b
    a + b
bar : ƒ a b
    a * b
a :
    foo
    (bar 2 3)
    3
`,

"9"
],
[
`
foo : ƒ a b
    a + b
bar : ƒ a b
    a * b
a :
    foo
    (
        bar
        2
        3
    )
    3
`,

"9"
],
]);
import { test } from "./Tester";
import { Runner } from "../Runner";
const runner = new Runner("./Runtime");
test(source, runner);
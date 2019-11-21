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

"'else'"
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

"'success'"
],
[
`
type Cell :
    Live
    Dead

type Foo :
    Foo
    Bar

id : ƒ a
    a

getCellValue = Text → Num
getCellValue : ƒ cell
    case id cell of
        Live →
            1
        Foo →
            0
`,

"[SyntaxError] Line 18 at 'Foo': Subtype Foo does not exist in Cell!"
],
[
`
type Cell :
    Live
    Dead

type Foo :
    Foo
    Bar

id : ƒ a
    a

getCellValue = Text → Num
getCellValue : ƒ cell
    case id cell of
        Live →
            1
        Dead →
            0
`,

"[SyntaxError] Line 14 at 'ƒ': Declared type Text → Num and actual type Cell → Num do not match!"
],
[
`
type Cell :
    Live
    Dead

type Foo :
    Foo
    Bar

id : ƒ a
    a

getCellValue = Cell → Num
getCellValue : ƒ cell
    case id cell of
        Live →
            1
        Dead →
            0

_ :
    getCellValue Live
`,

"1"
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
[
`
bar : ƒ a
    a
foo :
    if bar 1 = 1 then
        1
    else
        0
`,

"1"
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
[
`
foo :
    List.map
    ƒ a
        a
    (List.range -1 1)
`,

"[-1, 0, 1]"
],
[
`
row :
    [1, 2, 3]

row2 :
    List.map ƒ cell (cell) row
`,

"[1, 2, 3]"
],
// complex hybrid test
[
`
getNeighborSum = Num → Num → List List Num → List List Num
getNeighborSum : ƒ r c grid
    List.map
    ƒ dr
        List.map
        ƒ dc
            let
                value :
                    List.nth
                    (c + dc)
                    case List.nth (r + dr) grid of
                        Nothing →
                            []
                        Just list →
                            list
            in
            if dc = 0 ⋏ dr = 0 then
                0
            else
                case value of
                    Nothing →
                        0
                    Just n →
                        n
        (List.range -1 1)
    (List.range -1 1)

end :
    'end'
`,

"'end'"
]
]);
import { test } from "./Tester";
import { Runner } from "../Runner";
const runner = new Runner("./Runtime");
test(source, runner);
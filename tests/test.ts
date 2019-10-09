const source = new Map([
[
`call print(3e-10)`,

`$SLK.print($SLK3e_10);`
],
[
`var my simple name of a variable: 'a string 📆🤞🌈'`,

`var my_simple_name_of_a_variable = "a string 📆🤞🌈";`
],
[
`var exit: f (final value)
    element nr: 0
    return final value`,
    
`var exit = $SLK.stone(function (final_value) {
    element_nr = $SLK0;
    return final_value;
});`
],
[
`while element nr ≥ 0
    element nr: element nr - 1
    reduction: callback function(
        reduction
        array[element nr]
        element nr
        exit
    )`,

`while ($SLK.ge(element_nr, $SLK0)){
    element_nr = $SLK.sub(element_nr, $SLK1);
    reduction = callback_function(reduction, $SLK.get(array, element_nr), element_nr, exit);
}`
],
[
`if my hero = 'monster'
    call blood curdling scream()
elif my hero = 'butterfly'
    call do not make a sound()
else
    call sing like a rainbow()`,

`if ($SLK.eq(my_hero, "monster")){
    blood_curdling_scream();
} else if ($SLK.eq(my_hero, "butterfly")){
    do_not_make_a_sound();
} else {
    sing_like_a_rainbow();
}`
],
// records
[
`var obj: {
    3: 3.230
    'hello': {
        'something': true
    }
}`,

`var obj = (function (o) {
    $SLK.set(o, $SLK3, $SLK3_23);
    $SLK.set(o, "hello", (function (o) {
        $SLK.set(o, "something", true);
        return o;
    }(Object.create(null))));
    return o;
}(Object.create(null)));`
],
[

`var a: {a: 32}`,

`var a = (function (o) {
    $SLK.set(o, a, $SLK32);
    return o;
}(Object.create(null)));`
],
[
`var wala : {
    some thing: true
}
var three: {
    'a': 0.1
    'b': 'lala'
    'a long var name': wala
}`,

`var wala = (function (o) {
    $SLK.set(o, some_thing, true);
    return o;
}(Object.create(null)));
var three = (function (o) {
    $SLK.set(o, "a", $SLK0_1);
    $SLK.set(o, "b", "lala");
    $SLK.set(o, "a long var name", wala);
    return o;
}(Object.create(null)));`
],
[
`var record: {}`,

`var record = (function (o) {
    return o;
}(Object.create(null)));`
],
[
`var a: [1, 2, '3'][0]`,

`var a = $SLK.get([$SLK1, $SLK2, "3"], $SLK0);`
],
[
`var a: []`,

`var a = [];`
],
[
`var a: [
    'we'
    3.0
    true
    false
]`,

`var a = ["we", $SLK3, true, false];`
],
[
`var a: [
    'we',
    3.0,
    true,
    false
]`,

`var a = ["we", $SLK3, true, false];`
],
[
`#comment1
#comment2`,

``
],
[
`var a: 3 #comment1
#comment2
call print(a)`,

`var a = $SLK3;
$SLK.print(a);`
],
[
`

# comment

# comment 1
# comment 2
`,

``
],
// multi-line expression
[
`var a: (
    1
    +
    2
)`,

`var a = ($SLK.add($SLK1, $SLK2));`
],
[
`var a: (
    false
        ? 3
        ! (
            3 ≠ 4
            ? '3 ≠ 4'
            ! '3 = 4'
        )
)`,

`var a = (
    false
    ? $SLK3
    : (
        $SLK.ne($SLK3, $SLK4)
        ? "3 ≠ 4"
        : "3 = 4"
    )
);`
],
// logical connectives
[
`var a: true \\/ false`,

`var a = (true || false);`
],
[
`var a: true /\\ false`,

`var a = (true && false);`
],
[
`var a: (
    true /\\ false \\/ true
    /\\ false
)`,

`var a = ((true && false) || (true && false));`
],
[
`if first boolean variable \\/ second boolean variable
    call print('Either the first or the second is true')`,

`if (($SLK.assert_boolean(first_boolean_variable) || $SLK.assert_boolean(second_boolean_variable))){
    $SLK.print("Either the first or the second is true");
}`
],
[
`var a: f ()
    call print('b')
call print('a')`,

`var a = $SLK.stone(function () {
    $SLK.print("b");
});
$SLK.print("a");`
]
]);
import { test } from "./Tester";
import { Runner } from "../Runner";
const runner = new Runner(false);
test(source, runner);
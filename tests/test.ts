const source = new Map([
[
`call print 3e-10`,

`$SLK.print($SLK3e_10);`
],
[
`var my·simple·name·of·a·variable: 'a string 📆🤞🌈'`,

`var my_simple_name_of_a_variable = "a string 📆🤞🌈";`
],
[
`var exit: f final·value
    var element·nr: 0
    return final·value`,
    
`var exit = $SLK.stone(function (final_value) {
    var element_nr = $SLK0;
    return final_value;
});`
],
[
`var element·nr: 10
var callback·function: f reduction element element·nr exit
    # function details omitted
    return null
while element·nr ≥ 0
    let element·nr: element·nr - 1
    # fake some variables
    var reduction: null
    var array: null
    var exit: null
    call (
        callback·function
        reduction
        array
        element·nr
        exit
    )`,

`var element_nr = $SLK10;
var callback_function = $SLK.stone(function (reduction, element, element_nr, exit) {
    return undefined;
});
while ($SLK.ge(element_nr, $SLK0)){
    element_nr = $SLK.sub(element_nr, $SLK1);
    var reduction = undefined;
    var array = undefined;
    var exit = undefined;
    callback_function(reduction, array, element_nr, exit);
}`
],
[
`var my·hero: 'butterfly'
if my·hero = 'monster'
    call print 'blood curdling scream'
elif my·hero = 'butterfly'
    call print 'do not make a sound'
else
    call print 'sing like a rainbow'`,

`var my_hero = "butterfly";
if ($SLK.eq(my_hero, "monster")){
    $SLK.print("blood curdling scream");
} else if ($SLK.eq(my_hero, "butterfly")){
    $SLK.print("do not make a sound");
} else {
    $SLK.print("sing like a rainbow");
}`
],
// records
[
`var obj: {
    three: 3.230
    hello: {
        something: true
    }
}`,

`var obj = (function (o) {
    o["three"] = $SLK3_23;
    o["hello"] = (function (o) {
        o["something"] = true;
        return o;
    }(Object.create(null)));
    return o;
}(Object.create(null)));`
],
[

`var a: {one: 32}`,

`var a = (function (o) {
    o["one"] = $SLK32;
    return o;
}(Object.create(null)));`
],
[
`var wala : {
    some·thing: true
}
var three: {
    a: 0.1
    b: 'lala'
    a·long·var·name: wala
}`,

`var wala = (function (o) {
    o["some·thing"] = true;
    return o;
}(Object.create(null)));
var three = (function (o) {
    o["a"] = $SLK0_1;
    o["b"] = "lala";
    o["a·long·var·name"] = wala;
    return o;
}(Object.create(null)));`
],
[
`var three: {
    a: 0.1
    b: 'lala'
}
call print three~a`,

`var three = (function (o) {
    o["a"] = $SLK0_1;
    o["b"] = "lala";
    return o;
}(Object.create(null)));
$SLK.print($SLK.get(three, "a"));`
],
[
`var record1: {}`,

`var record1 = Object.create(null);`
],
[
`var a: [1, 2, '3']`,

`var a = [$SLK1, $SLK2, "3"];`
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
call print (a)`,

`var a = $SLK3;
$SLK.print((a));`
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
`var a: true ⋎ false`,

`var a = (true || false);`
],
[
`var a: true ⋏ false`,

`var a = (true && false);`
],
[
`var a: (
    true ⋏ false ⋎ true
    ⋏ false
)`,

`var a = ((true && false) || (true && false));`
],
[
`var first·boolean·variable: true
var second·boolean·variable: false
if first·boolean·variable ⋎ second·boolean·variable
    call print 'Either the first or the second is true'`,

`var first_boolean_variable = true;
var second_boolean_variable = false;
if (($SLK.assert_boolean(first_boolean_variable) || $SLK.assert_boolean(second_boolean_variable))){
    $SLK.print("Either the first or the second is true");
}`
],
// using keyword as identifier
[
`var var: 3
call print var`,

`var $SLKvar = $SLK3;
$SLK.print($SLKvar);`
],
// functions
[
`var foo: f a b
    return a * b
call print (foo 2 3)`,

`var foo = $SLK.stone(function (a, b) {
    return $SLK.mul(a, b);
});
$SLK.print((foo($SLK2, $SLK3)));`
],
[
`var foo: f a b (
    a * b
)
call print (foo 2 3)`,

`var foo = $SLK.stone(function (a, b) {return ($SLK.mul(a, b))});
$SLK.print((foo($SLK2, $SLK3)));`
],
// functinos
[
`var bool: f⋏ true false`,

`var bool = $SLK.and(true, false);`
],
[
`var bool: f⋎ false false`,

`var bool = $SLK.or(false, false);`
],
[
`var a: f+ 0.1 0.2`,

`var a = $SLK.add($SLK0_1, $SLK0_2);`
],
[
`var a: f- 0.1 0.2`,

`var a = $SLK.sub($SLK0_1, $SLK0_2);`
],
[
`var a: f* 0.1 0.2`,

`var a = $SLK.mul($SLK0_1, $SLK0_2);`
],
[
`var a: f/ 0.1 0.2`,

`var a = $SLK.div($SLK0_1, $SLK0_2);`
],
[
`var a: f% 0.1 0.2`,

`var a = $SLK.mod($SLK0_1, $SLK0_2);`
],
[
`var a: f= 'a' 'b'`,

`var a = $SLK.eq("a", "b");`
],
[
`var a: f≠ 'a' 'b'`,

`var a = $SLK.ne("a", "b");`
],
[
`var a: f< 'a' 'b'`,

`var a = $SLK.lt("a", "b");`
],
[
`var a: f≥ 'a' 'b'`,

`var a = $SLK.ge("a", "b");`
],
[
`var a: f> 'a' 'b'`,

`var a = $SLK.gt("a", "b");`
],
[
`var a: f& 'abcd' 0.3e-10`,

`var a = $SLK.cat("abcd", $SLK3e_11);`
],
// logical not function
[
`var a: not true`,

`var a = $SLK.not(true);`
],
// negation function
[
`var a: neg -3`,

`var a = $SLK.neg($SLK_3);`
],
// minus operator
[
`var a: 3 - 0.2e-10`,

`var a = $SLK.sub($SLK3, $SLK2e_11);`
],
// pipe function
[
`var a: (pipe (f⋏ false) (f⋎ true) not) true`,

`var a = ($SLK.pipe(($SLK.and(false)), ($SLK.or(true)), $SLK.not))(true);`
],
// string concatenation
[
`call print ('abcd' & 'a' & 0.3e-10)`,

`$SLK.print(($SLK.cat($SLK.cat("abcd", "a"), $SLK3e_11)));`
]
]);
import { test } from "./Tester";
import { Runner } from "../Runner";
const runner = new Runner();
test(source, runner);
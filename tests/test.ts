const source = new Map([
[
`print(3e-10)`,

`const $SLK3e_10 = $SLK.number("3e-10");

$SLK.print($SLK3e_10);`
],
[
`var my simple name of a variable: 'a string 📆🤞🌈'`,

`var my_simple_name_of_a_variable = "a string 📆🤞🌈";`
],
[
`var exit: f (final value)
    element nr: 0
    return final value`,
    
`const $SLK0 = $SLK.number("0");

var exit = $SLK.stone(function (final_value) {
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

`const $SLK0 = $SLK.number("0");
const $SLK1 = $SLK.number("1");

while ($SLK.ge(element_nr, $SLK0)){
    element_nr = $SLK.sub(element_nr, $SLK1);
    reduction = callback_function(reduction, $SLK.get(array, element_nr), element_nr, exit);
}`
],
[
`if my hero = 'monster'
    call blood curdling scream()
elif my hero = 'butterfly'
    do not make a sound()
else
    sing like a rainbow()`,

`if ($SLK.eq(my_hero, "monster")){
    call_blood_curdling_scream();
} else if ($SLK.eq(my_hero, "butterfly")){
    do_not_make_a_sound();
} else {
    sing_like_a_rainbow();
}`
]
]);
import { test } from "./Tester";
import { Runner } from "../Runner";
const runner = new Runner(false);
test(source, runner);
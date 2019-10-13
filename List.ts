import R from "ramda";
import Decimal from "decimal.js";
import { isNumber } from "./utils";

const map = R.map;
const filter = R.filter;
const reject = R.reject;
const find = R.find;
const reduce = R.reduce;
const reduce_last = R.reduceRight;
const all = R.all;
const any = R.any;
const first = R.head;
const tail = R.tail;
const head = R.init;
const last = R.last;
const nth = R.curry(function<T>(n: Decimal, list: readonly T[]) {
    return R.nth(checkNumber(n), list);
});
const take = R.curry(function<T>(n: Decimal, list: readonly T[]) {
    return R.take(checkNumber(n), list);
});
const take_last = R.curry(function<T>(n: Decimal, list: readonly T[]) {
    return R.takeLast(checkNumber(n), list);
});

function checkNumber(n: any) {
    if (isNumber(n)) {
        return n.toNumber()
    }
    throw `List index must be a number!`;
}

export default {
    map,
    filter,
    reject,
    find,
    reduce,
    "reduce·last": reduce_last,
    all,
    any,
    first,
    tail,
    head,
    last,
    nth,
    take,
    "take·last": take_last
};

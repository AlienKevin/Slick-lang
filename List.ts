import R from "ramda";
import Decimal from "decimal.js";
import { number, maybe } from "./utils";

const map = R.map;
const mapIndexed = R.curry(function<T, U>(f: (a: T, index: Decimal) => U, list: readonly T[]) {
    let arr = [];
    for (let i = 0; i < list.length; i++) {
        arr.push(f(list[i], new Decimal(i)));
    }
    return arr;
});
const filter = R.filter;
const reject = R.reject;
const find = R.curry(function<T>(f: (a: T) => boolean, list: readonly T[]) {
    return maybe(R.find(f, list));
});
const reduce = R.reduce;
const reduceLast = R.reduceRight;
const all = R.all;
const any = R.any;
const first = maybe(function<T>(list: readonly T[]) {
    return maybe(R.head(list));
});
const tail = R.tail;
const head = R.init;
const last = maybe(function<T>(list: readonly T[]) {
    return maybe(R.last(list));
});
const nth = R.curry(function<T>(n: Decimal, list: readonly T[]) {
    return maybe(R.nth(number(n), list));
});
const take = R.curry(function<T>(n: Decimal, list: readonly T[]) {
    return R.take(number(n), list);
});
const takeLast = R.curry(function<T>(n: Decimal, list: readonly T[]) {
    return R.takeLast(number(n), list);
});
const slice = R.curry(function<T>(a: Decimal, b: Decimal, list: readonly T[]) {
    return R.slice(number(a), number(b), list);
});
const member = R.includes;
const insert = R.curry(function<T>(index: Decimal, elt: T, list: readonly T[]) {
    return R.insert(number(index), elt, list);
});
const append = R.append;
const prepend = R.prepend;
const update = R.curry(function<T>(index: Decimal, value: T, list: readonly T[]) {
    return R.update(number(index), value, list);
});
const drop = R.curry(function<T>(index: Decimal, list: readonly T[]) {
    return R.drop(number(index), list);
});
const dropLast = R.curry(function<T>(index: Decimal, list: readonly T[]) {
    return R.dropLast(number(index), list);
});
const concat = R.concat;
const adjust = R.curry(function<T>(index: Decimal, fn: (a: T) => T, list: readonly T[]) {
    return R.adjust(number(index), fn, list);
});
const length = function<T>(list: readonly T[]) {
    return new Decimal(list.length);
};

export default {
    map,
    mapIndexed,
    filter,
    reject,
    find,
    reduce,
    reduceLast,
    all,
    any,
    first,
    tail,
    head,
    last,
    nth,
    take,
    takeLast,
    slice,
    member,
    insert,
    append,
    prepend,
    update,
    drop,
    dropLast,
    concat,
    adjust,
    length
};

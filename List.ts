import R from "ramda";

const map = R.map;
const filter = R.filter;
const reject = R.reject;
const find = R.find;
const reduce = R.reduce;
const reduce_right = R.reduceRight;
const all = R.all;
const any = R.any;

export default {
    map,
    filter,
    reject,
    find,
    reduce,
    "reduce·right": reduce_right,
    all,
    any
};

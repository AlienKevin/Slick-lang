import R from "ramda";

const prop = R.prop;
const pick = R.pick;
const has = R.has;
const path = R.path;
const keys = R.keys;
const values = R.values;
const assoc = R.assoc;
const assoc_path = R.assocPath;
const dissoc = R.dissoc;
const dissoc_path = R.dissocPath;
const omit = R.omit;
const evolve = R.evolve;
const merge = R.mergeLeft;
const merge_last = R.mergeRight;

export default {
    prop,
    pick,
    has,
    path,
    keys,
    values,
    assoc,
    "assoc·path": assoc_path,
    dissoc,
    "dissoc·path": dissoc_path,
    omit,
    evolve,
    merge,
    "merge·last": merge_last
}

import R from "ramda";
import Decimal from "decimal.js";
import { number } from "./utils";
import * as unified from "string-unified";

const lower = R.toLower;
const upper = R.toUpper;
const lower_ = R.curry(function (text: string) {
   return /[a-z]/.test(text) && !/[A-Z]/.test(text);
});
const upper_ = R.curry(function (text: string) {
    return !/[a-z]/.test(text) && /[A-Z]/.test(text);
});
const nth = R.curry(function (index: Decimal, text: string) {
    return unified.charAt(text, number(index));
});
const take = R.curry(function (length: Decimal, text: string) {
    const len = number(length);
    if (len <= 0) {
        return "";
    }
    return unified.substring(text, 0, len);
});
const take_last = R.curry(function (length: Decimal, text: string) {
    const len = number(length);
    if (len <= 0) {
        return "";
    }
    return unified.substring(text, -len);
});
const trim = R.trim;
const split = R.curry(function (splitter: string, text: string) {
    return unified.split(text, splitter);
});
const capitalize = R.curry(function (text: string) {
    if (text === "") {
        return "";
    }
    return unified.charAt(text, 0) + capitalize(unified.substring(text, 1));
});
const ends_with = R.curry(function (searchText: string, text: string) {
    return unified.endsWith(text, searchText);
});
const starts_with = R.curry(function (searchText: string, text: string) {
    return unified.startsWith(text, searchText);
});
const slice = R.curry(function (start: Decimal, end: Decimal, text: string) {
    return unified.substring(text, number(start), number(end));
});
const member = R.curry(function (searchText: string, text: string) {
    return unified.includes(text, searchText);
});
const length = function (text: string) {
    return new Decimal(unified.length(text));
}

export default {
    lower,
    upper,
    "lower?": lower_,
    "upper?": upper_,
    nth,
    take,
    "take·last": take_last,
    trim,
    split,
    capitalize,
    "ends·with": ends_with,
    "starts·with": starts_with,
    slice,
    member,
    length
}

import { isList, isNumber, isText, isBoolean, isNull } from "./utils";
import Decimal from "decimal.js";
import * as unified from "string-unified";
import List from "./List";

function print(any) {
    console.log(toString(any));
}

function toString(any) {
    if (isNumber(any) || isText(any) || isBoolean(any)) {
        return any.toString();
    }
    if (isNull(any)) {
        return "null";
    }
    if (isList(any)) {
        return "[" + any.join(", ") + "]";
    }
    if (typeof any === "object") {
        let linebreak = "";
        let padding = "";
        if (Object.keys(any).length > 1) {
            linebreak = "\n";
            padding = "    ";
        }
        return (
            "{" + linebreak
            + Object.entries(any).map(([key, value]) => 
                padding + toString(key) + ": " + toString(value)
            ).join(linebreak)
            + linebreak
            + "}"
        );
    }
    if (typeof any === "function") {
        return "<function>";
    }
}

function error(message: string) {
    throw new Error(message);
}

function checkNumber(n: any) {
    if (isNumber(n)) {
        return n.toNumber()
    }
    error(`List index must be a number!`)
}

function checkIndex(n: any, length: number) {
    let index = checkNumber(n);
    if (!Number.isInteger(index)) {
        error(`List index must be an integer!`);
    }
    if (index >= length
        || index < -length) {
        error(`List index ouside range from ${-length} to ${length - 1}!`);
    } else {
        return (
            index >= 0
            ? index
            : length + index
        );
    }
}

function get(container, key) {
    if (isList(container)) {
        const index = checkIndex(key, container.length);
        return container[index];
    } else if (isText(container)) {
        const index = checkIndex(key, unified.length(container));
        return unified.charAt(container, index);
    }
    if (typeof container === "object") {
        const value = container[key];
        if (value === undefined) {
            error(`Record does not contain key ${key}!`);
        } else {
            return value;
        }
    }
}

function number(n) {
    if (isBoolean(n)) {
        return (
            n === true
            ? new Decimal(1)
            : new Decimal(0)
        );
    }
    // else n is a string or number
    const number = new Decimal(n);
    if (number.isNaN()) {
        error(`Invalid number literal!`);
    }
    return number;
}

function text(zeroth) {
    if (isNumber(zeroth)) {
        return zeroth.toString();
    }
    if (isBoolean(zeroth)) {
        return String(zeroth);
    }
}

// 'stone' is a deep freeze.
function stone(object) {
    if (!Object.isFrozen(object)) {
        object = Object.freeze(object);
        if (typeof object === "object") {
            if (Array.isArray(object)) {
                object.forEach(stone);
            } else {
                Object.keys(object).forEach(function (key) {
                    stone(object[key]);
                });
            }
        }
    }
    return object;
}

function length(container) {
    if (isList(container)) {
        return number(container.length);
    }
    if (isText(container)) {
        return number(unified.length(container));
    }
    error(`Property 'length' does not exist!`);
}

function boolean_(any) {
    return isBoolean(any);
}

function function_(any) {
    return typeof any === "function";
}

function integer_(any) {
    return (
        isNumber(any)
        && any.isInteger()
    );
}

function number_(any) {
    return isNumber(any);
}

function record_(any) {
    return (
        typeof any === "object"
        && !isList(any)
        && !isNumber(any)
    );
}

function text_(any) {
    return isText(any);
}

function assert_boolean(boolean) {
    if (isBoolean(boolean)) {
        return boolean
    } else {
        error(`Expected a boolean value!`);
    }
}

function and(zeroth, oneth) {
    return assert_boolean(zeroth) && assert_boolean(oneth);
}

function or(zeroth, oneth) {
    return assert_boolean(zeroth) || assert_boolean(oneth);
}

function not(boolean) {
    return !assert_boolean(boolean);
}

function ternary(zeroth, oneth, twoth) {
    return (
        assert_boolean(zeroth)
        ? oneth
        : twoth
    );
}

function eq(zeroth, oneth) {
    return zeroth === oneth || (
        isNumber(zeroth)
        && isNumber(oneth)
        && zeroth.equals(oneth)
    );
}

function lt(zeroth, oneth) {
    if (isNumber(zeroth) && isNumber(oneth)) {
        return zeroth.lt(oneth);
    } else if (typeof zeroth === typeof oneth && (
        typeof zeroth === "string"
        || typeof zeroth === "number"
    )) {
        return zeroth < oneth;
    }
    error(`Invalid arguments for lt()`);
}

function ge(zeroth, wunth) {
    return !lt(zeroth, wunth);
}

function gt(zeroth, wunth) {
    return lt(wunth, zeroth);
}

function le(zeroth, wunth) {
    return !lt(wunth, zeroth);
}

function ne(zeroth, wunth) {
    return !eq(wunth, zeroth);
}

function calc(name, a, b?) {
    if (isNumber(a)) {
        if (b === undefined) {
            return a[name]();
        }
        if (isNumber(b)) {
            return a[name](b);
        }
    }
    error(`Invalid arguments for ${name}()`);
}

function add(a, b) {
    return calc("add", a, b);
}

function sub(a, b) {
    return calc("sub", a, b);
}

function mul(a, b) {
    return calc("mul", a, b);
}

function div(a, b) {
    if (isNumber(a) && isNumber(b) && b.isZero()) {
        error(`Cannot divide by zero!`);
    }
    return calc("div", a, b);
}

function mod(a, b) {
    return calc("mod", a, b);
}

function max(a, b) {
    return (
        lt(b, a)
        ? a
        : b
    );
}

function min(a, b) {
    return (
        lt(a, b)
        ? a
        : b
    );
}

function abs(a) {
    return calc("abs", a);
}

function fraction(a) {
    if (isNumber(a)) {
        return a.sub(a.trunc());
    }
    error(`Invalid arguments for integer()`);
}

function integer(a) {
    if (isNumber(a)) {
        a.trunc()
    }
    error(`Invalid arguments for integer()`);
}

function neg(a) {
    return calc("neg", a);
}

export default stone({
    abs,
    add,
    and,
    assert_boolean,
    boolean_,
    div,
    eq,
    fraction,
    function_,
    ge,
    get,
    gt,
    integer,
    integer_,
    le,
    length,
    lt,
    List,
    max,
    min,
    mod,
    mul,
    ne,
    neg,
    not,
    number,
    number_,
    or,
    print,
    record_,
    stone,
    sub,
    ternary,
    text,
    text_
});

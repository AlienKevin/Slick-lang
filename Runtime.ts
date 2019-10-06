import { isList, isNumber, isText, isBoolean } from "./utils";
import Decimal from "decimal.js";

let records = new WeakMap();

function print(any) {
    console.log(toString(any));
}

function toString(any) {
    if (isNumber(any) || isText(any) || isBoolean(any)) {
        return any.toString();
    }
    if (isList(any)) {
        return "[" + any.join(", ") + "]";
    }
    if (typeof any === "object") {
        "{\n"
        + Object.entries(any).map(([key, value]) => 
            "    " + toString(key) + ": " + toString(value) + "\n"
        )
        + "}";
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

function checkIndex(n: any, container: any[] | string) {
    let index = checkNumber(n);
    const length = container.length;
    if (index >= length
        || index < -length) {
        error(`List index ouside range from ${-length} to ${length - 1}!`)
    } else {
        return (
            index >= 0
            ? index
            : length + index
        );
    }
}

function get(container, key) {
    if (isList(container) || isText(container)) {
        return checkIndex(key, container);
    }
    if (typeof container === "object") {
        if (records.get(container)[key] !== undefined) {
            return records.get(container).get(key);
        } else {
            error(`Record does not contain key ${key}!`);
        }
    }
}

function set(container, key, value) {
    if (Object.isFrozen(container)) {
        error(`Cannot set value of a stoned object!`);
    }
    // set value of list
    if (isList(container)) {
        container[checkIndex(key, container)] = value;
    }
    // set key and value of record
    else if (typeof container === "object") {
        let record = records.get(container);
        // create new record if not yet initialized
        if (record === undefined) {
            record = new WeakMap();
            records.set(container, record);
        }
        // update record
        else {
            record.set(key, value);
        }
    }
    error(`Invalid arguments for set()`);
}

function list(zeroth, oneth, ...rest) {
    if (isList(zeroth)) {
        return zeroth.slice(checkNumber(oneth), checkNumber(rest[0]));
    }
    if (typeof zeroth === "object") {
        return Object.keys(zeroth);
    }
    if (isText(zeroth)) {
        return zeroth.split(oneth || "");
    }
    error(`Invalid arguments for list()`);
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

function record(zeroth, oneth) {
    const newRecord = Object.create(null);
    if (zeroth === undefined) {
        return newRecord;
    }
    if (isList(zeroth)) {
        if (oneth === undefined) {
            oneth = true;
        }
        zeroth.forEach((element, index) => {
            set(
                newRecord,
                element,
                (
                    isList(oneth)
                    ? oneth[index]
                    : oneth
                )
            )
        });
    }
    return newRecord;
}

function text(zeroth, oneth, twoth) {
    if (isText(zeroth)) {
        return zeroth.slice(checkNumber(oneth), checkNumber(twoth));
    }
    if (isNumber(zeroth)) {
        return zeroth.toString();
    }
    if (isList(zeroth)) {
        let separator = oneth;
        if (!isText(oneth)) {
            if (oneth !== undefined) {
                error(`Separator must be a string!`);
            }
            separator = "";
        }
        return zeroth.join(separator);
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
    if (isList(container) || isText(container)) {
        return number(container.length);
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
    list,
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
    max,
    min,
    mul,
    ne,
    neg,
    not,
    number,
    number_,
    or,
    print,
    record,
    record_,
    set,
    stone,
    sub,
    ternary,
    text,
    text_
});

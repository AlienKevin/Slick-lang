import { isList, isNumber, isText, isBoolean, isNull } from "./utils";
import Decimal from "decimal.js";
import * as unified from "string-unified";
import List from "./List";
import R from "ramda"

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
        return "[" + any.map(toString).join(", ") + "]";
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

const pipe = R.pipe;

function error(message: string) {
    throw message;
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

function cat(zeroth, wunth) {
    zeroth = text(zeroth);
    wunth = text(wunth);
    if (typeof zeroth === "string" && typeof wunth === "string") {
        return zeroth + wunth;
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
    if (isText(zeroth)) {
        return zeroth;
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

const and = R.curry(function(zeroth, oneth) {
    return assert_boolean(zeroth) && assert_boolean(oneth);
});

const or = R.curry(function (zeroth, oneth) {
    return assert_boolean(zeroth) || assert_boolean(oneth);
});

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

const eq = R.curry(function (zeroth, oneth) {
    return R.equals(zeroth, oneth) || (
        isNumber(zeroth)
        && isNumber(oneth)
        && zeroth.equals(oneth)
    );
});

const lt = R.curry(function (zeroth, oneth) {
    if (isNumber(zeroth) && isNumber(oneth)) {
        return zeroth.lt(oneth);
    } else if (typeof zeroth === typeof oneth && (
        typeof zeroth === "string"
        || typeof zeroth === "number"
    )) {
        return zeroth < oneth;
    }
    error(`Invalid arguments for lt()`);
});

const ge = R.curry(function (zeroth, wunth) {
    return !lt(zeroth, wunth);
});

const gt = R.curry(function (zeroth, wunth) {
    return lt(wunth, zeroth);
});

const le = R.curry(function (zeroth, wunth) {
    return !lt(wunth, zeroth);
});

const ne = R.curry(function (zeroth, wunth) {
    return !eq(wunth, zeroth);
});

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

const add = R.curry(function (a, b) {
    return calc("add", a, b);
});

const sub = R.curry(function (a, b) {
    return calc("sub", a, b);
});

const mul = R.curry(function (a, b) {
    return calc("mul", a, b);
});

const div = R.curry(function (a, b) {
    if (isNumber(a) && isNumber(b) && b.isZero()) {
        error(`Cannot divide by zero!`);
    }
    return calc("div", a, b);
});

const mod = R.curry(function (a, b) {
    return calc("mod", a, b);
});

const max = R.curry(function (a, b) {
    return (
        lt(b, a)
        ? a
        : b
    );
});

const min = R.curry(function (a, b) {
    return (
        lt(a, b)
        ? a
        : b
    );
});

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
    cat,
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
    pipe,
    print,
    record_,
    stone,
    sub,
    ternary,
    text,
    text_
});

import { isList, isNumber, isText, isBoolean, isNil } from "./utils";
import List from "./List";
import Text from "./Text";
import R from "ramda"
import Decimal from "decimal.js";

function print(any) {
    const string = toString(any);
    console.log(string);
    return string;
}

function toString(any) {
    if (isNumber(any)) {
        return any.toString();
    }
    if (isBoolean(any)) {
        return any ? "True" : "False";
    }
    if (isText(any)) {
        return "'" + any + "'";
    }
    if (isNil(any)) {
        return "Nil";
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

const cat = R.curry(function (zeroth, wunth) {
    return zeroth + wunth;
});

function number(n: string) {
    return new Decimal(n);
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

function calc(name: string, a: Decimal, b?: Decimal) {
    if (b === undefined) {
        return a[name]();
    }
    return a[name](b);
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

const div = R.curry(function (a: Decimal, b: Decimal) {
    if (b.isZero()) {
        console.warn("Warning: Division by zero!")
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

function round(a: Decimal) {
    return calc("round", a);
}

function floor(a: Decimal) {
    return calc("floor", a);
}

function ceil(a: Decimal) {
    return calc("ceil", a);
}

function trunc(a: Decimal) {
    return calc("trunc", a);
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

function sqrt(a: Decimal) {
    if (a.isNegative()) {
        console.log("Warning: Taking the square root of a negative number!");
    }
    return calc("sqrt", a);
}

export default stone({
    abs,
    add,
    and,
    assert_boolean,
    cat,
    div,
    eq,
    round,
    ge,
    gt,
    integer,
    le,
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
    or,
    pipe,
    print,
    sqrt,
    stone,
    sub,
    ternary,
    Text,
    floor,
    ceil,
    trunc,
}); 

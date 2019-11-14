import { isList, isNumber, isText, isBoolean, isCustomType } from "./utils";
import List from "./List";
import Text from "./Text";
import R from "ramda"
import Decimal from "decimal.js";
import { RecordLiteral } from "./Expr";
import { CustomType } from "./typeChecking/CustomType";

Decimal.set({
    toExpPos: 5,
    toExpNeg: -5,
    precision: 20
});

function print(any) {
    const string = toString(any);
    console.log(string);
    return string;
}

function toString(any, padding = 4) {
    if (isNumber(any)) {
        return any.toDecimalPlaces(5).toString();
    }
    if (isBoolean(any)) {
        return any ? "True" : "False";
    }
    if (isText(any)) {
        return "'" + any + "'";
    }
    if (isCustomType(any)) {
        return (
            any.name
            + (
                any.parameters === undefined
                ? ""
                : " " + toString(any.parameters, padding)
            )
        );
    }
    if (isList(any)) {
        return "[" + any.map(any => toString(any, padding)).join(", ") + "]";
    }
    if (typeof any === "object") {
        let linebreak = "\n";
        const indent = 4;
        return (
            "{" + linebreak
            + Object.entries(any).map(([key, value]) => 
                " ".repeat(padding) + toString(key, padding + indent) + ": " + toString(value, padding + indent)
            ).join(linebreak)
            + linebreak
            + " ".repeat(padding - indent) + "}"
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

const curry = R.curry;

const and = R.curry(function(zeroth, oneth) {
    return zeroth && oneth;
});

const or = R.curry(function (zeroth, oneth) {
    return zeroth || oneth;
});

function not(boolean) {
    return !boolean;
}

function ternary(zeroth, oneth, twoth) {
    return (
        zeroth
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

function neg(a) {
    return calc("neg", a);
}

function sqrt(a: Decimal) {
    if (a.isNegative()) {
        console.log("Warning: Taking the square root of a negative number!");
    }
    return calc("sqrt", a);
}

function sin(a: Decimal) {
    return a.sin();
}
function cos(a: Decimal) {
    return a.cos();
}
function tan(a: Decimal) {
    return a.tan();
}
const asin = function (a: Decimal) {
    if (a.lt(-1) || a.gt(1)) {
        console.log("Warning: Input to asin() outside domain from -1 to 1!");
    }
    return a.asin();
}
const acos = function (a: Decimal) {
    if (a.lt(-1) || a.gt(1)) {
        console.log("Warning: Input to acos() outside domain from -1 to 1!");
    }
    return a.acos();
}
function atan(a: Decimal) {
    return a.atan();
}
function atan2(a: Decimal, b: Decimal) {
    return Decimal.atan2(a, b);
}

const pi = Decimal.acos(-1);
const e = new Decimal(1).exp();

function createCustomType(name: string, parameters?: RecordLiteral) {
    return new CustomType(name, [], parameters);
}

export default stone({
    abs,
    add,
    and,
    cat,
    div,
    eq,
    round,
    ge,
    gt,
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
    curry,
    sub,
    ternary,
    Text,
    floor,
    ceil,
    trunc,
    pi,
    e,
    sin,
    cos,
    tan,
    asin,
    acos,
    atan,
    atan2,
    createCustomType,
    toString
}); 

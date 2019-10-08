import Decimal from "decimal.js";

// Source: https://stackoverflow.com/a/8935675/6798201
export function isDigit(char: string) {
    return /^\d$/.test(char);
}

export function isSpace(char: string) {
    return char === ' ';
}

// Based on: https://stackoverflow.com/a/4434100/6798201
export function isAlpha(char: string) {
    return /^[a-z_]$/i.test(char);
}

export function isAlphaNumeric(char: string) {
    return isAlpha(char) || isDigit(char);
}

export function isList<T>(value: T[]): value is T[] {
    return Array.isArray(value);
}

export function isNumber(value: any): value is Decimal {
    return Decimal.isDecimal(value);
}

export function isText(value: any): value is string {
    return typeof value === "string";
}

export function isBoolean(value: any): value is boolean {
    return typeof value === "boolean";
}

export function isNull(value: any): value is undefined {
    return value === undefined;
}

export function capitalize(str: string) {
    return (
        str.length > 0
            ? str[0].toUpperCase() + str.slice(1)
            : ""
    )
}
import Decimal from "decimal.js";
import { CustomType } from "./typeChecking/CustomType";
import { RecordLiteral } from "./Expr";

// Source: https://stackoverflow.com/a/8935675/6798201
export function isDigit(char: string) {
    return /^\d$/.test(char);
}

// Based on: https://stackoverflow.com/a/4434100/6798201
export function isAlpha(char: string) {
    return /^[a-z]$/i.test(char);
}

export function isAlphaNumeric(char: string) {
    return isAlpha(char) || isDigit(char);
}

export function isUpper(char: string) {
    return /[A-Z]/.test(char);
}

export function isList(value: any): value is any[] {
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

export function isCustomType(value: any): value is CustomType {
    return value instanceof CustomType;
}

export function capitalize(str: string) {
    return (
        str.length > 0
            ? str[0].toUpperCase() + str.slice(1)
            : ""
    )
}

export function nextChar(c: string) {
    return String.fromCharCode(c.charCodeAt(0) + 1);
}

export function number(n: any) {
    if (isNumber(n)) {
        return n.toNumber()
    }
}

export function are(length: number) {
    if (length === 0 || length > 1) {
        return " are "
    } else {
        return " is "
    }
}

export function them(length: number) {
    if (length === 0 || length > 1) {
        return " them "
    } else {
        return " it "
    }
}

export function createCustomType(name: string, parameters?: RecordLiteral) {
    return new CustomType(name, [], parameters);
}


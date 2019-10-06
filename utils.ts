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

export function isList(value: any) {
    return Array.isArray(value);
}

export function capitalize(str: string) {
    return (
        str.length > 0
            ? str[0].toUpperCase() + str.slice(1)
            : ""
    )
}
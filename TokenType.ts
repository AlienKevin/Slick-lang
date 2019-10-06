export enum TokenType {
    // Single-character tokens.                      
    LEFT_PAREN = "LEFT_PAREN",
    RIGHT_PAREN = "RIGHT_PAREN",
    LEFT_BRACE = "LEFT_BRACE",
    RIGHT_BRACE = "RIGHT_BRACE",
    LEFT_BRACKET = "LEFT_BRACKET",
    RIGHT_BRACKET = "RIGHT_BRACKET",
    BANG = "BANG",
    QUESTION = "QUESTION",
    COMMA = "COMMA",
    DOT = "DOT",
    MINUS = "MINUS",
    PLUS = "PLUS",
    SLASH = "SLASH",
    STAR = "STAR",
    MODULO = "MODULO",
    COLON = "COLON",

    // indentation tokens
    INDENT = "INDENT",
    DEDENT = "DEDENT",

    NOT_EQUAL = "NOT_EQUAL",
    EQUAL = "EQUAL",
    GREATER = "GREATER",
    GREATER_EQUAL = "GREATER_EQUAL",
    LESS = "LESS",
    LESS_EQUAL = "LESS_EQUAL",

    // Literals.                                     
    IDENTIFIER = "IDENTIFIER",
    STRING = "STRING",
    NUMBER = "NUMBER",

    // Keywords.                                     
    AND = "AND",
    ELSE = "ELSE",
    ELIF = "ELIF",
    FALSE = "FALSE",
    IF = "IF",
    OR = "OR",
    RETURN = "RETURN",
    TRUE = "TRUE",
    WHILE = "WHILE",
    BREAK = "BREAK",
    MUT = "MUT",
    VAR = "VAR",
    F = "F",

    // End of File
    EOF = "EOF"
};
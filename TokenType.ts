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
    TILDE = "TILDE",
    MINUS = "MINUS",
    PLUS = "PLUS",
    SLASH = "SLASH",
    BACK_SLASH = "BACK_SLASH",
    STAR = "STAR",
    MODULO = "MODULO",
    COLON = "COLON",
    AMPERSAND = "AMPERSAND",

    // Newline (implicit statement terminator)
    NEWLINE = "NEWLINE",
    // newline inside braces (i.e. {}, [], ())
    // usually ignored by the parser except when there's a brace mismatch
    SOFT_NEWLINE = "SOFT_NEWLINE",
    
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
    IF = "IF",
    OR = "OR",
    RETURN = "RETURN",
    WHILE = "WHILE",
    BREAK = "BREAK",
    MUT = "MUT",
    VAR = "VAR",
    F = "F",
    CALL = "CALL",
    LET = "LET",
    FALSE = "FALSE",
    TRUE = "TRUE",
    NULL = "NULL",

    // End of File
    EOF = "EOF"
};
export enum TokenType {
    // Single-character tokens.                      
    LEFT_PAREN = "LEFT_PAREN",
    RIGHT_PAREN = "RIGHT_PAREN",
    LEFT_BRACE = "LEFT_BRACE",
    RIGHT_BRACE = "RIGHT_BRACE",
    LEFT_BRACKET = "LEFT_BRACKET",
    RIGHT_BRACKET = "RIGHT_BRACKET",
    COMMA = "COMMA",
    DOT = "DOT",
    MINUS = "MINUS",
    PLUS = "PLUS",
    SLASH = "SLASH",
    STAR = "STAR",
    MODULO = "MODULO",
    COLON = "COLON",

    // Newline (implicit statement terminator)
    NEWLINE = "NEWLINE",
    // newline inside braces (i.e. {}, [], ())
    // usually ignored by the parser except when there's a brace mismatch
    SOFT_NEWLINE = "SOFT_NEWLINE",
    
    // indentation tokens
    INDENT = "INDENT",
    DEDENT = "DEDENT",

    BANG_EQUAL = "BANG_EQUAL",
    EQUAL = "EQUAL",
    EQUAL_EQUAL = "EQUAL_EQUAL",
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
    NOT = "NOT",
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
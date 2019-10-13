import { Decimal } from "decimal.js";
import { TokenType } from "./TokenType";
import { Token } from "./Token";
import { isDigit, isAlpha, isAlphaNumeric, isMiddot } from "./utils";
import { Runner } from "./Runner";

const reservedWords = new Map([
    ["true", TokenType.TRUE],
    ["false", TokenType.FALSE],
    ["null", TokenType.NULL],
    ["f", TokenType.F],
])

export class Scanner {

    public tokens: Token[];
    private lineStart: number;
    private start: number;
    private current: number;
    private line: number;
    private braceStack: string[];
    private indentStack: number[];
    private lastIndent: string = undefined;

    public hadError: boolean;

    constructor(public source: string, private runner: Runner) {
        this.tokens = [];
    }

    scan() {
        this.lineStart = 0;
        this.start = 0;
        this.current = 0;
        this.line = 1;
        this.hadError = false;
        this.braceStack = [];
        this.indentStack = [0]; // starts with 0 indentation level

        this.runner.lineStarts.push(0);

        while (!this.isAtEnd()) {
            this.start = this.current;
            this.scanToken();
        }
        this.start = this.current;
        this.addToken(TokenType.EOF);
    }

    scanToken() {
        const c = this.advance();
        switch (c) {
            // single symbols
            case '(': this.addToken(TokenType.LEFT_PAREN); this.braceStack.push('('); break;
            case ')': this.addToken(TokenType.RIGHT_PAREN); this.braceStack.pop(); break;
            case '[': this.addToken(TokenType.LEFT_BRACKET); this.braceStack.push('['); break;
            case ']': this.addToken(TokenType.RIGHT_BRACKET); this.braceStack.pop(); break;
            case '{': this.addToken(TokenType.LEFT_BRACE); this.braceStack.push('{'); break;
            case '}': this.addToken(TokenType.RIGHT_BRACE); this.braceStack.pop(); break;
            case ',': this.addToken(TokenType.COMMA); break;
            case '.': this.addToken(TokenType.DOT); break;
            case '-': this.addToken(TokenType.MINUS); break;
            case '+': this.addToken(TokenType.PLUS); break;
            case '*': this.addToken(TokenType.STAR); break;
            case '/': this.addToken(TokenType.SLASH); break;
            case '%': this.addToken(TokenType.MODULO); break;
            case ':': this.addToken(TokenType.COLON); break;
            case '?': this.addToken(TokenType.QUESTION); break;
            case '!': this.addToken(TokenType.BANG); break;
            case '=': this.addToken(TokenType.EQUAL); break;
            case '<': this.addToken(TokenType.LESS); break;
            case '>': this.addToken(TokenType.GREATER); break;
            case '≥': this.addToken(TokenType.GREATER_EQUAL); break;
            case '≤': this.addToken(TokenType.LESS_EQUAL); break;
            case '≠': this.addToken(TokenType.NOT_EQUAL); break;
            case '⋎': this.addToken(TokenType.OR); break;
            case '⋏': this.addToken(TokenType.AND); break;

            case '#':
                // skip the whole comment line
                while (!this.isAtEnd() && this.peek() !== '\n') {
                    this.advance();
                }
                break;

            // whitespace
            case ' ':
            case '\t':
                // ignore whitespace not at the start of a line (not indentation)
                break;

            case '\r':
                // ignore CR, must have LF after to count as a newline
                break;

            // newlines
            case '\n':
                if (this.braceStack.length > 0) { // newlines inside braces found
                    // generate a soft newline used specifically inside braces
                    this.addToken(TokenType.SOFT_NEWLINE);
                    this.incrementLineCount();
                } else {
                    // this newline token is on the current line, not the next
                    // so this.line++ need to be after addToken(TokenType.NEWLINE)
                    this.addToken(TokenType.NEWLINE);
                    this.incrementLineCount();
                    // all the rest token peeks are at the next line

                    // move start to start of next token
                    this.start = this.current;
                    let indentLevel = 0;
                    let spaceStack = [];
                    let hasIndentationError = false; // used to prevent duplicated error messages for the same line
                    while (this.peek() === ' ' || this.peek() === '\t') {
                        // space and tab are mixed, throw error
                        if (this.lastIndent !== undefined &&
                            this.peek() !== this.lastIndent &&
                            !hasIndentationError) {
                            hasIndentationError = true;
                            this.error("Indentations must either be all spaces or tabs throughout the program!");
                        } else {
                            this.lastIndent = this.peek();
                        }
                        spaceStack.push(this.advance());
                        indentLevel++;
                    }
                    // deeper indented
                    if (indentLevel > this.indentStack[this.indentStack.length - 1]) {
                        this.addToken(TokenType.INDENT);
                        this.indentStack.push(indentLevel);
                        // dedented
                    } else if (indentLevel < this.indentStack[this.indentStack.length - 1]) {
                        let dedentLevel = 0;
                        while (this.indentStack.length > 1 &&
                            indentLevel < this.indentStack[this.indentStack.length - 1]) {
                            this.indentStack.pop();
                            dedentLevel++;
                        }
                        if (indentLevel < this.indentStack[this.indentStack.length - 1]) {
                            this.error("Invalid indentations!");
                        }
                        while (dedentLevel > 0) {
                            this.addToken(TokenType.DEDENT);
                            dedentLevel--;
                        }
                    }
                    // else: indentation stays the same
                }
                while (this.peek() === '\n') { // empty line found
                    this.advance();
                    this.incrementLineCount();
                }
                break;

            case "'": this.string(); break;

            default:
                if (isDigit(c)) {
                    this.number();
                } else if (isAlpha(c)) {
                    this.identifier();
                } else {
                    this.error(`Invalid token: '${c}'`, -1);
                }
        }
    }

    private incrementLineCount() {
        this.line++;
        this.lineStart = this.current;
        this.runner.lineStarts.push(this.current);
    }

    private identifier() {
        while (isAlphaNumeric(this.peek())
            || (isMiddot(this.peek()) && isAlpha(this.peekNext()))) {
            this.advance();
        }
        if (!isMiddot(this.previous()) && this.previous() !== "f"
        && this.peek() === '?') {
            this.advance();
        }

        const text = this.source.substring(this.start, this.current);
        const type = reservedWords.get(text);
        if (type !== undefined) {
            this.addToken(type, text);
        } else {
            this.addToken(TokenType.IDENTIFIER, text);
        }
    } 
    
    private string() {
        let foundDoubleSlash = false;
        let value = "";
        // find closing "'", skip escaped double quotes "\'"
        while ((this.previous() !== '\\' ? this.peek() !== "'" : !foundDoubleSlash) && !this.isAtEnd()) {
            if (this.previous() === '\\') {
                if (['n', 't', "'", '\\'].every((ch) => this.peek() !== ch)) {
                    this.error(`Invalid escape character!`);
                } else { // find a valid escape character
                    switch (this.peek()) {
                        case 't':
                            value += '\t'
                            break;
                        case 'n':
                            value += '\n'
                            break;
                        case "'":
                            value += "'"
                            break;
                        case '\\':
                            value += '\\'
                            break;
                    }
                }
            } else if (this.peek() !== '\\') {
                value += this.peek();
            }
            if (this.previous() === '\\' && this.peek() === '\\') {
                this.advance();
                if (this.peek() === "'") {
                    break;
                } else if (this.peek() !== '\\') {
                    value += this.peek();
                }
            }
            this.advance();
            if (this.previous() === '\n') {
                this.incrementLineCount();
            }
        }

        // Unterminated string.                                 
        if (this.isAtEnd()) {
            this.error(`Unterminated string!`);
            return;
        }

        // The closing `'`
        this.advance();

        this.addToken(TokenType.STRING, value);
    }

    private number() {
        // required integer part
        while (isDigit(this.peek())) {
            // consume the integer part
            this.advance();
        }

        // optional fraction part
        if (this.peek() === '.' && isDigit(this.peekNext())) {
            // consume the "." (dot)
            this.advance();
            // consume the fraction part
            while (isDigit(this.peek())) {
                this.advance();
            }
        } else if (this.peek() == '.') {
            this.error("Illegal number format: numbers must not end with a '.'!");
        }

        // optional exponent part
        if (this.peek() === 'e') {
            // consume the 'e'
            this.advance();
            // consume the exponential part
            if (this.peek() === '-') {
                this.advance();
            }
            while (isDigit(this.peek())) {
                this.advance();
            }
        }

        const numberString = this.source.substring(this.start, this.current);
        const number = new Decimal(numberString);
        this.addToken(TokenType.NUMBER, number);
    }

    private match(expected: string) {
        if (this.isAtEnd()) {
            return false;
        }
        if (this.peek() !== expected) {
            return false;
        }

        // consume that character
        this.current++;
        return true;
    }

    private previous() {
        if (this.current - 1 < 0) {
            return "";
        }
        return this.source[this.current - 1];
    }

    private peekNext() {
        if (this.current + 1 >= this.source.length) {
            return "";
        }
        return this.source[this.current + 1];
    }

    private peek() {
        if (this.isAtEnd()) {
            return "";
        }
        return this.source[this.current];
    }

    private error(message: string, offset = 0) {
        this.hadError = true;
        const programIndex = this.current + offset;
        const lineIndex = programIndex - this.lineStart;
        let lineEnd = programIndex;
        while (this.source[lineEnd] !== "\n" && lineEnd < this.source.length) {
            lineEnd++;
        }
        this.runner.error(this.source.substring(this.lineStart, lineEnd), this.line, lineIndex, message);
    }

    private advance() {
        this.current++;
        return this.source[this.current - 1];
    }

    private addToken(type: TokenType, literal: any = undefined, offset = 0, lexeme?: string) {
        if (type === TokenType.EOF) {
            this.runner.lineStarts.push(this.source.length);
        }
        if (lexeme === undefined) {
            lexeme = this.source.substring(this.start, this.current)
        }
        const index = this.start + offset;
        this.tokens.push(new Token(type, lexeme, literal, this.line, index));
    }

    private isAtEnd() {
        return this.current >= this.source.length;
    }
}
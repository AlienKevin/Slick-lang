import { TokenType } from "./TokenType";
import { Expr, Binary, Grouping, Literal, Unary, Variable, Call, Ternary, Get, Set, Function, ListLiteral, RecordLiteral } from "./Expr";
import { Block, If, While, Break, Return, VarDeclaration, Assign, Call as CallStmt } from "./Stmt";
import { Token } from "./Token";
import { Runner } from "./Runner";
import { Environment } from "./Environment";

const LEFT_PAREN = TokenType.LEFT_PAREN;
const RIGHT_PAREN = TokenType.RIGHT_PAREN;
const LEFT_BRACE = TokenType.LEFT_BRACE;
const RIGHT_BRACE = TokenType.RIGHT_BRACE;
const LEFT_BRACKET = TokenType.LEFT_BRACKET;
const RIGHT_BRACKET = TokenType.RIGHT_BRACKET;
const BANG =TokenType.BANG;
const QUESTION =TokenType.QUESTION;
const COMMA =TokenType.COMMA;
const DOT =TokenType.DOT;
const MINUS =TokenType.MINUS;
const PLUS =TokenType.PLUS;
const SLASH =TokenType.SLASH;
const STAR =TokenType.STAR;
const MODULO =TokenType.MODULO;
const COLON =TokenType.COLON;
const INDENT =TokenType.INDENT;
const DEDENT =TokenType.DEDENT;
const NOT_EQUAL = TokenType.NOT_EQUAL;
const EQUAL =TokenType.EQUAL;
const GREATER =TokenType.GREATER;
const GREATER_EQUAL = TokenType.GREATER_EQUAL;
const LESS =TokenType.LESS;
const LESS_EQUAL = TokenType.LESS_EQUAL;
const IDENTIFIER =TokenType.IDENTIFIER;
const STRING =TokenType.STRING;
const NUMBER =TokenType.NUMBER;
const AND =TokenType.AND;
const ELSE =TokenType.ELSE;
const ELIF =TokenType.ELIF;
const IF =TokenType.IF;
const OR =TokenType.OR;
const RETURN =TokenType.RETURN;
const WHILE =TokenType.WHILE;
const BREAK =TokenType.BREAK;
const MUT =TokenType.MUT;
const VAR =TokenType.VAR;
const F =TokenType.F;
const CALL = TokenType.CALL;
const LET = TokenType.LET;
const EOF =TokenType.EOF;
const NEWLINE = TokenType.NEWLINE;
const SOFT_NEWLINE = TokenType.SOFT_NEWLINE;
const TRUE = TokenType.TRUE;
const FALSE = TokenType.FALSE;
const NULL = TokenType.NULL;

const keywords = new Map([
    ["if", TokenType.IF],
    ["elif", TokenType.ELIF],
    ["else", TokenType.ELSE],
    ["while", TokenType.WHILE],
    ["break", TokenType.BREAK],
    ["return", TokenType.RETURN],
    ["mut", TokenType.MUT],
    ["var", TokenType.VAR],
    ["call", TokenType.CALL],
    ["let", TokenType.LET],
]);

export class Parser {
    private loopDepth: number;
    private current: number;
    private env: Environment;
    private groupMembers = 0;

    constructor(public tokens: Token[], private runner: Runner) {
        // stores the depth of loop and use it for break statements
        this.loopDepth = 0;
        this.env = this.newEnv();
        // declare primordials
        const primordials = [
            "abs",
            "list?",
            "boolean?",
            "fraction",
            "function?",
            "integer",
            "integer?",
            "length",
            "number",
            "number?",
            "print",
            "record?",
            "text",
            "text?",

            // modules
            "List",
        ];
        primordials.forEach((primordial) => {
            this.env.declarePrimordial(primordial);
        });
    }

    parse() {
        this.current = 0;
        let statements = [];
        try {
            while (!this.isAtEnd()) {
                const declaration = this.declaration();
                if (declaration !== undefined) {
                    statements.push(declaration);
                }
            }
            return statements;
        } catch (error) {
            if (error instanceof SyntaxError) {
                return null;
            } else {
                console.log(error);
            }
        }
    }

    newEnv(enclosing?: Environment) {
        return new Environment(this.error.bind(this), enclosing);
    }

    prelude() {
        const text = this.peek().lexeme;
        if (this.peek().type === IDENTIFIER && keywords.get(text) !== undefined) {
            this.peek().type = keywords.get(text);
        }
    }

    declaration() {
        try {
            this.prelude();
            if (this.check(VAR, MUT)) {
                return this.varDeclaration();
            }
            return this.statement();
        } catch (error) {
            if (error instanceof SyntaxError) {
                this.synchronize();
                return null;
            } else {
                console.log(error);
            }
        }
    }

    func() {
        let params = this.consumeParameters();
        const enclosing = this.env;
            // new function environment
            this.env = this.newEnv(enclosing);
            const mutable = false;
            params.forEach((param) => {
                this.env.declare(param, mutable);
            })
        const body = (
            this.match(NEWLINE)
            ? this.block()
            : this.expression()
        );
        this.env = enclosing;
        return new Function(params, body);
    }

    consumeParameters() {
        let params: Token[] = [];
        while (this.match(IDENTIFIER)) {
            params.push(this.previous());
        }
        return params;
    }

    varDeclaration() {
        const typeModifier: TokenType = this.consume([VAR, MUT], `Variable declaration must begin with the 'var' or 'mut' keyword!`).type;
        const nameToken: Token = this.consume(IDENTIFIER, `Variable must have a valid name!`);
        this.consume(COLON, `Variable '${nameToken.lexeme}' must be initialized when declared!`);
        const initializer: Expr = this.expression();
        this.endStmt("value");
        const mutable = typeModifier === MUT;
        this.env.declare(nameToken, mutable);
        return new VarDeclaration(nameToken, initializer, typeModifier);
    }

    // block → INDENT (declaration* block? declaration*) (DEDENT | EOF)
    block() {
        this.consume(INDENT, "Expect indentation before block!");
        let statements = []; // a list of blocks (nested arrays) and statements
        let indentStack = [INDENT]; // push the first indent
        while (indentStack.length > 0 && !this.isAtEnd()) {
            this.prelude();
            let result;
            if (this.check(INDENT)) { // a nested block
                result = this.block();
            } else if (this.check(DEDENT)) {
                indentStack.pop();
            } else if (this.match(BREAK)) { // break statement
                result = this.breakStatement();
            } else {
                result = this.declaration();
            }
            if (result !== undefined) {
                statements.push(result);
            }
        }
        this.consume([DEDENT, EOF], "Expect dedentation or EOF after block!");
        return new Block(statements);
    }

    statement() {
        if (this.match(IF)) {
            return this.ifStatement();
        } else if (this.match(WHILE)) {
            return this.whileStatement();
        } else if (this.match(RETURN)) {
            return this.returnStatement();
        } else if (this.match(CALL)) {
            return this.callStatement();
        } else if (this.match(LET)) {
            return this.assignStatement();
        }
        // ignore blank lines
        else if (this.match(NEWLINE)) {
            return undefined;
        } else {
            throw this.error(this.peek(), `Expected a statement!`);
        }
    }

    returnStatement() {
        const returnToken = this.previous();
        let value = null;
        if (!this.check(NEWLINE, EOF)) {
            value = this.expression();
        }
        this.endStmt("return");
        return new Return(returnToken, value);
    }

    breakStatement() {
        if (this.loopDepth <= 0) {
            throw this.error(this.previous(), "Break statement cannot appear outside a loop!");
        }
        this.endStmt("break");
        return new Break();
    }

    whileStatement() {
        this.loopDepth++;
        try {
            const condition = this.expression();
            this.consume(NEWLINE, "while block must be on its own line!");
            const body = this.block();
            return new While(condition, body);
        } finally {
            this.loopDepth--;
        }
    }

    ifStatement() {
        const condition = this.expression();
        this.consume(NEWLINE, "if block must be on its own line!");
        const thenBranch = this.block();
        this.prelude();
        if (this.match(ELIF)) {
            return new If(condition, thenBranch, this.ifStatement());
        }
        // last else without if
        if (this.match(ELSE)) {
            this.consume(NEWLINE, "else block must be on its own line!");
            return new If(condition, thenBranch, this.block());
        }
        // single if statement without elif and else
        return new If(condition, thenBranch, undefined);
    }

    callStatement() {
        const keyword = this.previous();
        const expr = this.expression();
        // call statement
        if (expr instanceof Call) {
            this.endStmt("call");
            return new CallStmt(expr);
        } else if (expr instanceof Grouping && expr.expression instanceof Call) {
            this.endStmt("call");
            return new CallStmt(expr.expression);
        } else {
            throw this.error(keyword, `Expected a function call!`);
        }
    }

    assignStatement() {
        const expr = this.expression();
        const equal = this.consume(COLON, `Expected ':' after assignment target!`);
        const value = this.expression();
        this.endStmt("assignment");
        if (expr instanceof Variable) {
            const name = expr.name;
            return new Assign(name, value);
        } else if (expr instanceof Get) {
            return new Set(expr.object, expr.name, value, expr.bracket);
        } else {
            throw this.error(equal, "Invalid assignment target!");
        }
    }

    // expression → assignment
    expression() {
        return this.ternary();
    }

    // ternary → or ("?" expression ! ternary)?
    ternary() {
        let expr = this.or();
        if (this.match(QUESTION)) {
            const questionMark = this.previous();
            const trueBranch = this.expression();
            this.consume(BANG, `Expected '!' after then branch!`);
            const falseBranch = this.ternary();
            expr = new Ternary(expr, questionMark, trueBranch, falseBranch);
        }
        return expr;
    }

    // or → and (OR and)*
    or() {
        let expr = this.and();
        while (this.match(OR)) {
            const operator = this.previous();
            const right = this.and();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // and → equality (AND equality)*
    and() {
        let expr = this.equality();
        while (this.match(AND)) {
            const operator = this.previous();
            const right = this.equality();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // equality → comparison ( ("≠" | "=") comparison )* 
    equality() {
        let expr = this.comparison();
        while (this.match(NOT_EQUAL, EQUAL)) {
            let operator = this.previous();
            const right = this.comparison();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // comparison → addition((">" | "≥" | "<" | "≤") addition) * ;
    comparison() {
        let expr = this.addition();
        while (this.match(GREATER, GREATER_EQUAL, LESS, LESS_EQUAL)) {
            const operator = this.previous();
            const right = this.addition();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // addition → multiplication(("-" | "+") multiplication) * ;
    addition() {
        let expr = this.multiplication();
        while (this.match(MINUS, PLUS)) {
            const operator = this.previous();
            const right = this.multiplication();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // multiplication → unary(("/" | "*" | "%") unary) * ;
    multiplication() {
        let expr = this.unary();
        while (this.match(SLASH, STAR, MODULO)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // unary → ("!" | "-") unary | primary;
    unary() {
        let expr: Expr;
        if (this.match(BANG, MINUS)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new Unary(operator, right);
        } else {
            expr = this.call();
        }
        return expr;
    }

    // call  → primary ( arguments? | "." IDENTIFIER )* ;
    //       → "[" arguments? "]"
    call(required = false) {
        let expr: Expr;
        if (this.match(LEFT_BRACKET)) {
            const list = this.getList(TokenType.RIGHT_BRACKET, COMMA);
            this.consume([TokenType.RIGHT_BRACKET], `Expect ']' after arguments!`);
            expr = new ListLiteral(list);
        } else if (this.match(LEFT_BRACE)) {
            let keys: string[] = [];
            let values: Expr[] = [];
            if (!this.check(RIGHT_BRACE)) { // has arguments
                // arguments → expression ( "," expression )*
                do {
                    let key = this.consume(IDENTIFIER, `Key must be a label, not an expression!`);
                    keys.push(key.lexeme);
                    this.consume(COLON, `Expected ':' after map key!`);
                    const value = this.expression();
                    values.push(value);
                    
                } while (
                    (
                        this.match(COMMA)
                        || this.match(SOFT_NEWLINE)
                    )
                && this.peek().type !== RIGHT_BRACE);
            }
            this.consume(RIGHT_BRACE, `Expect right '}' after arguments!`);
            expr = new RecordLiteral(keys, values);
        } else {
            expr = this.funcExpr();
            this.groupMembers ++;
        }
        while (true) {
            if (this.match(DOT)) {
                const property = this.consume(IDENTIFIER, `Expected property name after '.'!`);
                expr = new Get(expr, property);
            } else if (this.groupMembers === 1) {
                // maybe start of a function call
                if (expr instanceof Variable) {
                    const funcName: Token = this.previous();
                    let argumentList = this.getArgumentList();
                    if (argumentList.length === 0) {
                        if (required) {
                            throw this.error(this.peek(), `Expected invokation after callee!`);
                        }
                    } else {
                        expr = new Call(expr, funcName, argumentList);
                    }
                // a normal expression
                } else {
                    this.groupMembers = 0;
                }
                break;
            } else {
                break;
            }
        }
        return expr;
    }

    checkLiteral() {
        const literals = [
            TRUE,
            FALSE,
            NULL,
            STRING,
            NUMBER,
            IDENTIFIER,
        ];
        // check if current token is the begining
        // of a literal value
        return this.check(...literals, LEFT_BRACE, LEFT_BRACKET, LEFT_PAREN, F);
    }

    // argumentList → expression*
    getArgumentList() {
        let list: Expr[] = [];
        while (this.checkLiteral()) {
            list.push(this.expression());
        }
        this.groupMembers = 0;
        return list;
    }

    getList(endTokenType: TokenType, separator: TokenType) {
        let list: Expr[] = [];
        if (!this.check(endTokenType, NEWLINE, EOF)) { // have list elements
            // list → expression ( SEPARATOR expression )*
            do {
                list.push(this.expression());
            } while (
                (
                    this.match(separator)
                    || this.match(SOFT_NEWLINE)
                )
                && !this.check(endTokenType, NEWLINE, EOF)
            );
        }
        return list;
    }

    funcExpr() {
        if (this.match(F)) {
                return this.func();
        }
        return this.primary();
    }

    // primary → NUMBER | STRING | "false" | "true" | "null" | "(" expression ")" | IDENTIFIER
    primary() {
        if (this.match(NUMBER, STRING)) {
            return new Literal(this.previous().literal);
        }
        if (this.match(TRUE)) {
            return new Literal(true);
        }
        if (this.match(FALSE)) {
            return new Literal(false);
        }
        if (this.match(NULL)) {
            return new Literal(undefined);
        }
        if (this.match(LEFT_PAREN)) {
            const enclosingGroupMembers = this.groupMembers;
            this.groupMembers = 0;
            const expr = this.expression();
            this.consume(RIGHT_PAREN, "Expect ')' after expression!");
            this.groupMembers = enclosingGroupMembers;
            return new Grouping(expr);
        }
        if (this.match(IDENTIFIER)) {
            const name = this.previous();
            if (!this.env.lookup(name)) {
                throw this.error(name, `Variable '${name.lexeme}' is not declared!`);
            }
            return new Variable(name);
        }
        throw this.error(this.peek(), "Expression expected!");
    }

    private consume(tokenType: TokenType | TokenType[], errorMessage: string) {
        let matched = false;
        if (Array.isArray(tokenType)) {
            tokenType.some((type) => {
                if (this.check(type)) {
                    this.advance();
                    matched = true;
                    return true; // break out of some
                }
            });
        } else if (this.check(tokenType)) {
            this.advance();
            matched = true;
        }
        if (matched) {
            return this.previous();
        }
        throw this.error(this.peek(), errorMessage);
    }

    private endStmt(name: string) {
        if (this.previous().type === DEDENT) {
            return;
        }
        this.consume([NEWLINE, EOF], `Expected newline or EOF after ${name}!`);
    }

    private error(token: Token, errorMessage: string) {
        if (this.runner.detailedError) {
            this.runner.error(token, errorMessage, "SyntaxError");
        } else {
            if (token.type === EOF) { // End of file
                this.runner.output(`[CompileError] At end of file: ${errorMessage}`);
            } else {
                switch (token.type) {
                    case INDENT:
                        this.runner.output(`[CompileError] Unexpected indentation at line ${token.line}: ${errorMessage}`);
                        break;
                    case DEDENT:
                        this.runner.output(`[CompileError] Unexpected dedentation at line ${token.line}: ${errorMessage}`);
                        break;
                    default:
                        this.runner.output(`[CompileError] Line ${token.line} at '${token.lexeme.replace(/\n/g, "\\n")}': ${errorMessage}`);
                }
            }
        }
        return new SyntaxError();
    }

    private synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type === NEWLINE) {
                return;
            }
            switch (this.peek().type) {
                case WHILE:
                case IF:
                case F:
                case RETURN:
                case IDENTIFIER:
                case MUT:
                case VAR:
                    return;
            }
            this.advance();
        }
    }

    private match(...tokenTypes: TokenType[]) {
        return tokenTypes.some((tokenType) => {
            if (this.check(tokenType)) {
                // console.log(`token type ${tokenType} is checked!`);
                this.advance();
                return true;
            }
        });
    }

    private check(...tokenType: TokenType[]) {
        return tokenType.some((tokenType) => {
            if (this.peek().type === SOFT_NEWLINE &&
                tokenType !== SOFT_NEWLINE &&
                // skip over soft newline only if next token is what we want to find
                // otherwise, soft newline is what we need for error report
                this.peekNext().type === tokenType) {
                this.advance(); // skip over soft newline
            }
            return this.peek().type === tokenType;
        });
    }

    private peek() {
        return this.tokens[this.current];
    }

    private peekNext() {
        return this.tokens[this.current + 1];
    }

    private advance() {
        if (!this.isAtEnd()) {
            this.current++;
        }
        return this.previous();
    }

    private previous() {
        return this.tokens[this.current - 1];
    }

    private isAtEnd() {
        return this.tokens[this.current].type === EOF;
    }
}
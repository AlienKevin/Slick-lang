import { TokenType } from "./TokenType";
import { Param } from "./interfaces/Param";
import { Expr, Binary, Grouping, Literal, Unary, Variable, Call, Ternary, Get, Set, Function } from "./Expr";
import { Block, If, While, Break, Return, VarDeclaration, Assign } from "./Stmt";
import { Token } from "./Token";
import { Runner } from "./Runner";

export class Parser {
    private loopDepth: number;
    private current: number;

    constructor(public tokens: Token[], private runner: Runner) {
        // stores the depth of loop and use it for break statements
        this.loopDepth = 0;
    }

    parse() {
        this.current = 0;
        let statements = [];
        try {
            while (!this.isAtEnd()) {
                const declaration = this.declaration();
                if (declaration !== null) {
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

    declaration() {
        try {
            if (this.check(TokenType.VAR, TokenType.MUT)) {
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

    // sample partial function declaration:
    // (m, n)       // parameters
    //     print(n) // function body
    func() {
        this.consume(TokenType.LEFT_PAREN, `Expect '(' after 'f' keyword!`);
        let params = this.consumeParameters();
        this.consume(TokenType.RIGHT_PAREN, `Expect ')' after function parameters!`);
        this.consume(TokenType.NEWLINE, `Function body must be on a newline!`);
        const body = this.block();
        return new Function(params, body);
    }

    consumeParameters() {
        let params: Param[] = [];
        while (!this.check(TokenType.RIGHT_PAREN)) {
            let mutable = false;
            // optional mutable parameter
            if (this.match(TokenType.MUT)) {
                mutable = true;
            }
            // get parameter name
            let name: Token = null;
            name = this.consume(TokenType.IDENTIFIER, "Expect a parameter name!");
            params.push({
                "mutable": mutable,
                "token": name,
            });
        }
        return params;
    }

    varDeclaration() {
        const typeModifier: TokenType = this.consume([TokenType.VAR, TokenType.MUT], `Variable declaration must begin with the 'var' or 'mut' keyword!`).type;
        const nameToken: Token = this.consume(TokenType.IDENTIFIER, `Variable must have a valid name!`);
        this.consume(TokenType.COLON, `Variable '${nameToken.lexeme}' must be initialized when declared!`);
        const initializer: Expr = this.expression();
        this.endStmt("value");
        return new VarDeclaration(nameToken, initializer, typeModifier);
    }

    // block → INDENT (declaration* block? declaration*) (DEDENT | EOF)
    block() {
        this.consume(TokenType.INDENT, "Expect indentation before block!");
        let statements = []; // a list of blocks (nested arrays) and statements
        let indentStack = [TokenType.INDENT]; // push the first indent
        while (indentStack.length > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.INDENT)) { // a nested block
                statements.push(this.block());
            } else if (this.check(TokenType.DEDENT)) {
                indentStack.pop();
            } else if (this.match(TokenType.BREAK)) { // break statement
                statements.push(this.breakStatement());
            } else {
                statements.push(this.declaration());
            }
        }
        // console.log(statements);
        this.consume([TokenType.DEDENT, TokenType.EOF], "Expect dedentation or EOF after block!");
        return new Block(statements);
    }

    statement() {
        if (this.match(TokenType.IF)) {
            return this.ifStatement();
        } else if (this.match(TokenType.WHILE)) {
            return this.whileStatement();
        } else if (this.match(TokenType.RETURN)) {
            return this.returnStatement();
        }
        return this.assignStatement();
    }

    returnStatement() {
        const returnToken = this.previous();
        let value = null;
        if (!this.check(TokenType.NEWLINE, TokenType.EOF)) {
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
            this.consume(TokenType.NEWLINE, "while block must be on its own line!");
            const body = this.block();
            return new While(condition, body);
        } finally {
            this.loopDepth--;
        }
    }

    ifStatement() {
        const condition = this.expression();
        this.consume(TokenType.NEWLINE, "if block must be on its own line!");
        const thenBranch = this.block();
        if (this.match(TokenType.ELIF)) {
            return new If(condition, thenBranch, this.ifStatement());
        }
        // last else without if
        if (this.match(TokenType.ELSE)) {
            this.consume(TokenType.NEWLINE, "else block must be on its own line!");
            return new If(condition, thenBranch, this.block());
        }
        // single if statement without elif and else
        return new If(condition, thenBranch, undefined);
    }

    assignStatement() {
        const expr = this.expression();
        // call statement
        if (expr instanceof Call) {
            this.endStmt("call");
        }
        // assignment statement
        else if (this.match(TokenType.COLON)) {
            const equal = this.previous();
            const value = this.funcExpr();
            this.endStmt("assignment");
            if (expr instanceof Variable) {
                const name = expr.name;
                return new Assign(name, value);
            } else if (expr instanceof Get) {
                return new Set(expr.object, expr.name, value, expr.bracket);
            } else {
                throw this.error(equal, "Invalid assignment target!");
            }
        } else {
            throw this.error(this.peek(), `Expected a statement!`);
        }
    }

    // expression → assignment
    expression() {
        return this.funcExpr();
    }

    funcExpr() {
        if (this.match(TokenType.F)) {
            return this.func();
        }
        return this.ternary();
    }

    // ternary → or ("?" expression ! ternary)?
    ternary() {
        let expr = this.or();
        if (this.match(TokenType.QUESTION)) {
            const questionMark = this.previous();
            const trueBranch = this.expression();
            this.consume(TokenType.BANG, `Expected '!' after then branch!`);
            const falseBranch = this.ternary();
            expr = new Ternary(expr, questionMark, trueBranch, falseBranch);
        }
        return expr;
    }

    // or → and (OR and)*
    or() {
        let expr = this.and();
        while (this.match(TokenType.OR)) {
            const operator = this.previous();
            const right = this.and();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // and → equality (AND equality)*
    and() {
        let expr = this.equality();
        while (this.match(TokenType.AND)) {
            const operator = this.previous();
            const right = this.equality();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // equality → comparison ( ("≠" | "=") comparison )* 
    equality() {
        let expr = this.comparison();
        while (this.match(TokenType.NOT_EQUAL, TokenType.EQUAL)) {
            let operator = this.previous();
            const right = this.comparison();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // comparison → addition((">" | "≥" | "<" | "≤") addition) * ;
    comparison() {
        let expr = this.addition();
        while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
            const operator = this.previous();
            const right = this.addition();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // addition → multiplication(("-" | "+") multiplication) * ;
    addition() {
        let expr = this.multiplication();
        while (this.match(TokenType.MINUS, TokenType.PLUS)) {
            const operator = this.previous();
            const right = this.multiplication();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // multiplication → unary(("/" | "*" | "%") unary) * ;
    multiplication() {
        let expr = this.unary();
        while (this.match(TokenType.SLASH, TokenType.STAR, TokenType.MODULO)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // unary → ("!" | "-") unary | primary;
    unary() {
        let expr: Expr;
        if (this.match(TokenType.BANG, TokenType.MINUS)) {
            const operator = this.previous();
            const right = this.unary();
            expr = new Unary(operator, right);
        } else {
            expr = this.call();
        }
        return expr;
    }

    // call  → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
    //       → "[" arguments? "]"
    call(required = false) {
        let expr: Expr;
        if (this.match(TokenType.LEFT_BRACKET)) {
            const bracket = this.previous();
            expr = new Variable(new Token(TokenType.IDENTIFIER, "List", undefined, bracket.line, bracket.index));
            expr = this.finishCall(expr, TokenType.RIGHT_BRACKET);
        } else if (this.match(TokenType.LEFT_BRACE)) {
            const leftBrace = this.previous();
            const listCallee = new Variable(new Token(TokenType.IDENTIFIER, "List", undefined, leftBrace.line, leftBrace.index));
            let argumentList: Expr[] = []; // default to no arguments
            if (!this.check(TokenType.RIGHT_BRACE)) { // has arguments
                // arguments → expression ( "," expression )*
                do {
                    const key = this.expression();
                    this.consume(TokenType.COLON, `Expected ':' after map key!`);
                    const value = this.expression();
                    argumentList.push(new Call(listCallee, leftBrace, [key, value]));
                } while (this.match(TokenType.COMMA) && this.peek().type !== TokenType.RIGHT_BRACE);
            }
            this.consume(TokenType.RIGHT_BRACE, `Expect right '}' after arguments!`);
            expr = new Variable(new Token(TokenType.IDENTIFIER, "Map", undefined, leftBrace.line, leftBrace.index));
            expr = new Call(expr, leftBrace, 
                argumentList.length === 0 ? 
                [] : [new Call(listCallee, leftBrace, argumentList)]
            );
        } else {
            expr = this.primary();
        }
        let invokations = 0;
        while (true) {
            if (this.match(TokenType.LEFT_PAREN)) {
                expr = this.finishCall(expr, TokenType.RIGHT_PAREN);
            } else if (this.match(TokenType.DOT)) {
                const property = this.consume(TokenType.IDENTIFIER, `Expected property name after '.'!`);
                expr = new Get(expr, property);
            } else if (this.match(TokenType.LEFT_BRACKET)) {
                const bracket = this.previous();
                expr = new Get(expr, this.expression(), bracket);
                this.consume(TokenType.RIGHT_BRACKET, `Expect right ']' after arguments!`);
            } else {
                if (required && invokations === 0) {
                    throw this.error(this.peek(), `Expected invokation after callee!`);
                }
                break;
            }
            invokations ++;
        }
        return expr;
    }

    finishCall(callee: Expr, endTokenType: TokenType) {
        const leftParen: Token = this.previous();
        let argumentList: Expr[] = []; // default to no arguments
        if (!this.check(endTokenType)) { // has arguments
            // arguments → expression ( "," expression )*
            do {
                argumentList.push(this.expression());
            } while (
                (
                    this.match(TokenType.COMMA)
                    || this.match(TokenType.SOFT_NEWLINE)
                )
                && this.peek().type !== endTokenType
            );
        }
        this.consume(endTokenType,
            `Expect right '${endTokenType === TokenType.RIGHT_PAREN ? ")" : "]"}' after arguments!`);
        return new Call(callee, leftParen, argumentList);
    }

    // primary → NUMBER | STRING | "false" | "true" | "(" expression ")" | IDENTIFIER
    primary() {
        if (this.match(TokenType.NUMBER, TokenType.STRING)) {
            return new Literal(this.previous().literal);
        }
        if (this.match(TokenType.FALSE)) {
            return new Literal(false);
        }
        if (this.match(TokenType.TRUE)) {
            return new Literal(true);
        }
        // can contain anonymous functions that are invoked immediately
        if (this.match(TokenType.LEFT_PAREN)) {
            const expr = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression!");
            return new Grouping(expr);
        }
        if (this.match(TokenType.IDENTIFIER)) {
            return new Variable(this.previous());
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
                    return true; // break out of tokenType.some
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
        this.consume([TokenType.NEWLINE, TokenType.EOF], `Expected newline or EOF after ${name}!`);
    }

    private error(token: Token, errorMessage: string) {
        if (this.runner.detailedError) {
            this.runner.error(token, errorMessage, "SyntaxError");
        } else {
            if (token.type === TokenType.EOF) { // End of file
                this.runner.output(`[CompileError] At end of file: ${errorMessage}`);
            } else {
                switch (token.type) {
                    case TokenType.INDENT:
                        this.runner.output(`[CompileError] Unexpected indentation at line ${token.line}: ${errorMessage}`);
                        break;
                    case TokenType.DEDENT:
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
            if (this.previous().type === TokenType.NEWLINE) {
                return;
            }
            switch (this.peek().type) {
                case TokenType.WHILE:
                case TokenType.IF:
                case TokenType.F:
                case TokenType.RETURN:
                case TokenType.IDENTIFIER:
                case TokenType.MUT:
                case TokenType.VAR:
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
            if (this.peek().type === TokenType.SOFT_NEWLINE &&
                tokenType !== TokenType.SOFT_NEWLINE &&
                // skip over soft newline only if next token is what we want to find
                // otherwise, soft newline is what we need for error report
                this.peekNext().type === tokenType) {
                this.advance(); // skip over soft newline
            }
            return this.peek().type === tokenType;
        });
    }

    private checkNext(...tokenType: TokenType[]) {
        return tokenType.some((tokenType) => {
            if (this.peekNext().type === TokenType.SOFT_NEWLINE &&
                tokenType !== TokenType.SOFT_NEWLINE) {
                this.advance(); // skip over soft newline
                // backtrack if the token after soft newline is not the one we want to find
                // in this case, soft newline is the token that we need for error report
                if (this.peekNext().type !== tokenType) {
                    this.backtrack(1);
                }
            }
            return this.peekNext().type === tokenType;
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

    private backtrack(steps = 1) {
        if (this.current >= steps) {
            this.current -= steps;
        }
        return this.peek();
    }

    private previous() {
        return this.tokens[this.current - 1];
    }

    private isAtEnd() {
        return this.tokens[this.current].type === TokenType.EOF;
    }
}
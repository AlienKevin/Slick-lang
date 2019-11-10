import { TokenType } from "./TokenType";
import { Expr, Binary, Grouping, Literal, Variable, Call, Ternary, Get, Function, ListLiteral, RecordLiteral, Case } from "./Expr";
import { Block, If, Return, VarDeclaration, Assign, Call as CallStmt, CustomTypeDeclaration } from "./Stmt";
import { Token } from "./Token";
import { Runner } from "./Runner";
import { Environment } from "./Environment";
import { Type } from "./typeChecking/Type";
import { ListType } from "./typeChecking/ListType";
import { PrimitiveType } from "./typeChecking/PrimitiveType";
import { FunctionType } from "./typeChecking/FunctionType";
import { AnyType } from "./typeChecking/AnyType";
import { NilType } from "./typeChecking/NilType";
import { MaybeType } from "./typeChecking/MaybeType";
import { isNumber, isUpper } from "./utils";
import { RecordType } from "./typeChecking/RecordType";
import { CustomType } from "./typeChecking/CustomType";

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
const AMPERSAND = TokenType.AMPERSAND;
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
const MUT =TokenType.MUT;
const VAR =TokenType.VAR;
const TYPE = TokenType.TYPE;
const ALIAS = TokenType.ALIAS;
const F =TokenType.F;
const CALL = TokenType.CALL;
const LET = TokenType.LET;
const EOF =TokenType.EOF;
const NEWLINE = TokenType.NEWLINE;
const SOFT_NEWLINE = TokenType.SOFT_NEWLINE;
const TRUE = TokenType.TRUE;
const FALSE = TokenType.FALSE;
const NIL = TokenType.NIL;
const ARROW = TokenType.ARROW;
const BAR = TokenType.BAR;

const keywords = new Map([
    ["if", TokenType.IF],
    ["elif", TokenType.ELIF],
    ["else", TokenType.ELSE],
    ["return", TokenType.RETURN],
    ["mut", TokenType.MUT],
    ["var", TokenType.VAR],
    ["type", TokenType.TYPE],
    ["alias", TokenType.ALIAS],
    ["call", TokenType.CALL],
    ["let", TokenType.LET],
    ["case", TokenType.CASE]
]);

const functinos = [
    QUESTION, AND, OR, EQUAL, NOT_EQUAL,
    LESS, GREATER_EQUAL, GREATER, LESS_EQUAL,
    PLUS, MINUS, STAR, SLASH, MODULO, AMPERSAND
];

export class Parser {
    public current: number;
    private env: Environment;
    private groupMembers = 0;
    private types: {[alias: string]: Type} = (function(o) {
        o["Text"] = PrimitiveType.Text;
        o["Num"] = PrimitiveType.Num;
        o["Bool"] = PrimitiveType.Bool;
        o["Maybe"] = MaybeType;
        o["List"] = ListType;
        return o;
    })(Object.create(null));

    constructor(public tokens: Token[], private runner: Runner) {
        this.env = this.newEnv();
        // declare primordials
        const primordials = [
            "abs",
            "max",
            "min",
            "neg",
            "not",
            "print",
            "sqrt",
            "round",
            "floor",
            "ceil",
            "trunc",
            "e",
            "pi",
            "sin",
            "cos",
            "tan",
            "asin",
            "acos",
            "atan",
            "atan2",

            // modules
            "List",
            "Text",
            "pipe"
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
            } else if (this.match(TYPE)) {
                if (this.peek().lexeme === "alias") {
                    this.advance();
                    return this.typeAlias();
                } else {
                    return this.customType();
                }
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

    customType() {
        const nameToken = this.consume(IDENTIFIER, `Expected a custom type name!`);
        const name = nameToken.lexeme;
        if (!isUpper(name[0])) {
            throw this.error(nameToken, `Custom type must starts with a capital letter!`);
        }
        if (this.types[name] !== undefined) {
            throw this.error(nameToken, `Duplicated type name!`);
        }
        this.consume(COLON, `Expected a ':' after custom type name!`);
        this.consume(NEWLINE, `Expected a linebreak after ':'!`);
        this.consume(INDENT, `Expected indentation before types!`);
        let subtypes = Object.create(null);
        do {
            const subtypeToken = this.consume(IDENTIFIER, `Expected a subtype name!`);
            const subtypeName = subtypeToken.lexeme;
            let subtypeProperties = undefined;
            if (this.peek().type !== NEWLINE) {
                subtypeProperties = this.typeDeclaration();
                if (!(subtypeProperties instanceof RecordType)) {
                    throw this.error(subtypeToken, `Subtype properties must be a record!`);
                }
            }
            subtypes = {
                ...subtypes,
                [subtypeName] : subtypeProperties
            }
            this.env.declare(subtypeToken, false);
        } while (this.match(NEWLINE) && !this.match(DEDENT));
        
        const customType = new CustomTypeDeclaration(
            nameToken,
            subtypes
        );
        this.types[name] = new CustomType(name);
        return customType;
    }

    typeAlias() {
        const aliasToken = this.consume(IDENTIFIER, `Expected a type alias!`);
        const alias = aliasToken.lexeme;
        if (!isUpper(alias[0])) {
            throw this.error(aliasToken, `Type alias must starts with a capital letter!`);
        }
        if (this.types[alias] !== undefined) {
            throw this.error(aliasToken, `Duplicated type name!`);
        }
        this.consume(COLON, `Expected a ':' after type alias!`)
        const type = this.typeDeclaration();
        this.endStmt("type");
        this.types[alias] = type;
    }

    func() {
        const first = this.previous();
        let params = this.consumeParameters();
        const enclosing = this.env;
        // new function environment
        this.env = this.newEnv(enclosing);
        const mutable = false;
        params.forEach((param) => {
            this.env.declare(param, mutable);
        });
        const body = (
            this.match(NEWLINE)
            ? this.block()
            : (() => {
                this.consume(LEFT_PAREN, `Expected '(' before function body!`);
                const expr = this.expression();
                this.consume(RIGHT_PAREN, `Expected ')' after function body!`);
                return expr;
            })()
        );
        this.env = enclosing;
        return new Function(first, params, body);
    }

    consumeParameters() {
        let params: Token[] = [];
        while (this.match(IDENTIFIER)) {
            params.push(this.previous());
        }
        return params;
    }

    varDeclaration(declaredTypeModifier?: TokenType, declaredName?: string, declaredType?: Type) {
        const typeModifier: TokenType = this.consume([VAR, MUT], `Variable declaration must begin with the 'var' or 'mut' keyword!`).type;
        if (declaredTypeModifier !== undefined
            && typeModifier !== declaredTypeModifier) {
            throw this.error(this.previous(), `Type modifiers do not match between type declaration and actual declaration!`);
        }
        const nameToken: Token = this.consume(IDENTIFIER, `Variable must have a valid name!`);
        const name: string = nameToken.lexeme;
        if (declaredName !== undefined
            && name !== declaredName) {
            throw this.error(this.previous(), `Variable name do not match between type declaration and actual declaration!`);
        }
        const operator = this.consume([EQUAL, COLON], `Variable '${name}' must be initialized when declared!`);
        if (operator.type === COLON) {
            const mutable = typeModifier === MUT;
            this.env.declare(nameToken, mutable);
            const initializer: Expr = this.expression();
            this.endStmt("value");
            return new VarDeclaration(nameToken, initializer, typeModifier, declaredType);
        } else if (operator.type === EQUAL) {
            const type: Type = this.typeDeclaration();
            this.endStmt("type declaration");
            this.prelude();
            return this.varDeclaration(typeModifier, name, type);
        }
    }

    typeDeclaration(allowFunctionType = true): Type {
        const first = this.consume([NIL, IDENTIFIER, LEFT_PAREN, LEFT_BRACE], `Expected a type!`);
        let type: Type;
        switch (first.lexeme) {
            case "(":
                type = this.typeDeclaration();
                this.consume(RIGHT_PAREN, `Expected a ')'!`);
                break;
            case "{":
                let recordType = Object.create(null);
                if (this.check(IDENTIFIER)) {
                    do {
                        const keyName = this.consume(IDENTIFIER, `Expected a key name!`).lexeme;
                        this.consume(EQUAL, `Expected a '=' after key name!`);
                        const valueType = this.typeDeclaration();
                        recordType[keyName] = valueType;
                    } while (
                        this.match(COMMA, SOFT_NEWLINE)
                        && this.peek().type !== RIGHT_BRACE);
                }
                type = new RecordType(recordType);
                this.consume(RIGHT_BRACE, `Expected a closing '}'!`);
                break;
            case "List":
                type = new ListType(this.typeDeclaration(false));
                break;
            case "Maybe":
                type = new MaybeType(this.typeDeclaration(false));
                break;
            case "Bool":
                type = PrimitiveType.Bool;
                break;
            case "Text":
                type = PrimitiveType.Text;
                break;
            case "Num":
                type = PrimitiveType.Num;
                break;
            default:
                if (isUpper(first.lexeme[0])) {
                    type = this.types[first.lexeme];
                    if (type === undefined) {
                        throw this.error(first, `Cannot find type ${first.lexeme}!\nUse lowercase names for generic types!`);
                    }
                } else {
                    type = new AnyType(first.lexeme);
                }
                break;
        }
        while (allowFunctionType && this.match(ARROW)) {
            type = new FunctionType(type, this.typeDeclaration());
        }
        return type;
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
        } else if (this.match(RETURN)) {
            return this.returnStatement();
        } else if (this.match(CALL)) {
            return this.callStatement();
        } else if (this.match(LET)) {
            return this.assignStatement();
        } else {
            throw this.error(this.peek(), `Expected a statement!`);
        }
    }

    returnStatement() {
        const returnToken = this.previous();
        const value = this.expression();
        this.endStmt("return");
        return new Return(returnToken, value);
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
            throw this.error(expr.first, `Expected a function call, not a ${expr}!`);
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
            throw this.error(expr.name, "Cannot modify an immutable property!");
        } else {
            throw this.error(equal, "Invalid assignment target!");
        }
    }

    // expression → assignment
    expression(): Expr {
        return this.caseExpr();
    }

    caseExpr() {
        if (this.peek().lexeme === "case") {
            this.advance();
            const keyword = this.previous();
            let expr = this.ternary();
            this.consume(NEWLINE, `Expected a linebreak before caes branches!`);
            this.consume(INDENT, `Expected indentation before case branches!`);
            let cases: {
                subtype: Token | Literal,
                parameters: Token[],
                result: Expr
            }[] = [];
            do {
                let subtype;
                let parameters = [];
                if (this.match(IDENTIFIER)) {
                    subtype = this.previous();
                    if (this.match(LEFT_BRACE)) {
                        do {
                            parameters.push(this.consume(IDENTIFIER, `Expected a record property name!`));
                        } while (this.match(COMMA) && !this.check(RIGHT_BRACE))
                        this.consume(RIGHT_BRACE, `Expected a '}' to close the record!`);
                    } else if (this.match(IDENTIFIER)) {
                        parameters.push(this.previous());
                    }
                } else {
                    subtype = this.primitiveLiteral()
                }
                // declare parameters temporarily
                parameters.forEach(parameter =>
                    this.env.declare(parameter, false)
                )
                this.consume(ARROW, `Expected a '→' after case condition!`);
                this.consume(NEWLINE, `Expected a linebreak before caes condition!`);
                this.consume(INDENT, `Expected indentation before case condition!`);
                const result = this.expression();

                // remove parameters from scope
                parameters.forEach(parameter =>
                    this.env.undeclare(parameter)
                )

                this.consume(NEWLINE, `Expected a linebreak before caes result!`);
                this.consume(DEDENT, `Expected dendetation after case result!`);
                cases.push({
                    subtype,
                    parameters,
                    result
                });
            } while (!this.match(DEDENT));
            return new Case(keyword, expr, cases);
        } else {
            return this.ternary();
        }
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

    // addition → multiplication(("-" | "+" | "&") multiplication) * ;
    addition() {
        let expr = this.multiplication();
        while (this.match(MINUS, PLUS, AMPERSAND)) {
            const operator = this.previous();
            const right = this.multiplication();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // multiplication → unary(("/" | "*" | "%") unary) * ;
    multiplication() {
        let expr = this.call();
        while (this.match(SLASH, STAR, MODULO)) {
            const operator = this.previous();
            const right = this.call();
            expr = new Binary(expr, operator, right);
        }
        return expr;
    }

    // call  → primary ( arguments? | "." IDENTIFIER )* ;
    //       → "[" arguments? "]"
    call(required = false) {
        let expr: Expr = this.funcExpr();
        this.groupMembers ++;
        if (this.groupMembers === 1) {
            // maybe start of a function call
            if (this.maybeFunctionCall(expr)) {
                const funcName: Token = this.previous();
                let argumentList = this.getArgumentList();
                if (argumentList.length === 0) {
                    if (required) {
                        throw this.error(this.peek(), `Expected invokation after callee!`);
                    }
                } else {
                    expr = new Call(expr, funcName, argumentList);
                }
            }
        }
        this.groupMembers = 0;
        return expr;
    }

    maybeFunctionCall(expr: Expr) {
        return (
            expr instanceof Variable
            || expr instanceof Get
            || (expr instanceof Function && expr.body instanceof Expr)
            || expr instanceof Grouping
        );
    }

    checkLiteral() {
        const literals = [
            TRUE,
            FALSE,
            NIL,
            STRING,
            NUMBER,
            IDENTIFIER,
        ];
        // Disallow consuming function arguments at the next line without using ()
        // e.g. The following is disallowed
        // var result: foo 
        // a # argument on the next line without ()
        // This rule is to support record literal parsing
        // e.g.
        // var record: {
        //      a: foo # without this rule, SOFT_NEWLINE permits
        //             # variable 'foo' to consume 'b' as its argument
        //      b: 'text'
        // }
        if (this.groupMembers === 1 && this.check(SOFT_NEWLINE)) {
            return false;
        }
        return (
            this.check(...literals, LEFT_BRACE, LEFT_BRACKET, LEFT_PAREN, F)
        );
    }

    // argumentList → expression*
    getArgumentList() {
        let list: Expr[] = [];
        while (this.checkLiteral()) {
            list.push(this.funcExpr());
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
            // functinos
            if (this.check(...functinos)) {
                let start = this.previous();
                let symbol = this.advance().lexeme;
                if (symbol === "?") {
                    if (this.match(BANG)) {
                        symbol = "?!";
                    } else {
                        throw this.error(this.peek(), `Expected '!' after '?'!`);
                    }
                }
                const name = new Token(
                    IDENTIFIER, "ƒ" + symbol, undefined, start.line, start.index
                );
                return new Variable(name);
            // function expression
            } else {
                return this.func();
            }
        }
        return this.primary();
    }

    primary() {
        let expr = this.basicPrimary();
        return this.getExpr(expr);
    }

    getExpr(expr: Expr) {
        // get expression
        while (this.match(DOT)) {
            const property = this.consume(IDENTIFIER, `Expected property name after '.'!`);
            expr = new Get(expr, property);
        }
        return expr;
    }

    // primary → NUMBER | STRING | "false" | "true" | "Nil" | "(" expression ")" | IDENTIFIER
    basicPrimary() {
        // record literal
        if (this.match(LEFT_BRACE)) {
            const first = this.previous();
            let keyNames: string[] = [];
            let keys: Token[] = [];
            let values: Expr[] = [];
            let target: Variable | Get = undefined;
            if (!this.check(RIGHT_BRACE)) { // has arguments
                const firstToken = this.consume(IDENTIFIER, `Expected a key label or record name!`);
                // get expression
                if (this.check(DOT)) {
                    target = this.getExpr(new Variable(firstToken)) as Get;
                    this.consume(BAR, `Expected a '|' after target record!`);
                } else {
                    if (this.match(BAR)) {
                        target = new Variable(firstToken);
                    }
                }
                // arguments → expression ( "," expression )*
                do {
                    let keyToken;
                    if (keys.length === 0 && target === undefined) {
                        keyToken = firstToken;
                    } else {
                        keyToken = this.consume(IDENTIFIER, `Expected a key label!`);
                    }
                    const keyName = keyToken.lexeme;
                    if (keyNames.includes(keyName)) {
                        throw this.error(keyToken, `Duplicated key ${keyName} in record!`);
                    }
                    keyNames.push(keyName);
                    keys.push(keyToken);
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
            return new RecordLiteral(
                first,
                keyNames.reduce((record, key, index) => 
                    ({...record, [key]: values[index]}),
                Object.create(null)),
                keyNames.reduce((keyTokens, key, index) =>
                    ({...keyTokens, [key]: keys[index]}),
                Object.create(null)),
                target
            );
        }
        // list literal
        if (this.match(LEFT_BRACKET)) {
            const first = this.previous();
            const list = this.getList(TokenType.RIGHT_BRACKET, COMMA);
            this.consume([TokenType.RIGHT_BRACKET], `Expect ']' after arguments!`);
            return new ListLiteral(first, list);
        }
        const primitive = this.primitiveLiteral();
        if (primitive !== undefined) {
            return primitive;
        }
        if (this.match(LEFT_PAREN)) {
            const first = this.previous();
            const enclosingGroupMembers = this.groupMembers;
            this.groupMembers = 0;
            const expr = this.expression();
            this.consume(RIGHT_PAREN, "Expect ')' after expression!");
            this.groupMembers = enclosingGroupMembers;
            return new Grouping(first, expr);
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

    private primitiveLiteral() {
        if (this.match(NUMBER, STRING)) {
            const token = this.previous();
            return new Literal(token, token.literal);
        }
        if (this.match(TRUE)) {
            return new Literal(this.previous(), true);
        }
        if (this.match(FALSE)) {
            return new Literal(this.previous(), false);
        }
        if (this.match(NIL)) {
            return new Literal(this.previous(), undefined);
        }
        return undefined;
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
        this.runner.error(token, errorMessage, "SyntaxError");
        return new SyntaxError();
    }

    private synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type === NEWLINE) {
                return;
            }
            switch (this.peek().type) {
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
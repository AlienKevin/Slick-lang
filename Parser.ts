import { TokenType } from "./TokenType";
import { Expr, Binary, Grouping, Literal, Variable, Call, If, Get, Function, ListLiteral, RecordLiteral, Case } from "./Expr";
import { VarDeclaration, CustomTypeDeclaration } from "./Stmt";
import { Token } from "./Token";
import { Runner } from "./Runner";
import { Environment } from "./Environment";
import { Type } from "./typeChecking/Type";
import { ListType } from "./typeChecking/ListType";
import { PrimitiveType } from "./typeChecking/PrimitiveType";
import { FunctionType } from "./typeChecking/FunctionType";
import { AnyType } from "./typeChecking/AnyType";
import { isNumber, isUpper, are, them, createCustomType } from "./utils";
import { RecordType } from "./typeChecking/RecordType";
import { CustomType } from "./typeChecking/CustomType";
import runtime from "./Runtime";
import clone from "lodash.clone";

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
const TYPE = TokenType.TYPE;
const ALIAS = TokenType.ALIAS;
const F =TokenType.F;
const EOF =TokenType.EOF;
const NEWLINE = TokenType.NEWLINE;
const SOFT_NEWLINE = TokenType.SOFT_NEWLINE;
const TRUE = TokenType.TRUE;
const FALSE = TokenType.FALSE;
const ARROW = TokenType.ARROW;
const BAR = TokenType.BAR;
const THEN = TokenType.THEN;
const IN = TokenType.IN;
const UNDERSCORE = TokenType.UNDERSCORE;
const OF = TokenType.OF;

const keywords = new Map([
    ["if", TokenType.IF],
    ["then", TokenType.THEN],
    ["elif", TokenType.ELIF],
    ["else", TokenType.ELSE],
    ["type", TokenType.TYPE],
    ["alias", TokenType.ALIAS],
    ["case", TokenType.CASE],
    ["of", TokenType.OF],
    ["in", TokenType.IN],
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
    private endKeywordNames: String[] = [];
    private canBeFunctionCall = true;
    public types: {[alias: string]: Type} = (function(o) {
        o["Text"] = PrimitiveType.Text;
        o["Num"] = PrimitiveType.Num;
        o["Bool"] = PrimitiveType.Bool;
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

    declareMaybe() {
        this.types["Maybe"] = createCustomType("Maybe", undefined, {a: new AnyType("a")});
        this.env.declare(new Token(IDENTIFIER, "Just", undefined, undefined, undefined), false);
        this.env.declare(new Token(IDENTIFIER, "Nothing", undefined, undefined, undefined), false);
        return new CustomTypeDeclaration(
            new Token(IDENTIFIER, "Maybe", undefined, undefined, undefined),
            {
                "Just": new AnyType("a"),
                "Nothing": undefined
            },
            {a: new AnyType("a")}
        );
    }

    parse() {
        this.current = 0;
        let statements = [];
        // declare maybe
        // TODO: import instead of hardcode
        statements.push(this.declareMaybe());
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

    getExprKeywordsAware(func: () => Expr, keywords: string[]) {
        keywords.forEach((keyword) =>
            this.endKeywordNames.push(keyword)
        );
        const expr = func.bind(this)();
        keywords.forEach((keyword) =>
            this.endKeywordNames.splice(
                this.endKeywordNames.indexOf(keyword),
                1
            )
        );
        return expr;
    }

    indent(message?: string) {
        this.consume(INDENT, (
            message === undefined
            ? `Expected an indentation here!`
            : message
        ));
    }

    dedent(message?: string) {
        this.consume(DEDENT, (
            message === undefined
            ? `Expected a dedentation here!`
            : message
        ));
    }

    beginBlock(message: string, condition = true) {
        if (condition) {
            this.consume(NEWLINE, message);
            this.indent();
        }
    }

    endBlock(message: string, condition = true) {
        if (condition) {
            let hadEnd = false;
            hadEnd = this.match(NEWLINE) || hadEnd;
            hadEnd = this.match(DEDENT) || hadEnd;
            if (!hadEnd) {
                throw this.error(this.peek(), message);
            }
        }
    }

    declaration() {
        try {
            if (this.peek().lexeme === "type"
            && this.peekNext().type !== COLON
            && this.peekNext().type !== EQUAL
            ) {
                this.advance();
                if (this.peek().lexeme === "alias") {
                    this.advance();
                    return this.typeAlias();
                } else {
                    return this.customType();
                }
            } else {
                return this.varDeclaration();
            }
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
        let typeParameters: {[name: string]: AnyType} = {};
        let typeParameterTokens: Token[] = [];
        if (this.peek().type === IDENTIFIER) {
            const token = this.advance();
            typeParameterTokens.push(token);
            typeParameters[token.lexeme] = new AnyType(token.lexeme);
        }
        this.consume(COLON, `Expected a ':' after custom type name!`);
        this.consume(NEWLINE, `Expected a linebreak after ':'!`);
        this.consume(INDENT, `Expected indentation before types!`);
        let subtypes = Object.create(null);
        let usedParameters: string[] = [];
        do {
            const subtypeToken = this.consume(IDENTIFIER, `Expected a subtype name!`);
            const subtypeName = subtypeToken.lexeme;
            let subtype = undefined;
            if (this.peek().type !== NEWLINE) {
                subtype = this.typeDeclaration({
                    allowFunctionType : true,
                    allowTypeVariable : true,
                    typeParameters : typeParameters,
                    usedParameters : usedParameters
                });
                if (subtype instanceof FunctionType) {
                    throw this.error(
                        subtypeToken, 
                        `Subtype parameter cannot be a function type.\nIt must be a single type (including a record of types)!`
                    );
                }
            }
            subtypes = {
                ...subtypes,
                [subtypeName] : subtype
            }
            this.env.declare(subtypeToken, false);
        } while (this.match(NEWLINE) && !this.match(DEDENT));
        
        // check if all type parameters are used
        const notusedParameters = Object.values(typeParameters).map((parameter) => parameter.name).filter((parameter) => !usedParameters.includes(parameter))
        if (notusedParameters.length > 0) {
            const firstUnusedParameterToken = typeParameterTokens[usedParameters.length];
            throw this.error(
                firstUnusedParameterToken,
                "Type parameter "
                + typeParameterTokens.slice(usedParameters.length).join(", ")
                + are(notusedParameters.length)
                + "unused. Remove"
                + them(notusedParameters.length)
                + "or use"
                + them(notusedParameters.length)
                + "in subtypes!")
        }

        const customType = new CustomTypeDeclaration(
            nameToken,
            subtypes,
            typeParameters
        );
        this.types[name] = new CustomType(name, typeParameters);
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
        this.consume(NEWLINE, `Expected a linebreak after ':'!`);
        this.indent(`Expected indentation before type!`);
        const type = this.typeDeclaration({
            allowFunctionType : true,
            allowTypeVariable : false,
            typeParameters : [],
            usedParameters : []
        });
        this.endStmt("type", {dedent: true});
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
        let locals = Object.create(null);
        const body = (
            this.check(NEWLINE)
            ? (() => {
                this.beginBlock("Expected the body of function to be on it's own line!");
                locals = this.letInExpr(params.map((param) => param.lexeme));
                const expr = this.expression();
                this.endBlock("Expected dedentation to end the body of function!");
                this.canBeFunctionCall = false;
                return expr;
            })()
            : (() => {
                this.consume(LEFT_PAREN, `Expected '(' before function body!`);
                const expr = this.expression();
                this.consume(RIGHT_PAREN, `Expected ')' after function body!`);
                return expr;
            })()
        );
        this.env = enclosing;
        return new Function(first, params, locals, body);
    }

    consumeParameters() {
        let params: Token[] = [];
        while (this.match(IDENTIFIER)) {
            params.push(this.previous());
        }
        return params;
    }

    letInExpr(declaredNames: string[]) {
        let locals: { [name: string]: VarDeclaration } = Object.create(null);
        if (this.peek().lexeme === "let") {
            this.advance();
            this.beginBlock("Expected the body of let to be on it's own line!");
            let numberOfUnderscores = 0;
            do {
                const declaration = this.varDeclaration();
                let name = declaration.name.lexeme;
                if (Object.keys(locals).includes(name)
                || declaredNames.includes(name)) {
                    throw this.error(declaration.name, `Duplicated variable name '${name}'!`);
                }
                if (name === "_") {
                    name = "_" + numberOfUnderscores;
                    numberOfUnderscores ++;
                }
                locals[name] = declaration;
            } while (!this.match(DEDENT));
            this.prelude();
            this.consume(IN, `Expected 'in' keyword at the end of let expression!`);
            this.consume(NEWLINE, `Expected linebreak after 'in' keyword!`);
        }
        return locals;
    }

    varDeclaration(declaredName?: string, declaredType?: Type): VarDeclaration {
        const nameToken: Token = this.consume([IDENTIFIER, UNDERSCORE], `Variable must have a valid name!`);
        const name: string = nameToken.lexeme;
        if (declaredName !== undefined
            && name !== declaredName) {
            throw this.error(this.previous(), `Variable name do not match between type declaration and actual declaration!`);
        }
        const operator = this.consume([EQUAL, COLON], `Variable '${name}' must be initialized when declared!`);
        if (operator.type === COLON) {
            const mutable = false;
            if (nameToken.type !== UNDERSCORE) {
                this.env.declare(nameToken, mutable);
            }
            const needEndStmt = !this.check(F);
            if (!this.check(F)) {
                this.beginBlock('All expressions except functions must be on its own line!');
                if (this.check(F)) {
                    throw this.error(
                        this.peek(),
                        "Function declaration must starts at the same line as ':'.\nAll other expressions should be on a separate line!"
                    )
                }
            }
            const enclosing = this.env;
            this.env = this.newEnv(enclosing);
            const locals = this.letInExpr([name]);
            const initializer: Expr = this.expression();
            this.env = enclosing;
            if (needEndStmt) {
                this.endStmt("value", {dedent: true});
            }
            return new VarDeclaration(nameToken, locals, initializer, declaredType);
        } else if (operator.type === EQUAL) {
            const type: Type = this.typeDeclaration();
            this.endStmt("type declaration");
            return this.varDeclaration(name, type);
        }
    }
    typeDeclaration(opts = {allowFunctionType : true, allowTypeVariable : true, typeParameters : undefined, usedParameters : []}): Type {
        const first = this.consume([IDENTIFIER, LEFT_PAREN, LEFT_BRACE], `Expected a type!`);
        let type: Type;
        switch (first.lexeme) {
            case "(":
                type = this.typeDeclaration(opts);
                this.consume(RIGHT_PAREN, `Expected a ')'!`);
                break;
            case "{":
                let recordType = Object.create(null);
                if (this.check(IDENTIFIER)) {
                    do {
                        const keyName = this.consume(IDENTIFIER, `Expected a key name!`).lexeme;
                        this.consume(EQUAL, `Expected a '=' after key name!`);
                        const valueType = this.typeDeclaration(opts);
                        recordType[keyName] = valueType;
                    } while (
                        this.match(COMMA, SOFT_NEWLINE)
                        && this.peek().type !== RIGHT_BRACE);
                }
                type = new RecordType(recordType);
                this.consume(RIGHT_BRACE, `Expected a closing '}'!`);
                break;
            case "List":
                type = new ListType(this.typeDeclaration({
                    ...opts,
                    allowFunctionType : false
                }));
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
                    if (type instanceof CustomType) {
                        type = Object.assign(
                            clone(type),
                            {
                                typeParameters: Object.keys(type.typeParameters).reduce((parameters, name) =>
                                    ({
                                        ...parameters,
                                        [name]: this.typeDeclaration({
                                            ...opts,
                                            allowFunctionType : false
                                        })
                                    }),
                                    {}
                                )
                            }
                        );
                    }
                } else if (opts.allowTypeVariable) {
                    const name = first.lexeme;
                    if (opts.typeParameters !== undefined) {
                        if (!Object.values(opts.typeParameters).map(parameter => (parameter as AnyType).name).includes(name)) {
                            throw this.error(first, `Type variable ${name} must be declared in the custom type declaration header before being used here!`);
                        }
                    }
                    type = new AnyType(name);
                    opts.usedParameters.push(name);
                } else {
                    throw this.error(first, `Cannot declare type variable here!`)
                }
                break;
        }
        while (opts.allowFunctionType && this.match(ARROW)) {
            type = new FunctionType(type, this.typeDeclaration(opts));
        }
        return type;
    }

    // expression → assignment
    expression(): Expr {
        return this.caseExpr();
    }

    caseExpr() {
        if (this.peek().lexeme === "case") {
            // 'case' is a variable name
            if (this.env.lookup(this.peek())) {
                return this.if();
            }
            this.advance();
            const keyword = this.previous();
            let expr = this.getExprKeywordsAware(this.if, ["of"]);
            this.prelude();
            this.consume(OF, `Expected 'of' keyword after case condition!`);
            this.consume(NEWLINE, `Expected a linebreak before caes branches!`);
            this.consume(INDENT, `Expected indentation before case branches!`);
            let cases: {
                subtype: Token | Literal,
                parameters: Token[],
                isRecord: boolean,
                result: Expr
            }[] = [];
            do {
                let subtype;
                let parameters = [];
                let isRecord;
                if (this.match(IDENTIFIER, UNDERSCORE)) {
                    subtype = this.previous();
                    if (cases
                        .filter((individualCase) =>
                            individualCase.subtype instanceof Token)
                        .map((individualCase) =>
                            (individualCase.subtype as Token).lexeme
                        )
                        .includes(subtype.lexeme)) {
                        throw this.error(subtype, `Duplicated case condition ${subtype}!`);
                    }
                    if (this.match(LEFT_BRACE)) {
                        do {
                            parameters.push(this.consume(IDENTIFIER, `Expected a record property name!`));
                        } while (this.match(COMMA) && !this.check(RIGHT_BRACE))
                        this.consume(RIGHT_BRACE, `Expected a '}' to close the record!`);
                        isRecord = true;
                    } else if (this.match(IDENTIFIER)) {
                        parameters.push(this.previous());
                        isRecord = false;
                    }
                } else {
                    subtype = this.primitiveLiteral();
                    if (cases.some((individualCase) =>
                        individualCase.subtype instanceof Literal
                        ? runtime.eq(individualCase.subtype.value, subtype.value)
                        : false
                    )) {
                        throw this.error(subtype.first, `Duplicated case condition ${runtime.toString(subtype.value)}!`);
                    }
                }
                // declare parameters temporarily
                parameters.forEach(parameter =>
                    this.env.declare(parameter, false)
                )
                this.consume(ARROW, `Expected a '→' after case condition!`);
                this.consume(NEWLINE, `Expected a linebreak before case condition!`);
                this.consume(INDENT, `Expected indentation before case condition!`);
                const result = this.expression();

                // remove parameters from scope
                parameters.forEach(parameter =>
                    this.env.undeclare(parameter)
                )
                
                this.match(NEWLINE);
                this.consume(DEDENT, `Expected dendetation after case result!`);
                cases.push({
                    subtype,
                    parameters,
                    isRecord,
                    result
                });
            } while (!this.match(DEDENT));
            return new Case(keyword, expr, cases);
        } else {
            return this.if();
        }
    }

    if() {
        if (this.peek().lexeme === "if") {
            // 'if' is a variable name
            if (this.env.lookup(this.peek())) {
                return this.or();
            }
            this.advance();
            return this.ifHelper();
        } else {
            return this.or();
        }
    }

    ifHelper(isMultiline = false) {
        const condition = this.getExprKeywordsAware(this.or, ["then"]);
        this.prelude();
        this.consume(THEN, `Expected 'then' after if condition!`);
        const beginMessage = `Expected the body of this branch on its own line!`;
        const endMessage = `Expected dedentation to end the body of this branch!`;
        this.beginBlock(beginMessage, isMultiline);
        if (this.match(NEWLINE)) {
            isMultiline = true;
            this.indent();
        }
        const thenBranch = this.getExprKeywordsAware(this.expression, ["elif", "else"]);
        this.endBlock(endMessage, isMultiline);
        this.prelude();
        if (this.match(ELIF)) {
            return new If(condition, thenBranch, this.ifHelper(isMultiline));
        }
        // last else without if
        this.consume(ELSE, `Expected 'else' at the end of every if expression!`);
        this.beginBlock(beginMessage, isMultiline);
        const expr = new If(condition, thenBranch, this.expression());
        this.endBlock(endMessage, isMultiline);
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
        const bool = (
            this.canBeFunctionCall
            && (
                expr instanceof Variable
                || expr instanceof Get
                || (expr instanceof Function && expr.body instanceof Expr)
                || expr instanceof Grouping
            )
        );
        this.canBeFunctionCall = true;
        return bool;
    }

    checkLiteral() {
        const literals = [
            TRUE,
            FALSE,
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
        this.match(NEWLINE);
        return (
            this.check(...literals, LEFT_BRACE, LEFT_BRACKET, LEFT_PAREN, F)
            && !this.endKeywordNames.includes(this.peek().lexeme)
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

    // primary → NUMBER | STRING | "false" | "true" | "(" expression ")" | IDENTIFIER
    basicPrimary() {
        // record literal
        if (this.match(LEFT_BRACE)) {
            const enclosingGroupMembers = this.groupMembers;
            this.groupMembers = 0;
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
            this.groupMembers = enclosingGroupMembers;
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
            const enclosingGroupMembers = this.groupMembers;
            this.groupMembers = 0;
            const first = this.previous();
            const list = this.getList(TokenType.RIGHT_BRACKET, COMMA);
            this.consume([TokenType.RIGHT_BRACKET], `Expect ']' after arguments!`);
            this.groupMembers = enclosingGroupMembers;
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
        if (this.peek().type === IDENTIFIER) {
            const name = this.peek();
            if (!this.env.lookup(name)) {
                if (this.endKeywordNames.includes(name.lexeme)) {
                    throw this.error(this.peek(), `Expression expected before '${name}' keyword!`);
                }
                throw this.error(name, `Variable '${name.lexeme}' is not declared!`);
            }
            this.advance();
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

    private endStmt(name: string, opts = {dedent : false}) {
        this.match(NEWLINE, EOF);
        if (opts.dedent) {
            this.match(DEDENT);
        }
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
                case IDENTIFIER:
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
        if (this.tokens[this.current].type === SOFT_NEWLINE) {
            this.advance(); // skip over soft newline
        }
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
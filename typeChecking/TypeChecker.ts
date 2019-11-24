import { Visitor } from "../interfaces/Visitor";
import { Runner } from "../Runner";
import { If, Binary, Expr, Get, Call, Literal, Grouping, Variable, Function, ListLiteral, RecordLiteral, Case } from "../Expr";
import { VarDeclaration, Stmt, CustomTypeDeclaration } from "../Stmt";
import { PrimitiveType } from "./PrimitiveType";
import { CError } from "./CompileError";
import { TokenType } from "../TokenType";
import { Token } from "../Token";
import { Type } from "./Type";
import { RecordType } from "./RecordType";
import { isList, capitalize, isNumber, isBoolean, isText, nextChar, isInteger } from "../utils";
import { Env } from "./Environment";
import { ListType } from "./ListType";
import { FunctionType } from "./FunctionType";
import { AnyType } from "./AnyType";
import clone from "lodash.clone";
import { Scanner } from "../Tokenizer";
import { Parser } from "../Parser";
import { CustomType } from "./CustomType";
import { zip } from 'zip-array';

const NUMBER = PrimitiveType.Num;
const INTEGER = PrimitiveType.Int;
const TEXT = PrimitiveType.Text;
const BOOLEAN = PrimitiveType.Bool;

type Location = Token | Expr;

export class Checker implements Visitor {
    private env: Env;
    private anyTypeName = 'a';
    constructor(private runner: Runner) {
        // global environment
        const globals = this.newEnv();
        this.env = globals;
        this.declarePrimordials(globals);
        this.importModules(["List", "Text"], globals);
    }

    newEnv(enclosing?: Env) {
        return new Env(this, enclosing);
    }

    private importModules(moduleNames: string[], globals: Env) {
        moduleNames.forEach(name => {
            const moduleDeclaration = require("./" + name).default;
            const types = Checker.parseTypeDeclarations(moduleDeclaration);
            globals.declarePrimordial(name, new RecordType(types));
        });
    }

    private declarePrimordials(globals: Env) {
        this.declareMaybeType();

        const primordials = 
        `abs       Num → Num
        max        Num → Num → Num
        min        Num → Num → Num
        neg        Num → Num
        not        Bool → Bool
        print      a → Text
        sqrt       Num → Num
        round      Num → Num
        floor      Num → Num
        ceil       Num → Num
        trunc      Num → Num
        pi         Num
        e          Num
        sin        Num → Num
        cos        Num → Num
        tan        Num → Num
        asin       Num → Num
        acos       Num → Num
        atan       Num → Num
        atan2      Num → Num → Num
        ƒ⋏         Bool → Bool → Bool
        ƒ⋎         Bool → Bool → Bool
        ƒ=         a → a → Bool
        ƒ≠         a → a → Bool
        ƒ<         Num → Num → Bool
        ƒ≥         Num → Num → Bool
        ƒ>         Num → Num → Bool
        ƒ≤         Num → Num → Bool
        ƒ+         Num → Num → Num
        ƒ-         Num → Num → Num
        ƒ*         Num → Num → Num
        ƒ/         Num → Num → Num
        ƒ%         Num → Num → Num
        ƒ&         Text → Text → Text`;
        const types = Checker.parseTypeDeclarations(primordials);
        Object.entries(types).forEach(([name, type]) => 
            globals.declarePrimordial(name, type)
        );
    }

    private declareMaybeType() {
        // declare Maybe type
        this.visitCustomTypeDeclarationStmt(new CustomTypeDeclaration(
            new Token(TokenType.IDENTIFIER, "Maybe", undefined, undefined, undefined),
            {
                "Nothing": undefined,
                "Just": new AnyType("a")
            },
            {a: new AnyType("a")}
        ));
    }

    public static parseTypeDeclarations(declarations) {
        const regex = /\s*(.*?)\s+(.*)/g;
        let match: string[];
        let types: {[name: string]: Type} = Object.create(null);
        while ((match = regex.exec(declarations)) !== null) {
            const name = match[1];
            const typeString = match[2];
            const runner = new Runner();
            runner.lineStarts = [];
            const scanner = new Scanner(typeString, runner);
            scanner.scan();
            const parser = new Parser(scanner.tokens, runner);
            parser.current = 0;

            // declare Maybe type
            // TODO: import Maybe type instead of hardcoding declaration
            if (typeString.includes("Maybe")) {
                parser.types["Maybe"] = new CustomType("Maybe", {a: new AnyType("a")});
            }

            types[name] = parser.typeDeclaration();
        }
        return types;
    }

    checkType(stmts: Stmt[]) {
        try {
            stmts.forEach(stmt => {
                this.statement(stmt);
            });
        } catch (error) {
            if (error instanceof CError) {
                this.runner.error(error.token, error.message, "CompileError");
            } else {
                console.log(error);
            }
            this.runner.hadError = true;
        }
    }

    statement(stmt: Stmt) {
        return stmt.accept(this);
    }

    expression(expr: Expr): Type {
        return expr.accept(this);
    }

    type(expr: any) {
        if (isText(expr)) {
            return TEXT;
        }
        if (isBoolean(expr)) {
            return BOOLEAN;
        }
        if (isNumber(expr)) {
            if (isInteger(expr)) {
                return INTEGER;
            }
            return NUMBER;
        }
    }

    public matchTypes(a: Type, b: Type, message: string, location: Location, opts?: {isFirstSubtype: boolean, looseCustomType?: boolean}) {
        if (!this.sameTypes(a, b, opts)) {
            throw this.error(location, message);
        }
    }

    public sameTypes(a: Type, b: Type, opts: {isFirstSubtype: boolean, looseCustomType?: boolean} = {isFirstSubtype: false, looseCustomType: false}): boolean {
        if (opts.isFirstSubtype && b instanceof AnyType) {
            return true;
        }
        if (a === undefined || b === undefined) {
            return true;
        }
        if (a instanceof AnyType && b instanceof AnyType) {
            return a.name === b.name;
        }
        if (a instanceof CustomType && b instanceof CustomType) {
            return (
                a.name === b.name
                && zip(Object.values(a.typeParameters), Object.values(b.typeParameters)).every(([aParameter, bParameter]) =>
                    opts.looseCustomType
                    ? (
                        aParameter instanceof AnyType
                        || bParameter instanceof AnyType
                        || this.sameTypes(aParameter, bParameter)
                    )
                    : this.sameTypes(aParameter, bParameter)
                )
            );
        } else if (a instanceof ListType && b instanceof ListType) {
            return this.sameTypes(a.type, b.type, opts);
        } else if (a instanceof RecordType && b instanceof RecordType) {
            if (!opts.isFirstSubtype) {
                if (Object.keys(a.record).length !== Object.keys(b.record).length) {
                    return false;
                }
            }
            return Object.keys(a.record).every((key) => {
                if (b.record[key] === undefined) {
                    return false;
                }
                return this.sameTypes(a.record[key], b.record[key], opts);
            });
        } else if (a instanceof FunctionType && b instanceof FunctionType) {
            return (
                this.sameTypes(a.inputType, b.inputType, opts)
                && this.sameTypes(a.outputType, b.outputType, opts)
            )
        } else if (opts.isFirstSubtype && a === INTEGER && b === NUMBER) {
            return true;
        } else if (a === b) {
            return true;
        }
        return false;
    }

    number(valueType: Type, operand: Expr, name?: string) {
        return this.matchType(valueType, NUMBER, operand, name);
    }

    boolean(valueType: Type, operand: Expr, name?: string) {
        return this.matchType(valueType, BOOLEAN, operand, name);
    }

    text(valueType: Type, operand: Expr, name?: string) {
        return this.matchType(valueType, TEXT, operand, name);
    }

    matchType(value: Type, target: Type, operand: Expr, name = "operand") {
        if (value instanceof AnyType && operand instanceof Variable) {
            this.env.define(operand.name, target);
        } else {
            this.matchTypes(
                value,
                target,
                `${capitalize(name)} must be a ${target}, not ${value}!`,
                operand,
                {
                    isFirstSubtype : true,
                    looseCustomType : false
                }
            );
        }
    }

    matchLeftRightTypes(leftType: Type, rightType: Type, leftOperand: Expr, rightOperand: Expr) {
        if (leftType instanceof AnyType && leftOperand instanceof Variable) {
            this.env.define(leftOperand.name, rightType);
        } else if (rightType instanceof AnyType && rightOperand instanceof Variable) {
            this.env.define(rightOperand.name, leftType);
        } else if ((leftType === INTEGER || leftType === NUMBER)
            && (rightType === INTEGER || rightType === NUMBER)) {
            return true;
        } else {
            this.matchTypes(
                leftType,
                rightType,
                `Right operand typed ${rightType} does not match left operand typed ${leftType}!`,
                rightOperand
            );
        }
    }

    error(location: Location, message: string) {
        return new CError(
            location instanceof Expr
                ? location.first
                : location
            , message
        );
    }

    // anatomy of case expression
    // case value
    //     condition 1 →
    //          result 1
    //     condition 2 →
    //          result 2
    //     else →
    //          else result
    visitCaseExpr(caseExpr: Case) {
        let supertype = this.expression(caseExpr.expr);
        let returnType;
        caseExpr.cases.forEach(({subtype, parameters, result}, index) => {
            if (subtype instanceof Token) {
                if (supertype instanceof CustomType) {
                    if (subtype.lexeme === "_") {
                        throw this.error(subtype, `Cannot use placeholder '_' in case expression with custom types.\nMust handle all subtypes explicitly!`)
                    }
                    const subtypes = this.env.getSubtypes(supertype.name);
                    if (subtypes.hasOwnProperty(subtype.lexeme)) {
                        const typeParameters = (
                            subtypes[subtype.lexeme] === undefined
                            ? subtypes[subtype.lexeme]
                            : this.substituteReturnType(
                                subtypes[subtype.lexeme],
                                supertype.typeParameters
                            )
                        );

                        if (typeParameters === undefined) {
                            if (parameters.length > 0) {
                                throw this.error(subtype, `Expected 0 parameter for subtype ${subtype} but got ${parameters.length}!`);
                            }
                        } else if (typeParameters instanceof RecordType) {
                            parameters.forEach((parameter) => {
                                const declaredType = typeParameters.record[parameter.lexeme];
                                if (declaredType === undefined) {
                                    throw this.error(parameter, `Paramter ${parameter} does not exist on custom type ${supertype}!`);
                                }
                                // declare parameter types temporarily
                                this.env.declare(parameter, declaredType , false);
                            });
                        } else {
                            if (parameters.length > 1) {
                                throw this.error(parameters[1], `Expected 1 parameter but got ${parameters.length}!`);
                            }
                            // declare parameter type temporarily
                            this.env.declare(parameters[0], typeParameters , false);
                        }
                    } else {
                        throw this.error(subtype, `Subtype ${subtype} does not exist in ${supertype}!`);
                    }
                } else {
                    if (subtype.lexeme === "_") {
                        // 'else' is not the last case condition
                        if (index < caseExpr.cases.length - 1) {
                            throw this.error(subtype, `Placeholder '_' must be the last case condition of non-custom types!`);
                        }
                    } else if (supertype instanceof AnyType) {
                        const customType = this.env.getCustomType(subtype.lexeme);
                        if (customType === undefined) {
                            throw this.error(subtype, `Subtype ${subtype} does not exist in ${supertype}!`);
                        }
                        this.env.substituteAnyType(supertype, customType);
                        supertype = customType;
                    } else {
                        throw this.error(subtype, `Expected case condition to be a ${supertype}, not a custom type ${subtype}!`);
                    }
                }
            } else {
                const sub = this.expression(subtype);
                const isSubtype = this.sameTypes(sub, supertype, {isFirstSubtype: true, looseCustomType: false});
                if (!isSubtype) {
                    throw this.error(subtype, `Expected case condition to be a ${supertype}, not a ${sub}!`);
                }
                // last case condition reached
                if (index === caseExpr.cases.length - 1) {
                    throw this.error(subtype, `Placeholder '_' must be the last case condition of non-custom types!`);
                }
            }

            const currentReturnType = this.expression(result);

            // remove temporary parameter declarations from scope
            parameters.forEach((parameter) =>
                this.env.undeclare(parameter)
            )

            if (returnType === undefined) {
                returnType = currentReturnType
            } else if (
                this.sameTypes(currentReturnType, returnType)
                || currentReturnType instanceof AnyType
                || returnType instanceof AnyType
            ) {
                returnType = this.substituteAnyTypes(returnType, currentReturnType, {});
            } else {
                throw this.error(result, `Return type ${currentReturnType} of this case expression does not match previous return type ${returnType}!`);
            }
        });

        return returnType;
    }

    visitIfExpr(expr: If) {
        this.boolean(this.expression(expr.condition), expr.condition, "condition");
        const thenBranch = this.expression(expr.thenBranch);
        const elseBranch = this.expression(expr.elseBranch);
        this.matchTypes(
            thenBranch, elseBranch,
            `Type ${thenBranch} of then branch does not match type ${elseBranch} of else branch!`,
            expr,
            {
                isFirstSubtype: false,
                looseCustomType: true
            }
        );
        return thenBranch;
    }
    visitBinaryExpr(expr: Binary) {
        const leftType = this.expression(expr.left);
        const rightType = this.expression(expr.right);

        // logical operators
        if (expr.operator.type === TokenType.AND ||
            expr.operator.type === TokenType.OR) {
            this.boolean(leftType, expr.left);
            this.boolean(rightType, expr.right);
            return BOOLEAN;
        }

        // other Binary operators
        switch (expr.operator.type) {
            // arithmetic operators
            case TokenType.MINUS:
            case TokenType.PLUS:
            case TokenType.SLASH:
            case TokenType.STAR:
            case TokenType.MODULO:
                this.number(leftType, expr.left);
                this.number(rightType, expr.right);
                if (expr.operator.type !== TokenType.SLASH
                    && leftType === INTEGER && rightType === INTEGER) {
                    return INTEGER;
                }
                return NUMBER;
            
            case TokenType.AMPERSAND:
                this.text(leftType, expr.left);
                this.text(rightType, expr.right);
                return TEXT;

            // comparison operators
            case TokenType.GREATER:
            case TokenType.GREATER_EQUAL:
            case TokenType.LESS:
            case TokenType.LESS_EQUAL:
                try {
                    this.number(leftType, expr.left);
                    this.number(rightType, expr.right);
                } catch(ignore) {
                    try {
                        this.text(leftType, expr.left);
                        this.text(rightType, expr.left);
                    } catch(ignore) {
                        throw this.error(expr.operator, "Operands must be two numbers or two strings!");
                    }
                }
                return BOOLEAN;

            // equality operators
            case TokenType.EQUAL:
            case TokenType.NOT_EQUAL:
                this.matchLeftRightTypes(leftType, rightType, expr.left, expr.right);
                return BOOLEAN;
        }
    }
    visitGroupingExpr(expr: Grouping) {
        return this.expression(expr.expression);
    }
    visitLiteralExpr(expr: Literal) {
        return this.type(expr.value);
    }
    visitListLiteralExpr(expr: ListLiteral) {
        let type: Type;
        expr.list.some((element) => {
            const elementType = this.expression(element);
            if (type === undefined) {
                type = elementType;
            } else if (elementType === NUMBER && type === INTEGER) {
                type = elementType;
            } else {
                this.matchTypes(
                    elementType,
                    type,
                    `List elements must be the same types!\n${elementType} does not match ${type}!`,
                    element,
                    {
                        isFirstSubtype : true
                    }
                );
            }
        });
        return new ListType(type);
    }
    visitRecordLiteralExpr(expr: RecordLiteral) {
        if (expr.target === undefined) {
            return new RecordType(
                Object.keys(expr.record).reduce(
                    (record, key) => ({
                        ...record, 
                        [key]: this.expression(expr.record[key])
                    }),
                    Object.create(null)
                )
            );
        } else {
            // check if the new keys and values match target record's
            const target = this.expression(expr.target) as RecordType;
            if (target === undefined) {
                throw this.error(expr.target, `Target record '${expr.target}' is not declared!`);
            }
            Object.keys(expr.record).forEach(key => {
                if (target.record[key] === undefined) {
                    throw this.error(expr.keyTokens[key], `Target record '${expr.target}' does not contain key '${key}'!`);
                }
                const targetType = target.record[key];
                const sourceType = this.expression(expr.record[key]);
                this.matchTypes(
                    targetType,
                    sourceType,
                    `Source value typed ${sourceType} does not match target value typed ${targetType}!`,
                    expr.record[key]
                )
            });
        }
    }
    visitVariableExpr(expr: Variable) {
        return this.env.get(expr.name);
    }
    visitCallExpr(expr: Call) {
        let callee = this.expression(expr.callee);
        if (callee instanceof AnyType) {
            const argTypes = expr.argumentList.map(arg => this.expression(arg));
            const calleeType = Checker.createFunctionType([
                ...argTypes,
                this.generateAnyType()
            ]);
            if (expr.callee instanceof Variable) {
                this.env.define(expr.callee.name, calleeType);
            }
            return calleeType;
        }
        const func = callee;
        if (!(callee instanceof FunctionType)) {
            throw this.error(expr.paren, `Callee must be a function!`);
        }
        let paramType = callee.inputType;
        const argTypes = expr.argumentList.map(arg => this.expression(arg));
        let anyTypes = {};
        argTypes.forEach((argType, index) => {
            paramType = this.substituteAnyTypes(paramType, argType, anyTypes);
            const arg = expr.argumentList[index];
            if (!(callee instanceof FunctionType)) {
                const funcName = (
                    expr.callee instanceof Get
                    ? expr.callee.object.first.lexeme + "." + expr.callee.name.lexeme
                    : (
                        expr.callee instanceof Grouping
                        ? ""
                        : expr.callee.first.lexeme
                    )
                );
                throw this.error(
                    arg.first,
                    `Function ${funcName === "" ? func : "'" + funcName + "'"} expects ${index} arguments but got ${argTypes.length} instead!`
                );
            }
            if (argType instanceof AnyType && arg instanceof Variable) {
                this.env.define(arg.name, paramType);
            } else {
                this.matchTypes(
                    argType,
                    paramType,
                    `Argument type ${argType} does not match paramter type ${paramType}!`,
                    arg,
                    {
                        isFirstSubtype: true,
                        looseCustomType: false
                    }
                );
            }
            callee = callee.outputType;
            if (callee instanceof FunctionType) {
                paramType = callee.inputType;
            } else {
                paramType = callee;
            }
        });
        return this.substituteReturnType(callee, anyTypes);
    }

    // substitute AnyTypes in return type with concrete types extracted from argument types
    substituteReturnType(returnType: Type, anyTypes: {[name: string]: Type}) {
        if (returnType instanceof FunctionType) {
            return Object.assign(
                clone(returnType),
                {
                    inputType: this.substituteReturnType(returnType.inputType, anyTypes),
                    outputType: this.substituteReturnType(returnType.outputType, anyTypes)
                }
            )
        } else if (
            returnType instanceof ListType
        ) {
            return Object.assign(
                clone(returnType),
                {
                    type: this.substituteReturnType(returnType.type, anyTypes)
                }
            )
        }
        else if (returnType instanceof CustomType) {
            return Object.assign(
                clone(returnType),
                {
                    typeParameters: Object.entries(returnType.typeParameters).reduce(
                        (parameters, [name, type]) =>
                            ({
                                ... parameters,
                                [name]: this.substituteReturnType(type, anyTypes)
                            }),
                        {}
                    )
                }
            )
        } else if (returnType instanceof AnyType) {
            const substituteType = anyTypes[returnType.name]
            return (
                substituteType === undefined
                ? returnType
                : substituteType
            );
        } else {
            return returnType;
        }
    }

    resetAnyTypeName() {
        this.anyTypeName = 'a';
    }

    generateAnyType() {
        const curr = this.anyTypeName;
        const next = nextChar(curr);
        this.anyTypeName = next;
        return new AnyType(curr);
    }

    visitFunctionExpr(expr: Function, declaredType?: FunctionType) {
        const enclosing = this.env;
        this.env = this.newEnv(enclosing);
        this.env.functionName = enclosing.functionName;
        let declaredParamType: Type = declaredType;
        expr.params.forEach((param) => {
            if (param.lexeme === this.env.functionName) {
                throw this.error(param, `Parameter '${param.lexeme}' cannot have the same name as the function!`);
            }
            let paramType: Type;
            if (declaredType !== undefined) {
                paramType = (declaredParamType as FunctionType).inputType;
                declaredParamType = (declaredParamType as FunctionType).outputType;
            } else {
                paramType = this.generateAnyType();
            }
            this.env.declare(param, paramType, false);
        });
        this.env.functionParams = expr.params;
        Object.values(expr.locals).forEach((declaration) =>
            this.visitVarDeclarationStmt(declaration)
        )
        const outputType = this.expression(expr.body);
        const paramTypes = (
            expr.params.length > 0
            ? (expr.params.map(param => this.env.get(param)))
            : [new AnyType("a")]
        );
        const returnType = Checker.createFunctionType(
            [
                ...paramTypes,
                outputType
            ]
        );
        // reset to defaults
        this.env = enclosing;
        this.env.functionParams = undefined;
        this.env.functionName = undefined;
        this.resetAnyTypeName();
        return returnType;
    }

    public static createFunctionType(types: Type[]) {
        if (types.length === 1) {
            return types[0];
        }
        return new FunctionType(types[0], this.createFunctionType(types.slice(1)));
    }

    visitGetExpr(expr: Get) {
        const object = this.expression(expr.object);
        const name = expr.name;
        if (object instanceof RecordType) {
            return object.get(name);
        } else {
            if (object instanceof AnyType && expr.object instanceof Variable) {
                const propertyType = this.generateAnyType();
                this.env.define(expr.object.name, new RecordType({
                    [name.lexeme]: propertyType
                }));
                return propertyType;
            } else {
                throw this.error(name, `${object} does not have property ${name.lexeme}!`);
            }
        }
    }

    visitCustomTypeDeclarationStmt(stmt: CustomTypeDeclaration) {
        const name = stmt.name.lexeme;
        const customType = new CustomType(name, stmt.typeParameters);
        this.env.declareCustomType(name, stmt.subtypes, customType);
        Object.entries(stmt.subtypes).forEach(([name, type]) => {
            if (type === undefined) {
                this.env.declare(name, customType, false);
            } else {
                this.env.declare(name, new FunctionType(type, customType), false);
            }
        });
    }

    visitVarDeclarationStmt(stmt: VarDeclaration) {
        const mutable = false;
        if (stmt.initializer instanceof Function) {
            this.env.functionName = stmt.name.lexeme;
        }
        Object.values(stmt.locals).forEach((declaration) =>
            this.visitVarDeclarationStmt(declaration)
        )
        let actualType = this.expression(stmt.initializer);
        const declaredType = stmt.typeDeclaration;
        if (stmt.typeDeclaration !== undefined) {
            actualType = this.substituteAnyTypes(actualType, declaredType, {});
            this.matchTypes(
                actualType,
                declaredType,
                `Declared type ${declaredType} and actual type ${actualType} do not match!`,
                stmt.initializer,
                {
                    isFirstSubtype: true,
                }
            );
            if (stmt.initializer instanceof Function
                && declaredType instanceof FunctionType) {
                const actualType = this.visitFunctionExpr(stmt.initializer, declaredType);
                const actualReturnType = Checker.getFunctionOutputType(actualType);
                const declaredReturntype = Checker.getFunctionOutputType(declaredType);
                this.matchTypes(
                    declaredReturntype,
                    actualReturnType,
                    `Declared type ${declaredType} and actual type ${actualType} do not match!`,
                    stmt.initializer,
                );
            }
        }
        if (stmt.initializer instanceof Function) {
            this.env.functionName = undefined;
        }
        this.env.declare(
            stmt.name,
            declaredType === undefined
                ? actualType
                : declaredType,
            mutable);
    }

    private static getFunctionOutputType(funcType: FunctionType) {
        let type: Type = funcType;
        while (type instanceof FunctionType) {
            type = type.outputType;
        }
        return type;
    }

    private substituteAnyTypes(declaredType: Type, actualType: Type, anyTypes: {[name: string]: Type}): Type {
        if (declaredType instanceof FunctionType
            && actualType instanceof FunctionType) {
            return Object.assign(
                clone(declaredType),
                {
                    inputType: this.substituteAnyTypes(
                        declaredType.inputType,
                        actualType.inputType,
                        anyTypes
                    ),
                    outputType: this.substituteAnyTypes(
                        declaredType.outputType,
                        actualType.outputType,
                        anyTypes
                    )
                }
            );
        } else if (declaredType instanceof ListType
                && actualType instanceof ListType) {
            return Object.assign(
                    clone(declaredType),
                    {
                        type: this.substituteAnyTypes(
                            declaredType.type,
                            actualType.type,
                            anyTypes
                        )
                    }
                );
        } else if (declaredType instanceof RecordType
                && actualType instanceof RecordType) {
            return Object.assign(
                clone(declaredType),
                {
                    record: Object.keys(declaredType.record).reduce((record, key) => (
                        {
                            ...record,
                            [key]: this.substituteAnyTypes(
                                declaredType.record[key],
                                actualType.record[key],
                                anyTypes
                            )
                        }
                    ), Object.create(null))
                }
            );
        } else if (declaredType instanceof CustomType
            && actualType instanceof CustomType) {
            return Object.assign(
                clone(declaredType),
                {
                    typeParameters: Object.entries(declaredType.typeParameters).reduce((parameters, [declaredName, declaredParameter]) =>
                        ({
                            ... parameters,
                            [declaredName]: this.substituteAnyTypes(declaredParameter, actualType.typeParameters[declaredName], anyTypes)
                        }),
                    {})
                }
            );
        } else if (declaredType instanceof AnyType) {
            const storedType = anyTypes[declaredType.name];
            if (storedType !== undefined) {
                // declared type does not match actual type
                if (
                    !(
                        (
                            storedType instanceof AnyType
                            && !(actualType instanceof AnyType)
                        )
                        || this.sameTypes(storedType, actualType)
                    )
                ) {
                    return storedType;
                }
            }
            // add new type mapping
            anyTypes[declaredType.name] = actualType;
            return actualType;
        }
        return declaredType;
    }

}
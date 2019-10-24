import { Visitor } from "../interfaces/Visitor";
import { Runner } from "../Runner";
import { Ternary, Binary, Expr, Get, Call, Literal, Grouping, Variable, Function, ListLiteral, RecordLiteral } from "../Expr";
import { Return, VarDeclaration, While, Stmt, Block, Call as CallStmt, If, Break, Assign } from "../Stmt";
import { PrimitiveType } from "./PrimitiveType";
import { CError } from "./CompileError";
import { TokenType } from "../TokenType";
import { Token } from "../Token";
import { Type } from "./Type";
import { RecordType } from "./RecordType";
import { isList, capitalize, isNumber, isBoolean, isText, nextChar, isNil } from "../utils";
import { Env } from "./Environment";
import { ListType } from "./ListType";
import { FunctionType } from "./FunctionType";
import { AnyType } from "./AnyType";
import clone from "lodash.clone";
import { Scanner } from "../Tokenizer";
import { Parser } from "../Parser";
import { NilType } from "./NilType";
import { MaybeType } from "./MaybeType";

const NUMBER = PrimitiveType.Num;
const TEXT = PrimitiveType.Text;
const BOOLEAN = PrimitiveType.Bool;
const NIL = new NilType();

type Location = Token | Expr;

export class Checker implements Visitor {
    private env: Env;
    constructor(private runner: Runner) {
        // global environment
        const globals = this.newEnv();
        this.env = globals;
        this.declarePrimordials(globals);
        this.importModules(["List"], globals);
    }

    newEnv(enclosing?: Env) {
        return new Env(this, enclosing);
    }

    private importModules(moduleNames: string[], globals: Env) {
        moduleNames.forEach(name => {
            const moduleDeclaration = require("./" + name).default;
            globals.declarePrimordial(name, moduleDeclaration);
        });
    }

    private declarePrimordials(globals: Env) {
        const primordials = 
        `abs=      Num → Num
        fraction=  Num → Num
        integer=   Num → Num
        max=       Num → Num → Num
        min=       Num → Num → Num
        neg=       Num → Num
        not=       Bool → Bool
        print=     a → Text
        `;
        const types = Checker.parseTypeDeclarations(primordials);
        Object.entries(types).forEach(([name, type]) => 
            globals.declarePrimordial(name, type)
        );
    }

    public static parseTypeDeclarations(declarations) {
        const regex = /(.*)\s*\=\s*(.*)/g;
        let match: string[];
        let types: {name: string, type: Type} = Object.create(null);
        while ((match = regex.exec(declarations)) !== null) {
            const name = match[1].trim();
            const typeString = match[2];
            const runner = new Runner();
            runner.lineStarts = [];
            const scanner = new Scanner(typeString, runner);
            scanner.scan();
            const parser = new Parser(scanner.tokens, runner);
            parser.current = 0;
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

    expression(expr: Expr) {
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
            return NUMBER;
        }
        if (isNil(expr)) {
            return NIL;
        }
    }

    public matchTypes(a: Type, b: Type, message: string, location: Location) {
        if (!Checker.sameTypes(a, b)) {
            throw this.error(location, message);
        }
    }

    public static sameTypes(a: Type, b: Type): boolean {
        if (a === undefined || b === undefined) {
            return true;
        }
        if (a instanceof AnyType && b instanceof AnyType) {
            return a.name === b.name;
        }
        if (a instanceof NilType && b instanceof NilType) {
            return true;
        }
        if (a instanceof MaybeType && b instanceof MaybeType) {
            return Checker.sameTypes(a.type, b.type);
        } else if (a instanceof ListType && b instanceof ListType) {
            return Checker.sameTypes(a.type, b.type);
        } else if (a instanceof RecordType && b instanceof RecordType) {
            if (Object.keys(a.record).length !== Object.keys(b.record).length) {
                return false;
            }
            return Object.keys(a.record).every((key) => {
                if (b.record[key] === undefined) {
                    return false;
                }
                return Checker.sameTypes(a.record[key], b.record[key])
            });
        } else if (a instanceof FunctionType && b instanceof FunctionType) {
            return (
                Checker.sameTypes(a.inputType, b.inputType)
                && Checker.sameTypes(a.outputType, b.outputType)
            )
        } else if (a === b) {
            return true;
        }
        return false;
    }

    number(valueType: any, operand: Expr, name?: string) {
        return this.matchType(NUMBER, valueType, operand, name);
    }

    boolean(valueType: any, operand: Expr, name?: string) {
        return this.matchType(BOOLEAN, valueType, operand, name);
    }

    text(valueType: any, operand: Expr, name?: string) {
        return this.matchType(TEXT, valueType, operand, name);
    }

    matchType(target: Type, value: Type, operand: Expr, name = "operand") {
        if (value instanceof AnyType && operand instanceof Variable) {
            this.env.define(operand.name, target);
        } else {
            this.matchTypes(
                target,
                value,
                `${capitalize(name)} must be a ${target}, not ${value}!`,
                operand
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

    visitTernaryExpr(expr: Ternary) {
        this.boolean(this.expression(expr.condition), expr.condition, "condition");
        const trueBranch = this.expression(expr.trueBranch);
        const falseBranch = this.expression(expr.falseBranch);
        this.matchTypes(
            trueBranch, falseBranch,
            "Types in then and else branch do not match!",
            expr
        );
        return trueBranch;
    }
    visitBinaryExpr(expr: Binary) {
        const left = this.expression(expr.left);
        const right = this.expression(expr.right);

        // logical operators
        if (expr.operator.type === TokenType.AND ||
            expr.operator.type === TokenType.OR) {
            this.boolean(left, expr.left);
            this.boolean(right, expr.right);
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
                this.number(left, expr.left);
                this.number(right, expr.right);
                return NUMBER;
            
            case TokenType.AMPERSAND:
                this.text(left, expr.left);
                this.text(right, expr.right);
                return TEXT;

            // comparison operators
            case TokenType.GREATER:
            case TokenType.GREATER_EQUAL:
            case TokenType.LESS:
            case TokenType.LESS_EQUAL:
                try {
                    this.number(left, expr.left);
                    this.number(right, expr.right);
                } catch(ignore) {
                    try {
                        this.text(left, expr.left);
                        this.text(right, expr.left);
                    } catch(ignore) {
                        throw this.error(expr.operator, "Operands must be two numbers or two strings!");
                    }
                }
                return BOOLEAN;

            // equality operators
            case TokenType.EQUAL:
            case TokenType.NOT_EQUAL:
                if (!Checker.sameTypes(left, right)) {
                    throw this.error(expr.right, `Right operand typed ${right} does not match left operand typed ${left}!`);
                }
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
            } else {
                this.matchTypes(
                    type,
                    elementType,
                    `List elements must be the same types!\n${elementType} does not match ${type}!`,
                    element
                );
            }
        });
        return new ListType(type);
    }
    visitRecordLiteralExpr(expr: RecordLiteral) {
        return new RecordType(
            Object.keys(expr.record).reduce(
                (record, key) => ({
                    ...record, 
                    [key]: this.expression(expr.record[key])
                }),
                Object.create(null)
            )
        );
    }
    visitVariableExpr(expr: Variable) {
        return this.env.get(expr.name);
    }
    visitCallExpr(expr: Call) {
        let callee = this.expression(expr.callee);
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
                const funcName = expr.callee instanceof Get
                    ? expr.callee.object.first.lexeme + "~" + expr.callee.name.lexeme
                    : expr.callee.first.lexeme;
                throw this.error(
                    arg.first,
                    `Function '${funcName}' expects ${index} arguments but got ${argTypes.length} instead!`
                );
            }
            if (argType instanceof AnyType && arg instanceof Variable) {
                this.env.define(arg.name, paramType);
            } else {
                this.matchTypes(
                    paramType,
                    argType,
                    `Argument type ${argType} does not match paramter type ${paramType}!`,
                    arg
                );
            }
            callee = callee.outputType;
            if (callee instanceof FunctionType) {
                paramType = callee.inputType;
            } else {
                paramType = callee;
            }
        });
        return callee;
    }
    visitFunctionExpr(expr: Function) {
        const enclosing = this.env;
        this.env = this.newEnv(enclosing);
        this.env.functionName = enclosing.functionName;
        let char = "a";
        function generateAnyType() {
            const curr = char;
            const next = nextChar(curr);
            char = next;
            return new AnyType(curr);
        }
        expr.params.forEach((param) => {
            const paramType = generateAnyType();
            this.env.declare(param, paramType, false);
        });
        this.env.functionParams = expr.params;
        let outputType: Type = generateAnyType();
        if (expr.body instanceof Expr) {
            outputType = this.expression(expr.body);
        } else if (expr.body instanceof Block) {
            this.visitBlockStmt(expr.body);
            outputType = this.env.functionReturnType;
        }
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
        this.env.functionReturnType = undefined;
        this.env.functionName = undefined;
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
            throw this.error(name, `${object} does not have property ${name.lexeme}!`);
        }
    }

    visitBlockStmt(stmt: Block) {
        stmt.statements.forEach((stmt) => {
            this.statement(stmt);
        });
    }
    visitIfStmt(stmt: If) {
        this.boolean(this.expression(stmt.condition), stmt.condition);
        this.statement(stmt.thenBranch);
        if (stmt.elseBranch !== undefined) {
            this.statement(stmt.elseBranch);
        }
    }
    visitCallStmt(stmt: CallStmt) {
        this.expression(stmt.call);
    }
    visitWhileStmt(stmt: While) {
        this.boolean(this.expression(stmt.condition), stmt.condition);
        this.statement(stmt.body);
    }
    visitBreakStmt(stmt: Break) {
        // do nothing
        // checking if break is in loop is already done in parser
    }
    visitReturnStmt(stmt: Return) {
        const returnType = this.expression(stmt.value);
        if (this.env.functionReturnType === undefined) {
            this.env.functionReturnType = returnType;
        } else {
            this.matchTypes(
                this.env.functionReturnType,
                returnType,
                `Return type ${returnType} differs from previous type ${this.env.functionReturnType}!`,
                stmt.value
            );
        }
    }
    visitVarDeclarationStmt(stmt: VarDeclaration) {
        const mutable = stmt.typeModifier === TokenType.MUT;
        if (stmt.initializer instanceof Function) {
            this.env.functionName = stmt.name.lexeme;
        }
        let type = this.expression(stmt.initializer);
        const declaredType = stmt.typeDeclaration;
        if (stmt.typeDeclaration !== undefined) {
            this.matchTypes(
                declaredType, this.substituteAnyTypes(type, declaredType, {}),
                `Declared type ${declaredType} and actual type ${type} do not match!`,
                stmt.initializer
            );
        }
        if (stmt.initializer instanceof Function) {
            this.env.functionName = undefined;
        }
        this.env.declare(
            stmt.name,
            declaredType === undefined
                ? type
                : declaredType,
            mutable);
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
                        || Checker.sameTypes(storedType, actualType)
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

    visitAssignStmt(stmt: Assign) {
        let type = this.expression(stmt.value);
        this.env.define(stmt.name, type, stmt.value);
    }

}
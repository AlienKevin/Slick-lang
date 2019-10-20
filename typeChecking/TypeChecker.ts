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
import { isList, capitalize, isNumber, isBoolean, isText, nextChar } from "../utils";
import { Env } from "./Environment";
import { ListType } from "./ListType";
import { FunctionType } from "./FunctionType";
import { AnyType } from "./AnyType";
import clone from "lodash.clone";
import { Scanner } from "../Tokenizer";
import { Parser } from "../Parser";
import { NilType } from "./NilType";

const NUMBER = PrimitiveType.Num;
const TEXT = PrimitiveType.Text;
const BOOLEAN = PrimitiveType.Bool;

export class Checker implements Visitor {
    private env: Env;
    constructor(private runner: Runner) {
        // global environment
        const globals = new Env();
        this.env = globals;
        this.declarePrimordials(globals);
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
        print=     a → Nil
        `;
        const regex = /([a-zA-Z]+\??)\=\s*(.*)/g;
        let match: string[];
        while ((match = regex.exec(primordials)) !== null) {
            const name = match[1];
            const typeString = match[2];
            const runner = new Runner();
            runner.lineStarts = [];
            const scanner = new Scanner(typeString, runner);
            scanner.scan();
            const parser = new Parser(scanner.tokens, runner);
            parser.current = 0;
            const type = parser.typeDeclaration();
            globals.declarePrimordial(name, type);
        }
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
    }

    public static sameTypes(a: Type, b: Type, message: string, location: Expr | Token) {
        let hasError = false;
        if (a instanceof AnyType || b instanceof AnyType) {
            return;
        }
        if (a instanceof NilType && b instanceof NilType) {
            return;
        }
        if (a instanceof ListType && b instanceof ListType) {
            Checker.sameTypes(a.type, b.type, message, location);
        } else if (a instanceof RecordType && b instanceof RecordType) {
            if (Object.keys(a).length === Object.keys(b).length) {
                hasError = true;
            }
            Object.keys(a).every((key) =>
                Checker.sameTypes(a[key], b[key], message, location)
            )
        } else if (a instanceof FunctionType && b instanceof FunctionType) {
            Checker.sameTypes(a.inputType, b.inputType, message, location);
            Checker.sameTypes(a.outputType, b.outputType, message, location);
        } else if (a !== b) {
            hasError = true;
        }
        if (hasError) {
            throw new CError(
                (
                    location instanceof Expr
                    ? location.first
                    : location
                ), message
            );
        }
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
            Checker.sameTypes(
                target,
                value,
                `${capitalize(name)} must be a ${target}, not ${value}!`,
                operand
            );
        }
    }

    error(token: Token, message: string) {
        return new CError(token, message);
    }

    visitTernaryExpr(expr: Ternary) {
        this.boolean(this.expression(expr.condition), expr.condition, "condition");
        const trueBranch = this.expression(expr.trueBranch);
        const falseBranch = this.expression(expr.falseBranch);
        Checker.sameTypes(
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
                this.boolean(left, expr.left);
                this.boolean(right, expr.right);
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
                Checker.sameTypes(
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
            expr.keys,
            expr.values.map((value) => this.expression(value))
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
        argTypes.forEach((argType, index) => {
            const arg = expr.argumentList[index];
            if (!(callee instanceof FunctionType)) {
                const funcName = expr.callee.first.lexeme;
                throw this.error(
                    arg.first,
                    `Function '${funcName}' expects ${index} arguments but got ${argTypes.length} instead!`
                );
            }
            if (argType instanceof AnyType && arg instanceof Variable) {
                this.env.define(arg.name, paramType);
            } else {
                Checker.sameTypes(
                    paramType,
                    argType,
                    `Argument type ${argType} does not match paramter type ${paramType}!`,
                    expr.argumentList[0]
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
        this.env = new Env(this.env);
        let char = "a";
        function generateAnyType() {
            const curr = char;
            const next = nextChar(curr);
            char = next;
            return new AnyType(curr);
        }
        expr.params.forEach((param) => {
            this.env.declare(param, generateAnyType(), false);
        });
        let outputType: Type;
        if (expr.body instanceof Expr) {
            outputType = this.expression(expr.body);
        } else if (expr.body instanceof Block) {
            this.visitBlockStmt(expr.body);
            outputType = this.env.returnType;
        }
        const returnType = this.createFunctionType(
            [
                ...expr.params.map(param => this.env.get(param)),
                outputType
            ]
        );
        this.env = enclosing;
        return returnType;
    }

    createFunctionType(types: Type[]) {
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
            throw new CError(name, `${object} does not have property ${name.lexeme}!`);
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
        this.statement(stmt.elseBranch);
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
        if (this.env.returnType === undefined) {
            this.env.returnType = returnType;
        } else {
            Checker.sameTypes(
                this.env.returnType,
                returnType,
                `Return type ${returnType} differs from previous type ${this.env.returnType}!`,
                stmt.value
            );
        }
    }
    visitVarDeclarationStmt(stmt: VarDeclaration) {
        const mutable = stmt.typeModifier === TokenType.MUT;
        let type = this.expression(stmt.initializer);
        if (stmt.typeDeclaration !== undefined) {
            const declaredType = Checker.substituteAnyTypes(stmt.typeDeclaration, type);
            Checker.sameTypes(
                type, declaredType,
                `Declared type ${declaredType} and actual type ${type} do not match!`,
                stmt.initializer
            );
        }
        this.env.declare(stmt.name, type, mutable);
    }

    private static substituteAnyTypes(declaredType: Type, actualType: Type) {
        if (declaredType instanceof FunctionType && actualType instanceof FunctionType) {
            if (declaredType.inputType instanceof AnyType) {
                return Object.assign(
                    clone(declaredType),
                    {
                        inputType: actualType.inputType
                    },
                    {
                        outputType: this.substituteAnyTypes(
                            declaredType.outputType,
                            actualType.outputType
                        )
                    }
                );
            } else if (declaredType.inputType instanceof ListType
                && actualType.inputType instanceof ListType) {
                return Object.assign(
                    clone(declaredType),
                    {
                        inputType: Object.assign(
                            clone(declaredType.inputType),
                            {
                                type: this.substituteAnyTypes(
                                    declaredType.inputType.type,
                                    actualType.inputType.type
                                )
                            }
                        )
                    },
                    {
                        outputType: this.substituteAnyTypes(
                            declaredType.outputType,
                            actualType.outputType
                        )
                    }
                );
            } else if (declaredType.inputType instanceof FunctionType) {
                return this.substituteAnyTypes(
                    Object.assign(
                        clone(declaredType),
                        {
                            inputType: this.substituteAnyTypes(
                                declaredType.inputType,
                                actualType.inputType
                            )
                        },
                        {
                            outputType: this.substituteAnyTypes(
                                declaredType.outputType,
                                actualType.outputType
                            )
                        }
                    ),
                    actualType.outputType
                );
            }
        } else if (declaredType instanceof AnyType) {
            return actualType;
        }
        return declaredType;
    }

    visitAssignStmt(stmt: Assign) {
        let type = this.expression(stmt.value);
        this.env.define(stmt.name, type, stmt.value);
    }

}
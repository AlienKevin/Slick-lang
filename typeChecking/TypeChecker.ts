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
import { isList, capitalize, isNumber, isBoolean, isText } from "../utils";
import { Env } from "./Environment";
import { ListType } from "./ListType";
import { FunctionType } from "./FunctionType";

const NUMBER = PrimitiveType.Num;
const TEXT = PrimitiveType.Text;
const BOOLEAN = PrimitiveType.Bool;

export class Checker implements Visitor {
    private env: Env;
    constructor(private runner: Runner) {
        // global environment
        const globals = new Env();
        this.env = globals;

    }

    private primordialGenerator() {
        const primordials = 
        `abs=      Num → Num
        fraction=  Num → Num
        integer=   Num → Num
        print=     a → Nil`;
        const regex = /([a-zA-Z]+\??)\=\s*(.*)→(.+)/g;
        let match: string[];
        while ((match = regex.exec(primordials)) !== null) {
            const name = match[1];
            const params = match[2].split("→").map((param) => param.trim());
            const result = match[3];
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
        if (a === undefined || b === undefined) {
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
        Checker.sameTypes(
            target,
            value,
            `${capitalize(name)} must be a ${target}!`,
            operand
        )
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
        const callee = this.expression(expr.callee);
        if (!(callee instanceof Function)) {
            throw this.error(expr.paren, `Callee must be a function!`);
        }
        // create a temporary function environment for this call
        const enclosing = this.env;
        this.env = new Env(this.env);
        expr.argumentList.forEach((arg, index) => {
            const param = callee.params[index];
            const name = param;
            const mutable = false;
            const type = this.expression(arg);
            this.env.declare(name, type, mutable);
        });

        // execute function body
        this.statement(callee.body);

        // pop off function call environment
        this.env = enclosing;
        return this.env.returnType;
    }
    visitFunctionExpr(expr: Function) {
        return expr;
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
        const declaredType = stmt.typeDeclaration;
        if (declaredType !== undefined) {
            Checker.sameTypes(
                type, declaredType,
                `Declared type ${declaredType} and actual type ${type} do not match!`,
                stmt.initializer
            );
        }
        this.env.declare(stmt.name, type, mutable);
    }
    visitAssignStmt(stmt: Assign) {
        let type = this.expression(stmt.value);
        this.env.define(stmt.name, stmt.value, type);
    }

}
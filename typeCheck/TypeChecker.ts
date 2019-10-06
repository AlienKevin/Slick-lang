import { Visitor } from "../interfaces/Visitor";
import { Runner } from "../Runner";
import { Ternary, Binary, Expr, Set, Get, Call, Unary, Literal, Grouping, Variable, Function } from "../Expr";
import { Return, VarDeclaration, While, Stmt, Block, Call as CallStmt, If, Break, Assign } from "../Stmt";
import { PrimitiveType } from "./PrimitiveType";
import { CError } from "./CompileError";
import Decimal from "decimal.js";
import { TokenType } from "../TokenType";
import { Token } from "../Token";
import { Type } from "./Type";
import { CompoundType } from "./CompoundType";
import { RecordType } from "./RecordType";
import { ListType } from "./ListType";
import { isList, capitalize } from "../utils";
import { Env } from "./Environment";

const NUMBER = PrimitiveType.NUMBER;
const TEXT = PrimitiveType.TEXT;
const BOOLEAN = PrimitiveType.BOOLEAN;

export class TypeChecker implements Visitor {
    private env;
    constructor(private runner: Runner) {
        // global environment
        const globals = new Env();
        this.env = globals;

    }

    private primordialGenerator() {
        const primordials = 
        `abs:      number => number

        list:      [], number?, number? => []

        list?:     any  => boolean

        boolean?:  any => boolean

        fraction:  number => number

        function?: any => boolean

        integer:   number => number

        integer?:  any => boolean
        
        length:    text=> number
        length:    []  => number
        length:    {}  => number
        
        number:    text => number
        
        number?:   any => boolean

        print:     any => void
        
        record:    [], [] => {}

        record:    {}, text[]? => {}

        record:    void => {}
        
        record?:   any => boolean

        stone:     any => any

        stone?:    any => boolean
        
        text:      number => text
        text:      [], text => text
        text:      text, number, number? => text
        
        text?:     any => boolean`;
        const regex = /([a-zA-Z]+\??):\s*(.*)\=\>(.+)/g;
        let match: string[];
        while ((match = regex.exec(primordials)) !== null) {
            const name = match[1];
            const params = match[2].split(",").map((param) => param.trim());
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
        if (typeof expr === "string") {
            return TEXT;
        }
        if (typeof expr === "boolean") {
            return BOOLEAN;
        }
        if (expr instanceof Decimal) {
            return NUMBER;
        }
        if (isList(expr)) {
            return new CompoundType(expr[0]);
        }
    }

    number(value: any, operator: Token, name?: string) {
        return this.matchTypeValue(NUMBER, value, operator, name);
    }

    boolean(value: any, operator: Token, name?: string) {
        return this.matchTypeValue(BOOLEAN, value, operator, name);
    }

    text(value: any, operator: Token, name?: string) {
        return this.matchTypeValue(TEXT, value, operator, name);
    }

    matchTypeValue(type: Type, value: any, operator: Token, name = "operand") {
        if (this.type(value) === type) {
            return type;
        }
        throw this.error(operator, `${capitalize(name)} must be a ${type}!`);
    }

    public static match(type1: Type, type2: Type) {
        // TODO: compare functions, records, and lists
        return type1 === type2;
    }

    error(token: Token, message: string) {
        return new CError(token, message);
    }

    visitTernaryExpr(expr: Ternary) {
        this.boolean(expr.condition, expr.questionMark, "condition");
        const trueBranch = this.expression(expr.trueBranch);
        const falseBranch = this.expression(expr.falseBranch);
        return new CompoundType(trueBranch, falseBranch);
    }
    visitBinaryExpr(expr: Binary) {
        const left = this.expression(expr.left);
        const right = this.expression(expr.right);

        // logical operators (short circuit evaluation)
        if (expr.operator.type === TokenType.AND ||
            expr.operator.type === TokenType.OR) {
            this.boolean(left, expr.operator);
            this.boolean(right, expr.operator);
            // TODO: short-circuit evaluation can yield two possible types
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
                this.number(left, expr.operator);
                this.number(right, expr.operator);
                return NUMBER;

            // comparison operators
            case TokenType.GREATER:
            case TokenType.GREATER_EQUAL:
            case TokenType.LESS:
            case TokenType.LESS_EQUAL:
                try {
                    this.number(left, expr.operator);
                    this.number(right, expr.operator);
                } catch(ignore) {
                    try {
                        this.text(left, expr.operator);
                        this.text(right, expr.operator);
                    } catch(ignore) {
                        throw this.error(expr.operator, "Operands must be two numbers or two strings!");
                    }
                }
                return BOOLEAN;

            // equality operators
            case TokenType.EQUAL:
            case TokenType.NOT_EQUAL:
                this.boolean(left, expr.operator);
                this.boolean(right, expr.operator);
                return BOOLEAN;
        }
    }
    visitGroupingExpr(expr: Grouping) {
        return this.type(expr.expression);
    }
    visitLiteralExpr(expr: Literal) {
        return this.type(expr);
    }
    visitUnaryExpr(expr: Unary) {
        const right = this.expression(expr.right);

        switch (expr.operator.type) {
            case TokenType.MINUS:
                return this.number(right, expr.operator);
            case TokenType.BANG:
                return this.boolean(right, expr.operator);
        }
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
            const name = param.name;
            const mutable = param.mutable;
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
        if (expr.name instanceof Token) {
            const name = expr.name;
            if (object instanceof RecordType) {
                return object.get(name);
            } else {
                throw new CError(name, `${object} does not have property ${name.lexeme}!`);
            }
        } else if (expr.name instanceof Expr) {
            const name = this.expression(expr.name);
            if (object instanceof ListType) {
                if (name !== NUMBER) {
                    throw this.error(name, `${object} does not have property of type ${name}`);
                }
                return object.type;
            }
        }
    }
    visitSetExpr(expr: Set) {
        const object = this.expression(expr.object);
        const value = this.expression(expr.value);
        if (expr.name instanceof Token) {
            const name = expr.name;
            if (object instanceof RecordType) {
                object.set(name, value);
            } else {
                throw new CError(name, `${object} does not have property ${name.lexeme}!`);
            }
        } else if (expr.name instanceof Expr) {
            const name = this.expression(expr.name);
            if (object instanceof ListType) {
                if (name !== NUMBER) {
                    throw this.error(name, `${object} does not have property of type ${name}`);
                }
                if (TypeChecker.match(object.type, value)) {
                    throw this.error(name, `Cannot set value of type ${value} in ${object}!`);
                }
            }
        }
    }

    visitBlockStmt(stmt: Block) {
        stmt.statements.forEach((stmt) => {
            this.statement(stmt);
        });
    }
    visitIfStmt(stmt: If) {
        this.boolean(this.expression(stmt.condition));
        this.statement(stmt.thenBranch);
        this.statement(stmt.elseBranch);
    }
    visitCallStmt(stmt: Stmt) {
        throw new Error("Method not implemented.");
    }
    visitWhileStmt(stmt: While) {
        this.boolean(this.expression(stmt.condition));
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
        } else if (!TypeChecker.match(this.env.returnType, returnType)){
            throw this.error(stmt.keyword, `Return type ${returnType} differs from previous type ${this.env.returnType}!`);
        }
    }
    visitVarDeclarationStmt(stmt: VarDeclaration) {
        const mutable = stmt.typeModifier === TokenType.MUT;
        let type = this.expression(stmt.initializer);
        this.env.declare(stmt.name, type, mutable);
    }
    visitAssignStmt(stmt: Assign) {
        let type = this.expression(stmt.value);
        this.env.define(stmt.name, type);
    }

}
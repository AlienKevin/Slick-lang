import { Type } from "./Type";
import { Token } from "../Token";
import { CError } from "./CompileError";
import { Checker } from "./TypeChecker";
import { Expr } from "../Expr";

interface Value {
    mutable: boolean,
    type: Type
}

export class Env {
    private values: { [name: string]: Value } = Object.create(null);
    public returnType: Type;
    constructor(readonly checker: Checker, readonly enclosing?: Env) {}

    get(nameToken: Token) {
        const name = nameToken.lexeme;
        if (this.isDeclared(name)) {
            return this.values[name].type;
        }
        if (this.enclosing !== undefined) {
            return this.enclosing.get(nameToken);
        }
    }

    declare(nameToken: Token, type: Type, mutable: boolean) {
        const name = nameToken.lexeme;
        this.values[name] = {
            "mutable": mutable,
            "type": type
        }
    }

    declarePrimordial(name: string, type: Type) {
        this.values[name] = {
            "mutable": false,
            "type": type
        }
    }

    isDeclared(name: string) {
        return this.values[name] !== undefined;
    }

    define(nameToken: Token, type: Type, value?: Expr) {
        const name = nameToken.lexeme;
        if (this.isDeclared(name)) {
            if (value === undefined) {
                this.values[name].type = type;
            } else if (this.values[name].mutable) {
                const declaredType = this.values[name].type;
                this.checker.matchTypes(
                    declaredType,
                    type,
                    `Value of type ${type} does not match declared type ${declaredType}`,
                    value
                );
            } else {
                throw new CError(nameToken, `Immutable variable '${name}' can not be reassigned!`);
            }
        }
        if (this.enclosing !== undefined) {
            this.enclosing.define(nameToken, type, value);
            return;
        }
    }
}
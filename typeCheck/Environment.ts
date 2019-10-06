import { Type } from "./Type";
import { Token } from "../Token";
import { CError } from "./CompileError";

interface Value {
    mutable: boolean,
    type: Type
}

export class Env {
    private values: { [name: string]: Value } = Object.create(null);
    public returnType: Type;
    constructor(public enclosing?: Env) {}

    get(nameToken: Token) {
        const name = nameToken.lexeme;
        if (this.isDeclared(name)) {
            return this.values[name].type;
        }
        if (this.enclosing !== undefined) {
            return this.enclosing.get(nameToken);
        }
        throw new CError(nameToken, `Variable '${name}' is not declared!`);
    }

    isDeclared(name: string) {
        return this.values[name] !== undefined;
    }

    declare(nameToken: Token, type: Type, mutable: boolean) {
        const name = nameToken.lexeme;
        if (this.isDeclared(name)) {
            throw new CError(nameToken, `Duplicated declaration of '${name}'!`);
        } else {
            this.values[name] = {
                "mutable": mutable,
                "type": type
            }
        }
    }

    define(nameToken: Token, type: Type) {
        const name = nameToken.lexeme;
        if (this.isDeclared(name)) {
            if (this.values[name].mutable) {
                this.values[name].type = type;
            } else {
                throw new CError(nameToken, `Immutable variable '${name}' can not be reassigned!`);
            }
        }
        if (this.enclosing !== undefined) {
            this.enclosing.define(nameToken, type);
            return;
        }
        if (!this.isDeclared(name)) {
            throw new CError(nameToken, `Variable '${name}' is not declared!`);
        }
    }
}
import { Token } from "./Token";

interface Value {
    mutable: boolean,
    read: boolean
}

export class Environment {
    private values: { [name: string]: Value } = Object.create(null);
    constructor(private error: Function, private enclosing?: Environment) {}

    lookup(nameToken: Token): boolean {
        const name = nameToken.lexeme;
        if (this.isDeclared(name)) {
            return true;
        }
        if (this.enclosing !== undefined) {
            return this.enclosing.lookup(nameToken);
        }
        return false;
    }

    isDeclared(name: string) {
        return this.values[name] !== undefined;
    }

    declarePrimordial(name: string) {
        this.values[name] = {
            "mutable": false,
            "read": true
        }
    }

    declare(nameToken: Token, mutable: boolean) {
        const name = nameToken.lexeme;
        if (this.isDeclared(name)) {
            throw this.error(nameToken, `Duplicated declaration of '${name}'!`);
        } else {
            this.values[name] = {
                "mutable": mutable,
                "read": false
            }
        }
    }

    undeclare(nameToken: Token) {
        delete this.values[nameToken.lexeme];
    }

}
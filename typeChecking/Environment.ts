import { Type } from "./Type";
import { Token } from "../Token";
import { CError } from "./CompileError";
import { Checker } from "./TypeChecker";
import { Expr } from "../Expr";
import { CustomType } from "./CustomType";
import { RecordType } from "./RecordType";

interface Value {
    mutable: boolean,
    type: Type
}

type Subtypes = {[name: string] : RecordType};

export class Env {
    private values: { [name: string]: Value } = Object.create(null);
    // current function
    public functionParams: Token[];
    public functionReturnType: Type;
    public functionName: string;
    public customTypes : {[name: string] : Subtypes} = Object.create(null);
    constructor(readonly checker: Checker, readonly enclosing?: Env) {}

    getSubtypes(name: string) : Subtypes {
        if (this.customTypes[name] !== undefined) {
            return this.customTypes[name];
        }
        if (this.enclosing !== undefined) {
            return this.enclosing.getSubtypes(name);
        }
        return undefined;
    }

    declareCustomType(name: string, subtypes: Subtypes) {
        this.customTypes[name] = subtypes;
    }

    get(nameToken: Token): Type {
        const name = nameToken.lexeme;
        if (name === this.functionName) {
            if (this.functionReturnType === undefined) {
                throw new CError(nameToken, `Cannot make recursive calls to function '${name}' before returning concrete values!`);
            }
            const functionParamTypes = this.functionParams.map((param) =>
                this.get(param)
            );
            return Checker.createFunctionType([
                ...functionParamTypes,
                this.functionReturnType
            ]);
        }
        if (this.isDeclared(name)) {
            return this.values[name].type;
        }
        if (this.enclosing !== undefined) {
            return this.enclosing.get(nameToken);
        }
    }

    declare(nameToken: Token | string, type: Type, mutable: boolean) {
        const name = nameToken instanceof Token ? nameToken.lexeme : nameToken;
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
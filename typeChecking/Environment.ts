import { Type } from "./Type";
import { Token } from "../Token";
import { CError } from "./CompileError";
import { Checker } from "./TypeChecker";
import { Expr } from "../Expr";
import { AnyType } from "./AnyType";
import { CustomType } from "./CustomType";

interface Value {
    mutable: boolean,
    type: Type
}

type Subtypes = {[name: string] : Type};

export class Env {
    private values: { [name: string]: Value } = Object.create(null);
    // current function
    public functionParams: Token[];
    public functionName: string;
    public customTypesWithSubtypes : {[name: string] : Subtypes} = Object.create(null);
    private customTypes : {[name: string]: CustomType} = Object.create(null);
    constructor(readonly checker: Checker, readonly enclosing?: Env) {}

    getSubtypes(name: string) : Subtypes {
        if (this.customTypesWithSubtypes[name] !== undefined) {
            return this.customTypesWithSubtypes[name];
        }
        if (this.enclosing !== undefined) {
            return this.enclosing.getSubtypes(name);
        }
        return undefined;
    }

    getCustomType(subtypeName: string): CustomType {
        const customType = Object.entries(this.customTypesWithSubtypes).find(([customTypeName, subtypes]) =>
            Object.keys(subtypes).includes(subtypeName)
        );
        if (customType === undefined) {
            return (
                this.enclosing !== undefined
                ? this.enclosing.getCustomType(subtypeName)
                : undefined
            );
        } else {
            const customTypeName = customType[0]
            return this.customTypes[customTypeName];
        }
    }

    declareCustomType(name: string, subtypes: Subtypes, customType: CustomType) {
        this.customTypesWithSubtypes[name] = subtypes;
        this.customTypes[name] = customType;
    }

    get(nameToken: Token): Type {
        const name = nameToken.lexeme;
        if (name === this.functionName) {
            const functionParamTypes = this.functionParams.map((param) =>
                this.get(param)
            );
            return Checker.createFunctionType([
                ...functionParamTypes,
                undefined
            ]);
        }
        if (this.isDeclared(name)) {
            return this.values[name].type;
        }
        if (this.enclosing !== undefined) {
            return this.enclosing.get(nameToken);
        }
    }

    substituteAnyType(anyType: AnyType, substituteType: CustomType) {
        this.values = Object.entries(this.values).reduce((newValues, [name, value]) => {
            return {
                ...newValues,
                [name]: {
                    ...value,
                    type: this.checker.substituteReturnType(value.type, {[anyType.name]: substituteType})
                }
            }
        }, Object.create(null));
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

    undeclare(nameToken: Token) {
        delete this.values[nameToken.lexeme];
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
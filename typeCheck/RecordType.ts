import { Token } from "../Token";
import { Type } from "./Type";
import { CError } from "./CompileError";
import { TypeChecker } from "./TypeChecker";

export class RecordType {
    // TODO: add map which is a Type mapped to a Type
    // unlike a record which is a label string mapped to a Type
    private record: {[name: string]: Type};
    constructor(record?: object) {
        this.record = Object.create(null);
        if (record !== undefined) {
            Object.entries(record).forEach(([key, value]) => 
                this.record[key] = value
            );
        }
    }

    get(name: Token) {
        if (this.record[name.lexeme] === undefined) {
            throw new CError(name, `Key ${name.lexeme} does not exist in record!`);
        } else {
            return this.record[name.lexeme];
        }
    }

    set(nameToken: Token, value: Type) {
        const name = nameToken.lexeme;
        const stored = this.record[name];
        if (stored !== undefined) {
            if (TypeChecker.match(stored, value)) {
                this.record[name] = value;
            } else {
                throw new CError(nameToken, `Cannot change ${name}'s type from ${stored} to ${value}!`);
            }
        } else {
            this.record[name] = value;
        }
    }
}
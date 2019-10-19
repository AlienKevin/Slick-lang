import { Token } from "../Token";
import { Type } from "./Type";
import { CError } from "./CompileError";

export class RecordType {
    private record: {[name: string]: Type};
    constructor(keys: string[], values: Type[]) {
        this.record = Object.create(null);
        if (keys !== undefined) {
            keys.forEach((key, index) => 
                this.record[key] = values[index]
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
}
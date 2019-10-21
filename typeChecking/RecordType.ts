import { Token } from "../Token";
import { Type } from "./Type";
import { CError } from "./CompileError";

export class RecordType {
    constructor(readonly record: {[name: string]: Type}) {}

    get(name: Token) {
        if (this.record[name.lexeme] === undefined) {
            throw new CError(name, `Key ${name.lexeme} does not exist in record!`);
        } else {
            return this.record[name.lexeme];
        }
    }

    toString() {
        let linebreak = "";
        let padding = "";
        return (
            "{" + linebreak
            + Object.entries(this.record).map(([key, value]) => 
                padding + key + ": " + value
            ).join(linebreak)
            + linebreak
            + "}"
        );
    }
}
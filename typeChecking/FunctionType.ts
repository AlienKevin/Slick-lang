import { Type } from "./Type";
import { nextChar } from "../utils";

let char = "a";

export class FunctionType {
    constructor(readonly inputType: Type, readonly outputType: Type) {}

    toString() {
        function handleGenericType(type: Type) {
            if (type === undefined) {
                const curr = char;
                const next = nextChar(curr);
                char = next;
                return curr;
            }
            return type;
        }
        const string = handleGenericType(this.inputType) + " → "
            + handleGenericType(this.outputType);
        char = "a";
        return string;
    }

}
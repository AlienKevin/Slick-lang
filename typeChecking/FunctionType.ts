import { Type } from "./Type";

export class FunctionType {
    constructor(readonly inputType: Type, readonly outputType: Type) {}

    toString() {
        return this.inputType + " → " + this.outputType;
    }

}
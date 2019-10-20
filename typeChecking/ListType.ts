import { Type } from "./Type";

export class ListType {
    constructor(readonly type: Type) {}

    toString() {
        return "List " + this.type;
    }
}
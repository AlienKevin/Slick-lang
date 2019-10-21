import { Type } from "./Type";

export class MaybeType {
    constructor(readonly type: Type) {}

    toString() {
        return `Maybe ${this.type}`;
    }

}
import { Type } from "./Type";

export class CompoundType {
    public types: Type[];
    constructor(...types: Type[]) {
        this.types = types;
    }

    toString() {
        return this.types.join(" | ");
    }
}
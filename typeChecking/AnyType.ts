import { Type } from "./Type";

export class AnyType {
    constructor(readonly name: string, public types: Type[] = [], readonly anyTypes: AnyType[] = []) {}

    toString() {
        return this.name;
    }
}
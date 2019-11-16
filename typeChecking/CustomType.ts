import { Type } from "./Type";

export class CustomType {
    constructor(readonly name: string, readonly typeParameters: {[key: string]: Type}, readonly parameters?: {[key: string]: any}) {}

    toString() {
        return (
            this.name
            + (
                this.typeParameters === undefined
                ? ""
                : " " + Object.values(this.typeParameters).join(" ")
            )
        );
    }
}
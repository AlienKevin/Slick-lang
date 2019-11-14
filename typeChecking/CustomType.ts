import { Type } from "./Type";

export class CustomType {
    constructor(readonly name: string, readonly typeParameters: Type[] = [], readonly parameters?: {[key: string]: any}) {}

    toString() {
        return (
            this.name
            + (
                this.typeParameters === undefined
                ? ""
                : " " + this.typeParameters.join(" ")
            )
        );
    }
}
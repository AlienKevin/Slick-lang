export class CustomType {
    constructor(readonly name: string, readonly parameters?: {[key: string]: any}) {}

    toString() {
        return this.name;
    }
}
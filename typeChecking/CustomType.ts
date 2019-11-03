export class CustomType {
    constructor(readonly name: string) {}

    toString() {
        return this.name;
    }
}
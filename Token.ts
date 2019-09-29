import { TokenType } from "./TokenType";

export class Token {
    constructor(
        public type: TokenType, 
        public lexeme: string,
        public literal: object,
        public line: number,
        public index: number) {
    }

    toString() {
        return `${this.type}: "${this.lexeme}", ${this.literal !== undefined ?
             this.literal.toString() : "undefined"}`;
    }

}
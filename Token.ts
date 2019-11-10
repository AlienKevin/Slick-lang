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
        return this.lexeme;
    }

}
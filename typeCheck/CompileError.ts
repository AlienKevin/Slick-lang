import { Token } from "../Token";

// CError stands for CompileError
export class CError extends Error {
    constructor(public token: Token, public errorMessage: string) {
        super(errorMessage);
    }
    toString() {
        return `[CompileError] Line ${this.token.line} at '${this.token.lexeme}': ${this.message}`;
    }
}
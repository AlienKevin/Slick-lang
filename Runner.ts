import {Scanner} from "./Tokenizer";
import { Token } from "./Token";
import AsciiTable from "ascii-table";

export class Runner {
    public hadError = false;
    public lineStarts: number[];
    private source: string;

    constructor(readonly detailedError = false, public input?: (prompt: string) => string, public output = console["log"]) {}

    run(source: string) {
        this.source = source;
        this.lineStarts = [];
        const scanner = new Scanner(source, this);
        scanner.scan();
        const table = new AsciiTable();
        table.setHeading("Type", "Lexeme", "Literal", "Line");
        scanner.tokens.forEach((token) => {
            let lexeme = token.lexeme;
            if (token.lexeme.indexOf("\n") >= 0) { // don't print line break in table
                lexeme = token.lexeme.replace(/\n/g, "\\n");
            }
            table.addRow(token.type, lexeme, token.literal, token.line);
        });
        console.log(table.toString());
    }

    error(line: string, lineNumer: number, index: number, message: string): void;
    error(token: Token, message: string, errorType: string, isError?: boolean): void;
    error(a : string | Token, b: number | string, c: number | string, d?: string | boolean): void {
        let output = "";
        // syntax errors from tokenizer
        if (typeof a === "string") {
            this.hadError = true;
            const line = a as string;
            const lineNumber = b as number;
            const index = c as number;
            const message = d as string;
            if (this.detailedError) {
                this.printErrorMessage(line, lineNumber, index, message);
            } else {
                output = `[SyntaxError] Line ${lineNumber}: ${message}`;
            }
        }
        this.output(output);
    }
    
    private printErrorMessage(line: string, lineNumber: number, index: number, message: string) {
        let output = `SyntaxError: ${message}\n\n\t${lineNumber} | ${line}\n`;
        output += `\t${" ".repeat(lineNumber.toString().length + " | ".length) + 
        line.substring(0, index).split("").map((ch) => ch === "\t" ? "\t" : " ").join("") }^`;
        this.output(output);
    }

}

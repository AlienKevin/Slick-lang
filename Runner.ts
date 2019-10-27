import {Scanner} from "./Tokenizer";
import {CodeGenerator} from "./CodeGenerator";
import { Token } from "./Token";
import { Parser } from "./Parser";
import { Checker } from "./typeChecking/TypeChecker";

export class Runner {
    public hadError = false;
    public lineStarts: number[];
    private source: string;

    constructor(readonly detailedError = false, public input?: (prompt: string) => string, public output = console["log"]) {}

    run(source: string, options = {
        printTokenList: false,
        runCode: true
        }) {
        this.source = source;
        this.lineStarts = [];

        // scann
        const scanner = new Scanner(source, this);
        scanner.scan();

        // display token list
        if (options.printTokenList) {
            const AsciiTable = require("ascii-table");
            const table = new AsciiTable();
            table.setHeading("Type", "Lexeme", "Literal", "Line", "Index");
            scanner.tokens.forEach((token) => {
                let lexeme = token.lexeme;
                if (token.lexeme.indexOf("\n") >= 0) { // don't print line break in table
                    lexeme = token.lexeme.replace(/\n/g, "\\n");
                }
                table.addRow(token.type, lexeme, token.literal, token.line, token.index);
            });
            console.log(table.toString());
        }

        // parse
        const parser = new Parser(scanner.tokens, this);
        const statements = parser.parse();

        if (this.hadError) {
            // reset back to default!!!
            this.hadError = false;
            return;
        }

        // check type
        const typeChecker = new Checker(this);
        typeChecker.checkType(statements);

        if (this.hadError) {
            // reset back to default!!!
            this.hadError = false;
            return;
        }

        // generate code
        const code = new CodeGenerator().generateCode(statements, options.runCode);
        if (options.runCode) {
            // fs.writeFileSync("./tests/dist.js", code);
            eval(code);
        } else {
            this.output(code);
        }
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
        } else { // errors from parser or typechecker
            const nameToken = a as Token;
            const message = b as string;
            if (nameToken === null) {
                output = `[CompileError]: ${message}`;
            } else {
                const errorType = c as string;
                const isError = (d as boolean) === undefined ? true : d;
                if (isError) {
                    this.hadError = true;
                }
                if (this.detailedError) {
                    const programIndex = nameToken.index;
                    const [line, lineIndex] = this.getLocation(programIndex);
                    const lineNumber = nameToken.line;
                    this.printErrorMessage(line, lineNumber, lineIndex, message);
                } else {
                    if (nameToken.type === TokenType.EOF) { // End of file
                        output = `[SyntaxError] At end of file: ${message}`;
                    } else {
                        switch (nameToken.type) {
                            case TokenType.INDENT:
                                output = `[SyntaxError] Unexpected indentation at line ${nameToken.line}: ${message}`;
                                break;
                            case TokenType.DEDENT:
                                output = `[SyntaxError] Unexpected dedentation at line ${nameToken.line}: ${message}`;
                                break;
                            default:
                                output = `[SyntaxError] Line ${nameToken.line} at '${nameToken.lexeme.replace(/\n/g, "\\n")}': ${message}`;
                        }
                    }
                }
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

    private getLocation(position: number, startIndex = 0, endIndex = this.lineStarts.length): [string, number] {
            const start = this.lineStarts[startIndex];
            const end = this.lineStarts[endIndex];
            if (endIndex === startIndex + 1 && start < position) {
                return [this.source.substring(start, end).replace(/\n$/, ""), position - start];
            }
            if (startIndex === endIndex) {
                if (end === undefined){
                    return [this.source.substring(start, end).replace(/\n$/, ""), position - start];
                } else {
                    return [this.source.substring(end, this.lineStarts[endIndex + 1] - 1), position - end];
                }
            }
            // get the middle of the array of line start indexes
            const middleIndex = Math.floor((startIndex + endIndex) / 2);
            const middle = this.lineStarts[middleIndex];
            if (middle < position) {
                return this.getLocation(position, middleIndex, endIndex);
            } else if (middle > position) {
                return this.getLocation(position, startIndex, middleIndex);
            } else {
                const next = this.lineStarts[middleIndex + 1];
                let end = next - 1;
                if (next === this.source.length) { // end of line is the end of file
                    end = next;
                }
                return [this.source.substring(middle, end), next === undefined ? position : position - middle];
            }
        }

}

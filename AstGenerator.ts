const fs = require('fs');

const stmtDescriptions = {
    "Block": ["statements: Stmt[]"],
    "If": ["condition: Expr", "thenBranch: Block", "elseBranch: Block"],
    "Call": ["call: CallExpr"],
    "Return": ["keyword: Token", "value: Expr"],
    "VarDeclaration": ["name: Token", "initializer: Expr", "typeModifier: TokenType", "typeDeclaration?: Type"],
    "Assign": ["name: Token", "value: Expr"],
    "CustomTypeDeclaration": ["name: Token", "subtypes: {[name: string] : Type}"]
};

const exprDescriptions = {
    "Ternary": ["condition: Expr", "questionMark: Token", "trueBranch: Expr", "falseBranch: Expr"],
    "Binary": ["left: Expr", "operator: Token", "right: Expr"],
    "Grouping": ["first: Token", "expression: Expr"],
    "Literal": ["first: Token", "value: any"],
    "Variable": ["name: Token"],
    "Call": ["callee: Expr", "paren: Token", "argumentList: Expr[]"],
    "ListLiteral": ["first: Token", "list: Expr[]"],
    "RecordLiteral": ["first: Token", "record: {[name: string]: Expr}", "keyTokens: {[name: string]: Token}", "target: Variable | Get"],
    "Function": ["first: Token", "params: Token[]", "body: Block | Expr"],
    "Get": ["object: Expr", "name: Token", "bracket?: Token"],
    "Case": ["first: Token", "expr: Expr", "cases: {subtype: Token | Literal, parameters: Token[], isRecord: boolean, result: Expr}[]"]
};

function createExpr() {
    const filePath = "./Expr.ts";
    // descriptions of all operands of different types
    const descriptions: {[exprType: string]: string[]} = exprDescriptions;
    const parentClassName = "Expr";
    const imports = 
`import {Token} from "./Token"
import {Block} from "./Stmt";\n`;
    createAst(filePath, parentClassName, descriptions, imports);
}

function createStmt() {
    const filePath = "./Stmt.ts";
    const descriptions: {[stmtType: string]: string[]} = stmtDescriptions;
    const parentClassName = "Stmt";
    const imports =  
`import {Expr, Variable, Call as CallExpr} from "./Expr";
import { TokenType } from "./TokenType";
import { Token } from "./Token";
import { Type } from "./typeChecking/Type";
import { RecordType } from "./typeChecking/RecordType";\n`
    createAst(filePath, parentClassName, descriptions, imports);
}

function createAst(filePath: string, parentClassName: string, descriptions: {[stmtType: string]: string[]}, imports = "") {
    // import Visitor interface
    let astClasses = `import {Visitor} from "./interfaces/Visitor";\n`;

    // add custom imports
    astClasses += imports;

    // add parent class
    astClasses += 
`export abstract class ${parentClassName} {
    abstract accept(visitor: Visitor): any;\n`
    + (
        parentClassName === "Expr"
        ? "\tconstructor (readonly first: Token) {}\n"
        : ""
    )
    + `}\n`;

    // add inherited classes
    Object.entries(descriptions).forEach(([type, operands]) => {
        astClasses += `export class ${type} extends ${parentClassName} {\n`
        + `\tconstructor(`
        + operands.map((operand) => {
            const modifier = (
                operand.startsWith("first")
                ? ""
                : "public "
            );
            return modifier + operand;
        }).join(", ")
        + `) {\n`
        + `\t\tsuper(`
        + (
            parentClassName === "Expr"
            ? (
                // special case 'name' property is the first token
                type === "Variable"
                ? "name"
                : (
                    operands[0].startsWith("first")
                    ? "first"
                    : operands[0].substring(0, operands[0].indexOf(":")) + ".first"
                )
            )
            : ""
        )
        + `);\n`
        + `\t}\n`
        + `\taccept(visitor: Visitor) {\n`
        + `\t\treturn visitor.visit${type}${parentClassName}(this);\n`
        + `\t}\n`
        + (
            parentClassName === "Expr"
            ? `\ttoString() {\n`
                + `\t\treturn "${type} expression"\n`
                + `\t}\n`
            : ""
        )
        + `}\n`;
    });

    fs.writeFileSync(filePath, astClasses);
}

function createVisitor() {
    const visitorFilePath: string = `./interfaces/Visitor.ts`;
    let visitorContent = `import { Expr } from "../Expr";\nimport { Stmt } from "../Stmt";\n`;
    visitorContent += `export interface Visitor {\n`;
    visitorContent += createVisitorContent("Expr", exprDescriptions) 
        + createVisitorContent("Stmt", stmtDescriptions);
        visitorContent += "}\n";
    fs.writeFileSync(visitorFilePath, visitorContent);
}

function createVisitorContent(parentClassName: string, descriptions: {[stmtType: string]: string[]}) {
     // generate the content of the Visitor interface
    let visitorContent = "";
    Object.entries(descriptions).forEach(([type, operands]) => {
        visitorContent += `\tvisit${type}${parentClassName}(${parentClassName.toLowerCase()}: ${parentClassName}): any;\n`;
    });
    return visitorContent;
}

createExpr();
createVisitor();
createStmt();

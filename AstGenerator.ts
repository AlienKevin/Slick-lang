const fs = require('fs');

const stmtDescriptions = {
    "Expression": ["expression: Expr"],
    "Block": ["statements: (Stmt | Block)[]"],
    "If": ["condition: Expr", "thenBranch: Block", "elseBranches: Branch[]"],
    "While": ["condition: Expr", "body: Block"],
    "Break": [],
    "Function": ["name: Token", "params: Param[]", "body: (Stmt | Block)[]"],
    "Return": ["keyword: Token", "value: any"],
    "VarDeclaration": ["name: Token", "initializer: Expr", "typeModifier: TokenType"],
};

const exprDescriptions = {
    "Ternary": ["condition: Expr", "questionMark: Token", "trueBranch: Expr", "falseBranch: Expr"],
    "Binary": ["left: Expr", "operator: Token", "right: Expr"],
    "Grouping": ["expression: Expr"],
    "Literal": ["value: any"],
    "Unary": ["operator: Token", "right: Expr"],
    "Variable": ["name: Token"],
    "Assign": ["name: Token", "value: Expr"],
    "Call": ["callee: Expr", "paren: Token", "argumentList: Expr[]"],
    "Get": ["object: Expr", "name: Token | Expr", "bracket?: Token"],
    "Set": ["object: Expr", "name: Token | Expr", "value: Expr", "bracket?: Token"],
};

function createExpr() {
    const filePath = "./Expr.ts";
    // descriptions of all operands of different types
    const descriptions: {[exprType: string]: string[]} = exprDescriptions;
    const parentClassName = "Expr";
    const imports = 
`import {Token} from "./Token"\n`;
    createAst(filePath, parentClassName, descriptions, imports);
}

function createStmt() {
    const filePath = "./Stmt.ts";
    const descriptions: {[stmtType: string]: string[]} = stmtDescriptions;
    const parentClassName = "Stmt";
    const imports =  
`import {Expr, Variable} from "./Expr";
import { TokenType } from "./TokenType";
import { Token } from "./Token";
import {Param} from "./interfaces/Param"
import {Branch} from "./interfaces/Branch"\n`
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
    abstract accept(visitor: Visitor): any;
}\n`;

    // add inherited classes
    Object.entries(descriptions).forEach(([type, operands]) => {
        astClasses += `export class ${type} extends ${parentClassName} {\n`;
        astClasses += `\tconstructor(${operands.map((operand) => `public ${operand}`).join(", ")}) {\n`;
        astClasses += `\t\tsuper();\n`;
        astClasses += `\t}\n`;
        astClasses += `\taccept(visitor: Visitor) {\n`;
        astClasses += `\t\treturn visitor.visit${type}${parentClassName}(this);\n`;
        astClasses += `\t}\n`
        astClasses += `}\n`;
    });

    // astClasses += `module.exports = {${parentClassName}, ${Object.keys(descriptions).map((varName) => varName.split(":")[0]).join(", ")}};`;
    fs.writeFileSync(filePath, astClasses);
}

function createVisitor() {
    const visitorFilePath: string = `./interfaces/Visitor.ts`;
    let visitorContent = `import { Expr } from "./Expr";\nimport { Stmt } from "./Stmt";\n`;
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

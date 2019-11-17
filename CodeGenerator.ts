import Decimal from "decimal.js";
import $SLK from "./Runtime";
import { If, Binary, Expr, Get, Call, Literal, Grouping, Variable, Function, ListLiteral, RecordLiteral, Case } from "./Expr";
import { Return, VarDeclaration, Stmt, Call as CallStmt, CustomTypeDeclaration } from "./Stmt";
import { Visitor } from "./interfaces/Visitor";
import { Token } from "./Token";
import { isNumber, isText, isBoolean } from "./utils";

const reserved = makeSet([
    "arguments", "await", "break", "case", "catch", "class", "const",
    "continue", "debugger", "default", "delete", "do", "else", "enum", "eval",
    "export", "extends", "false", "finally", "for", "function", "if",
    "implements", "import", "in", "Infinity", "instanceof", "interface", "let",
    "NaN", "new", "null", "package", "private", "protected", "public", "return",
    "static", "super", "switch", "this", "throw", "true", "try", "typeof",
    "undefined", "var", "void", "while", "with", "yield"
]);

const primordial = $SLK.stone({
    "abs": "$SLK.abs",
    "max": "$SLK.max",
    "min": "$SLK.min",
    "neg": "$SLK.neg",
    "not": "$SLK.not",
    "print": "$SLK.print",
    "sqrt": "$SLK.sqrt",
    "round": "$SLK.round",
    "floor": "$SLK.floor",
    "ceil": "$SLK.ceil",
    "trunc": "$SLK.trunc",
    "e": "$SLK.e",
    "pi": "$SLK.pi",
    "sin": "$SLK.sin",
    "cos": "$SLK.cos",
    "tan": "$SLK.tan",
    "asin": "$SLK.asin",
    "acos": "$SLK.acos",
    "atan": "$SLK.atan",
    "atan2": "$SLK.atan2",

    // functinos
    "ƒ⋏": "$SLK.and",
    "ƒ⋎": "$SLK.or",
    "ƒ=": "$SLK.eq",
    "ƒ≠": "$SLK.ne",
    "ƒ<": "$SLK.lt",
    "ƒ≥": "$SLK.ge",
    "ƒ>": "$SLK.gt",
    "ƒ≤": "$SLK.le",
    "ƒ+": "$SLK.add",
    "ƒ-": "$SLK.sub",
    "ƒ*": "$SLK.mul",
    "ƒ/": "$SLK.div",
    "ƒ%": "$SLK.mod",
    "ƒ&": "$SLK.cat",

    // modules
    "List": "$SLK.List",
    "Text": "$SLK.Text",
    "pipe": "$SLK.pipe"
});

function makeSet(list: any[], value = true) {
    const object = Object.create(null);
    list.forEach((element) => {
        object[element] = value;
    });
    return $SLK.stone(object);
}

export class CodeGenerator implements Visitor {
    private frontMatter: string[];
    private indentation: number = 0;
    private uniqueNumbers: {[name: string]: true} = {};
    private operatorTransform = $SLK.stone({
        "AND": (expr: Binary) => {
            return (
                "(" + this.expression(expr.left)
                + " && " + this.expression(expr.right)
                + ")"
            );
        },
        "OR": (expr: Binary) => {
            return (
                "(" + this.expression(expr.left)
                + " || " + this.expression(expr.right)
                + ")"
            );
        },
        "EQUAL": "$SLK.eq",
        "NOT_EQUAL": "$SLK.ne",
        "LESS": "$SLK.lt",
        "GREATER_EQUAL": "$SLK.ge",
        "GREATER": "$SLK.gt",
        "LESS_EQUAL": "$SLK.le",
        "PLUS": "$SLK.add",
        "AMPERSAND": "$SLK.cat",
        "MINUS": "$SLK.sub",
        "STAR": "$SLK.mul",
        "SLASH": "$SLK.div",
        "MODULO": "$SLK.mod",
    });
    constructor(runtimePath = "./Runtime") {
        this.frontMatter = [`const $SLK = require("${runtimePath}").default;\n`];
    }

    public generateCode(stmts: Stmt[], generateFrontMatters = true) {
        const bulk = this.statements(stmts).replace(/$\n+/, "");
        return (
            (
                generateFrontMatters 
                ? this.frontMatter.join("") 
                : ""
            )
            + bulk
        );
    }

    private indent() {
        this.indentation += 4;
    }

    private outdent() {
        this.indentation -= 4;
    }

    private begin() {
        // At the beginning of each line we emit a line break and padding.
        return "\n" + " ".repeat(this.indentation);
    }

    public static mangle(name: string) {
    // JavaScript does not allow space or '?' in identifiers, so we
    // replace them with '_'. We give reserved words a '$SLK' prefix.

    //  So 'what me worry?' becomes 'what_me_worry_', and 'class' becomes '$SLKclass'.

        return (
            reserved[name] === true
            ? "$SLK" + name
            : name.replace(/[\u00B7?]/g, "_")
        );
    }

    private numgle(number: Decimal) {
    // We make big decimal literals look as natural as possible by making them into
    // constants. A constant name start with '$SLK'. A '-' or '.' is replaced with '_'.

    //  So, '1' becomes '$SLK1', '98.6' becomes '$SLK98_6', and '-1.011e-5' becomes
    //  '$SLK_1_011e_5'.

        const text = number.toString();
        const name = "$SLK" + text.replace(/[\-.]/g, "_").replace(/[+]/g, "");
        if (this.uniqueNumbers[name] !== true) {
            this.uniqueNumbers[name] = true;
            this.frontMatter.push(
                "const " + name + " = $SLK.number(\"" + text + "\");\n"
            );
        }
        return name;
    }

    statement(stmt: Stmt) {
        return stmt.accept(this);
    }

    public statements(stmts: Stmt[]) {
        const padding = this.begin();
        return stmts.map((stmt) => {
            return padding + this.statement(stmt);
        }).join("");
    }
    
    visitCallStmt(stmt: CallStmt) {
        return (
            this.visitCallExpr(stmt.call) + ";"
        );
    }
    
    visitReturnStmt(stmt: Return) {
        return "return " + this.expression(stmt.value) + ";";
    }

    visitCustomTypeDeclarationStmt(stmt: CustomTypeDeclaration) {
        return Object.entries(stmt.subtypes).map(([name, type]) => 
            "var " + CodeGenerator.mangle(name) + " = "
            + (
                type === undefined
                ? "$SLK.createCustomType(\"" + name + "\")"
                : (
                    "function (t) { return $SLK.createCustomType(\"" + name + "\", t); }"
                )
            )
            + ";"
        ).join("\n");
    }

    visitVarDeclarationStmt(stmt: VarDeclaration) {
        this.indent();
        const padding = this.begin();
        let str =
            "var " + CodeGenerator.mangle(stmt.name.lexeme) + " = "
            + "(function () {"
            + Object.values(stmt.locals).map((declaration) =>
                padding + (
                    Object.keys(declaration.locals).length > 0
                    ? this.visitVarDeclarationStmt(declaration)
                    : "var " + declaration.name + " = " + this.expression(declaration.initializer) + ";"
                )
            ).join("")
            + padding + "return " + this.expression(stmt.initializer) + ";"
        this.outdent();
        str += this.begin() + "})();";
        return str;
    }

    visitCaseExpr(caseExpr: Case) {
        const expr = this.expression(caseExpr.expr);
        this.indent();
        let padding = this.begin();
        let str = 
            "(function() {"
            + padding + "const $expr = " + expr + ";"
        str += caseExpr.cases.map(
                (currentCase, index) => {
                    let caseStr =
                        padding
                        + (
                            index === 0
                            ? ""
                            : "else "
                        );
                    if (currentCase.subtype instanceof Literal) {
                        caseStr +=
                            "if (" + "$SLK.eq(" + "$expr, " + this.expression(currentCase.subtype) + ")) {";
                    } else if (currentCase.subtype.lexeme !== "else") {
                        caseStr +=
                            "if ($expr.name === \""  + currentCase.subtype + "\") {";
                    } else {
                        caseStr +=
                            "{";
                    }
                    this.indent();
                    padding = this.begin();
                    caseStr +=
                        (
                            currentCase.isRecord
                            ? currentCase.parameters.map(
                                (parameter) => {
                                    return padding + "const " + parameter + " = $expr.parameters." + parameter + ";"
                                }
                            ).join("")
                            : (
                                currentCase.parameters[0] === undefined
                                ? ""
                                : padding + "const " + currentCase.parameters[0] + " = $expr.parameters;"
                            )
                        ) + padding + "return " + this.expression(currentCase.result) + ";"
                    this.outdent();
                    padding = this.begin();
                    caseStr += padding + "}"
                    return caseStr;
                }
            ).join("")
        this.outdent();
        str += this.begin() + "})()"
        return str;
    }

    private expression(expr: Expr) {
        return expr.accept(this);
    }

    visitIfExpr(expr: If) {
        this.indent();
        let padding = this.begin();
        let string = (
            "(" + padding + this.expression(expr.condition)
            + padding + "? " + this.expression(expr.thenBranch)
            + padding + ": " + this.expression(expr.elseBranch)
        );
        this.outdent();
        return string + this.begin() + ")";
    }

    visitBinaryExpr(expr: Binary) {
        const transform = this.operatorTransform[expr.operator.type];
        if (typeof transform === "string") {
            return (
                transform
                + "("
                + this.expression(expr.left)
                + ", "
                + this.expression(expr.right)
                + ")"
            );
        } else {
            return transform(expr);
        }
    }

    visitGetExpr(expr: Get) {
        return (
            this.expression(expr.object)
            + "[\"" 
            + expr.name.lexeme
            + "\"]"
        )
    }

    visitCallExpr(expr: Call) {
        return (
            this.expression(expr.callee) + "("
            + expr.argumentList.map(this.expression, this).join(", ") + ")"
        );
    }

    visitListLiteralExpr(expr: ListLiteral) {
        return (
            "["
            + expr.list.map(
                (element) => this.expression(element)
            ,this).join(", ")
            + "]"
        );
    }

    visitRecordLiteralExpr(expr: RecordLiteral) {
        if (Object.keys(expr.record).length === 0) {
            return "Object.create(null)";
        } else if (expr.target === undefined) {
            this.indent();
            const padding = this.begin();
            const string = "(function (o) {"
            + Object.entries(expr.record).map(([key, value]) => {
                return padding + (
                    "o["
                    + '"' + key + '"'
                    + "] = "
                    + this.expression(value)
                    + ";"
                )}).join("") + padding + "return o;";
            this.outdent();
            return string + this.begin() + "}(Object.create(null)))";
        } else {
            this.indent();
            const padding = this.begin();
            const string = "{"
            + padding + "..." + this.expression(expr.target) + ","
            + Object.entries(expr.record).map(([key, value]) => {
                return padding + (
                    '"' + key + '": '
                    + this.expression(value) + ","
                )}).join("");
            this.outdent();
            return string + this.begin() + "}";
        }
    }

    visitFunctionExpr(expr: Function) {
        return this.funcExpr(expr);
    }

    funcExpr(expr: Function) {
        return "$SLK.curry(function (" + expr.params.map((param) => {
            return CodeGenerator.mangle(param.lexeme);
        }).join(", ") + ") "
        + "{return " + this.expression(expr.body) + "}"
        + ")";
    }

    visitVariableExpr(expr: Variable) {
        let name = primordial[expr.name.lexeme]
        return (
            name === undefined
                ? CodeGenerator.mangle(expr.name.lexeme)
                : name
        );
    }

    visitGroupingExpr(expr: Grouping) {
        const code: string = this.expression(expr.expression)
        // avoid repeated parentheses
        if (code.startsWith("(")) {
            return code;
        } else {
            return "(" + code + ")";
        }
    }

    visitLiteralExpr(expr: Literal) {
        if (isText(expr.value)) {
            return '"' + expr.value + '"';
        }
        if (isBoolean(expr.value)) {
            return (
                expr.value === true
                    ? "true"
                    : "false"
            );
        }
        if (isNumber(expr.value)) {
            return this.numgle(expr.value);
        }
    }
}

import Decimal from "decimal.js";
import $SLK from "./Runtime";
import { Ternary, Binary, Expr, Set, Get, Call, Unary, Literal, Grouping, Variable, Function, ListLiteral, RecordLiteral } from "./Expr";
import { Return, VarDeclaration, While, Stmt, Block, Call as CallStmt, If, Break, Assign } from "./Stmt";
import { Visitor } from "./interfaces/Visitor";
import { Token } from "./Token";
import { isNumber, isText, isBoolean, isNull } from "./utils";

Decimal.set({
    toExpPos: 5,
    toExpNeg: -5,
    precision: 30
});

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
    "list": "$SLK.list",
    "list?": "Array.isArray",
    "boolean?": "$SLK.boolean_",
    "fraction": "$SLK.fraction",
    "function?": "$SLK.function_",
    "integer": "$SLK.integer",
    "integer?": "$SLK.integer_",
    "length": "$SLK.length",
    "number": "$SLK.make",
    "number?": "$SLK.is_decimal",
    "print": "$SLK.print",
    "record": "$SLK.record",
    "record?": "$SLK.record_",
    "stone": "$SLK.stone",
    "stone?": "Object.isFrozen",
    "text": "$SLK.text",
    "text?": "$SLK.text_",
});

function makeSet(list: any[], value = true) {
    const object = Object.create(null);
    list.forEach((element) => {
        object[element] = value;
    });
    return $SLK.stone(object);
}

function isBooleanOperator(op) {
    if (op instanceof Call) {
        const booleanFunctions = makeSet([
            "list?", "boolean?", "function?", "integer?", "number?", "record?",
            "stone?", "text?"].map(CodeGenerator.mangle));
        return booleanFunctions[this.expression(op.callee)] === true;
    } else {
        const booleanBinaryOperators = makeSet([
            "=", "≠", "<", ">", "≤", "≥",
            "/\\", "\\/",
        ]);
        return (
            op instanceof Binary
                && booleanBinaryOperators[op.operator.lexeme] === true
            // '!' logical negation
            || op instanceof Unary && op.operator.lexeme === "!"
            // 'true' and 'false'
            || op instanceof Literal && typeof op.value === "boolean"
        );
    }
}

export class CodeGenerator implements Visitor {
    private indentation: number = 0;
    private frontMatter: string[] = [`import $SLK from "../dist/Runtime";\n`];
    private uniqueNumbers: {[name: string]: true} = {};
    private operatorTransform = $SLK.stone({
        "AND": (expr: Binary) => {
            return (
                "(" + this.assertBoolean(expr.left)
                + " && " + this.assertBoolean(expr.right)
                + ")"
            );
        },
        "OR": (expr: Binary) => {
            return (
                "(" + this.assertBoolean(expr.left)
                + " || " + this.assertBoolean(expr.right)
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
        "MINUS": "$SLK.sub",
        "STAR": "$SLK.mul",
        "SLASH": "$SLK.div",
    });

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

    private assertBoolean(expr: Expr) {
        const string = this.expression(expr);
        return (
            isBooleanOperator(expr)
            ? string
            : "$SLK.assert_boolean(" + string + ")"
        );
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
    
    private block(block: Block) {
        this.indent();
        const string = this.statements(block.statements);
        this.outdent();
        return "{" + string + this.begin() + "}";
    }

    visitCallStmt(stmt: CallStmt) {
        return (
            this.visitCallExpr(stmt.call) + ";"
        );
    }
    
    visitBlockStmt(stmt: Block) {
        return (
            this.block(stmt)
        );
    }
    visitIfStmt(stmt: If) {
        return (
            "if ("
            + this.assertBoolean(stmt.condition)
            + ")"
            + this.block(stmt.thenBranch)
            + (
                stmt.elseBranch === undefined
                ? ""
                : " else " + (
                    stmt.elseBranch instanceof If
                    ? this.visitIfStmt(stmt.elseBranch)
                    : this.block(stmt.elseBranch)
                )
            )
        )
    }
    visitWhileStmt(stmt: While) {
        return (
            "while (" + this.expression(stmt.condition) + ")"
            + this.block(stmt.body)
        );
    }
    visitBreakStmt(stmt: Break) {
        return "break;";
    }
    visitReturnStmt(stmt: Return) {
        return "return " + this.expression(stmt.value) + ";";
    }
    visitVarDeclarationStmt(stmt: VarDeclaration) {
        return (
            "var " + CodeGenerator.mangle(stmt.name.lexeme) + " = "
            + this.expression(stmt.initializer) + ";"
        );
    }

    private expression(expr: Expr) {
        return expr.accept(this);
    }

    visitAssignStmt(stmt: Assign) {
        return (
            CodeGenerator.mangle(stmt.name.lexeme) + " = " + this.expression(stmt.value) + ";"
        );
    }

    visitSetExpr(expr: Set) {
        return (
            "$SLK.set("
            + this.expression(expr.object)
            + ", " 
            + (
                expr.name instanceof Token
                    ? CodeGenerator.mangle(expr.name.lexeme)
                    : this.expression(expr.name)
            )
            + ", "
            + this.expression(expr.value)
            + ")"
        )
    }

    visitTernaryExpr(expr: Ternary) {
        this.indent();
        let padding = this.begin();
        let string = (
            "(" + padding + this.assertBoolean(expr.condition)
            + padding + "? " + this.expression(expr.trueBranch)
            + padding + ": " + this.expression(expr.falseBranch)
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

    visitUnaryExpr(expr: Unary) {
        const op = expr.operator.lexeme;
        if (op === "!") {
            return "!" + this.assertBoolean(expr.right)
        } else if (op === "-") {
            return "$SLK.neg(" + this.expression(expr.right) + ")"
        }
    }
    
    visitGetExpr(expr: Get) {
        return (
            "$SLK.get(" + this.expression(expr.object)
            + ", " 
            + (
                expr.name instanceof Token
                    ? CodeGenerator.mangle(expr.name.lexeme)
                    : this.expression(expr.name)
            )
            + ")"
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
        this.indent();
        const padding = this.begin();
        const string = "(function (o) {"
        + expr.keys.map((key, index) => {
            const value = expr.values[index];
            return padding + (
                "o["
                + '"' + key + '"'
                + "] = "
                + this.expression(value)
                + ";"
            )}).join("") + padding + "return o;";
        this.outdent();
        return string + this.begin() + "}(Object.create(null)))";
    }

    visitFunctionExpr(expr: Function) {
        return this.funcExpr(expr);
    }

    funcExpr(expr: Function) {
        return "$SLK.stone(function (" + expr.params.map((param) => {
            return CodeGenerator.mangle(param.name.lexeme);
        }).join(", ") + ") " + (
            this.block(expr.body)
        ) + ")";
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
        if (isNull(expr.value)) {
            return "undefined";
        }
    }
}

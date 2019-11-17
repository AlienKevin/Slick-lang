import {Visitor} from "./interfaces/Visitor";
import {Token} from "./Token"
import {Block} from "./Stmt";
export abstract class Expr {
    abstract accept(visitor: Visitor): any;
	constructor (readonly first: Token) {}
}
export class If extends Expr {
	constructor(public condition: Expr, public thenBranch: Expr, public elseBranch: Expr) {
		super(condition.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitIfExpr(this);
	}
	toString() {
		return "If expression"
	}
}
export class Binary extends Expr {
	constructor(public left: Expr, public operator: Token, public right: Expr) {
		super(left.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitBinaryExpr(this);
	}
	toString() {
		return "Binary expression"
	}
}
export class Grouping extends Expr {
	constructor(first: Token, public expression: Expr) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitGroupingExpr(this);
	}
	toString() {
		return "Grouping expression"
	}
}
export class Literal extends Expr {
	constructor(first: Token, public value: any) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitLiteralExpr(this);
	}
	toString() {
		return "Literal expression"
	}
}
export class Variable extends Expr {
	constructor(public name: Token) {
		super(name);
	}
	accept(visitor: Visitor) {
		return visitor.visitVariableExpr(this);
	}
	toString() {
		return "Variable expression"
	}
}
export class Call extends Expr {
	constructor(public callee: Expr, public paren: Token, public argumentList: Expr[]) {
		super(callee.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitCallExpr(this);
	}
	toString() {
		return "Call expression"
	}
}
export class ListLiteral extends Expr {
	constructor(first: Token, public list: Expr[]) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitListLiteralExpr(this);
	}
	toString() {
		return "ListLiteral expression"
	}
}
export class RecordLiteral extends Expr {
	constructor(first: Token, public record: {[name: string]: Expr}, public keyTokens: {[name: string]: Token}, public target: Variable | Get) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitRecordLiteralExpr(this);
	}
	toString() {
		return "RecordLiteral expression"
	}
}
export class Function extends Expr {
	constructor(first: Token, public params: Token[], public body: Block | Expr) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitFunctionExpr(this);
	}
	toString() {
		return "Function expression"
	}
}
export class Get extends Expr {
	constructor(public object: Expr, public name: Token, public bracket?: Token) {
		super(object.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitGetExpr(this);
	}
	toString() {
		return "Get expression"
	}
}
export class Case extends Expr {
	constructor(first: Token, public expr: Expr, public cases: {subtype: Token | Literal, parameters: Token[], isRecord: boolean, result: Expr}[]) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitCaseExpr(this);
	}
	toString() {
		return "Case expression"
	}
}

import {Visitor} from "./interfaces/Visitor";
import {Token} from "./Token"
import {Block} from "./Stmt";
export abstract class Expr {
    abstract accept(visitor: Visitor): any;
}
export class Ternary extends Expr {
	constructor(public condition: Expr, public questionMark: Token, public trueBranch: Expr, public falseBranch: Expr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitTernaryExpr(this);
	}
}
export class Binary extends Expr {
	constructor(public left: Expr, public operator: Token, public right: Expr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitBinaryExpr(this);
	}
}
export class Grouping extends Expr {
	constructor(public expression: Expr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitGroupingExpr(this);
	}
}
export class Literal extends Expr {
	constructor(public value: any) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitLiteralExpr(this);
	}
}
export class Variable extends Expr {
	constructor(public name: Token) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitVariableExpr(this);
	}
}
export class Call extends Expr {
	constructor(public callee: Expr, public paren: Token, public argumentList: Expr[]) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitCallExpr(this);
	}
}
export class ListLiteral extends Expr {
	constructor(public list: Expr[]) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitListLiteralExpr(this);
	}
}
export class RecordLiteral extends Expr {
	constructor(public keys: string[], public values: Expr[]) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitRecordLiteralExpr(this);
	}
}
export class Function extends Expr {
	constructor(public params: Token[], public body: Block | Expr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitFunctionExpr(this);
	}
}
export class Get extends Expr {
	constructor(public object: Expr, public name: Token, public bracket?: Token) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitGetExpr(this);
	}
}
export class Set extends Expr {
	constructor(public object: Expr, public name: Token | Expr, public value: Expr, public bracket?: Token) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitSetExpr(this);
	}
}

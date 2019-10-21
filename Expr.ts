import {Visitor} from "./interfaces/Visitor";
import {Token} from "./Token"
import {Block} from "./Stmt";
export abstract class Expr {
    abstract accept(visitor: Visitor): any;
	constructor (readonly first: Token) {}
}
export class Ternary extends Expr {
	constructor(public condition: Expr, public questionMark: Token, public trueBranch: Expr, public falseBranch: Expr) {
		super(condition.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitTernaryExpr(this);
	}
}
export class Binary extends Expr {
	constructor(public left: Expr, public operator: Token, public right: Expr) {
		super(left.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitBinaryExpr(this);
	}
}
export class Grouping extends Expr {
	constructor(first: Token, public expression: Expr) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitGroupingExpr(this);
	}
}
export class Literal extends Expr {
	constructor(first: Token, public value: any) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitLiteralExpr(this);
	}
}
export class Variable extends Expr {
	constructor(public name: Token) {
		super(name);
	}
	accept(visitor: Visitor) {
		return visitor.visitVariableExpr(this);
	}
}
export class Call extends Expr {
	constructor(public callee: Expr, public paren: Token, public argumentList: Expr[]) {
		super(callee.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitCallExpr(this);
	}
}
export class ListLiteral extends Expr {
	constructor(first: Token, public list: Expr[]) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitListLiteralExpr(this);
	}
}
export class RecordLiteral extends Expr {
	constructor(first: Token, public record: {[name: string]: Expr}) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitRecordLiteralExpr(this);
	}
}
export class Function extends Expr {
	constructor(first: Token, public params: Token[], public body: Block | Expr) {
		super(first);
	}
	accept(visitor: Visitor) {
		return visitor.visitFunctionExpr(this);
	}
}
export class Get extends Expr {
	constructor(public object: Expr, public name: Token, public bracket?: Token) {
		super(object.first);
	}
	accept(visitor: Visitor) {
		return visitor.visitGetExpr(this);
	}
}

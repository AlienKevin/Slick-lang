import {Visitor} from "./interfaces/Visitor";
import {Expr, Variable} from "./Expr";
import { TokenType } from "./TokenType";
import { Token } from "./Token";
export abstract class Stmt {
    abstract accept(visitor: Visitor): any;
}
export class Expression extends Stmt {
	constructor(public expression: Expr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitExpressionStmt(this);
	}
}
export class Block extends Stmt {
	constructor(public statements: Stmt[]) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitBlockStmt(this);
	}
}
export class If extends Stmt {
	constructor(public condition: Expr, public thenBranch: Block, public elseBranch: Block) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitIfStmt(this);
	}
}
export class While extends Stmt {
	constructor(public condition: Expr, public body: Block) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitWhileStmt(this);
	}
}
export class Break extends Stmt {
	constructor() {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitBreakStmt(this);
	}
}
export class Return extends Stmt {
	constructor(public keyword: Token, public value: any) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitReturnStmt(this);
	}
}
export class VarDeclaration extends Stmt {
	constructor(public name: Token, public initializer: Expr, public typeModifier: TokenType) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitVarDeclarationStmt(this);
	}
}

import {Visitor} from "./interfaces/Visitor";
import {Expr, Variable, Call as CallExpr} from "./Expr";
import { TokenType } from "./TokenType";
import { Token } from "./Token";
import { Type } from "./typeChecking/Type";
import { RecordType } from "./typeChecking/RecordType";
export abstract class Stmt {
    abstract accept(visitor: Visitor): any;
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
export class Call extends Stmt {
	constructor(public call: CallExpr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitCallStmt(this);
	}
}
export class Return extends Stmt {
	constructor(public keyword: Token, public value: Expr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitReturnStmt(this);
	}
}
export class VarDeclaration extends Stmt {
	constructor(public name: Token, public initializer: Expr, public typeModifier: TokenType, public typeDeclaration?: Type) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitVarDeclarationStmt(this);
	}
}
export class Assign extends Stmt {
	constructor(public name: Token, public value: Expr) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitAssignStmt(this);
	}
}
export class CustomTypeDeclaration extends Stmt {
	constructor(public name: Token, public subtypes: {[name: string] : Type}, public typeParameters: Type[]) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitCustomTypeDeclarationStmt(this);
	}
}

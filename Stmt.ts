import {Visitor} from "./interfaces/Visitor";
import {Expr, Variable, Call as CallExpr} from "./Expr";
import { TokenType } from "./TokenType";
import { Token } from "./Token";
import { Type } from "./typeChecking/Type";
import { RecordType } from "./typeChecking/RecordType";
export abstract class Stmt {
    abstract accept(visitor: Visitor): any;
}
export class VarDeclaration extends Stmt {
	constructor(public name: Token, public locals: {[name: string]: VarDeclaration}, public initializer: Expr, public typeDeclaration?: Type) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitVarDeclarationStmt(this);
	}
}
export class CustomTypeDeclaration extends Stmt {
	constructor(public name: Token, public subtypes: {[name: string] : Type}, public typeParameters: {[name: string] : Type}) {
		super();
	}
	accept(visitor: Visitor) {
		return visitor.visitCustomTypeDeclarationStmt(this);
	}
}

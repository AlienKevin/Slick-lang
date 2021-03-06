import { Expr } from "../Expr";
import { Stmt } from "../Stmt";
export interface Visitor {
	visitIfExpr(expr: Expr): any;
	visitBinaryExpr(expr: Expr): any;
	visitGroupingExpr(expr: Expr): any;
	visitLiteralExpr(expr: Expr): any;
	visitVariableExpr(expr: Expr): any;
	visitCallExpr(expr: Expr): any;
	visitListLiteralExpr(expr: Expr): any;
	visitRecordLiteralExpr(expr: Expr): any;
	visitFunctionExpr(expr: Expr): any;
	visitGetExpr(expr: Expr): any;
	visitCaseExpr(expr: Expr): any;
	visitVarDeclarationStmt(stmt: Stmt): any;
	visitCustomTypeDeclarationStmt(stmt: Stmt): any;
}

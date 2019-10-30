import { Expr } from "../Expr";
import { Stmt } from "../Stmt";
export interface Visitor {
	visitTernaryExpr(expr: Expr): any;
	visitBinaryExpr(expr: Expr): any;
	visitGroupingExpr(expr: Expr): any;
	visitLiteralExpr(expr: Expr): any;
	visitVariableExpr(expr: Expr): any;
	visitCallExpr(expr: Expr): any;
	visitListLiteralExpr(expr: Expr): any;
	visitRecordLiteralExpr(expr: Expr): any;
	visitFunctionExpr(expr: Expr): any;
	visitGetExpr(expr: Expr): any;
	visitBlockStmt(stmt: Stmt): any;
	visitIfStmt(stmt: Stmt): any;
	visitCallStmt(stmt: Stmt): any;
	visitReturnStmt(stmt: Stmt): any;
	visitVarDeclarationStmt(stmt: Stmt): any;
	visitAssignStmt(stmt: Stmt): any;
}

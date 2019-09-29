import {Block} from "../Stmt";
import {Expr} from "../Expr";
export interface Branch {
    condition: Expr,
    body: Block,
}
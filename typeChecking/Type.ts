import { PrimitiveType } from "./PrimitiveType";
import { ListType } from "./ListType";
import { RecordType } from "./RecordType";
import { FunctionType } from "./FunctionType";
import { AnyType } from "./AnyType";

export type Type = PrimitiveType | ListType | RecordType | FunctionType | AnyType;
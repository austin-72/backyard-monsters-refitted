/** flash.errors */
import { ASError } from "as3";
import { flashClass } from "../_internal";

export class IOError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "IOError"; } }
flashClass(IOError, "flash.errors.IOError");
export class EOFError extends IOError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "EOFError"; } }
flashClass(EOFError, "flash.errors.EOFError");
export class IllegalOperationError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "IllegalOperationError"; } }
flashClass(IllegalOperationError, "flash.errors.IllegalOperationError");
export class InvalidSWFError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "InvalidSWFError"; } }
flashClass(InvalidSWFError, "flash.errors.InvalidSWFError");
export class MemoryError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "MemoryError"; } }
flashClass(MemoryError, "flash.errors.MemoryError");
export class ScriptTimeoutError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "ScriptTimeoutError"; } }
flashClass(ScriptTimeoutError, "flash.errors.ScriptTimeoutError");
export class StackOverflowError extends ASError { $ctor(m: any = "", id: any = 0) { super.$ctor(m, id); this.name = "StackOverflowError"; } }
flashClass(StackOverflowError, "flash.errors.StackOverflowError");

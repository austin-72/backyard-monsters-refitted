import { ASObject, trace } from "as3";
import { getQualifiedClassName } from "flash/utils";

export class Warning extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: string, param2: any): void {
        trace("Class: " + getQualifiedClassName(param2) + "\nWarning: " + param1);
    }
}

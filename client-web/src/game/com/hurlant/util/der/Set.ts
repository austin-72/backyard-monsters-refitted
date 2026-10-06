import * as as3 from "as3";
import { uint } from "as3";
import { DER, IAsn1Type, Sequence } from "@game";

export class Set extends Sequence implements IAsn1Type {
    [key: string]: any;

    static {
        as3.implement(this, [IAsn1Type]);
    }

    public $ctor(type: uint = 49, length: uint = 0): void {
        super.$ctor(type, length);
    }

    public override toString(): string {
        let s: string = DER.indent;
        DER.indent += "    ";
        let t: string = this.join("\n");
        DER.indent = s;
        return DER.indent + "Set[" + this.type + "][" + this.len + "][\n" + t + "\n" + s + "]";
    }
}

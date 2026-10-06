import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { BigInteger, DER, IAsn1Type } from "@game";

export class Integer extends BigInteger implements IAsn1Type {
    static {
        as3.implement(this, [IAsn1Type]);
        as3.fields(this, { type: 0, len: 0 });
    }

    private type: uint;
    private len: uint;

    public $ctor(type?: uint, length?: any /* uint */, b?: any /* ByteArray */): void {
        this.type = type;
        this.len = length;
        super.$ctor(b);
    }

    public getLength(): uint {
        return this.len;
    }

    public getType(): uint {
        return this.type;
    }

    public override toString(radix: number = 0): string {
        return DER.indent + "Integer[" + this.type + "][" + this.len + "][" + super.toString(16) + "]";
    }

    public toDER(): ByteArray {
        return null;
    }
}

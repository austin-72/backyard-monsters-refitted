import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { DER, Hex, IAsn1Type } from "@game";

export class ByteString extends ByteArray implements IAsn1Type {
    static {
        as3.implement(this, [IAsn1Type]);
        as3.fields(this, { type: 0, len: 0 });
    }

    private type: uint;
    private len: uint;

    public $ctor(type: uint = 4, length: uint = 0): void {
        super.$ctor();
        this.type = type;
        this.len = length;
    }

    public getLength(): uint {
        return this.len;
    }

    public getType(): uint {
        return this.type;
    }

    public toDER(): ByteArray {
        return DER.wrapDER(this.type, this);
    }

    public override toString(): string {
        return DER.indent + "ByteString[" + this.type + "][" + this.len + "][" + Hex.fromArray(this) + "]";
    }
}

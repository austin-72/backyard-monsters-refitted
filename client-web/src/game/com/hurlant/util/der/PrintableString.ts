import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { DER, IAsn1Type } from "@game";

export class PrintableString extends ASObject implements IAsn1Type {
    static {
        as3.implement(this, [IAsn1Type]);
        as3.fields(this, { type: 0, len: 0, str: null });
    }

    protected type: uint;
    protected len: uint;
    protected str: string;

    public $ctor(type?: uint, length?: uint): void {
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

    public setString(s: string): void {
        this.str = s;
    }

    public getString(): string {
        return this.str;
    }

    public toString(): string {
        return DER.indent + this.str;
    }

    public toDER(): ByteArray {
        return null;
    }
}

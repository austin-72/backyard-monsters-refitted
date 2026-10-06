import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray } from "flash/utils";
import { DER, IAsn1Type } from "@game";

export class ObjectIdentifier extends ASObject implements IAsn1Type {
    static {
        as3.implement(this, [IAsn1Type]);
        as3.fields(this, { type: 0, len: 0, oid: null });
    }

    private type: uint;
    private len: uint;
    private oid: any[];

    public $ctor(type?: uint, length?: uint, b?: any): void {
        super.$ctor();
        this.type = type;
        this.len = length;
        if (b instanceof ByteArray) {
            this.parse(as3.as(b, ByteArray));
        } else if (as3.is(b, String)) {
            this.generate(as3.as(b, String));
        } else {
            throw new Error("Invalid call to new ObjectIdentifier");
        }
    }

    private generate(s: string): void {
        this.oid = s.split(".");
    }

    private parse(b: ByteArray): void {
        // parse stuff
        // first byte = 40*value1 + value2
        let o: uint = b.readUnsignedByte();
        let a: any[] = [];
        a.push((o / 40) >>> 0);
        a.push((o % 40) >>> 0);
        let v: uint = 0;
        while (b.bytesAvailable > 0) {
            o = b.readUnsignedByte();
            let last: boolean = (o & 0x80) == 0;
            o = (o & 0x7f) >>> 0;
            v = (v * 128 + o) >>> 0;
            if (last) {
                a.push(v);
                v = 0;
            }
        }
        this.oid = a;
    }

    public getLength(): uint {
        return this.len;
    }

    public getType(): uint {
        return this.type;
    }

    public toDER(): ByteArray {
        let i: int = 0;
        let tmp: any[] = [];
        tmp[0] = this.oid[0] * 40 + this.oid[1];
        for (i = 2; i < this.oid.length; i++) {
            let v: int = parseInt(as3.str(this.oid[i])) | 0;
            if (v < 128) {
                tmp.push(v);
            } else if (v < 128 * 128) {
                tmp.push((v >> 7) | 0x80);
                tmp.push(v & 0x7f);
            } else if (v < 128 * 128 * 128) {
                tmp.push((v >> 14) | 0x80);
                tmp.push((v >> 7) & 0x7f | 0x80);
                tmp.push(v & 0x7f);
            } else if (v < 128 * 128 * 128 * 128) {
                tmp.push((v >> 21) | 0x80);
                tmp.push((v >> 14) & 0x7f | 0x80);
                tmp.push((v >> 7) & 0x7f | 0x80);
                tmp.push(v & 0x7f);
            } else {
                throw new Error("OID element bigger than we thought. :(");
            }
        }
        this.len = tmp.length;
        if (this.type == 0) {
            this.type = 6;
        }
        tmp.unshift(this.len);
        // assume length is small enough to fit here.
        tmp.unshift(this.type);
        let b: ByteArray = new ByteArray();
        for (i = 0; i < tmp.length; i++) {
            b[i] = tmp[i];
        }
        return b;
    }

    public toString(): string {
        return DER.indent + this.oid.join(".");
    }

    public dump(): string {
        return "OID[" + this.type + "][" + this.len + "][" + this.toString() + "]";
    }
}

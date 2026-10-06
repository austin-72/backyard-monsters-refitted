import * as as3 from "as3";
import { int, uint } from "as3";
import { ByteArray } from "flash/utils";
import { DER, IAsn1Type, ObjectIdentifier, Set } from "@game";

export class Sequence extends Array implements IAsn1Type {
    [key: string]: any;

    static {
        as3.implement(this, [IAsn1Type]);
        as3.fields(this, { type: 0, len: 0 });
    }

    protected type: uint;
    protected len: uint;

    public $ctor(type: uint = 48, length: uint = 0): void {
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
        let tmp: ByteArray = new ByteArray();
        for (let i: int = 0; i < this.length; i++) {
            let e: IAsn1Type = as3.cast(this[i], IAsn1Type);
            if (e == null) {
                // XXX Arguably, I could have a der.Null class instead
                tmp.writeByte(0x05);
                tmp.writeByte(0x00);
            } else {
                tmp.writeBytes(e.toDER());
            }
        }
        return DER.wrapDER(this.type, tmp);
    }

    public toString(): string {
        let s: string = DER.indent;
        DER.indent += "    ";
        let t: string = "";
        for (let i: int = 0; i < this.length; i++) {
            if (this[i] == null) {
                continue;
            }
            let found: boolean = false;
            for (let key in this) {
                if ((i.toString() != key) && this[i] == this[key]) {
                    t += key + ": " + this[i] + "\n";
                    found = true;
                    break;
                }
            }
            if (!found) {
                t += this[i] + "\n";
            }
        }
        // var t:String = join("\n");
        DER.indent = s;
        return DER.indent + "Sequence[" + this.type + "][" + this.len + "][\n" + t + "\n" + s + "]";
    }

    // ///////
    public findAttributeValue(oid: string): IAsn1Type {
        for (let set of as3.values(this)) {
            if (set instanceof Set) {
                let child: any = set[0];
                if (child instanceof Sequence) {
                    let tmp: any = child[0];
                    if (tmp instanceof ObjectIdentifier) {
                        let id: ObjectIdentifier = as3.as(tmp, ObjectIdentifier);
                        if (id.toString() == oid) {
                            return as3.as(child[1], IAsn1Type);
                        }
                    }
                }
            }
        }
        return null;
    }
}

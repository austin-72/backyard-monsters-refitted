import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray, Endian } from "flash/utils";
import { IHash } from "@game";

export class SHABase extends ASObject implements IHash {
    static {
        as3.implement(this, [IHash]);
        as3.fields(this, { pad_size: 40 });
    }

    public pad_size: int;

    public $ctor(): void {
        super.$ctor();
    }

    public getInputSize(): uint {
        return 64;
    }

    public getHashSize(): uint {
        return 0;
    }

    public getPadSize(): int {
        return this.pad_size;
    }

    public hash(src: ByteArray): ByteArray {
        let i: uint = 0;
        let savedLength: uint = src.length;
        let savedEndian: string = src.endian;

        src.endian = Endian.BIG_ENDIAN;
        let len: uint = (savedLength * 8) >>> 0;
        // pad to nearest int.
        while (src.length % 4 != 0) {
            src[src.length] = 0;
        }
        // convert ByteArray to an array of uint
        src.position = 0;
        let a: any[] = [];
        for (i = 0; i < src.length; i = (i + 4) >>> 0) {
            a.push(src.readUnsignedInt());
        }
        let h: any[] = this.core(a, len);
        let out: ByteArray = new ByteArray();
        let words: uint = (this.getHashSize() / 4) >>> 0;
        for (i = 0; i < words; i++) {
            out.writeUnsignedInt(h[i] >>> 0);
        }
        // unpad, to leave the source untouched.
        src.length = savedLength;
        src.endian = savedEndian;
        return out;
    }

    protected core(x: any[], len: uint): any[] {
        return null;
    }

    public toString(): string {
        return "sha";
    }
}

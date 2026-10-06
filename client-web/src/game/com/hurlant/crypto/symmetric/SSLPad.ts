import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { IPad, TLSError } from "@game";

export class SSLPad extends ASObject implements IPad {
    static {
        as3.implement(this, [IPad]);
        as3.fields(this, { blockSize: 0 });
    }

    private blockSize: uint;

    public $ctor(blockSize: uint = 0): void {
        super.$ctor();
        this.blockSize = blockSize;
    }

    public pad(a: ByteArray): void {
        let c: uint = (this.blockSize - (a.length + 1) % this.blockSize) >>> 0;
        for (let i: uint = 0; i <= c; i++) {
            a[a.length] = c;
        }
    }

    public unpad(a: ByteArray): void {
        let c: uint = (a.length % this.blockSize) >>> 0;
        if (c != 0) {
            throw new TLSError("SSLPad::unpad: ByteArray.length isn't a multiple of the blockSize", TLSError.bad_record_mac);
        }
        c = a[a.length - 1] >>> 0;
        for (let i: uint = c; i > 0; i--) {
            let v: uint = a[a.length - 1] >>> 0;
            a.length--;
        }
        a.length--;
    }

    public setBlockSize(bs: uint): void {
        this.blockSize = bs;
    }
}

import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray } from "flash/utils";
import { IPRNG, IStreamCipher, Memory } from "@game";

export class ARC4 extends ASObject implements IPRNG, IStreamCipher {
    static {
        as3.implement(this, [IPRNG, IStreamCipher]);
        as3.fields(this, { i: 0, j: 0, S: null, psize: 256 });
    }

    private i: int;
    private j: int;
    private S: ByteArray;
    private psize: uint;

    public $ctor(key: ByteArray = null): void {
        super.$ctor();
        this.S = new ByteArray();
        if (key) {
            this.init(key);
        }
    }

    public getPoolSize(): uint {
        return this.psize;
    }

    public init(key: ByteArray): void {
        let i: int = 0;
        let j: int = 0;
        let t: int = 0;
        for (i = 0; i < 256; ++i) {
            this.S[i] = i;
        }
        j = 0;
        for (i = 0; i < 256; ++i) {
            j = (j + this.S[i] + key[i % key.length]) & 255;
            t = this.S[i] | 0;
            this.S[i] = this.S[j];
            this.S[j] = t;
        }
        this.i = 0;
        this.j = 0;
    }

    public next(): uint {
        let t: int = 0;
        this.i = (this.i + 1) & 255;
        this.j = (this.j + this.S[this.i]) & 255;
        t = this.S[this.i] | 0;
        this.S[this.i] = this.S[this.j];
        this.S[this.j] = t;
        return this.S[(t + this.S[this.i]) & 255] >>> 0;
    }

    public getBlockSize(): uint {
        return 1;
    }

    public encrypt(block: ByteArray): void {
        let i: uint = 0;
        while (i < block.length) {
            block[i++] ^= this.next();
        }
    }

    public decrypt(block: ByteArray): void {
        this.encrypt(block);
    }

    public dispose(): void {
        let i: uint = 0;
        if (this.S != null) {
            for (i = 0; i < this.S.length; i++) {
                this.S[i] = Math.random() * 256;
            }
            this.S.length = 0;
            this.S = null;
        }
        this.i = 0;
        this.j = 0;
        Memory.gc();
    }

    public toString(): string {
        return "rc4";
    }
}

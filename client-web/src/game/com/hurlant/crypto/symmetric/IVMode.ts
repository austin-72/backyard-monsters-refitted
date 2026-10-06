import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { IPad, ISymmetricKey, Memory, PKCS5, Random } from "@game";

/**
 * An "abtract" class to avoid redundant code in subclasses
 */
export class IVMode extends ASObject {
    static {
        as3.fields(this, { key: null, padding: null, prng: null, iv: null, lastIV: null, blockSize: 0 });
    }

    protected key: ISymmetricKey;
    protected padding: IPad;
    // random generator used to generate IVs
    protected prng: Random;
    // optional static IV. used for testing only.
    protected iv: ByteArray;
    // generated IV is stored here.
    protected lastIV: ByteArray;
    protected blockSize: uint;

    public $ctor(key?: ISymmetricKey, padding: IPad = null): void {
        super.$ctor();
        this.key = key;
        this.blockSize = key.getBlockSize();
        if (padding == null) {
            padding = new PKCS5(this.blockSize);
        } else {
            padding.setBlockSize(this.blockSize);
        }
        this.padding = padding;

        this.prng = new Random();
        this.iv = null;
        this.lastIV = new ByteArray();
    }

    public getBlockSize(): uint {
        return this.key.getBlockSize();
    }

    public dispose(): void {
        let i: uint = 0;
        if (this.iv != null) {
            for (i = 0; i < this.iv.length; i++) {
                this.iv[i] = this.prng.nextByte();
            }
            this.iv.length = 0;
            this.iv = null;
        }
        if (this.lastIV != null) {
            for (i = 0; i < this.iv.length; i++) {
                this.lastIV[i] = this.prng.nextByte();
            }
            this.lastIV.length = 0;
            this.lastIV = null;
        }
        this.key.dispose();
        this.key = null;
        this.padding = null;
        this.prng.dispose();
        this.prng = null;
        Memory.gc();
    }

    /**
     * Optional function to force the IV value.
     * Normally, an IV gets generated randomly at every encrypt() call.
     * Also, use this to set the IV before calling decrypt()
     * (if not set before decrypt(), the IV is read from the beginning of the stream.)
     */
    public set IV(value: ByteArray) {
        this.iv = value;
        this.lastIV.length = 0;
        this.lastIV.writeBytes(this.iv);
    }

    public get IV(): ByteArray {
        return this.lastIV;
    }

    protected getIV4e(): ByteArray {
        let vec: ByteArray = new ByteArray();
        if (this.iv) {
            vec.writeBytes(this.iv);
        } else {
            this.prng.nextBytes(vec, this.blockSize);
        }
        this.lastIV.length = 0;
        this.lastIV.writeBytes(vec);
        return vec;
    }

    protected getIV4d(): ByteArray {
        let vec: ByteArray = new ByteArray();
        if (this.iv) {
            vec.writeBytes(this.iv);
        } else {
            throw new Error("an IV must be set before calling decrypt()");
        }
        return vec;
    }
}

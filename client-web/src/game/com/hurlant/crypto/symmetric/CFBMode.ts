import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { IMode, IPad, ISymmetricKey, IVMode } from "@game";

/**
 * This is the "full" CFB.
 * CFB1 and CFB8 are hiding somewhere else.
 *
 * Note: The constructor accepts an optional padding argument, but ignores it otherwise.
 */
export class CFBMode extends IVMode implements IMode {
    static {
        as3.implement(this, [IMode]);
    }

    public $ctor(key?: ISymmetricKey, padding: IPad = null): void {
        super.$ctor(key, null);
    }

    public encrypt(src: ByteArray): void {
        let l: uint = src.length;
        let vector: ByteArray = this.getIV4e();
        for (let i: uint = 0; i < src.length; i = (i + this.blockSize) >>> 0) {
            this.key.encrypt(vector);
            let chunk: uint = ((i + this.blockSize < l) ? this.blockSize : l - i) >>> 0;
            for (let j: uint = 0; j < chunk; j++) {
                src[i + j] ^= vector[j];
            }
            vector.position = 0;
            vector.writeBytes(src, i, chunk);
        }
    }

    public decrypt(src: ByteArray): void {
        let l: uint = src.length;
        let vector: ByteArray = this.getIV4d();
        let tmp: ByteArray = new ByteArray();
        for (let i: uint = 0; i < src.length; i = (i + this.blockSize) >>> 0) {
            this.key.encrypt(vector);
            let chunk: uint = ((i + this.blockSize < l) ? this.blockSize : l - i) >>> 0;
            tmp.position = 0;
            tmp.writeBytes(src, i, chunk);
            for (let j: uint = 0; j < chunk; j++) {
                src[i + j] ^= vector[j];
            }
            vector.position = 0;
            vector.writeBytes(tmp);
        }
    }

    public toString(): string {
        return this.key.toString() + "-cfb";
    }
}

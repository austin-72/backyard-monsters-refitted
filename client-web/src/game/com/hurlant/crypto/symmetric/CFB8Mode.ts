import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { IMode, IPad, ISymmetricKey, IVMode } from "@game";

/**
 *
 * Note: The constructor accepts an optional padding argument, but ignores it otherwise.
 */
export class CFB8Mode extends IVMode implements IMode {
    static {
        as3.implement(this, [IMode]);
    }

    public $ctor(key?: ISymmetricKey, padding: IPad = null): void {
        super.$ctor(key, null);
    }

    public encrypt(src: ByteArray): void {
        let vector: ByteArray = this.getIV4e();
        let tmp: ByteArray = new ByteArray();
        for (let i: uint = 0; i < src.length; i++) {
            tmp.position = 0;
            tmp.writeBytes(vector);
            this.key.encrypt(vector);
            src[i] ^= vector[0];
            // rotate
            for (let j: uint = 0; j < this.blockSize - 1; j++) {
                vector[j] = tmp[j + 1];
            }
            vector[this.blockSize - 1] = src[i];
        }
    }

    public decrypt(src: ByteArray): void {
        let vector: ByteArray = this.getIV4d();
        let tmp: ByteArray = new ByteArray();
        for (let i: uint = 0; i < src.length; i++) {
            let c: uint = src[i] >>> 0;
            tmp.position = 0;
            tmp.writeBytes(vector);
            // I <- tmp
            this.key.encrypt(vector);
            // O <- vector
            src[i] ^= vector[0];
            // rotate
            for (let j: uint = 0; j < this.blockSize - 1; j++) {
                vector[j] = tmp[j + 1];
            }
            vector[this.blockSize - 1] = c;
        }
    }

    public toString(): string {
        return this.key.toString() + "-cfb8";
    }
}

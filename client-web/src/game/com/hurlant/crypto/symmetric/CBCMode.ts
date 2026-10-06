import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { IMode, IPad, ISymmetricKey, IVMode } from "@game";

/**
 * CBC confidentiality mode. why not.
 */
export class CBCMode extends IVMode implements IMode {
    static {
        as3.implement(this, [IMode]);
    }

    public $ctor(key?: ISymmetricKey, padding: IPad = null): void {
        super.$ctor(key, padding);
    }

    public encrypt(src: ByteArray): void {
        this.padding.pad(src);
        let vector: ByteArray = this.getIV4e();
        for (let i: uint = 0; i < src.length; i = (i + this.blockSize) >>> 0) {
            for (let j: uint = 0; j < this.blockSize; j++) {
                src[i + j] ^= vector[j];
            }
            this.key.encrypt(src, i);
            vector.position = 0;
            vector.writeBytes(src, i, this.blockSize);
        }
    }

    public decrypt(src: ByteArray): void {
        let vector: ByteArray = this.getIV4d();
        let tmp: ByteArray = new ByteArray();
        for (let i: uint = 0; i < src.length; i = (i + this.blockSize) >>> 0) {
            tmp.position = 0;
            tmp.writeBytes(src, i, this.blockSize);
            this.key.decrypt(src, i);
            for (let j: uint = 0; j < this.blockSize; j++) {
                src[i + j] ^= vector[j];
            }
            vector.position = 0;
            vector.writeBytes(tmp, 0, this.blockSize);
        }
        this.padding.unpad(src);
    }

    public toString(): string {
        return this.key.toString() + "-cbc";
    }
}

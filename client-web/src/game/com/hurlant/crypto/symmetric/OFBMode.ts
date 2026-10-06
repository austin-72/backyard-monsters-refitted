import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { IMode, IPad, ISymmetricKey, IVMode } from "@game";

export class OFBMode extends IVMode implements IMode {
    static {
        as3.implement(this, [IMode]);
    }

    public $ctor(key?: ISymmetricKey, padding: IPad = null): void {
        super.$ctor(key, null);
    }

    public encrypt(src: ByteArray): void {
        let vector: ByteArray = this.getIV4e();
        this.core(src, vector);
    }

    public decrypt(src: ByteArray): void {
        let vector: ByteArray = this.getIV4d();
        this.core(src, vector);
    }

    private core(src: ByteArray, iv: ByteArray): void {
        let l: uint = src.length;
        let tmp: ByteArray = new ByteArray();
        for (let i: uint = 0; i < src.length; i = (i + this.blockSize) >>> 0) {
            this.key.encrypt(iv);
            tmp.position = 0;
            tmp.writeBytes(iv);
            let chunk: uint = ((i + this.blockSize < l) ? this.blockSize : l - i) >>> 0;
            for (let j: uint = 0; j < chunk; j++) {
                src[i + j] ^= iv[j];
            }
            iv.position = 0;
            iv.writeBytes(tmp);
        }
    }

    public toString(): string {
        return this.key.toString() + "-ofb";
    }
}

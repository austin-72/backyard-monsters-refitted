import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { IMode, IPad, ISymmetricKey, IVMode } from "@game";

export class CTRMode extends IVMode implements IMode {
    static {
        as3.implement(this, [IMode]);
    }

    public $ctor(key?: ISymmetricKey, padding: IPad = null): void {
        super.$ctor(key, padding);
    }

    public encrypt(src: ByteArray): void {
        this.padding.pad(src);
        let vector: ByteArray = this.getIV4e();
        this.core(src, vector);
    }

    public decrypt(src: ByteArray): void {
        let vector: ByteArray = this.getIV4d();
        this.core(src, vector);
        this.padding.unpad(src);
    }

    private core(src: ByteArray, iv: ByteArray): void {
        let j: uint = 0;
        let X: ByteArray = new ByteArray();
        let Xenc: ByteArray = new ByteArray();
        X.writeBytes(iv);
        for (let i: uint = 0; i < src.length; i = (i + this.blockSize) >>> 0) {
            Xenc.position = 0;
            Xenc.writeBytes(X);
            this.key.encrypt(Xenc);
            for (j = 0; j < this.blockSize; j++) {
                src[i + j] ^= Xenc[j];
            }

            for (j = (this.blockSize - 1) >>> 0; j >= 0; --j) {
                X[j]++;
                if (X[j] != 0) {
                    break;
                }
            }
        }
    }

    public toString(): string {
        return this.key.toString() + "-ctr";
    }
}

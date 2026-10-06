import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { ICipher, IMode, IPad, ISymmetricKey, Memory, PKCS5 } from "@game";

/**
 * ECB mode.
 * This uses a padding and a symmetric key.
 * If no padding is given, PKCS#5 is used.
 */
export class ECBMode extends ASObject implements IMode, ICipher {
    static {
        as3.implement(this, [IMode, ICipher]);
        as3.fields(this, { key: null, padding: null });
    }

    private key: ISymmetricKey;
    private padding: IPad;

    public $ctor(key?: ISymmetricKey, padding: IPad = null): void {
        super.$ctor();
        this.key = key;
        if (padding == null) {
            padding = new PKCS5(key.getBlockSize());
        } else {
            padding.setBlockSize(key.getBlockSize());
        }
        this.padding = padding;
    }

    public getBlockSize(): uint {
        return this.key.getBlockSize();
    }

    public encrypt(src: ByteArray): void {
        this.padding.pad(src);
        src.position = 0;
        let blockSize: uint = this.key.getBlockSize();
        let tmp: ByteArray = new ByteArray();
        let dst: ByteArray = new ByteArray();
        for (let i: uint = 0; i < src.length; i = (i + blockSize) >>> 0) {
            tmp.length = 0;
            src.readBytes(tmp, 0, blockSize);
            this.key.encrypt(tmp);
            dst.writeBytes(tmp);
        }
        src.length = 0;
        src.writeBytes(dst);
    }

    public decrypt(src: ByteArray): void {
        src.position = 0;
        let blockSize: uint = this.key.getBlockSize();

        // sanity check.
        if (src.length % blockSize != 0) {
            throw new Error("ECB mode cipher length must be a multiple of blocksize " + blockSize);
        }

        let tmp: ByteArray = new ByteArray();
        let dst: ByteArray = new ByteArray();
        for (let i: uint = 0; i < src.length; i = (i + blockSize) >>> 0) {
            tmp.length = 0;
            src.readBytes(tmp, 0, blockSize);

            this.key.decrypt(tmp);
            dst.writeBytes(tmp);
        }
        this.padding.unpad(dst);
        src.length = 0;
        src.writeBytes(dst);
    }

    public dispose(): void {
        this.key.dispose();
        this.key = null;
        this.padding = null;
        Memory.gc();
    }

    public toString(): string {
        return this.key.toString() + "-ecb";
    }
}

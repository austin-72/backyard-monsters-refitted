import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { ICipher, IMode, IVMode, Memory } from "@game";

export class SimpleIVMode extends ASObject implements IMode, ICipher {
    static {
        as3.implement(this, [IMode, ICipher]);
        as3.fields(this, { mode: null, cipher: null });
    }

    protected mode: IVMode;
    protected cipher: ICipher;

    public $ctor(mode?: IVMode): void {
        super.$ctor();
        this.mode = mode;
        this.cipher = as3.as(mode, ICipher);
    }

    public getBlockSize(): uint {
        return this.mode.getBlockSize();
    }

    public dispose(): void {
        this.mode.dispose();
        this.mode = null;
        this.cipher = null;
        Memory.gc();
    }

    public encrypt(src: ByteArray): void {
        this.cipher.encrypt(src);
        let tmp: ByteArray = new ByteArray();
        tmp.writeBytes(this.mode.IV);
        tmp.writeBytes(src);
        src.position = 0;
        src.writeBytes(tmp);
    }

    public decrypt(src: ByteArray): void {
        let tmp: ByteArray = new ByteArray();
        tmp.writeBytes(src, 0, this.getBlockSize());
        this.mode.IV = tmp;
        tmp = new ByteArray();
        tmp.writeBytes(src, this.getBlockSize());
        this.cipher.decrypt(tmp);
        src.length = 0;
        src.writeBytes(tmp);
    }

    public toString(): string {
        return "simple-" + this.cipher.toString();
    }
}

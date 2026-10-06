import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { ISymmetricKey, Memory, Random } from "@game";

export class XTeaKey extends ASObject implements ISymmetricKey {
    static {
        as3.implement(this, [ISymmetricKey]);
        as3.fields(this, { NUM_ROUNDS: 64, k: null });
    }

    public NUM_ROUNDS: uint;
    private k: any[];

    public $ctor(a?: ByteArray): void {
        super.$ctor();
        a.position = 0;
        this.k = [a.readUnsignedInt(), a.readUnsignedInt(), a.readUnsignedInt(), a.readUnsignedInt()];
    }

    /**
     * K is an hex string with 32 digits.
     */
    public static parseKey(K: string): XTeaKey {
        let a: ByteArray = new ByteArray();
        a.writeUnsignedInt(parseInt(K.substr(0, 8), 16) >>> 0);
        a.writeUnsignedInt(parseInt(K.substr(8, 8), 16) >>> 0);
        a.writeUnsignedInt(parseInt(K.substr(16, 8), 16) >>> 0);
        a.writeUnsignedInt(parseInt(K.substr(24, 8), 16) >>> 0);
        a.position = 0;
        return new XTeaKey(a);
    }

    public getBlockSize(): uint {
        return 8;
    }

    public encrypt(block: ByteArray, index: uint = 0): void {
        block.position = index;
        let v0: uint = block.readUnsignedInt();
        let v1: uint = block.readUnsignedInt();
        let i: uint = 0;
        let sum: uint = 0;
        let delta: uint = 2654435769;
        for (i = 0; i < this.NUM_ROUNDS; i++) {
            v0 = (v0 + ((((v1 << 4) ^ (v1 >> 5)) + v1) ^ (sum + this.k[sum & 3]))) >>> 0;
            sum = (sum + delta) >>> 0;
            v1 = (v1 + ((((v0 << 4) ^ (v0 >> 5)) + v0) ^ (sum + this.k[(sum >> 11) & 3]))) >>> 0;
        }
        block.position = (block.position - 8) >>> 0;
        block.writeUnsignedInt(v0);
        block.writeUnsignedInt(v1);
    }

    public decrypt(block: ByteArray, index: uint = 0): void {
        block.position = index;
        let v0: uint = block.readUnsignedInt();
        let v1: uint = block.readUnsignedInt();
        let i: uint = 0;
        let delta: uint = 2654435769;
        let sum: uint = (delta * this.NUM_ROUNDS) >>> 0;
        for (i = 0; i < this.NUM_ROUNDS; i++) {
            v1 = (v1 - ((((v0 << 4) ^ (v0 >> 5)) + v0) ^ (sum + this.k[(sum >> 11) & 3]))) >>> 0;
            sum = (sum - delta) >>> 0;
            v0 = (v0 - ((((v1 << 4) ^ (v1 >> 5)) + v1) ^ (sum + this.k[sum & 3]))) >>> 0;
        }
        block.position = (block.position - 8) >>> 0;
        block.writeUnsignedInt(v0);
        block.writeUnsignedInt(v1);
    }

    public dispose(): void {
        // private var k:Array;
        let r: Random = new Random();
        for (let i: uint = 0; i < this.k.length; i++) {
            this.k[i] = r.nextByte();
            delete this.k[i];
        }
        this.k = null;
        Memory.gc();
    }

    public toString(): string {
        return "xtea";
    }
}

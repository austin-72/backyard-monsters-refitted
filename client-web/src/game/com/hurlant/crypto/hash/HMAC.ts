import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { IHMAC, IHash } from "@game";

export class HMAC extends ASObject implements IHMAC {
    static {
        as3.implement(this, [IHMAC]);
        as3.fields(this, { hash: null, bits: 0 });
    }

    private hash: IHash;
    private bits: uint;

    /**
     * Create a HMAC object, using a Hash function, and
     * optionally a number of bits to return.
     * The HMAC will be truncated to that size if needed.
     */
    public $ctor(hash?: IHash, bits: uint = 0): void {
        super.$ctor();
        this.hash = hash;
        this.bits = bits;
    }

    public getHashSize(): uint {
        if (this.bits != 0) {
            return (this.bits / 8) >>> 0;
        } else {
            return this.hash.getHashSize();
        }
    }

    /**
     * Compute a HMAC using a key and some data.
     * It doesn't modify either, and returns a new ByteArray with the HMAC value.
     */
    public compute(key: ByteArray, data: ByteArray): ByteArray {
        let hashKey: ByteArray = null;
        if (key.length > this.hash.getInputSize()) {
            hashKey = this.hash.hash(key);
        } else {
            hashKey = new ByteArray();
            hashKey.writeBytes(key);
        }
        while (hashKey.length < this.hash.getInputSize()) {
            hashKey[hashKey.length] = 0;
        }
        let innerKey: ByteArray = new ByteArray();
        let outerKey: ByteArray = new ByteArray();
        for (let i: uint = 0; i < hashKey.length; i++) {
            innerKey[i] = hashKey[i] ^ 0x36;
            outerKey[i] = hashKey[i] ^ 0x5c;
        }
        // inner + data
        innerKey.position = hashKey.length;
        innerKey.writeBytes(data);
        let innerHash: ByteArray = this.hash.hash(innerKey);
        // outer + innerHash
        outerKey.position = hashKey.length;
        outerKey.writeBytes(innerHash);
        let outerHash: ByteArray = this.hash.hash(outerKey);
        if (this.bits > 0 && this.bits < 8 * outerHash.length) {
            outerHash.length = (this.bits / 8) >>> 0;
        }
        return outerHash;
    }

    public dispose(): void {
        this.hash = null;
        this.bits = 0;
    }

    public toString(): string {
        return "hmac-" + (this.bits > 0 ? this.bits + "-" : "") + this.hash.toString();
    }
}

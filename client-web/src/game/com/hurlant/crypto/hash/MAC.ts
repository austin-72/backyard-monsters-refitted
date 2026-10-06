import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray } from "flash/utils";
import { IHMAC, IHash } from "@game";

export class MAC extends ASObject implements IHMAC {
    static {
        as3.implement(this, [IHMAC]);
        as3.fields(this, { hash: null, bits: 0, pad_1: null, pad_2: null, innerHash: null, outerHash: null, outerKey: null, innerKey: null });
    }

    private hash: IHash;
    private bits: uint;
    private pad_1: ByteArray;
    private pad_2: ByteArray;
    private innerHash: ByteArray;
    private outerHash: ByteArray;
    private outerKey: ByteArray;
    private innerKey: ByteArray;

    /**
     * Create a MAC object (for SSL 3.0 ) and
     * optionally a number of bits to return.
     * The MAC will be truncated to that size if needed.
     */
    public $ctor(hash?: IHash, bits: uint = 0): void {
        super.$ctor();
        this.hash = hash;
        this.bits = bits;
        this.innerHash = new ByteArray();
        this.outerHash = new ByteArray();
        this.innerKey = new ByteArray();
        this.outerKey = new ByteArray();

        if (hash != null) {
            let pad_size: int = hash.getPadSize();
            this.pad_1 = new ByteArray();
            this.pad_2 = new ByteArray();

            for (let x: int = 0; x < pad_size; x++) {
                this.pad_1.writeByte(0x36);
                this.pad_2.writeByte(0x5c);
            }
        }
    }

    public setPadSize(pad_size: int): void {
    }

    public getHashSize(): uint {
        if (this.bits != 0) {
            return (this.bits / 8) >>> 0;
        } else {
            return this.hash.getHashSize();
        }
    }

    /**
     * Compute a MAC using a key and some data.
     *
     */
    public compute(key: ByteArray, data: ByteArray): ByteArray {
        // take that incoming key and do hash(key + pad_2 + hash(key + pad_1 + sequence + length + record)
        // note that data =  (sequence + type + length + record)
        if (this.pad_1 == null) {
            let pad_size: int = this.hash.getPadSize();
            this.pad_1 = new ByteArray();
            this.pad_2 = new ByteArray();

            for (let x: int = 0; x < pad_size; x++) {
                this.pad_1.writeByte(0x36);
                this.pad_2.writeByte(0x5c);
            }
        }

        // Do some preliminary checking on stuff
        /*
        if (key.length > hash.getInputSize()) {
        hashKey = hash.hash(key);
        } else {
        hashKey = new ByteArray;
        hashKey.writeBytes(key);
        }
        
        while (hashKey.length < hash.getInputSize() ) {
        hashKey[hashKey.length] = 0;
        } */
        // Henri's conventions work just fine here..
        this.innerKey.length = 0;
        this.outerKey.length = 0;
        // trace("MAC Key: " + Hex.fromArray(key));
        // trace("Key Length: " + key.length);
        // trace("Pad_1 : " + Hex.fromArray(pad_1));
        // inner hash calc
        this.innerKey.writeBytes(key);
        this.innerKey.writeBytes(this.pad_1);
        this.innerKey.writeBytes(data);

        // trace("MAC Inner Key: " + Hex.fromArray(innerKey));
        this.innerHash = this.hash.hash(this.innerKey);

        // trace("MAC Inner Hash: " + Hex.fromArray(innerHash));
        // outer hash calc
        this.outerKey.writeBytes(key);
        this.outerKey.writeBytes(this.pad_2);
        this.outerKey.writeBytes(this.innerHash);

        // trace("MAC Outer Key: " + Hex.fromArray(outerKey));
        this.outerHash = this.hash.hash(this.outerKey);

        if (this.bits > 0 && this.bits < 8 * this.outerHash.length) {
            this.outerHash.length = (this.bits / 8) >>> 0;
        }

        // trace("MAC for record: " + Hex.fromArray(outerHash));
        return this.outerHash;
    }

    public dispose(): void {
        this.hash = null;
        this.bits = 0;
    }

    public toString(): string {
        return "mac-" + (this.bits > 0 ? this.bits + "-" : "") + this.hash.toString();
    }
}

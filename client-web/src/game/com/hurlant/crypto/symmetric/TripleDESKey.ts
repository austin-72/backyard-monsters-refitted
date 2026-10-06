import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";
import { DESKey, Memory } from "@game";

export class TripleDESKey extends DESKey {
    static {
        as3.fields(this, { encKey2: null, encKey3: null, decKey2: null, decKey3: null });
    }

    protected encKey2: any[];
    protected encKey3: any[];
    protected decKey2: any[];
    protected decKey3: any[];

    /**
     * This supports 2TDES and 3TDES.
     * If the key passed is 128 bits, 2TDES is used.
     * If the key has 192 bits, 3TDES is used.
     * Other key lengths give "undefined" results.
     */
    public $ctor(key?: ByteArray): void {
        super.$ctor(key);
        this.encKey2 = this.generateWorkingKey(false, key, 8);
        this.decKey2 = this.generateWorkingKey(true, key, 8);
        if (key.length > 16) {
            this.encKey3 = this.generateWorkingKey(true, key, 16);
            this.decKey3 = this.generateWorkingKey(false, key, 16);
        } else {
            this.encKey3 = this.encKey;
            this.decKey3 = this.decKey;
        }
    }

    public override dispose(): void {
        super.dispose();
        let i: uint = 0;
        if (this.encKey2 != null) {
            for (i = 0; i < this.encKey2.length; i++) {
                this.encKey2[i] = 0;
            }
            this.encKey2 = null;
        }
        if (this.encKey3 != null) {
            for (i = 0; i < this.encKey3.length; i++) {
                this.encKey3[i] = 0;
            }
            this.encKey3 = null;
        }
        if (this.decKey2 != null) {
            for (i = 0; i < this.decKey2.length; i++) {
                this.decKey2[i] = 0;
            }
            this.decKey2 = null;
        }
        if (this.decKey3 != null) {
            for (i = 0; i < this.decKey3.length; i++) {
                this.decKey3[i] = 0;
            }
            this.decKey3 = null;
        }
        Memory.gc();
    }

    public override encrypt(block: ByteArray, index: uint = 0): void {
        this.desFunc(this.encKey, block, index, block, index);
        this.desFunc(this.encKey2, block, index, block, index);
        this.desFunc(this.encKey3, block, index, block, index);
    }

    public override decrypt(block: ByteArray, index: uint = 0): void {
        this.desFunc(this.decKey3, block, index, block, index);
        this.desFunc(this.decKey2, block, index, block, index);
        this.desFunc(this.decKey, block, index, block, index);
    }

    public override toString(): string {
        return "3des";
    }
}

import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

export interface IHMAC {
    getHashSize(): uint;

    /**
     * Compute a HMAC using a key and some data.
     * It doesn't modify either, and returns a new ByteArray with the HMAC value.
     */
    compute(key: ByteArray, data: ByteArray): ByteArray;
    dispose(): void;
    toString(): string;
}
export const IHMAC = as3.iface("com.hurlant.crypto.hash::IHMAC", []);

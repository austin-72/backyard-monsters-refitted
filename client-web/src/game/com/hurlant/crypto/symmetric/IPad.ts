import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

/**
 * Tiny interface that represents a padding mechanism.
 */
export interface IPad {
    /**
     * Add padding to the array
     */
    pad(a: ByteArray): void;

    /**
     * Remove padding from the array.
     * @throws Error if the padding is invalid.
     */
    unpad(a: ByteArray): void;

    /**
     * Set the blockSize to work on
     */
    setBlockSize(bs: uint): void;
}
export const IPad = as3.iface("com.hurlant.crypto.symmetric::IPad", []);

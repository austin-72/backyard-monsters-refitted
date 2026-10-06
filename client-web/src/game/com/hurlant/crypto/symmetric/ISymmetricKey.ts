import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

export interface ISymmetricKey {
    /**
     * Returns the block size used by this particular encryption algorithm
     */
    getBlockSize(): uint;

    /**
     * Encrypt one block of data in "block", starting at "index", of length "getBlockSize()"
     */
    encrypt(block: ByteArray, index?: uint): void;

    /**
     * Decrypt one block of data in "block", starting at "index", of length "getBlockSize()"
     */
    decrypt(block: ByteArray, index?: uint): void;

    /**
     * Attempts to destroy sensitive information from memory, such as encryption keys.
     * Note: This is not guaranteed to work given the Flash sandbox model.
     */
    dispose(): void;

    toString(): string;
}
export const ISymmetricKey = as3.iface("com.hurlant.crypto.symmetric::ISymmetricKey", []);

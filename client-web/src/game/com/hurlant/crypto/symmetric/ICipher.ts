import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

export interface ICipher {
    getBlockSize(): uint;
    encrypt(src: ByteArray): void;
    decrypt(src: ByteArray): void;
    dispose(): void;
    toString(): string;
}
export const ICipher = as3.iface("com.hurlant.crypto.symmetric::ICipher", []);

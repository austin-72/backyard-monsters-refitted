import * as as3 from "as3";
import { int, uint } from "as3";
import { ByteArray } from "flash/utils";

export interface IHash {
    getInputSize(): uint;
    getHashSize(): uint;
    hash(src: ByteArray): ByteArray;
    toString(): string;
    getPadSize(): int;
}
export const IHash = as3.iface("com.hurlant.crypto.hash::IHash", []);

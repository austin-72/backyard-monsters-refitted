import * as as3 from "as3";
import { uint } from "as3";
import { ByteArray } from "flash/utils";

export interface IPRNG {
    getPoolSize(): uint;
    init(key: ByteArray): void;
    next(): uint;
    dispose(): void;
    toString(): string;
}
export const IPRNG = as3.iface("com.hurlant.crypto.prng::IPRNG", []);

import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { IPad } from "@game";

/**
 * A pad that does nothing.
 * Useful when you don't want padding in your Mode.
 */
export class NullPad extends ASObject implements IPad {
    static {
        as3.implement(this, [IPad]);
    }


    public unpad(a: ByteArray): void {
        return;
    }

    public pad(a: ByteArray): void {
        return;
    }

    public setBlockSize(bs: uint): void {
        return;
    }
}

import { ASObject, int } from "as3";
import { ByteArray } from "flash/utils";

export class ArrayUtil extends ASObject {

    public static equals(a1: ByteArray, a2: ByteArray): boolean {
        if (a1.length != a2.length) {
            return false;
        }
        let l: int = a1.length;
        for (let i: int = 0; i < l; i++) {
            if (a1[i] != a2[i]) {
                return false;
            }
        }
        return true;
    }
}

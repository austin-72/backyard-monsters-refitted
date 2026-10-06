import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Crypto, HMAC, MAC } from "@game";

export class MACs extends ASObject {
    public static readonly NULL: uint = 0;
    public static readonly MD5: uint = 1;
    public static readonly SHA1: uint = 2;

    public static getHashSize(hash: uint): uint {
        return [0, 16, 20][hash] >>> 0;
    }

    public static getPadSize(hash: uint): int {
        return [0, 48, 40][hash] | 0;
    }

    public static getHMAC(hash: uint): HMAC {
        if (hash == MACs.NULL) {
            return null;
        }
        return Crypto.getHMAC(as3.str(['', "md5", "sha1"][hash]));
    }

    public static getMAC(hash: uint): MAC {
        return Crypto.getMAC(as3.str(['', "md5", "sha1"][hash]));
    }
}

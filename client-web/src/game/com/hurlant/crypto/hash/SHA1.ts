import * as as3 from "as3";
import { int, uint } from "as3";
import { IHash, SHABase } from "@game";

export class SHA1 extends SHABase implements IHash {
    static {
        as3.implement(this, [IHash]);
    }

    public static readonly HASH_SIZE: int = 20;

    public override getHashSize(): uint {
        return SHA1.HASH_SIZE >>> 0;
    }

    protected override core(x: any[], len: uint): any[] {
        /* append padding */
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;

        let w: any[] = [];
        let a: uint = 1732584193;
        // 1732584193;
        let b: uint = 4023233417;
        // -271733879;
        let c: uint = 2562383102;
        // -1732584194;
        let d: uint = 271733878;
        // 271733878;
        let e: uint = 3285377520;

        // -1009589776;
        for (let i: uint = 0; i < x.length; i = (i + 16) >>> 0) {
            let olda: uint = a;
            let oldb: uint = b;
            let oldc: uint = c;
            let oldd: uint = d;
            let olde: uint = e;

            for (let j: uint = 0; j < 80; j++) {
                if (j < 16) {
                    w[j] = x[i + j] || 0;
                } else {
                    w[j] = this.rol((w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]) >>> 0, 1);
                }
                let t: uint = (this.rol(a, 5) + this.ft(j, b, c, d) + e + w[j] + this.kt(j)) >>> 0;
                e = d;
                d = c;
                c = this.rol(b, 30);
                b = a;
                a = t;
            }
            a = (a + olda) >>> 0;
            b = (b + oldb) >>> 0;
            c = (c + oldc) >>> 0;
            d = (d + oldd) >>> 0;
            e = (e + olde) >>> 0;
        }
        return [a, b, c, d, e];
    }

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    private rol(num: uint, cnt: uint): uint {
        return ((num << cnt) | (num >>> (32 - cnt))) >>> 0;
    }

    /*
     * Perform the appropriate triplet combination function for the current
     * iteration
     */
    private ft(t: uint, b: uint, c: uint, d: uint): uint {
        if (t < 20) {
            return ((b & c) | ((~b) & d)) >>> 0;
        }
        if (t < 40) {
            return (b ^ c ^ d) >>> 0;
        }
        if (t < 60) {
            return ((b & c) | (b & d) | (c & d)) >>> 0;
        }
        return (b ^ c ^ d) >>> 0;
    }

    /*
     * Determine the appropriate additive constant for the current iteration
     */
    private kt(t: uint): uint {
        return ((t < 20) ? 0x5A827999 : (t < 40) ? 0x6ED9EBA1 : (t < 60) ? 0x8F1BBCDC : 0xCA62C1D6) >>> 0;
    }

    public override toString(): string {
        return "sha1";
    }
}

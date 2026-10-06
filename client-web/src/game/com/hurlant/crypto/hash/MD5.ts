import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray, Endian } from "flash/utils";
import { IHash } from "@game";

export class MD5 extends ASObject implements IHash {
    static {
        as3.implement(this, [IHash]);
        as3.fields(this, { pad_size: 48 });
    }

    public static readonly HASH_SIZE: int = 16;
    public pad_size: int;

    public $ctor(): void {
        super.$ctor();
    }

    public getInputSize(): uint {
        return 64;
    }

    public getHashSize(): uint {
        return MD5.HASH_SIZE >>> 0;
    }

    public getPadSize(): int {
        return this.pad_size;
    }

    public hash(src: ByteArray): ByteArray {
        let i: uint = 0;
        let len: uint = (src.length * 8) >>> 0;
        let savedEndian: string = src.endian;
        // pad to nearest int.
        while (src.length % 4 != 0) {
            src[src.length] = 0;
        }
        // convert ByteArray to an array of uint
        src.position = 0;
        let a: any[] = [];
        src.endian = Endian.LITTLE_ENDIAN;
        for (i = 0; i < src.length; i = (i + 4) >>> 0) {
            a.push(src.readUnsignedInt());
        }
        let h: any[] = this.core_md5(a, len);
        let out: ByteArray = new ByteArray();
        out.endian = Endian.LITTLE_ENDIAN;
        for (i = 0; i < 4; i++) {
            out.writeUnsignedInt(h[i] >>> 0);
        }
        // restore length!
        src.length = (len / 8) >>> 0;
        src.endian = savedEndian;

        return out;
    }

    private core_md5(x: any[], len: uint): any[] {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        let a: uint = 1732584193;
        // 1732584193;
        let b: uint = 4023233417;
        // -271733879;
        let c: uint = 2562383102;
        // -1732584194;
        let d: uint = 271733878;

        // 271733878;
        for (let i: uint = 0; i < x.length; i = (i + 16) >>> 0) {
            x[i] ||= 0;
            x[i + 1] ||= 0;
            x[i + 2] ||= 0;
            x[i + 3] ||= 0;
            x[i + 4] ||= 0;
            x[i + 5] ||= 0;
            x[i + 6] ||= 0;
            x[i + 7] ||= 0;
            x[i + 8] ||= 0;
            x[i + 9] ||= 0;
            x[i + 10] ||= 0;
            x[i + 11] ||= 0;
            x[i + 12] ||= 0;
            x[i + 13] ||= 0;
            x[i + 14] ||= 0;
            x[i + 15] ||= 0;

            let olda: uint = a;
            let oldb: uint = b;
            let oldc: uint = c;
            let oldd: uint = d;

            a = this.ff(a, b, c, d, x[i + 0] >>> 0, 7, 3614090360);
            d = this.ff(d, a, b, c, x[i + 1] >>> 0, 12, 3905402710);
            c = this.ff(c, d, a, b, x[i + 2] >>> 0, 17, 606105819);
            b = this.ff(b, c, d, a, x[i + 3] >>> 0, 22, 3250441966);
            a = this.ff(a, b, c, d, x[i + 4] >>> 0, 7, 4118548399);
            d = this.ff(d, a, b, c, x[i + 5] >>> 0, 12, 1200080426);
            c = this.ff(c, d, a, b, x[i + 6] >>> 0, 17, 2821735955);
            b = this.ff(b, c, d, a, x[i + 7] >>> 0, 22, 4249261313);
            a = this.ff(a, b, c, d, x[i + 8] >>> 0, 7, 1770035416);
            d = this.ff(d, a, b, c, x[i + 9] >>> 0, 12, 2336552879);
            c = this.ff(c, d, a, b, x[i + 10] >>> 0, 17, 4294925233);
            b = this.ff(b, c, d, a, x[i + 11] >>> 0, 22, 2304563134);
            a = this.ff(a, b, c, d, x[i + 12] >>> 0, 7, 1804603682);
            d = this.ff(d, a, b, c, x[i + 13] >>> 0, 12, 4254626195);
            c = this.ff(c, d, a, b, x[i + 14] >>> 0, 17, 2792965006);
            b = this.ff(b, c, d, a, x[i + 15] >>> 0, 22, 1236535329);

            a = this.gg(a, b, c, d, x[i + 1] >>> 0, 5, 4129170786);
            d = this.gg(d, a, b, c, x[i + 6] >>> 0, 9, 3225465664);
            c = this.gg(c, d, a, b, x[i + 11] >>> 0, 14, 643717713);
            b = this.gg(b, c, d, a, x[i + 0] >>> 0, 20, 3921069994);
            a = this.gg(a, b, c, d, x[i + 5] >>> 0, 5, 3593408605);
            d = this.gg(d, a, b, c, x[i + 10] >>> 0, 9, 38016083);
            c = this.gg(c, d, a, b, x[i + 15] >>> 0, 14, 3634488961);
            b = this.gg(b, c, d, a, x[i + 4] >>> 0, 20, 3889429448);
            a = this.gg(a, b, c, d, x[i + 9] >>> 0, 5, 568446438);
            d = this.gg(d, a, b, c, x[i + 14] >>> 0, 9, 3275163606);
            c = this.gg(c, d, a, b, x[i + 3] >>> 0, 14, 4107603335);
            b = this.gg(b, c, d, a, x[i + 8] >>> 0, 20, 1163531501);
            a = this.gg(a, b, c, d, x[i + 13] >>> 0, 5, 2850285829);
            d = this.gg(d, a, b, c, x[i + 2] >>> 0, 9, 4243563512);
            c = this.gg(c, d, a, b, x[i + 7] >>> 0, 14, 1735328473);
            b = this.gg(b, c, d, a, x[i + 12] >>> 0, 20, 2368359562);

            a = this.hh(a, b, c, d, x[i + 5] >>> 0, 4, 4294588738);
            d = this.hh(d, a, b, c, x[i + 8] >>> 0, 11, 2272392833);
            c = this.hh(c, d, a, b, x[i + 11] >>> 0, 16, 1839030562);
            b = this.hh(b, c, d, a, x[i + 14] >>> 0, 23, 4259657740);
            a = this.hh(a, b, c, d, x[i + 1] >>> 0, 4, 2763975236);
            d = this.hh(d, a, b, c, x[i + 4] >>> 0, 11, 1272893353);
            c = this.hh(c, d, a, b, x[i + 7] >>> 0, 16, 4139469664);
            b = this.hh(b, c, d, a, x[i + 10] >>> 0, 23, 3200236656);
            a = this.hh(a, b, c, d, x[i + 13] >>> 0, 4, 681279174);
            d = this.hh(d, a, b, c, x[i + 0] >>> 0, 11, 3936430074);
            c = this.hh(c, d, a, b, x[i + 3] >>> 0, 16, 3572445317);
            b = this.hh(b, c, d, a, x[i + 6] >>> 0, 23, 76029189);
            a = this.hh(a, b, c, d, x[i + 9] >>> 0, 4, 3654602809);
            d = this.hh(d, a, b, c, x[i + 12] >>> 0, 11, 3873151461);
            c = this.hh(c, d, a, b, x[i + 15] >>> 0, 16, 530742520);
            b = this.hh(b, c, d, a, x[i + 2] >>> 0, 23, 3299628645);

            a = this.ii(a, b, c, d, x[i + 0] >>> 0, 6, 4096336452);
            d = this.ii(d, a, b, c, x[i + 7] >>> 0, 10, 1126891415);
            c = this.ii(c, d, a, b, x[i + 14] >>> 0, 15, 2878612391);
            b = this.ii(b, c, d, a, x[i + 5] >>> 0, 21, 4237533241);
            a = this.ii(a, b, c, d, x[i + 12] >>> 0, 6, 1700485571);
            d = this.ii(d, a, b, c, x[i + 3] >>> 0, 10, 2399980690);
            c = this.ii(c, d, a, b, x[i + 10] >>> 0, 15, 4293915773);
            b = this.ii(b, c, d, a, x[i + 1] >>> 0, 21, 2240044497);
            a = this.ii(a, b, c, d, x[i + 8] >>> 0, 6, 1873313359);
            d = this.ii(d, a, b, c, x[i + 15] >>> 0, 10, 4264355552);
            c = this.ii(c, d, a, b, x[i + 6] >>> 0, 15, 2734768916);
            b = this.ii(b, c, d, a, x[i + 13] >>> 0, 21, 1309151649);
            a = this.ii(a, b, c, d, x[i + 4] >>> 0, 6, 4149444226);
            d = this.ii(d, a, b, c, x[i + 11] >>> 0, 10, 3174756917);
            c = this.ii(c, d, a, b, x[i + 2] >>> 0, 15, 718787259);
            b = this.ii(b, c, d, a, x[i + 9] >>> 0, 21, 3951481745);

            a = (a + olda) >>> 0;
            b = (b + oldb) >>> 0;
            c = (c + oldc) >>> 0;
            d = (d + oldd) >>> 0;
        }
        return [a, b, c, d];
    }

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    private rol(num: uint, cnt: uint): uint {
        return ((num << cnt) | (num >>> (32 - cnt))) >>> 0;
    }

    /*
     * These functions implement the four basic operations the algorithm uses.
     */
    private cmn(q: uint, a: uint, b: uint, x: uint, s: uint, t: uint): uint {
        return (this.rol((a + q + x + t) >>> 0, s) + b) >>> 0;
    }

    private ff(a: uint, b: uint, c: uint, d: uint, x: uint, s: uint, t: uint): uint {
        return this.cmn(((b & c) | ((~b) & d)) >>> 0, a, b, x, s, t);
    }

    private gg(a: uint, b: uint, c: uint, d: uint, x: uint, s: uint, t: uint): uint {
        return this.cmn(((b & d) | (c & (~d))) >>> 0, a, b, x, s, t);
    }

    private hh(a: uint, b: uint, c: uint, d: uint, x: uint, s: uint, t: uint): uint {
        return this.cmn((b ^ c ^ d) >>> 0, a, b, x, s, t);
    }

    private ii(a: uint, b: uint, c: uint, d: uint, x: uint, s: uint, t: uint): uint {
        return this.cmn((c ^ (b | (~d))) >>> 0, a, b, x, s, t);
    }

    public toString(): string {
        return "md5";
    }
}

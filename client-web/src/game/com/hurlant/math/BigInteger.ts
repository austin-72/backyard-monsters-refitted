import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray } from "flash/utils";
import { BarrettReduction, ClassicReduction, Hex, IReduction, Memory, MontgomeryReduction, NullReduction, Random } from "@game";

// AS3 namespace bi_internal: members declared in it are plain properties in TypeScript.

export class BigInteger extends ASObject {
    static {
        as3.fields(this, { t: 0, s: 0, a: null });
    }

    public static DB: int; // const
    // number of significant bits per chunk
    public static DV: int; // const
    public static DM: int; // const

    // Max value in a chunk
    public static BI_FP: int; // const
    public static FV: number; // const
    public static F1: int; // const
    public static F2: int; // const

    public static ZERO: BigInteger; // const
    public static ONE: BigInteger; // const

    // Functions above are sufficient for RSA encryption.
    // The stuff below is useful for decryption and key generation
    public static lowprimes: any[]; // const
    public static lplim: int; // const

    static {
        as3.lazyStatics(this, { DB: 0, DV: 0, DM: 0, BI_FP: 0, FV: NaN, F1: 0, F2: 0, ZERO: null, ONE: null, lowprimes: null, lplim: 0 }, () => {
            BigInteger.DB = 30;
            BigInteger.DV = (1 << BigInteger.DB);
            BigInteger.DM = (BigInteger.DV - 1) | 0;
            BigInteger.BI_FP = 52;
            BigInteger.FV = Math.pow(2, BigInteger.BI_FP);
            BigInteger.F1 = (BigInteger.BI_FP - BigInteger.DB) | 0;
            BigInteger.F2 = (2 * BigInteger.DB - BigInteger.BI_FP) | 0;
            BigInteger.ZERO = BigInteger.nbv(0);
            BigInteger.ONE = BigInteger.nbv(1);
            BigInteger.lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509];
            BigInteger.lplim = ((1 << 26) / BigInteger.lowprimes[BigInteger.lowprimes.length - 1]) | 0;
        });
    }
    /*bi_internal */
    public t: int;
    // number of chunks.
    public s: int;
    // sign
    public a: any[];

    // chunks
    /**
     *
     * @param value
     * @param radix  WARNING: If value is ByteArray, this holds the number of bytes to use.
     * @param unsigned
     *
     */
    public $ctor(value: any = null, radix: int = 0, unsigned: boolean = false): void {
        super.$ctor();
        this.a = new Array();
        if (as3.is(value, String)) {
            if (radix && radix != 16) {
                throw new Error("BigInteger construction with radix!=16 is not supported.");
            }
            value = Hex.toArray(as3.str(value));
            radix = 0;
        }
        if (value instanceof ByteArray) {
            let array: ByteArray = as3.as(value, ByteArray);
            let length: int = (radix || (array.length - array.position)) | 0;
            this.fromArray(array, length, unsigned);
        }
    }

    public dispose(): void {
        let r: Random = new Random();
        for (let i: uint = 0; i < this.a.length; i++) {
            this.a[i] = r.nextByte();
            delete this.a[i];
        }
        this.a = null;
        this.t = 0;
        this.s = 0;
        Memory.gc();
    }

    public toString(radix: number = 16): string {
        if (this.s < 0) {
            return "-" + this.negate().toString(radix);
        }
        let k: int = 0;
        switch (radix) {
            case 2:
                k = 1;
                break;
            case 4:
                k = 2;
                break;
            case 8:
                k = 3;
                break;
            case 16:
                k = 4;
                break;
            case 32:
                k = 5;
                break;
            default:
        }
        let km: int = ((1 << k) - 1) | 0;
        let d: int = 0;
        let m: boolean = false;
        let r: string = "";
        let i: int = this.t;
        let p: int = (BigInteger.DB - (i * BigInteger.DB) % k) | 0;
        if (i-- > 0) {
            if (p < BigInteger.DB && (d = this.a[i] >> p) > 0) {
                m = true;
                r = as3.str(d.toString(36));
            }
            while (i >= 0) {
                if (p < k) {
                    d = (this.a[i] & ((1 << p) - 1)) << (k - p);
                    d |= this.a[--i] >> (p = (p + (BigInteger.DB - k)) | 0);
                } else {
                    d = (this.a[i] >> (p -= k)) & km;
                    if (p <= 0) {
                        p += BigInteger.DB;
                        --i;
                    }
                }
                if (d > 0) {
                    m = true;
                }
                if (m) {
                    r += d.toString(36);
                }
            }
        }
        return m ? r : "0";
    }

    public toArray(array: ByteArray): uint {
        const k: int = 8;
        const km: int = ((1 << 8) - 1) | 0;
        let d: int = 0;
        let i: int = this.t;
        let p: int = (BigInteger.DB - (i * BigInteger.DB) % k) | 0;
        let m: boolean = false;
        let c: int = 0;
        if (i-- > 0) {
            if (p < BigInteger.DB && (d = this.a[i] >> p) > 0) {
                m = true;
                array.writeByte(d);
                c++;
            }
            while (i >= 0) {
                if (p < k) {
                    d = (this.a[i] & ((1 << p) - 1)) << (k - p);
                    d |= this.a[--i] >> (p = (p + (BigInteger.DB - k)) | 0);
                } else {
                    d = (this.a[i] >> (p -= k)) & km;
                    if (p <= 0) {
                        p += BigInteger.DB;
                        --i;
                    }
                }
                if (d > 0) {
                    m = true;
                }
                if (m) {
                    array.writeByte(d);
                    c++;
                }
            }
        }
        return c >>> 0;
    }

    /**
     * best-effort attempt to fit into a Number.
     * precision can be lost if it just can't fit.
     */
    public valueOf(): number {
        if (this.s == -1) {
            return -this.negate().valueOf();
        }
        let coef: number = 1;
        let value: number = 0;
        for (let i: uint = 0; i < this.t; i++) {
            value += this.a[i] * coef;
            coef *= BigInteger.DV;
        }
        return value;
    }

    /**
     * -this
     */
    public negate(): BigInteger {
        let r: BigInteger = as3.cast(this.nbi(), BigInteger);
        BigInteger.ZERO.subTo(this, r);
        return r;
    }

    /**
     * |this|
     */
    public abs(): BigInteger {
        return (this.s < 0) ? this.negate() : this;
    }

    /**
     * return + if this > v, - if this < v, 0 if equal
     */
    public compareTo(v: BigInteger): int {
        let r: int = (this.s - v.s) | 0;
        if (r != 0) {
            return r;
        }
        let i: int = this.t;
        r = (i - v.t) | 0;
        if (r != 0) {
            return r;
        }
        while (--i >= 0) {
            r = (this.a[i] - v.a[i]) | 0;
            if (r != 0) {
                return r;
            }
        }
        return 0;
    }

    /**
     * returns bit length of the integer x
     */
    public nbits(x: int): int {
        let r: int = 1;
        let t: int = 0;
        if ((t = x >>> 16) != 0) {
            x = t;
            r += 16;
        }
        if ((t = x >> 8) != 0) {
            x = t;
            r += 8;
        }
        if ((t = x >> 4) != 0) {
            x = t;
            r += 4;
        }
        if ((t = x >> 2) != 0) {
            x = t;
            r += 2;
        }
        if ((t = x >> 1) != 0) {
            x = t;
            r += 1;
        }
        return r;
    }

    /**
     * returns the number of bits in this
     */
    public bitLength(): int {
        if (this.t <= 0) {
            return 0;
        }
        return (BigInteger.DB * (this.t - 1) + this.nbits(this.a[this.t - 1] ^ (this.s & BigInteger.DM))) | 0;
    }

    /**
     *
     * @param v
     * @return this % v
     *
     */
    public mod(v: BigInteger): BigInteger {
        let r: BigInteger = as3.cast(this.nbi(), BigInteger);
        this.abs().divRemTo(v, null, r);
        if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) {
            v.subTo(r, r);
        }
        return r;
    }

    /**
     * this^e % m, 0 <= e < 2^32
     */
    public modPowInt(e: int, m: BigInteger): BigInteger {
        let z: IReduction = null;
        if (e < 256 || m.isEven()) {
            z = new ClassicReduction(m);
        } else {
            z = new MontgomeryReduction(m);
        }
        return this.exp(e, z);
    }

    /**
     * copy this to r
     */
    public copyTo(r: BigInteger): void {
        for (let i: int = (this.t - 1) | 0; i >= 0; --i) {
            r.a[i] = this.a[i];
        }
        r.t = this.t;
        r.s = this.s;
    }

    /**
     * set from integer value "value", -DV <= value < DV
     */
    public fromInt(value: int): void {
        this.t = 1;
        this.s = (value < 0) ? -1 : 0;
        if (value > 0) {
            this.a[0] = value;
        } else if (value < -1) {
            this.a[0] = value + BigInteger.DV;
        } else {
            this.t = 0;
        }
    }

    /**
     * set from ByteArray and length,
     * starting a current position
     * If length goes beyond the array, pad with zeroes.
     */
    public fromArray(value: ByteArray, length: int, unsigned: boolean = false): void {
        let p: int = value.position;
        let i: int = (p + length) | 0;
        let sh: int = 0;
        const k: int = 8;
        this.t = 0;
        this.s = 0;
        while (--i >= p) {
            let x: int = (i < value.length ? value[i] : 0) | 0;
            if (sh == 0) {
                this.a[this.t++] = x;
            } else if (sh + k > BigInteger.DB) {
                this.a[this.t - 1] |= (x & ((1 << (BigInteger.DB - sh)) - 1)) << sh;
                this.a[this.t++] = x >> (BigInteger.DB - sh);
            } else {
                this.a[this.t - 1] |= x << sh;
            }
            sh += k;
            if (sh >= BigInteger.DB) {
                sh -= BigInteger.DB;
            }
        }
        if (!unsigned && (value[0] & 0x80) == 0x80) {
            this.s = -1;
            if (sh > 0) {
                this.a[this.t - 1] |= ((1 << (BigInteger.DB - sh)) - 1) << sh;
            }
        }
        this.clamp();
        value.position = Math.min(p + length, value.length) >>> 0;
    }

    /**
     * clamp off excess high words
     */
    public clamp(): void {
        let c: int = this.s & BigInteger.DM;
        while (this.t > 0 && this.a[this.t - 1] == c) {
            --this.t;
        }
    }

    /**
     * r = this << n*DB
     */
    public dlShiftTo(n: int, r: BigInteger): void {
        let i: int = 0;
        for (i = (this.t - 1) | 0; i >= 0; --i) {
            r.a[i + n] = this.a[i];
        }
        for (i = (n - 1) | 0; i >= 0; --i) {
            r.a[i] = 0;
        }
        r.t = (this.t + n) | 0;
        r.s = this.s;
    }

    /**
     * r = this >> n*DB
     */
    public drShiftTo(n: int, r: BigInteger): void {
        let i: int = 0;
        for (i = n; i < this.t; ++i) {
            r.a[i - n] = this.a[i];
        }
        r.t = Math.max(this.t - n, 0) | 0;
        r.s = this.s;
    }

    /**
     * r = this << n
     */
    public lShiftTo(n: int, r: BigInteger): void {
        let bs: int = (n % BigInteger.DB) | 0;
        let cbs: int = (BigInteger.DB - bs) | 0;
        let bm: int = ((1 << cbs) - 1) | 0;
        let ds: int = (n / BigInteger.DB) | 0;
        let c: int = (this.s << bs) & BigInteger.DM;
        let i: int = 0;
        for (i = (this.t - 1) | 0; i >= 0; --i) {
            r.a[i + ds + 1] = (this.a[i] >> cbs) | c;
            c = (this.a[i] & bm) << bs;
        }
        for (i = (ds - 1) | 0; i >= 0; --i) {
            r.a[i] = 0;
        }
        r.a[ds] = c;
        r.t = (this.t + ds + 1) | 0;
        r.s = this.s;
        r.clamp();
    }

    /**
     * r = this >> n
     */
    public rShiftTo(n: int, r: BigInteger): void {
        r.s = this.s;
        let ds: int = (n / BigInteger.DB) | 0;
        if (ds >= this.t) {
            r.t = 0;
            return;
        }
        let bs: int = (n % BigInteger.DB) | 0;
        let cbs: int = (BigInteger.DB - bs) | 0;
        let bm: int = ((1 << bs) - 1) | 0;
        r.a[0] = this.a[ds] >> bs;
        let i: int = 0;
        for (i = (ds + 1) | 0; i < this.t; ++i) {
            r.a[i - ds - 1] |= (this.a[i] & bm) << cbs;
            r.a[i - ds] = this.a[i] >> bs;
        }
        if (bs > 0) {
            r.a[this.t - ds - 1] |= (this.s & bm) << cbs;
        }
        r.t = (this.t - ds) | 0;
        r.clamp();
    }

    /**
     * r = this - v
     */
    public subTo(v: BigInteger, r: BigInteger): void {
        let i: int = 0;
        let c: int = 0;
        let m: int = Math.min(v.t, this.t) | 0;
        while (i < m) {
            c = (c + (this.a[i] - v.a[i])) | 0;
            r.a[i++] = c & BigInteger.DM;
            c >>= BigInteger.DB;
        }
        if (v.t < this.t) {
            c -= v.s;
            while (i < this.t) {
                c = (c + this.a[i]) | 0;
                r.a[i++] = c & BigInteger.DM;
                c >>= BigInteger.DB;
            }
            c += this.s;
        } else {
            c += this.s;
            while (i < v.t) {
                c = (c - v.a[i]) | 0;
                r.a[i++] = c & BigInteger.DM;
                c >>= BigInteger.DB;
            }
            c -= v.s;
        }
        r.s = (c < 0) ? -1 : 0;
        if (c < -1) {
            r.a[i++] = BigInteger.DV + c;
        } else if (c > 0) {
            r.a[i++] = c;
        }
        r.t = i;
        r.clamp();
    }

    /**
     * am: Compute w_j += (x*this_i), propagates carries,
     * c is initial carry, returns final carry.
     * c < 3*dvalue, x < 2*dvalue, this_i < dvalue
     */
    public am(i: int, x: int, w: BigInteger, j: int, c: int, n: int): int {
        let xl: int = x & 0x7fff;
        let xh: int = x >> 15;
        while (--n >= 0) {
            let l: int = this.a[i] & 0x7fff;
            let h: int = this.a[i++] >> 15;
            let m: int = (xh * l + h * xl) | 0;
            l = (xl * l + ((m & 0x7fff) << 15) + w.a[j] + (c & 0x3fffffff)) | 0;
            c = ((l >>> 30) + (m >>> 15) + xh * h + (c >>> 30)) | 0;
            w.a[j++] = l & 0x3fffffff;
        }
        return c;
    }

    /**
     * r = this * v, r != this,a (HAC 14.12)
     * "this" should be the larger one if appropriate
     */
    public multiplyTo(v: BigInteger, r: BigInteger): void {
        let x: BigInteger = this.abs();
        let y: BigInteger = v.abs();
        let i: int = x.t;
        r.t = (i + y.t) | 0;
        while (--i >= 0) {
            r.a[i] = 0;
        }
        for (i = 0; i < y.t; ++i) {
            r.a[i + x.t] = x.am(0, y.a[i] | 0, r, i, 0, x.t);
        }
        r.s = 0;
        r.clamp();
        if (this.s != v.s) {
            BigInteger.ZERO.subTo(r, r);
        }
    }

    /**
     * r = this^2, r != this (HAC 14.16)
     */
    public squareTo(r: BigInteger): void {
        let x: BigInteger = this.abs();
        let i: int = r.t = (2 * x.t) | 0;
        while (--i >= 0) {
            r.a[i] = 0;
        }
        for (i = 0; i < x.t - 1; ++i) {
            let c: int = x.am(i, x.a[i] | 0, r, (2 * i) | 0, 0, 1);
            if ((r.a[i + x.t] += x.am((i + 1) | 0, (2 * x.a[i]) | 0, r, (2 * i + 1) | 0, c, (x.t - i - 1) | 0)) >= BigInteger.DV) {
                r.a[i + x.t] -= BigInteger.DV;
                r.a[i + x.t + 1] = 1;
            }
        }
        if (r.t > 0) {
            r.a[r.t - 1] += x.am(i, x.a[i] | 0, r, (2 * i) | 0, 0, 1);
        }
        r.s = 0;
        r.clamp();
    }

    /**
     * divide this by m, quotient and remainder to q, r (HAC 14.20)
     * r != q, this != m. q or r may be null.
     */
    public divRemTo(m: BigInteger, q: BigInteger = null, r: BigInteger = null): void {
        let pm: BigInteger = m.abs();
        if (pm.t <= 0) {
            return;
        }
        let pt: BigInteger = this.abs();
        if (pt.t < pm.t) {
            if (q != null) {
                q.fromInt(0);
            }
            if (r != null) {
                this.copyTo(r);
            }
            return;
        }
        if (r == null) {
            r = as3.cast(this.nbi(), BigInteger);
        }
        let y: BigInteger = as3.cast(this.nbi(), BigInteger);
        let ts: int = this.s;
        let ms: int = m.s;
        let nsh: int = (BigInteger.DB - this.nbits(pm.a[pm.t - 1] | 0)) | 0;
        // normalize modulus
        if (nsh > 0) {
            pm.lShiftTo(nsh, y);
            pt.lShiftTo(nsh, r);
        } else {
            pm.copyTo(y);
            pt.copyTo(r);
        }
        let ys: int = y.t;
        let y0: int = y.a[ys - 1] | 0;
        if (y0 == 0) {
            return;
        }
        let yt: number = y0 * (1 << BigInteger.F1) + ((ys > 1) ? y.a[ys - 2] >> BigInteger.F2 : 0);
        let d1: number = BigInteger.FV / yt;
        let d2: number = (1 << BigInteger.F1) / yt;
        let e: number = 1 << BigInteger.F2;
        let i: int = r.t;
        let j: int = (i - ys) | 0;
        let t: BigInteger = as3.cast((q == null) ? this.nbi() : q, BigInteger);
        y.dlShiftTo(j, t);
        if (r.compareTo(t) >= 0) {
            r.a[r.t++] = 1;
            r.subTo(t, r);
        }
        BigInteger.ONE.dlShiftTo(ys, t);
        t.subTo(y, y);
        // "negative" y so we can replace sub with am later.
        while (y.t < ys) {
            y.filter(($node: any) => (y.t++, 0));
        }
        while (--j >= 0) {
            // Estimate quotient digit
            let qd: int = ((r.a[--i] == y0) ? BigInteger.DM : Number(r.a[i]) * d1 + (Number(r.a[i - 1]) + e) * d2) | 0;
            if ((r.a[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
                // Try it out
                y.dlShiftTo(j, t);
                r.subTo(t, r);
                while (r.a[i] < --qd) {
                    r.subTo(t, r);
                }
            }
        }
        if (q != null) {
            r.drShiftTo(ys, q);
            if (ts != ms) {
                BigInteger.ZERO.subTo(q, q);
            }
        }
        r.t = ys;
        r.clamp();
        if (nsh > 0) {
            r.rShiftTo(nsh, r);
        }
        if (ts < 0) {
            BigInteger.ZERO.subTo(r, r);
        }
    }

    /**
     * return "-1/this % 2^DB"; useful for Mont. reduction
     * justification:
     *         xy == 1 (mod n)
     *         xy =  1+km
     * 	 xy(2-xy) = (1+km)(1-km)
     * x[y(2-xy)] =  1-k^2.m^2
     * x[y(2-xy)] == 1 (mod m^2)
     * if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
     * should reduce x and y(2-xy) by m^2 at each step to keep size bounded
     * [XXX unit test the living shit out of this.]
     */
    public invDigit(): int {
        if (this.t < 1) {
            return 0;
        }
        let x: int = this.a[0] | 0;
        if ((x & 1) == 0) {
            return 0;
        }
        let y: int = x & 3;
        // y == 1/x mod 2^2
        y = (y * (2 - (x & 0xf) * y)) & 0xf;
        // y == 1/x mod 2^4
        y = (y * (2 - (x & 0xff) * y)) & 0xff;
        // y == 1/x mod 2^8
        y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff;
        // y == 1/x mod 2^16
        // last step - calculate inverse mod DV directly;
        // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
        // XXX 48 bit ints? Whaaaa? is there an implicit float conversion in here?
        y = ((y * (2 - x * y % BigInteger.DV)) % BigInteger.DV) | 0;
        // y == 1/x mod 2^dbits
        // we really want the negative inverse, and -DV < y < DV
        return ((y > 0) ? BigInteger.DV - y : -y) | 0;
    }

    /**
     * true iff this is even
     */
    public isEven(): boolean {
        return ((this.t > 0) ? (this.a[0] & 1) : this.s) == 0;
    }

    /**
     * this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
     */
    public exp(e: int, z: IReduction): BigInteger {
        if (e > 0xffffffff || e < 1) {
            return BigInteger.ONE;
        }
        let r: BigInteger = as3.cast(this.nbi(), BigInteger);
        let r2: BigInteger = as3.cast(this.nbi(), BigInteger);
        let g: BigInteger = z.convert(this);
        let i: int = (this.nbits(e) - 1) | 0;
        g.copyTo(r);
        while (--i >= 0) {
            z.sqrTo(r, r2);
            if ((e & (1 << i)) > 0) {
                z.mulTo(r2, g, r);
            } else {
                let t: BigInteger = r;
                r = r2;
                r2 = t;
            }
        }
        return z.revert(r);
    }

    public intAt(str: string, index: int): int {
        return parseInt(str.charAt(index), 36) | 0;
    }

    protected nbi(): any {
        return new BigInteger();
    }

    /**
     * return bigint initialized to value
     */
    public static nbv(value: int): BigInteger {
        let bn: BigInteger = new BigInteger();
        bn.fromInt(value);
        return bn;
    }

    public clone(): BigInteger {
        let r: BigInteger = new BigInteger();
        this.copyTo(r);
        return r;
    }

    /**
     *
     * @return value as integer
     *
     */
    public intValue(): int {
        if (this.s < 0) {
            if (this.t == 1) {
                return (this.a[0] - BigInteger.DV) | 0;
            } else if (this.t == 0) {
                return -1;
            }
        } else if (this.t == 1) {
            return this.a[0] | 0;
        } else if (this.t == 0) {
            return 0;
        }
        // assumes 16 < DB < 32
        return ((this.a[1] & ((1 << (32 - BigInteger.DB)) - 1)) << BigInteger.DB) | this.a[0];
    }

    /**
     *
     * @return value as byte
     *
     */
    public byteValue(): int {
        return (this.t == 0) ? this.s : (this.a[0] << 24) >> 24;
    }

    /**
     *
     * @return value as short (assumes DB>=16)
     *
     */
    public shortValue(): int {
        return (this.t == 0) ? this.s : (this.a[0] << 16) >> 16;
    }

    /**
     *
     * @param r
     * @return x s.t. r^x < DV
     *
     */
    protected chunkSize(r: number): int {
        return Math.floor(Math.LN2 * BigInteger.DB / Math.log(r)) | 0;
    }

    /**
     *
     * @return 0 if this ==0, 1 if this >0
     *
     */
    public sigNum(): int {
        if (this.s < 0) {
            return -1;
        } else if (this.t <= 0 || (this.t == 1 && this.a[0] <= 0)) {
            return 0;
        } else {
            return 1;
        }
    }

    /**
     *
     * @param b: radix to use
     * @return a string representing the integer converted to the radix.
     *
     */
    protected toRadix(b: uint = 10): string {
        if (this.sigNum() == 0 || b < 2 || b > 32) {
            return "0";
        }
        let cs: int = this.chunkSize(b);
        let a: number = Math.pow(b, cs);
        let d: BigInteger = BigInteger.nbv(a | 0);
        let y: BigInteger = as3.cast(this.nbi(), BigInteger);
        let z: BigInteger = as3.cast(this.nbi(), BigInteger);
        let r: string = "";
        this.divRemTo(d, y, z);
        while (y.sigNum() > 0) {
            r = (a + z.intValue()).toString(b).substr(1) + r;
            y.divRemTo(d, y, z);
        }
        return z.intValue().toString(b) + r;
    }

    /**
     *
     * @param s a string to convert from using radix.
     * @param b a radix
     *
     */
    protected fromRadix(s: string, b: int = 10): void {
        this.fromInt(0);
        let cs: int = this.chunkSize(b);
        let d: number = Math.pow(b, cs);
        let mi: boolean = false;
        let j: int = 0;
        let w: int = 0;
        for (let i: int = 0; i < s.length; ++i) {
            let x: int = this.intAt(s, i);
            if (x < 0) {
                if (s.charAt(i) == "-" && this.sigNum() == 0) {
                    mi = true;
                }
                continue;
            }
            w = (b * w + x) | 0;
            if (++j >= cs) {
                this.dMultiply(d | 0);
                this.dAddOffset(w, 0);
                j = 0;
                w = 0;
            }
        }
        if (j > 0) {
            this.dMultiply(Math.pow(b, j) | 0);
            this.dAddOffset(w, 0);
        }
        if (mi) {
            BigInteger.ZERO.subTo(this, this);
        }
    }

    // XXX function fromNumber not written yet.
    /**
     *
     * @return a byte array.
     *
     */
    public toByteArray(): ByteArray {
        let i: int = this.t;
        let r: ByteArray = new ByteArray();
        r[0] = this.s;
        let p: int = (BigInteger.DB - (i * BigInteger.DB) % 8) | 0;
        let d: int = 0;
        let k: int = 0;
        if (i-- > 0) {
            if (p < BigInteger.DB && (d = this.a[i] >> p) != (this.s & BigInteger.DM) >> p) {
                r[k++] = d | (this.s << (BigInteger.DB - p));
            }
            while (i >= 0) {
                if (p < 8) {
                    d = (this.a[i] & ((1 << p) - 1)) << (8 - p);
                    d |= this.a[--i] >> (p = (p + (BigInteger.DB - 8)) | 0);
                } else {
                    d = (this.a[i] >> (p -= 8)) & 0xff;
                    if (p <= 0) {
                        p += BigInteger.DB;
                        --i;
                    }
                }
                if ((d & 0x80) != 0) {
                    d |= -256;
                }
                if (k == 0 && (this.s & 0x80) != (d & 0x80)) {
                    ++k;
                }
                if (k > 0 || d != this.s) {
                    r[k++] = d;
                }
            }
        }
        return r;
    }

    public equals(a: BigInteger): boolean {
        return this.compareTo(a) == 0;
    }

    public min(a: BigInteger): BigInteger {
        return (this.compareTo(a) < 0) ? this : a;
    }

    public max(a: BigInteger): BigInteger {
        return (this.compareTo(a) > 0) ? this : a;
    }

    /**
     *
     * @param a	a BigInteger to perform the operation with
     * @param op a Function implementing the operation
     * @param r a BigInteger to store the result of the operation
     *
     */
    protected bitwiseTo(a: BigInteger, op: Function, r: BigInteger): void {
        let i: int = 0;
        let f: int = 0;
        let m: int = Math.min(a.t, this.t) | 0;
        for (i = 0; i < m; ++i) {
            r.a[i] = op(this.a[i], a.a[i]);
        }
        if (a.t < this.t) {
            f = a.s & BigInteger.DM;
            for (i = m; i < this.t; ++i) {
                r.a[i] = op(this.a[i], f);
            }
            r.t = this.t;
        } else {
            f = this.s & BigInteger.DM;
            for (i = m; i < a.t; ++i) {
                r.a[i] = op(f, a.a[i]);
            }
            r.t = a.t;
        }
        r.s = op(this.s, a.s) | 0;
        r.clamp();
    }

    private op_and(x: int, y: int): int {
        return x & y;
    }

    public and(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.bitwiseTo(a, as3.bind(this, this.op_and), r);
        return r;
    }

    private op_or(x: int, y: int): int {
        return x | y;
    }

    public or(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.bitwiseTo(a, as3.bind(this, this.op_or), r);
        return r;
    }

    private op_xor(x: int, y: int): int {
        return x ^ y;
    }

    public xor(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.bitwiseTo(a, as3.bind(this, this.op_xor), r);
        return r;
    }

    private op_andnot(x: int, y: int): int {
        return x & ~y;
    }

    public andNot(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.bitwiseTo(a, as3.bind(this, this.op_andnot), r);
        return r;
    }

    public not(): BigInteger {
        let r: BigInteger = new BigInteger();
        for (let i: int = 0; i < this.t; ++i) {
            r[i] = BigInteger.DM & ~this.a[i];
        }
        r.t = this.t;
        r.s = ~this.s;
        return r;
    }

    public shiftLeft(n: int): BigInteger {
        let r: BigInteger = new BigInteger();
        if (n < 0) {
            this.rShiftTo((-n) | 0, r);
        } else {
            this.lShiftTo(n, r);
        }
        return r;
    }

    public shiftRight(n: int): BigInteger {
        let r: BigInteger = new BigInteger();
        if (n < 0) {
            this.lShiftTo((-n) | 0, r);
        } else {
            this.rShiftTo(n, r);
        }
        return r;
    }

    /**
     *
     * @param x
     * @return index of lowet 1-bit in x, x < 2^31
     *
     */
    private lbit(x: int): int {
        if (x == 0) {
            return -1;
        }
        let r: int = 0;
        if ((x & 0xffff) == 0) {
            x >>= 16;
            r += 16;
        }
        if ((x & 0xff) == 0) {
            x >>= 8;
            r += 8;
        }
        if ((x & 0xf) == 0) {
            x >>= 4;
            r += 4;
        }
        if ((x & 0x3) == 0) {
            x >>= 2;
            r += 2;
        }
        if ((x & 0x1) == 0) {
            ++r;
        }
        return r;
    }

    /**
     *
     * @return index of lowest 1-bit (or -1 if none)
     *
     */
    public getLowestSetBit(): int {
        for (let i: int = 0; i < this.t; ++i) {
            if (this.a[i] != 0) {
                return (i * BigInteger.DB + this.lbit(this.a[i] | 0)) | 0;
            }
        }
        if (this.s < 0) {
            return (this.t * BigInteger.DB) | 0;
        }
        return -1;
    }

    /**
     *
     * @param x
     * @return number of 1 bits in x
     *
     */
    private cbit(x: int): int {
        let r: uint = 0;
        while (x != 0) {
            x &= x - 1;
            ++r;
        }
        return r;
    }

    /**
     *
     * @return number of set bits
     *
     */
    public bitCount(): int {
        let r: int = 0;
        let x: int = this.s & BigInteger.DM;
        for (let i: int = 0; i < this.t; ++i) {
            r += this.cbit(this.a[i] ^ x);
        }
        return r;
    }

    /**
     *
     * @param n
     * @return true iff nth bit is set
     *
     */
    public testBit(n: int): boolean {
        let j: int = Math.floor(n / BigInteger.DB) | 0;
        if (j >= this.t) {
            return this.s != 0;
        }
        return ((this.a[j] & (1 << (n % BigInteger.DB))) != 0);
    }

    /**
     *
     * @param n
     * @param op
     * @return this op (1<<n)
     *
     */
    protected changeBit(n: int, op: Function): BigInteger {
        let r: BigInteger = BigInteger.ONE.shiftLeft(n);
        this.bitwiseTo(r, op, r);
        return r;
    }

    /**
     *
     * @param n
     * @return this | (1<<n)
     *
     */
    public setBit(n: int): BigInteger {
        return this.changeBit(n, as3.bind(this, this.op_or));
    }

    /**
     *
     * @param n
     * @return this & ~(1<<n)
     *
     */
    public clearBit(n: int): BigInteger {
        return this.changeBit(n, as3.bind(this, this.op_andnot));
    }

    /**
     *
     * @param n
     * @return this ^ (1<<n)
     *
     */
    public flipBit(n: int): BigInteger {
        return this.changeBit(n, as3.bind(this, this.op_xor));
    }

    /**
     *
     * @param a
     * @param r = this + a
     *
     */
    protected addTo(a: BigInteger, r: BigInteger): void {
        let i: int = 0;
        let c: int = 0;
        let m: int = Math.min(a.t, this.t) | 0;
        while (i < m) {
            c = (c + (this.a[i] + a.a[i])) | 0;
            r.a[i++] = c & BigInteger.DM;
            c >>= BigInteger.DB;
        }
        if (a.t < this.t) {
            c += a.s;
            while (i < this.t) {
                c = (c + this.a[i]) | 0;
                r.a[i++] = c & BigInteger.DM;
                c >>= BigInteger.DB;
            }
            c += this.s;
        } else {
            c += this.s;
            while (i < a.t) {
                c = (c + a.a[i]) | 0;
                r.a[i++] = c & BigInteger.DM;
                c >>= BigInteger.DB;
            }
            c += a.s;
        }
        r.s = (c < 0) ? -1 : 0;
        if (c > 0) {
            r.a[i++] = c;
        } else if (c < -1) {
            r.a[i++] = BigInteger.DV + c;
        }
        r.t = i;
        r.clamp();
    }

    /**
     *
     * @param a
     * @return this + a
     *
     */
    public add(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.addTo(a, r);
        return r;
    }

    /**
     *
     * @param a
     * @return this - a
     *
     */
    public subtract(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.subTo(a, r);
        return r;
    }

    /**
     *
     * @param a
     * @return this * a
     *
     */
    public multiply(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.multiplyTo(a, r);
        return r;
    }

    /**
     *
     * @param a
     * @return this / a
     *
     */
    public divide(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.divRemTo(a, r, null);
        return r;
    }

    public remainder(a: BigInteger): BigInteger {
        let r: BigInteger = new BigInteger();
        this.divRemTo(a, null, r);
        return r;
    }

    /**
     *
     * @param a
     * @return [this/a, this%a]
     *
     */
    public divideAndRemainder(a: BigInteger): any[] {
        let q: BigInteger = new BigInteger();
        let r: BigInteger = new BigInteger();
        this.divRemTo(a, q, r);
        return [q, r];
    }

    /**
     *
     * this *= n, this >=0, 1 < n < DV
     *
     * @param n
     *
     */
    public dMultiply(n: int): void {
        this.a[this.t] = this.am(0, (n - 1) | 0, this, 0, 0, this.t);
        ++this.t;
        this.clamp();
    }

    /**
     *
     * this += n << w words, this >= 0
     *
     * @param n
     * @param w
     *
     */
    public dAddOffset(n: int, w: int): void {
        while (this.t <= w) {
            this.a[this.t++] = 0;
        }
        this.a[w] += n;
        while (this.a[w] >= BigInteger.DV) {
            this.a[w] -= BigInteger.DV;
            if (++w >= this.t) {
                this.a[this.t++] = 0;
            }
            ++this.a[w];
        }
    }

    /**
     *
     * @param e
     * @return this^e
     *
     */
    public pow(e: int): BigInteger {
        return this.exp(e, new NullReduction());
    }

    /**
     *
     * @param a
     * @param n
     * @param r = lower n words of "this * a", a.t <= n
     *
     */
    public multiplyLowerTo(a: BigInteger, n: int, r: BigInteger): void {
        let i: int = Math.min(this.t + a.t, n) | 0;
        r.s = 0;
        // assumes a, this >= 0
        r.t = i;
        while (i > 0) {
            r.a[--i] = 0;
        }
        let j: int = 0;
        for (j = (r.t - this.t) | 0; i < j; ++i) {
            r.a[i + this.t] = this.am(0, a.a[i] | 0, r, i, 0, this.t);
        }
        for (j = Math.min(a.t, n) | 0; i < j; ++i) {
            this.am(0, a.a[i] | 0, r, i, 0, (n - i) | 0);
        }
        r.clamp();
    }

    /**
     *
     * @param a
     * @param n
     * @param r = "this * a" without lower n words, n > 0
     *
     */
    public multiplyUpperTo(a: BigInteger, n: int, r: BigInteger): void {
        --n;
        let i: int = r.t = (this.t + a.t - n) | 0;
        r.s = 0;
        // assumes a,this >= 0
        while (--i >= 0) {
            r.a[i] = 0;
        }
        for (i = Math.max(n - this.t, 0) | 0; i < a.t; ++i) {
            r.a[this.t + i - n] = this.am((n - i) | 0, a.a[i] | 0, r, 0, 0, (this.t + i - n) | 0);
        }
        r.clamp();
        r.drShiftTo(1, r);
    }

    /**
     *
     * @param e
     * @param m
     * @return this^e % m (HAC 14.85)
     *
     */
    public modPow(e: BigInteger, m: BigInteger): BigInteger {
        let i: int = e.bitLength();
        let k: int = 0;
        let r: BigInteger = BigInteger.nbv(1);
        let z: IReduction = null;

        if (i <= 0) {
            return r;
        } else if (i < 18) {
            k = 1;
        } else if (i < 48) {
            k = 3;
        } else if (i < 144) {
            k = 4;
        } else if (i < 768) {
            k = 5;
        } else {
            k = 6;
        }
        if (i < 8) {
            z = new ClassicReduction(m);
        } else if (m.isEven()) {
            z = new BarrettReduction(m);
        } else {
            z = new MontgomeryReduction(m);
        }
        // precomputation
        let g: any[] = [];
        let n: int = 3;
        let k1: int = (k - 1) | 0;
        let km: int = ((1 << k) - 1) | 0;
        g[1] = z.convert(this);
        if (k > 1) {
            let g2: BigInteger = new BigInteger();
            z.sqrTo(as3.cast(g[1], BigInteger), g2);
            while (n <= km) {
                g[n] = new BigInteger();
                z.mulTo(g2, as3.cast(g[n - 2], BigInteger), as3.cast(g[n], BigInteger));
                n += 2;
            }
        }

        let j: int = (e.t - 1) | 0;
        let w: int = 0;
        let is1: boolean = true;
        let r2: BigInteger = new BigInteger();
        let t: BigInteger = null;
        i = (this.nbits(e.a[j] | 0) - 1) | 0;
        while (j >= 0) {
            if (i >= k1) {
                w = (e.a[j] >> (i - k1)) & km;
            } else {
                w = (e.a[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
                if (j > 0) {
                    w |= e.a[j - 1] >> (BigInteger.DB + i - k1);
                }
            }
            n = k;
            while ((w & 1) == 0) {
                w >>= 1;
                --n;
            }
            if ((i -= n) < 0) {
                i += BigInteger.DB;
                --j;
            }
            if (is1) {
                // ret == 1, don't bother squaring or multiplying it
                g[w].copyTo(r);
                is1 = false;
            } else {
                while (n > 1) {
                    z.sqrTo(r, r2);
                    z.sqrTo(r2, r);
                    n -= 2;
                }
                if (n > 0) {
                    z.sqrTo(r, r2);
                } else {
                    t = r;
                    r = r2;
                    r2 = t;
                }
                z.mulTo(r2, as3.cast(g[w], BigInteger), r);
            }
            while (j >= 0 && (e.a[j] & (1 << i)) == 0) {
                z.sqrTo(r, r2);
                t = r;
                r = r2;
                r2 = t;
                if (--i < 0) {
                    i = (BigInteger.DB - 1) | 0;
                    --j;
                }
            }
        }
        return z.revert(r);
    }

    /**
     *
     * @param a
     * @return gcd(this, a) (HAC 14.54)
     *
     */
    public gcd(a: BigInteger): BigInteger {
        let x: BigInteger = (this.s < 0) ? this.negate() : this.clone();
        let y: BigInteger = (a.s < 0) ? a.negate() : a.clone();
        if (x.compareTo(y) < 0) {
            let t: BigInteger = x;
            x = y;
            y = t;
        }
        let i: int = x.getLowestSetBit();
        let g: int = y.getLowestSetBit();
        if (g < 0) {
            return x;
        }
        if (i < g) {
            g = i;
        }
        if (g > 0) {
            x.rShiftTo(g, x);
            y.rShiftTo(g, y);
        }
        while (x.sigNum() > 0) {
            if ((i = x.getLowestSetBit()) > 0) {
                x.rShiftTo(i, x);
            }
            if ((i = y.getLowestSetBit()) > 0) {
                y.rShiftTo(i, y);
            }
            if (x.compareTo(y) >= 0) {
                x.subTo(y, x);
                x.rShiftTo(1, x);
            } else {
                y.subTo(x, y);
                y.rShiftTo(1, y);
            }
        }
        if (g > 0) {
            y.lShiftTo(g, y);
        }
        return y;
    }

    /**
     *
     * @param n
     * @return this % n, n < 2^DB
     *
     */
    protected modInt(n: int): int {
        if (n <= 0) {
            return 0;
        }
        let d: int = (BigInteger.DV % n) | 0;
        let r: int = ((this.s < 0) ? n - 1 : 0) | 0;
        if (this.t > 0) {
            if (d == 0) {
                r = (this.a[0] % n) | 0;
            } else {
                for (let i: int = (this.t - 1) | 0; i >= 0; --i) {
                    r = ((d * r + this.a[i]) % n) | 0;
                }
            }
        }
        return r;
    }

    /**
     *
     * @param m
     * @return 1/this %m (HAC 14.61)
     *
     */
    public modInverse(m: BigInteger): BigInteger {
        let ac: boolean = m.isEven();
        if ((this.isEven() && ac) || m.sigNum() == 0) {
            return BigInteger.ZERO;
        }
        let u: BigInteger = m.clone();
        let v: BigInteger = this.clone();
        let a: BigInteger = BigInteger.nbv(1);
        let b: BigInteger = BigInteger.nbv(0);
        let c: BigInteger = BigInteger.nbv(0);
        let d: BigInteger = BigInteger.nbv(1);
        while (u.sigNum() != 0) {
            while (u.isEven()) {
                u.rShiftTo(1, u);
                if (ac) {
                    if (!a.isEven() || !b.isEven()) {
                        a.addTo(this, a);
                        b.subTo(m, b);
                    }
                    a.rShiftTo(1, a);
                } else if (!b.isEven()) {
                    b.subTo(m, b);
                }
                b.rShiftTo(1, b);
            }
            while (v.isEven()) {
                v.rShiftTo(1, v);
                if (ac) {
                    if (!c.isEven() || !d.isEven()) {
                        c.addTo(this, c);
                        d.subTo(m, d);
                    }
                    c.rShiftTo(1, c);
                } else if (!d.isEven()) {
                    d.subTo(m, d);
                }
                d.rShiftTo(1, d);
            }
            if (u.compareTo(v) >= 0) {
                u.subTo(v, u);
                if (ac) {
                    a.subTo(c, a);
                }
                b.subTo(d, b);
            } else {
                v.subTo(u, v);
                if (ac) {
                    c.subTo(a, c);
                }
                d.subTo(b, d);
            }
        }
        if (v.compareTo(BigInteger.ONE) != 0) {
            return BigInteger.ZERO;
        }
        if (d.compareTo(m) >= 0) {
            return d.subtract(m);
        }
        if (d.sigNum() < 0) {
            d.addTo(m, d);
        } else {
            return d;
        }
        if (d.sigNum() < 0) {
            return d.add(m);
        } else {
            return d;
        }
    }

    /**
     *
     * @param t
     * @return primality with certainty >= 1-.5^t
     *
     */
    public isProbablePrime(t: int): boolean {
        let i: int = 0;
        let x: BigInteger = this.abs();
        if (x.t == 1 && x.a[0] <= BigInteger.lowprimes[BigInteger.lowprimes.length - 1]) {
            for (i = 0; i < BigInteger.lowprimes.length; ++i) {
                if (x[0] == BigInteger.lowprimes[i]) {
                    return true;
                }
            }
            return false;
        }
        if (x.isEven()) {
            return false;
        }
        i = 1;
        while (i < BigInteger.lowprimes.length) {
            let m: int = BigInteger.lowprimes[i] | 0;
            let j: int = (i + 1) | 0;
            while (j < BigInteger.lowprimes.length && m < BigInteger.lplim) {
                m = (m * BigInteger.lowprimes[j++]) | 0;
            }
            m = x.modInt(m);
            while (i < j) {
                if (m % BigInteger.lowprimes[i++] == 0) {
                    return false;
                }
            }
        }
        return x.millerRabin(t);
    }

    /**
     *
     * @param t
     * @return true if probably prime (HAC 4.24, Miller-Rabin)
     *
     */
    protected millerRabin(t: int): boolean {
        let n1: BigInteger = this.subtract(BigInteger.ONE);
        let k: int = n1.getLowestSetBit();
        if (k <= 0) {
            return false;
        }
        let r: BigInteger = n1.shiftRight(k);
        t = (t + 1) >> 1;
        if (t > BigInteger.lowprimes.length) {
            t = BigInteger.lowprimes.length;
        }
        let a: BigInteger = new BigInteger();
        for (let i: int = 0; i < t; ++i) {
            a.fromInt(BigInteger.lowprimes[i] | 0);
            let y: BigInteger = a.modPow(r, this);
            if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
                let j: int = 1;
                while (j++ < k && y.compareTo(n1) != 0) {
                    y = y.modPowInt(2, this);
                    if (y.compareTo(BigInteger.ONE) == 0) {
                        return false;
                    }
                }
                if (y.compareTo(n1) != 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Tweak our BigInteger until it looks prime enough
     *
     * @param bits
     * @param t
     *
     */
    public primify(bits: int, t: int): void {
        if (!this.testBit((bits - 1) | 0)) {
            // force MSB set
            this.bitwiseTo(BigInteger.ONE.shiftLeft((bits - 1) | 0), as3.bind(this, this.op_or), this);
        }
        if (this.isEven()) {
            this.dAddOffset(1, 0);
        }
        while (!this.isProbablePrime(t)) {
            this.dAddOffset(2, 0);
            while (this.bitLength() > bits) {
                this.subTo(BigInteger.ONE.shiftLeft((bits - 1) | 0), this);
            }
        }
    }
}

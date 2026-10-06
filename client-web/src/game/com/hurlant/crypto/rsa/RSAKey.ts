import * as as3 from "as3";
import { ASObject, int, trace, uint } from "as3";
import { ByteArray } from "flash/utils";
import { BigInteger, Memory, Random, TLSError } from "@game";

/**
 * Current limitations:
 * exponent must be smaller than 2^31.
 */
export class RSAKey extends ASObject {
    static {
        as3.fields(this, { e: 0, n: null, d: null, p: null, q: null, dmp1: null, dmq1: null, coeff: null, canDecrypt: false, canEncrypt: false });
    }

    // public key
    public e: int;
    // public exponent. must be <2^31
    public n: BigInteger;
    // modulus
    // private key
    public d: BigInteger;
    // extended private key
    public p: BigInteger;
    public q: BigInteger;
    public dmp1: BigInteger;
    public dmq1: BigInteger;
    public coeff: BigInteger;
    // flags. flags are cool.
    protected canDecrypt: boolean;
    protected canEncrypt: boolean;

    public $ctor(N?: BigInteger, E?: int, D: BigInteger = null, P: BigInteger = null, Q: BigInteger = null, DP: BigInteger = null, DQ: BigInteger = null, C: BigInteger = null): void {
        super.$ctor();
        this.n = N;
        this.e = E;
        this.d = D;
        this.p = P;
        this.q = Q;
        this.dmp1 = DP;
        this.dmq1 = DQ;
        this.coeff = C;

        // adjust a few flags.
        this.canEncrypt = (this.n != null && this.e != 0);
        this.canDecrypt = (this.canEncrypt && this.d != null);
    }

    public static parsePublicKey(N: string, E: string): RSAKey {
        return new RSAKey(new BigInteger(N, 16, true), parseInt(E, 16) | 0);
    }

    public static parsePrivateKey(N: string, E: string, D: string, P: string = null, Q: string = null, DMP1: string = null, DMQ1: string = null, IQMP: string = null): RSAKey {
        if (P == null) {
            return new RSAKey(new BigInteger(N, 16, true), parseInt(E, 16) | 0, new BigInteger(D, 16, true));
        } else {
            return new RSAKey(new BigInteger(N, 16, true), parseInt(E, 16) | 0, new BigInteger(D, 16, true), new BigInteger(P, 16, true), new BigInteger(Q, 16, true), new BigInteger(DMP1, 16, true), new BigInteger(DMQ1, 16, true), new BigInteger(IQMP, 16, true));
        }
    }

    public getBlockSize(): uint {
        return ((this.n.bitLength() + 7) / 8) >>> 0;
    }

    public dispose(): void {
        this.e = 0;
        this.n.dispose();
        this.n = null;
        Memory.gc();
    }

    public encrypt(src: ByteArray, dst: ByteArray, length: uint, pad: Function = null): void {
        this._encrypt(as3.bind(this, this.doPublic), src, dst, length, pad, 0x02);
    }

    public decrypt(src: ByteArray, dst: ByteArray, length: uint, pad: Function = null): void {
        this._decrypt(as3.bind(this, this.doPrivate2), src, dst, length, pad, 0x02);
    }

    public sign(src: ByteArray, dst: ByteArray, length: uint, pad: Function = null): void {
        this._encrypt(as3.bind(this, this.doPrivate2), src, dst, length, pad, 0x01);
    }

    public verify(src: ByteArray, dst: ByteArray, length: uint, pad: Function = null): void {
        this._decrypt(as3.bind(this, this.doPublic), src, dst, length, pad, 0x01);
    }

    private _encrypt(op: Function, src: ByteArray, dst: ByteArray, length: uint, pad: Function, padType: int): void {
        // adjust pad if needed
        if (pad == null) {
            pad = as3.bind(this, this.pkcs1pad);
        }
        // convert src to BigInteger
        if (src.position >= src.length) {
            src.position = 0;
        }
        let bl: uint = this.getBlockSize();
        let end: int = (src.position + length) | 0;
        while (src.position < end) {
            let block: BigInteger = new BigInteger(pad(src, end, bl, padType), bl, true);
            let chunk: BigInteger = as3.cast(op(block), BigInteger);
            chunk.toArray(dst);
        }
    }

    private _decrypt(op: Function, src: ByteArray, dst: ByteArray, length: uint, pad: Function, padType: int): void {
        // adjust pad if needed
        if (pad == null) {
            pad = as3.bind(this, this.pkcs1unpad);
        }

        // convert src to BigInteger
        if (src.position >= src.length) {
            src.position = 0;
        }
        let bl: uint = this.getBlockSize();
        let end: int = (src.position + length) | 0;
        while (src.position < end) {
            let block: BigInteger = new BigInteger(src, bl, true);
            let chunk: BigInteger = as3.cast(op(block), BigInteger);
            let b: ByteArray = as3.cast(pad(chunk, bl, padType), ByteArray);
            if (b == null) {
                throw new TLSError("Decrypt error - padding function returned null!", TLSError.decode_error);
            }
            // if (b != null)
            dst.writeBytes(b);
        }
    }

    /**
     * PKCS#1 pad. type 1 (0xff) or 2, random.
     * puts as much data from src into it, leaves what doesn't fit alone.
     */
    private pkcs1pad(src: ByteArray, end: int, n: uint, type: uint = 2): ByteArray {
        let out: ByteArray = new ByteArray();
        let p: uint = src.position;
        end = Math.min(end, src.length, p + n - 11) | 0;
        src.position = end >>> 0;
        let i: int = (end - 1) | 0;
        while (i >= p && n > 11) {
            out[--n] = src[i--];
        }
        out[--n] = 0;
        if (type == 0x02) {
            // type 2
            let rng: Random = new Random();
            let x: int = 0;
            while (n > 2) {
                do {
                    x = rng.nextByte();
                } while (x == 0);
                out[--n] = x;
            }
        } else {
            // type 1
            while (n > 2) {
                out[--n] = 0xFF;
            }
        }
        out[--n] = type;
        out[--n] = 0;
        return out;
    }

    /**
     *
     * @param src
     * @param n
     * @param type Not used.
     * @return
     *
     */
    private pkcs1unpad(src: BigInteger, n: uint, type: uint = 2): ByteArray {
        let b: ByteArray = src.toByteArray();
        let out: ByteArray = new ByteArray();

        b.position = 0;
        let i: int = 0;
        while (i < b.length && b[i] == 0) {
            ++i;
        }
        if (b.length - i != n - 1 || b[i] != type) {
            trace("PKCS#1 unpad: i=" + i + ", expected b[i]==" + type + ", got b[i]=" + b[i].toString(16));
            return null;
        }
        ++i;
        while (b[i] != 0) {
            if (++i >= b.length) {
                trace("PKCS#1 unpad: i=" + i + ", b[i-1]!=0 (=" + b[i - 1].toString(16) + ")");
                return null;
            }
        }
        while (++i < b.length) {
            out.writeByte(b[i] | 0);
        }
        out.position = 0;
        return out;
    }

    /**
     * Raw pad.
     */
    public rawpad(src: ByteArray, end: int, n: uint, type: uint = 0): ByteArray {
        return src;
    }

    public rawunpad(src: BigInteger, n: uint, type: uint = 0): ByteArray {
        return src.toByteArray();
    }

    public toString(): string {
        return "rsa";
    }

    public dump(): string {
        let s: string = "N=" + this.n.toString(16) + "\n" + "E=" + this.e.toString(16) + "\n";
        if (this.canDecrypt) {
            s += "D=" + this.d.toString(16) + "\n";
            if (this.p != null && this.q != null) {
                s += "P=" + this.p.toString(16) + "\n";
                s += "Q=" + this.q.toString(16) + "\n";
                s += "DMP1=" + this.dmp1.toString(16) + "\n";
                s += "DMQ1=" + this.dmq1.toString(16) + "\n";
                s += "IQMP=" + this.coeff.toString(16) + "\n";
            }
        }
        return s;
    }

    /**
     *
     * note: We should have a "nice" variant of this function that takes a callback,
     * 		and perform the computation is small fragments, to keep the web browser
     * 		usable.
     *
     * @param B
     * @param E
     * @return a new random private key B bits long, using public expt E
     *
     */
    public static generate(B: uint, E: string): RSAKey {
        let rng: Random = new Random();
        let qs: uint = (B >> 1) >>> 0;
        let key: RSAKey = new RSAKey(null, 0, null);
        key.e = parseInt(E, 16) | 0;
        let ee: BigInteger = new BigInteger(E, 16, true);
        for (; ; ) {
            for (; ; ) {
                key.p = RSAKey.bigRandom((B - qs) | 0, rng);
                if (key.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && key.p.isProbablePrime(10)) {
                    break;
                }
            }
            for (; ; ) {
                key.q = RSAKey.bigRandom(qs, rng);
                if (key.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && key.q.isProbablePrime(10)) {
                    break;
                }
            }
            if (key.p.compareTo(key.q) <= 0) {
                let t: BigInteger = key.p;
                key.p = key.q;
                key.q = t;
            }
            let p1: BigInteger = key.p.subtract(BigInteger.ONE);
            let q1: BigInteger = key.q.subtract(BigInteger.ONE);
            let phi: BigInteger = p1.multiply(q1);
            if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
                key.n = key.p.multiply(key.q);
                key.d = ee.modInverse(phi);
                key.dmp1 = key.d.mod(p1);
                key.dmq1 = key.d.mod(q1);
                key.coeff = key.q.modInverse(key.p);
                break;
            }
        }
        return key;
    }

    protected static bigRandom(bits: int, rnd: Random): BigInteger {
        if (bits < 2) {
            return BigInteger.nbv(1);
        }
        let x: ByteArray = new ByteArray();
        rnd.nextBytes(x, (bits >> 3));
        x.position = 0;
        let b: BigInteger = new BigInteger(x, 0, true);
        b.primify(bits, 1);
        return b;
    }

    protected doPublic(x: BigInteger): BigInteger {
        return x.modPowInt(this.e, this.n);
    }

    protected doPrivate2(x: BigInteger): BigInteger {
        if (this.p == null && this.q == null) {
            return x.modPow(this.d, this.n);
        }

        let xp: BigInteger = x.mod(this.p).modPow(this.dmp1, this.p);
        let xq: BigInteger = x.mod(this.q).modPow(this.dmq1, this.q);

        while (xp.compareTo(xq) < 0) {
            xp = xp.add(this.p);
        }
        let r: BigInteger = xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);

        return r;
    }

    protected doPrivate(x: BigInteger): BigInteger {
        if (this.p == null || this.q == null) {
            return x.modPow(this.d, this.n);
        }
        // TODO: re-calculate any missing CRT params
        let xp: BigInteger = x.mod(this.p).modPow(this.dmp1, this.p);
        let xq: BigInteger = x.mod(this.q).modPow(this.dmq1, this.q);

        while (xp.compareTo(xq) < 0) {
            xp = xp.add(this.p);
        }
        return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
    }
}

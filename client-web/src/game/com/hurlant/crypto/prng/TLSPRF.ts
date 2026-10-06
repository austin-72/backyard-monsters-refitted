import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray, IDataOutput } from "flash/utils";
import { HMAC, MD5, Memory, SHA1 } from "@game";

/**
 * There's "Random", and then there's TLS Random.
 * .
 * Still Pseudo-random, though.
 */
export class TLSPRF extends ASObject {
    static {
        as3.fields(this, { seed: null, s1: null, s2: null, a1: null, a2: null, p1: null, p2: null, d1: null, d2: null, hmac_md5: null, hmac_sha1: null });
    }

    // XXX WAY TOO MANY STRUCTURES HERE
    // seed
    private seed: ByteArray;
    // P_MD5's secret
    private s1: ByteArray;
    // P_SHA-1's secret
    private s2: ByteArray;
    // HMAC_MD5's A
    private a1: ByteArray;
    // HMAC_SHA1's A
    private a2: ByteArray;
    // Pool for P_MD5
    private p1: ByteArray;
    // Pool for P_SHA1
    private p2: ByteArray;
    // Data for HMAC_MD5
    private d1: ByteArray;
    // Data for HMAC_SHA1
    private d2: ByteArray;
    private hmac_md5: HMAC;
    private hmac_sha1: HMAC;

    public $ctor(secret?: ByteArray, label?: string, seed?: ByteArray): void {
        super.$ctor();
        let l: int = Math.ceil(secret.length / 2) | 0;
        let s1: ByteArray = new ByteArray();
        let s2: ByteArray = new ByteArray();
        s1.writeBytes(secret, 0, l >>> 0);
        s2.writeBytes(secret, (secret.length - l) >>> 0, l >>> 0);
        let s: ByteArray = new ByteArray();
        s.writeUTFBytes(label);
        s.writeBytes(seed);
        this.seed = s;
        this.s1 = s1;
        this.s2 = s2;
        this.hmac_md5 = new HMAC(new MD5());
        this.hmac_sha1 = new HMAC(new SHA1());

        this.a1 = this.hmac_md5.compute(s1, this.seed);
        this.a2 = this.hmac_sha1.compute(s2, this.seed);

        this.p1 = new ByteArray();
        this.p2 = new ByteArray();

        this.d1 = new ByteArray();
        this.d2 = new ByteArray();
        this.d1.position = MD5.HASH_SIZE >>> 0;
        this.d1.writeBytes(this.seed);
        this.d2.position = SHA1.HASH_SIZE >>> 0;
        this.d2.writeBytes(this.seed);
    }

    // XXX HORRIBLY SLOW. REWRITE.
    public nextBytes(buffer: IDataOutput, length: int): void {
        while (length--) {
            buffer.writeByte(this.nextByte());
        }
    }

    public nextByte(): int {
        if (this.p1.bytesAvailable == 0) {
            this.more_md5();
        }
        if (this.p2.bytesAvailable == 0) {
            this.more_sha1();
        }
        return this.p1.readUnsignedByte() ^ this.p2.readUnsignedByte();
    }

    public dispose(): void {
        this.seed = this.dba(this.seed);
        this.s1 = this.dba(this.s1);
        this.s2 = this.dba(this.s2);
        this.a1 = this.dba(this.a1);
        this.a2 = this.dba(this.a2);
        this.p1 = this.dba(this.p1);
        this.p2 = this.dba(this.p2);
        this.d1 = this.dba(this.d1);
        this.d2 = this.dba(this.d2);
        this.hmac_md5.dispose();
        this.hmac_md5 = null;
        this.hmac_sha1.dispose();
        this.hmac_sha1 = null;
        Memory.gc();
    }

    public toString(): string {
        return "tls-prf";
    }

    private dba(ba: ByteArray): ByteArray {
        for (let i: uint = 0; i < ba.length; i++) {
            ba[i] = 0;
        }
        ba.length = 0;
        return null;
    }

    private more_md5(): void {
        this.d1.position = 0;
        this.d1.writeBytes(this.a1);
        let p: int = this.p1.position;
        let more: ByteArray = this.hmac_md5.compute(this.s1, this.d1);
        this.a1 = this.hmac_md5.compute(this.s1, this.a1);
        this.p1.writeBytes(more);
        this.p1.position = p >>> 0;
    }

    private more_sha1(): void {
        this.d2.position = 0;
        this.d2.writeBytes(this.a2);
        let p: int = this.p2.position;
        let more: ByteArray = this.hmac_sha1.compute(this.s2, this.d2);
        this.a2 = this.hmac_sha1.compute(this.s2, this.a2);
        this.p2.writeBytes(more);
        this.p2.position = p >>> 0;
    }
}

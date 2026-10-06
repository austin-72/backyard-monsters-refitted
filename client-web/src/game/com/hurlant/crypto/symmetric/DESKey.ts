import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { ISymmetricKey, Memory } from "@game";

export class DESKey extends ASObject implements ISymmetricKey {
    static {
        as3.implement(this, [ISymmetricKey]);
        as3.fields(this, { key: null, encKey: null, decKey: null });
    }

    /**
     * what follows is mainly taken from "Applied Cryptography", by Bruce
     * Schneier, however it also bears great resemblance to Richard
     * Outerbridge's D3DES...
     */
    private static readonly Df_Key: any[] = [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67];

    private static readonly bytebit: any[] = [128, 64, 32, 16, 8, 4, 2, 1];

    private static readonly bigbyte: any[] = [0x800000, 0x400000, 0x200000, 0x100000, 0x80000, 0x40000, 0x20000, 0x10000, 0x8000, 0x4000, 0x2000, 0x1000, 0x800, 0x400, 0x200, 0x100, 0x80, 0x40, 0x20, 0x10, 0x8, 0x4, 0x2, 0x1];

    /*
     * Use the key schedule specified in the Standard (ANSI X3.92-1981).
     */
    private static readonly pc1: any[] = [56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3];

    private static readonly totrot: any[] = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];

    private static readonly pc2: any[] = [13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3, 25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29, 39, 50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31];

    private static readonly SP1: any[] = [0x01010400, 0x00000000, 0x00010000, 0x01010404, 0x01010004, 0x00010404, 0x00000004, 0x00010000, 0x00000400, 0x01010400, 0x01010404, 0x00000400, 0x01000404, 0x01010004, 0x01000000, 0x00000004, 0x00000404, 0x01000400, 0x01000400, 0x00010400, 0x00010400, 0x01010000, 0x01010000, 0x01000404, 0x00010004, 0x01000004, 0x01000004, 0x00010004, 0x00000000, 0x00000404, 0x00010404, 0x01000000, 0x00010000, 0x01010404, 0x00000004, 0x01010000, 0x01010400, 0x01000000, 0x01000000, 0x00000400, 0x01010004, 0x00010000, 0x00010400, 0x01000004, 0x00000400, 0x00000004, 0x01000404, 0x00010404, 0x01010404, 0x00010004, 0x01010000, 0x01000404, 0x01000004, 0x00000404, 0x00010404, 0x01010400, 0x00000404, 0x01000400, 0x01000400, 0x00000000, 0x00010004, 0x00010400, 0x00000000, 0x01010004];

    private static readonly SP2: any[] = [0x80108020, 0x80008000, 0x00008000, 0x00108020, 0x00100000, 0x00000020, 0x80100020, 0x80008020, 0x80000020, 0x80108020, 0x80108000, 0x80000000, 0x80008000, 0x00100000, 0x00000020, 0x80100020, 0x00108000, 0x00100020, 0x80008020, 0x00000000, 0x80000000, 0x00008000, 0x00108020, 0x80100000, 0x00100020, 0x80000020, 0x00000000, 0x00108000, 0x00008020, 0x80108000, 0x80100000, 0x00008020, 0x00000000, 0x00108020, 0x80100020, 0x00100000, 0x80008020, 0x80100000, 0x80108000, 0x00008000, 0x80100000, 0x80008000, 0x00000020, 0x80108020, 0x00108020, 0x00000020, 0x00008000, 0x80000000, 0x00008020, 0x80108000, 0x00100000, 0x80000020, 0x00100020, 0x80008020, 0x80000020, 0x00100020, 0x00108000, 0x00000000, 0x80008000, 0x00008020, 0x80000000, 0x80100020, 0x80108020, 0x00108000];

    private static readonly SP3: any[] = [0x00000208, 0x08020200, 0x00000000, 0x08020008, 0x08000200, 0x00000000, 0x00020208, 0x08000200, 0x00020008, 0x08000008, 0x08000008, 0x00020000, 0x08020208, 0x00020008, 0x08020000, 0x00000208, 0x08000000, 0x00000008, 0x08020200, 0x00000200, 0x00020200, 0x08020000, 0x08020008, 0x00020208, 0x08000208, 0x00020200, 0x00020000, 0x08000208, 0x00000008, 0x08020208, 0x00000200, 0x08000000, 0x08020200, 0x08000000, 0x00020008, 0x00000208, 0x00020000, 0x08020200, 0x08000200, 0x00000000, 0x00000200, 0x00020008, 0x08020208, 0x08000200, 0x08000008, 0x00000200, 0x00000000, 0x08020008, 0x08000208, 0x00020000, 0x08000000, 0x08020208, 0x00000008, 0x00020208, 0x00020200, 0x08000008, 0x08020000, 0x08000208, 0x00000208, 0x08020000, 0x00020208, 0x00000008, 0x08020008, 0x00020200];

    private static readonly SP4: any[] = [0x00802001, 0x00002081, 0x00002081, 0x00000080, 0x00802080, 0x00800081, 0x00800001, 0x00002001, 0x00000000, 0x00802000, 0x00802000, 0x00802081, 0x00000081, 0x00000000, 0x00800080, 0x00800001, 0x00000001, 0x00002000, 0x00800000, 0x00802001, 0x00000080, 0x00800000, 0x00002001, 0x00002080, 0x00800081, 0x00000001, 0x00002080, 0x00800080, 0x00002000, 0x00802080, 0x00802081, 0x00000081, 0x00800080, 0x00800001, 0x00802000, 0x00802081, 0x00000081, 0x00000000, 0x00000000, 0x00802000, 0x00002080, 0x00800080, 0x00800081, 0x00000001, 0x00802001, 0x00002081, 0x00002081, 0x00000080, 0x00802081, 0x00000081, 0x00000001, 0x00002000, 0x00800001, 0x00002001, 0x00802080, 0x00800081, 0x00002001, 0x00002080, 0x00800000, 0x00802001, 0x00000080, 0x00800000, 0x00002000, 0x00802080];

    private static readonly SP5: any[] = [0x00000100, 0x02080100, 0x02080000, 0x42000100, 0x00080000, 0x00000100, 0x40000000, 0x02080000, 0x40080100, 0x00080000, 0x02000100, 0x40080100, 0x42000100, 0x42080000, 0x00080100, 0x40000000, 0x02000000, 0x40080000, 0x40080000, 0x00000000, 0x40000100, 0x42080100, 0x42080100, 0x02000100, 0x42080000, 0x40000100, 0x00000000, 0x42000000, 0x02080100, 0x02000000, 0x42000000, 0x00080100, 0x00080000, 0x42000100, 0x00000100, 0x02000000, 0x40000000, 0x02080000, 0x42000100, 0x40080100, 0x02000100, 0x40000000, 0x42080000, 0x02080100, 0x40080100, 0x00000100, 0x02000000, 0x42080000, 0x42080100, 0x00080100, 0x42000000, 0x42080100, 0x02080000, 0x00000000, 0x40080000, 0x42000000, 0x00080100, 0x02000100, 0x40000100, 0x00080000, 0x00000000, 0x40080000, 0x02080100, 0x40000100];

    private static readonly SP6: any[] = [0x20000010, 0x20400000, 0x00004000, 0x20404010, 0x20400000, 0x00000010, 0x20404010, 0x00400000, 0x20004000, 0x00404010, 0x00400000, 0x20000010, 0x00400010, 0x20004000, 0x20000000, 0x00004010, 0x00000000, 0x00400010, 0x20004010, 0x00004000, 0x00404000, 0x20004010, 0x00000010, 0x20400010, 0x20400010, 0x00000000, 0x00404010, 0x20404000, 0x00004010, 0x00404000, 0x20404000, 0x20000000, 0x20004000, 0x00000010, 0x20400010, 0x00404000, 0x20404010, 0x00400000, 0x00004010, 0x20000010, 0x00400000, 0x20004000, 0x20000000, 0x00004010, 0x20000010, 0x20404010, 0x00404000, 0x20400000, 0x00404010, 0x20404000, 0x00000000, 0x20400010, 0x00000010, 0x00004000, 0x20400000, 0x00404010, 0x00004000, 0x00400010, 0x20004010, 0x00000000, 0x20404000, 0x20000000, 0x00400010, 0x20004010];

    private static readonly SP7: any[] = [0x00200000, 0x04200002, 0x04000802, 0x00000000, 0x00000800, 0x04000802, 0x00200802, 0x04200800, 0x04200802, 0x00200000, 0x00000000, 0x04000002, 0x00000002, 0x04000000, 0x04200002, 0x00000802, 0x04000800, 0x00200802, 0x00200002, 0x04000800, 0x04000002, 0x04200000, 0x04200800, 0x00200002, 0x04200000, 0x00000800, 0x00000802, 0x04200802, 0x00200800, 0x00000002, 0x04000000, 0x00200800, 0x04000000, 0x00200800, 0x00200000, 0x04000802, 0x04000802, 0x04200002, 0x04200002, 0x00000002, 0x00200002, 0x04000000, 0x04000800, 0x00200000, 0x04200800, 0x00000802, 0x00200802, 0x04200800, 0x00000802, 0x04000002, 0x04200802, 0x04200000, 0x00200800, 0x00000000, 0x00000002, 0x04200802, 0x00000000, 0x00200802, 0x04200000, 0x00000800, 0x04000002, 0x04000800, 0x00000800, 0x00200002];

    private static readonly SP8: any[] = [0x10001040, 0x00001000, 0x00040000, 0x10041040, 0x10000000, 0x10001040, 0x00000040, 0x10000000, 0x00040040, 0x10040000, 0x10041040, 0x00041000, 0x10041000, 0x00041040, 0x00001000, 0x00000040, 0x10040000, 0x10000040, 0x10001000, 0x00001040, 0x00041000, 0x00040040, 0x10040040, 0x10041000, 0x00001040, 0x00000000, 0x00000000, 0x10040040, 0x10000040, 0x10001000, 0x00041040, 0x00040000, 0x00041040, 0x00040000, 0x10041000, 0x00001000, 0x00000040, 0x10040040, 0x00001000, 0x00041040, 0x10001000, 0x00000040, 0x10000040, 0x10040000, 0x10040040, 0x10000000, 0x00040000, 0x10001040, 0x00000000, 0x10041040, 0x00040040, 0x10000040, 0x10040000, 0x10001000, 0x10001040, 0x00000000, 0x10041040, 0x00041000, 0x00041000, 0x00001040, 0x00001040, 0x00040040, 0x10000000, 0x10041000];
    protected key: ByteArray;
    protected encKey: any[];
    protected decKey: any[];

    public $ctor(key?: ByteArray): void {
        super.$ctor();
        this.key = key;
        this.encKey = this.generateWorkingKey(true, key, 0);
        this.decKey = this.generateWorkingKey(false, key, 0);
    }

    public getBlockSize(): uint {
        return 8;
    }

    public decrypt(block: ByteArray, index: uint = 0): void {
        this.desFunc(this.decKey, block, index, block, index);
    }

    public dispose(): void {
        let i: uint = 0;
        for (i = 0; i < this.encKey.length; i++) {
            this.encKey[i] = 0;
        }
        for (i = 0; i < this.decKey.length; i++) {
            this.decKey[i] = 0;
        }
        this.encKey = null;
        this.decKey = null;
        for (i = 0; i < this.key.length; i++) {
            this.key[i] = 0;
        }
        this.key.length = 0;
        this.key = null;
        Memory.gc();
    }

    public encrypt(block: ByteArray, index: uint = 0): void {
        this.desFunc(this.encKey, block, index, block, index);
    }

    /**
     * generate an integer based working key based on our secret key and what we
     * processing we are planning to do.
     *
     * Acknowledgements for this routine go to James Gillogly & Phil Karn.
     */
    protected generateWorkingKey(encrypting: boolean, key: ByteArray, off: uint): any[] {
        let j: uint = 0;
        let i: uint = 0;
        let m: uint = 0;
        let n: uint = 0;
        let i1: uint = 0;
        let i2: uint = 0;
        // int[] newKey = new int[32];
        let newKey: any[] = [];
        // boolean[] pc1m = new boolean[56], pcr = new boolean[56];
        let pc1m: ByteArray = new ByteArray();
        let pcr: ByteArray = new ByteArray();

        let l: uint = 0;

        for (j = 0; j < 56; j++) {
            l = DESKey.pc1[j] >>> 0;

            pc1m[j] = ((key[off + (l >>> 3)] & DESKey.bytebit[l & 7]) != 0);
        }

        for (i = 0; i < 16; i++) {
            if (encrypting) {
                m = (i << 1) >>> 0;
            } else {
                m = ((15 - i) << 1) >>> 0;
            }

            n = (m + 1) >>> 0;
            newKey[m] = newKey[n] = 0;

            for (j = 0; j < 28; j++) {
                l = (j + DESKey.totrot[i]) >>> 0;
                if (l < 28) {
                    pcr[j] = pc1m[l];
                } else {
                    pcr[j] = pc1m[l - 28];
                }
            }

            for (j = 28; j < 56; j++) {
                l = (j + DESKey.totrot[i]) >>> 0;
                if (l < 56) {
                    pcr[j] = pc1m[l];
                } else {
                    pcr[j] = pc1m[l - 28];
                }
            }

            for (j = 0; j < 24; j++) {
                if (pcr[DESKey.pc2[j]]) {
                    newKey[m] |= DESKey.bigbyte[j];
                }

                if (pcr[DESKey.pc2[j + 24]]) {
                    newKey[n] |= DESKey.bigbyte[j];
                }
            }
        }

        //
        // store the processed key
        //
        for (i = 0; i != 32; i = (i + 2) >>> 0) {
            i1 = newKey[i] >>> 0;
            i2 = newKey[i + 1] >>> 0;

            newKey[i] = ((i1 & 0x00fc0000) << 6) | ((i1 & 0x00000fc0) << 10) | ((i2 & 0x00fc0000) >>> 10) | ((i2 & 0x00000fc0) >>> 6);

            newKey[i + 1] = ((i1 & 0x0003f000) << 12) | ((i1 & 0x0000003f) << 16) | ((i2 & 0x0003f000) >>> 4) | (i2 & 0x0000003f);
        }
        return newKey;
    }

    /**
     * the DES engine.
     */
    protected desFunc(wKey: any[], inp: ByteArray, inOff: uint, out: ByteArray, outOff: uint): void {
        let fval: uint = 0;
        let work: uint = 0;
        let right: uint = 0;
        let left: uint = 0;

        left = ((inp[inOff + 0] & 0xff) << 24) >>> 0;
        left = (left | (inp[inOff + 1] & 0xff) << 16) >>> 0;
        left = (left | (inp[inOff + 2] & 0xff) << 8) >>> 0;
        left = (left | (inp[inOff + 3] & 0xff)) >>> 0;

        right = ((inp[inOff + 4] & 0xff) << 24) >>> 0;
        right = (right | (inp[inOff + 5] & 0xff) << 16) >>> 0;
        right = (right | (inp[inOff + 6] & 0xff) << 8) >>> 0;
        right = (right | (inp[inOff + 7] & 0xff)) >>> 0;

        work = (((left >>> 4) ^ right) & 0x0f0f0f0f) >>> 0;
        right = (right ^ work) >>> 0;
        left = (left ^ (work << 4)) >>> 0;
        work = (((left >>> 16) ^ right) & 0x0000ffff) >>> 0;
        right = (right ^ work) >>> 0;
        left = (left ^ (work << 16)) >>> 0;
        work = (((right >>> 2) ^ left) & 0x33333333) >>> 0;
        left = (left ^ work) >>> 0;
        right = (right ^ (work << 2)) >>> 0;
        work = (((right >>> 8) ^ left) & 0x00ff00ff) >>> 0;
        left = (left ^ work) >>> 0;
        right = (right ^ (work << 8)) >>> 0;
        right = (((right << 1) | ((right >>> 31) & 1)) & 0xffffffff) >>> 0;
        work = ((left ^ right) & 0xaaaaaaaa) >>> 0;
        left = (left ^ work) >>> 0;
        right = (right ^ work) >>> 0;
        left = (((left << 1) | ((left >>> 31) & 1)) & 0xffffffff) >>> 0;

        for (let round: uint = 0; round < 8; round++) {
            work = ((right << 28) | (right >>> 4)) >>> 0;
            work = (work ^ wKey[round * 4 + 0]) >>> 0;
            fval = DESKey.SP7[work & 0x3f] >>> 0;
            fval = (fval | DESKey.SP5[(work >>> 8) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP3[(work >>> 16) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP1[(work >>> 24) & 0x3f]) >>> 0;
            work = (right ^ wKey[round * 4 + 1]) >>> 0;
            fval = (fval | DESKey.SP8[work & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP6[(work >>> 8) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP4[(work >>> 16) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP2[(work >>> 24) & 0x3f]) >>> 0;
            left = (left ^ fval) >>> 0;
            work = ((left << 28) | (left >>> 4)) >>> 0;
            work = (work ^ wKey[round * 4 + 2]) >>> 0;
            fval = DESKey.SP7[work & 0x3f] >>> 0;
            fval = (fval | DESKey.SP5[(work >>> 8) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP3[(work >>> 16) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP1[(work >>> 24) & 0x3f]) >>> 0;
            work = (left ^ wKey[round * 4 + 3]) >>> 0;
            fval = (fval | DESKey.SP8[work & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP6[(work >>> 8) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP4[(work >>> 16) & 0x3f]) >>> 0;
            fval = (fval | DESKey.SP2[(work >>> 24) & 0x3f]) >>> 0;
            right = (right ^ fval) >>> 0;
        }

        right = ((right << 31) | (right >>> 1)) >>> 0;
        work = ((left ^ right) & 0xaaaaaaaa) >>> 0;
        left = (left ^ work) >>> 0;
        right = (right ^ work) >>> 0;
        left = ((left << 31) | (left >>> 1)) >>> 0;
        work = (((left >>> 8) ^ right) & 0x00ff00ff) >>> 0;
        right = (right ^ work) >>> 0;
        left = (left ^ (work << 8)) >>> 0;
        work = (((left >>> 2) ^ right) & 0x33333333) >>> 0;
        right = (right ^ work) >>> 0;
        left = (left ^ (work << 2)) >>> 0;
        work = (((right >>> 16) ^ left) & 0x0000ffff) >>> 0;
        left = (left ^ work) >>> 0;
        right = (right ^ (work << 16)) >>> 0;
        work = (((right >>> 4) ^ left) & 0x0f0f0f0f) >>> 0;
        left = (left ^ work) >>> 0;
        right = (right ^ (work << 4)) >>> 0;

        out[outOff + 0] = ((right >>> 24) & 0xff);
        out[outOff + 1] = ((right >>> 16) & 0xff);
        out[outOff + 2] = ((right >>> 8) & 0xff);
        out[outOff + 3] = (right & 0xff);
        out[outOff + 4] = ((left >>> 24) & 0xff);
        out[outOff + 5] = ((left >>> 16) & 0xff);
        out[outOff + 6] = ((left >>> 8) & 0xff);
        out[outOff + 7] = (left & 0xff);
    }

    public toString(): string {
        return "des";
    }
}

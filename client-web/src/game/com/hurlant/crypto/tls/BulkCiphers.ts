import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { Crypto, ICipher, SSLPad, TLSPad, TLSSecurityParameters } from "@game";

export class BulkCiphers extends ASObject {
    static {
        as3.fields(this, { type: 0, keyBytes: 0, expandedKeyBytes: 0, effectiveKeyBits: 0, IVSize: 0, blockSize: 0 });
    }

    public static STREAM_CIPHER: uint; // const
    public static BLOCK_CIPHER: uint; // const

    public static NULL: uint; // const
    public static RC4_40: uint; // const
    public static RC4_128: uint; // const
    public static RC2_CBC_40: uint; // const
    // XXX I don't have that one.
    public static DES_CBC: uint; // const
    public static DES3_EDE_CBC: uint; // const
    public static DES40_CBC: uint; // const
    public static IDEA_CBC: uint; // const
    // XXX I don't have that one.
    public static AES_128: uint; // const
    public static AES_256: uint; // const

    private static algos: any[]; // const

    private static _props: any[];

    static {
        as3.lazyStatics(this, { STREAM_CIPHER: 0, BLOCK_CIPHER: 0, NULL: 0, RC4_40: 0, RC4_128: 0, RC2_CBC_40: 0, DES_CBC: 0, DES3_EDE_CBC: 0, DES40_CBC: 0, IDEA_CBC: 0, AES_128: 0, AES_256: 0, algos: null, _props: null }, () => {
            BulkCiphers.STREAM_CIPHER = 0;
            BulkCiphers.BLOCK_CIPHER = 1;
            BulkCiphers.NULL = 0;
            BulkCiphers.RC4_40 = 1;
            BulkCiphers.RC4_128 = 2;
            BulkCiphers.RC2_CBC_40 = 3;
            BulkCiphers.DES_CBC = 4;
            BulkCiphers.DES3_EDE_CBC = 5;
            BulkCiphers.DES40_CBC = 6;
            BulkCiphers.IDEA_CBC = 7;
            BulkCiphers.AES_128 = 8;
            BulkCiphers.AES_256 = 9;
            BulkCiphers.algos = ['', 'rc4', 'rc4', '', 'des-cbc', '3des-cbc', 'des-cbc', '', 'aes', 'aes'];

            BulkCiphers.init();
        });
    }
    private type: uint;
    private keyBytes: uint;
    private expandedKeyBytes: uint;
    private effectiveKeyBits: uint;
    private IVSize: uint;
    private blockSize: uint;

    public $ctor(t?: uint, kb?: uint, ekb?: uint, fkb?: uint, ivs?: uint, bs?: uint): void {
        super.$ctor();
        this.type = t;
        this.keyBytes = kb;
        this.expandedKeyBytes = ekb;
        this.effectiveKeyBits = fkb;
        this.IVSize = ivs;
        this.blockSize = bs;
    }

    private static init(): void {
        BulkCiphers._props = [];
        BulkCiphers._props[BulkCiphers.NULL] = new BulkCiphers(BulkCiphers.STREAM_CIPHER, 0, 0, 0, 0, 0);
        BulkCiphers._props[BulkCiphers.RC4_40] = new BulkCiphers(BulkCiphers.STREAM_CIPHER, 5, 16, 40, 0, 0);
        BulkCiphers._props[BulkCiphers.RC4_128] = new BulkCiphers(BulkCiphers.STREAM_CIPHER, 16, 16, 128, 0, 0);
        BulkCiphers._props[BulkCiphers.RC2_CBC_40] = new BulkCiphers(BulkCiphers.BLOCK_CIPHER, 5, 16, 40, 8, 8);
        BulkCiphers._props[BulkCiphers.DES_CBC] = new BulkCiphers(BulkCiphers.BLOCK_CIPHER, 8, 8, 56, 8, 8);
        BulkCiphers._props[BulkCiphers.DES3_EDE_CBC] = new BulkCiphers(BulkCiphers.BLOCK_CIPHER, 24, 24, 168, 8, 8);
        BulkCiphers._props[BulkCiphers.DES40_CBC] = new BulkCiphers(BulkCiphers.BLOCK_CIPHER, 5, 8, 40, 8, 8);
        BulkCiphers._props[BulkCiphers.IDEA_CBC] = new BulkCiphers(BulkCiphers.BLOCK_CIPHER, 16, 16, 128, 8, 8);
        BulkCiphers._props[BulkCiphers.AES_128] = new BulkCiphers(BulkCiphers.BLOCK_CIPHER, 16, 16, 128, 16, 16);
        BulkCiphers._props[BulkCiphers.AES_256] = new BulkCiphers(BulkCiphers.BLOCK_CIPHER, 32, 32, 256, 16, 16);
    }

    private static getProp(cipher: uint): BulkCiphers {
        let p: BulkCiphers = as3.cast(BulkCiphers._props[cipher], BulkCiphers);
        if (p == null) {
            throw new Error("Unknown bulk cipher " + cipher.toString(16));
        }
        return p;
    }

    public static getType(cipher: uint): uint {
        return BulkCiphers.getProp(cipher).type;
    }

    public static getKeyBytes(cipher: uint): uint {
        return BulkCiphers.getProp(cipher).keyBytes;
    }

    public static getExpandedKeyBytes(cipher: uint): uint {
        return BulkCiphers.getProp(cipher).expandedKeyBytes;
    }

    public static getEffectiveKeyBits(cipher: uint): uint {
        return BulkCiphers.getProp(cipher).effectiveKeyBits;
    }

    public static getIVSize(cipher: uint): uint {
        return BulkCiphers.getProp(cipher).IVSize;
    }

    public static getBlockSize(cipher: uint): uint {
        return BulkCiphers.getProp(cipher).blockSize;
    }

    public static getCipher(cipher: uint, key: ByteArray, proto: uint): ICipher {
        if (proto == TLSSecurityParameters.PROTOCOL_VERSION) {
            return Crypto.getCipher(as3.str(BulkCiphers.algos[cipher]), key, new TLSPad());
        } else {
            return Crypto.getCipher(as3.str(BulkCiphers.algos[cipher]), key, new SSLPad());
        }
    }
}

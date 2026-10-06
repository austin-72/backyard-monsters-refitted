import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { BulkCiphers, KeyExchanges, MACs } from "@game";

export class CipherSuites extends ASObject {
    static {
        as3.fields(this, { cipher: 0, hash: 0, key: 0 });
    }

    // only the lines marked "ok" are currently implemented.
    // rfc 2246
    public static TLS_NULL_WITH_NULL_NULL: uint; // const
    // ok
    public static TLS_RSA_WITH_NULL_MD5: uint; // const
    // ok
    public static TLS_RSA_WITH_NULL_SHA: uint; // const
    // ok
    public static TLS_RSA_WITH_RC4_128_MD5: uint; // const
    // ok
    public static TLS_RSA_WITH_RC4_128_SHA: uint; // const
    // ok
    public static TLS_RSA_WITH_IDEA_CBC_SHA: uint; // const
    public static TLS_RSA_WITH_DES_CBC_SHA: uint; // const
    // ok
    public static TLS_RSA_WITH_3DES_EDE_CBC_SHA: uint; // const

    // ok
    public static TLS_DH_DSS_WITH_DES_CBC_SHA: uint; // const
    public static TLS_DH_DSS_WITH_3DES_EDE_CBC_SHA: uint; // const
    public static TLS_DH_RSA_WITH_DES_CBC_SHA: uint; // const
    public static TLS_DH_RSA_WITH_3DES_EDE_CBC_SHA: uint; // const
    public static TLS_DHE_DSS_WITH_DES_CBC_SHA: uint; // const
    public static TLS_DHE_DSS_WITH_3DES_EDE_CBC_SHA: uint; // const
    public static TLS_DHE_RSA_WITH_DES_CBC_SHA: uint; // const
    public static TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA: uint; // const

    public static TLS_DH_anon_WITH_RC4_128_MD5: uint; // const
    public static TLS_DH_anon_WITH_DES_CBC_SHA: uint; // const
    public static TLS_DH_anon_WITH_3DES_EDE_CBC_SHA: uint; // const

    // rfc3268
    public static TLS_RSA_WITH_AES_128_CBC_SHA: uint; // const
    // ok
    public static TLS_DH_DSS_WITH_AES_128_CBC_SHA: uint; // const
    public static TLS_DH_RSA_WITH_AES_128_CBC_SHA: uint; // const
    public static TLS_DHE_DSS_WITH_AES_128_CBC_SHA: uint; // const
    public static TLS_DHE_RSA_WITH_AES_128_CBC_SHA: uint; // const
    public static TLS_DH_anon_WITH_AES_128_CBC_SHA: uint; // const

    public static TLS_RSA_WITH_AES_256_CBC_SHA: uint; // const
    // ok
    public static TLS_DH_DSS_WITH_AES_256_CBC_SHA: uint; // const
    public static TLS_DH_RSA_WITH_AES_256_CBC_SHA: uint; // const
    public static TLS_DHE_DSS_WITH_AES_256_CBC_SHA: uint; // const
    public static TLS_DHE_RSA_WITH_AES_256_CBC_SHA: uint; // const
    public static TLS_DH_anon_WITH_AES_256_CBC_SHA: uint; // const

    private static _props: any[];

    static {
        as3.lazyStatics(this, { TLS_NULL_WITH_NULL_NULL: 0, TLS_RSA_WITH_NULL_MD5: 0, TLS_RSA_WITH_NULL_SHA: 0, TLS_RSA_WITH_RC4_128_MD5: 0, TLS_RSA_WITH_RC4_128_SHA: 0, TLS_RSA_WITH_IDEA_CBC_SHA: 0, TLS_RSA_WITH_DES_CBC_SHA: 0, TLS_RSA_WITH_3DES_EDE_CBC_SHA: 0, TLS_DH_DSS_WITH_DES_CBC_SHA: 0, TLS_DH_DSS_WITH_3DES_EDE_CBC_SHA: 0, TLS_DH_RSA_WITH_DES_CBC_SHA: 0, TLS_DH_RSA_WITH_3DES_EDE_CBC_SHA: 0, TLS_DHE_DSS_WITH_DES_CBC_SHA: 0, TLS_DHE_DSS_WITH_3DES_EDE_CBC_SHA: 0, TLS_DHE_RSA_WITH_DES_CBC_SHA: 0, TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA: 0, TLS_DH_anon_WITH_RC4_128_MD5: 0, TLS_DH_anon_WITH_DES_CBC_SHA: 0, TLS_DH_anon_WITH_3DES_EDE_CBC_SHA: 0, TLS_RSA_WITH_AES_128_CBC_SHA: 0, TLS_DH_DSS_WITH_AES_128_CBC_SHA: 0, TLS_DH_RSA_WITH_AES_128_CBC_SHA: 0, TLS_DHE_DSS_WITH_AES_128_CBC_SHA: 0, TLS_DHE_RSA_WITH_AES_128_CBC_SHA: 0, TLS_DH_anon_WITH_AES_128_CBC_SHA: 0, TLS_RSA_WITH_AES_256_CBC_SHA: 0, TLS_DH_DSS_WITH_AES_256_CBC_SHA: 0, TLS_DH_RSA_WITH_AES_256_CBC_SHA: 0, TLS_DHE_DSS_WITH_AES_256_CBC_SHA: 0, TLS_DHE_RSA_WITH_AES_256_CBC_SHA: 0, TLS_DH_anon_WITH_AES_256_CBC_SHA: 0, _props: null }, () => {
            CipherSuites.TLS_NULL_WITH_NULL_NULL = 0;
            CipherSuites.TLS_RSA_WITH_NULL_MD5 = 1;
            CipherSuites.TLS_RSA_WITH_NULL_SHA = 2;
            CipherSuites.TLS_RSA_WITH_RC4_128_MD5 = 4;
            CipherSuites.TLS_RSA_WITH_RC4_128_SHA = 5;
            CipherSuites.TLS_RSA_WITH_IDEA_CBC_SHA = 7;
            CipherSuites.TLS_RSA_WITH_DES_CBC_SHA = 9;
            CipherSuites.TLS_RSA_WITH_3DES_EDE_CBC_SHA = 10;
            CipherSuites.TLS_DH_DSS_WITH_DES_CBC_SHA = 12;
            CipherSuites.TLS_DH_DSS_WITH_3DES_EDE_CBC_SHA = 13;
            CipherSuites.TLS_DH_RSA_WITH_DES_CBC_SHA = 15;
            CipherSuites.TLS_DH_RSA_WITH_3DES_EDE_CBC_SHA = 16;
            CipherSuites.TLS_DHE_DSS_WITH_DES_CBC_SHA = 18;
            CipherSuites.TLS_DHE_DSS_WITH_3DES_EDE_CBC_SHA = 19;
            CipherSuites.TLS_DHE_RSA_WITH_DES_CBC_SHA = 21;
            CipherSuites.TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA = 22;
            CipherSuites.TLS_DH_anon_WITH_RC4_128_MD5 = 24;
            CipherSuites.TLS_DH_anon_WITH_DES_CBC_SHA = 26;
            CipherSuites.TLS_DH_anon_WITH_3DES_EDE_CBC_SHA = 27;
            CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA = 47;
            CipherSuites.TLS_DH_DSS_WITH_AES_128_CBC_SHA = 48;
            CipherSuites.TLS_DH_RSA_WITH_AES_128_CBC_SHA = 49;
            CipherSuites.TLS_DHE_DSS_WITH_AES_128_CBC_SHA = 50;
            CipherSuites.TLS_DHE_RSA_WITH_AES_128_CBC_SHA = 51;
            CipherSuites.TLS_DH_anon_WITH_AES_128_CBC_SHA = 52;
            CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA = 53;
            CipherSuites.TLS_DH_DSS_WITH_AES_256_CBC_SHA = 54;
            CipherSuites.TLS_DH_RSA_WITH_AES_256_CBC_SHA = 55;
            CipherSuites.TLS_DHE_DSS_WITH_AES_256_CBC_SHA = 56;
            CipherSuites.TLS_DHE_RSA_WITH_AES_256_CBC_SHA = 57;
            CipherSuites.TLS_DH_anon_WITH_AES_256_CBC_SHA = 58;

            CipherSuites.init();
        });
    }
    public cipher: uint;
    public hash: uint;
    public key: uint;

    public $ctor(cipher?: uint, hash?: uint, key?: uint): void {
        super.$ctor();
        this.cipher = cipher;
        this.hash = hash;
        this.key = key;
    }

    private static init(): void {
        CipherSuites._props = [];
        CipherSuites._props[CipherSuites.TLS_NULL_WITH_NULL_NULL] = new CipherSuites(BulkCiphers.NULL, MACs.NULL, KeyExchanges.NULL);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_NULL_MD5] = new CipherSuites(BulkCiphers.NULL, MACs.MD5, KeyExchanges.RSA);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_NULL_SHA] = new CipherSuites(BulkCiphers.NULL, MACs.SHA1, KeyExchanges.RSA);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_RC4_128_MD5] = new CipherSuites(BulkCiphers.RC4_128, MACs.MD5, KeyExchanges.RSA);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_RC4_128_SHA] = new CipherSuites(BulkCiphers.RC4_128, MACs.SHA1, KeyExchanges.RSA);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_DES_CBC_SHA] = new CipherSuites(BulkCiphers.DES_CBC, MACs.SHA1, KeyExchanges.RSA);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_3DES_EDE_CBC_SHA] = new CipherSuites(BulkCiphers.DES3_EDE_CBC, MACs.SHA1, KeyExchanges.RSA);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA] = new CipherSuites(BulkCiphers.AES_128, MACs.SHA1, KeyExchanges.RSA);
        CipherSuites._props[CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA] = new CipherSuites(BulkCiphers.AES_256, MACs.SHA1, KeyExchanges.RSA);
    }

    private static getProp(cipher: uint): CipherSuites {
        let p: CipherSuites = as3.cast(CipherSuites._props[cipher], CipherSuites);
        if (p == null) {
            throw new Error("Unknown cipher " + cipher.toString(16));
        }
        return p;
    }

    public static getBulkCipher(cipher: uint): uint {
        return CipherSuites.getProp(cipher).cipher;
    }

    public static getMac(cipher: uint): uint {
        return CipherSuites.getProp(cipher).hash;
    }

    public static getKeyExchange(cipher: uint): uint {
        return CipherSuites.getProp(cipher).key;
    }

    public static getDefaultSuites(): any[] {
        // a list of acceptable ciphers, sorted by preference.
        return [CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA, CipherSuites.TLS_RSA_WITH_3DES_EDE_CBC_SHA, CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA, CipherSuites.TLS_RSA_WITH_RC4_128_SHA, CipherSuites.TLS_RSA_WITH_RC4_128_MD5, CipherSuites.TLS_RSA_WITH_DES_CBC_SHA];
    }
}

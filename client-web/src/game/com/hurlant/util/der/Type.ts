import * as as3 from "as3";
import { ASObject } from "as3";
import { Hex, Integer, Sequence } from "@game";

export class Type extends ASObject {
    public static TLS_CERT: any[]; // const
    public static CERTIFICATE: any[]; // const
    public static RSA_PUBLIC_KEY: any[]; // const
    public static RSA_SIGNATURE: any[]; // const

    static {
        as3.lazyStatics(this, { TLS_CERT: null, CERTIFICATE: null, RSA_PUBLIC_KEY: null, RSA_SIGNATURE: null }, () => {
            Type.TLS_CERT = [{ name: "signedCertificate", extract: true, value: [{ name: "versionHolder", optional: true, value: [{ name: "version" }], defaultValue: ((): Sequence => {
                let s: Sequence = new Sequence(0, 0);
                let v: Integer = new Integer(2, 1, Hex.toArray("00"));
                s.push(v);
                s.version = v;
                return s;
            })() }, { name: "serialNumber" }, { name: "signature", value: [{ name: "algorithmId" }] }, { name: "issuer", extract: true, value: [{ name: "type" }, { name: "value" }] }, { name: "validity", value: [{ name: "notBefore" }, { name: "notAfter" }] }, { name: "subject", extract: true, value: [] }, { name: "subjectPublicKeyInfo", value: [{ name: "algorithm", value: [{ name: "algorithmId" }] }, { name: "subjectPublicKey" }] }, { name: "extensions", value: [] }] }, { name: "algorithmIdentifier", value: [{ name: "algorithmId" }] }, { name: "encrypted", value: null }];
            Type.CERTIFICATE = [{ name: "tbsCertificate", value: [{ name: "tag0", value: [{ name: "version" }] }, { name: "serialNumber" }, { name: "signature" }, { name: "issuer", value: [{ name: "type" }, { name: "value" }] }, { name: "validity", value: [{ name: "notBefore" }, { name: "notAfter" }] }, { name: "subject" }, { name: "subjectPublicKeyInfo", value: [{ name: "algorithm" }, { name: "subjectPublicKey" }] }, { name: "issuerUniqueID" }, { name: "subjectUniqueID" }, { name: "extensions" }] }, { name: "signatureAlgorithm" }, { name: "signatureValue" }];
            Type.RSA_PUBLIC_KEY = [{ name: "modulus" }, { name: "publicExponent" }];
            Type.RSA_SIGNATURE = [{ name: "algorithm", value: [{ name: "algorithmId" }] }, { name: "hash" }];
        });
    }
}

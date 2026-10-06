import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ByteArray } from "flash/utils";
import { Base64, BigInteger, DER, OID, RSAKey } from "@game";

export class PEM extends ASObject {
    private static readonly RSA_PRIVATE_KEY_HEADER: string = "-----BEGIN RSA PRIVATE KEY-----";
    private static readonly RSA_PRIVATE_KEY_FOOTER: string = "-----END RSA PRIVATE KEY-----";
    private static readonly RSA_PUBLIC_KEY_HEADER: string = "-----BEGIN PUBLIC KEY-----";
    private static readonly RSA_PUBLIC_KEY_FOOTER: string = "-----END PUBLIC KEY-----";
    private static readonly CERTIFICATE_HEADER: string = "-----BEGIN CERTIFICATE-----";
    private static readonly CERTIFICATE_FOOTER: string = "-----END CERTIFICATE-----";

    /**
     *
     * Read a structure encoded according to
     * ftp://ftp.rsasecurity.com/pub/pkcs/ascii/pkcs-1v2.asc
     * section 11.1.2
     *
     * @param str
     * @return
     *
     */
    public static readRSAPrivateKey(str: string): RSAKey {
        let der: ByteArray = PEM.extractBinary(PEM.RSA_PRIVATE_KEY_HEADER, PEM.RSA_PRIVATE_KEY_FOOTER, str);
        if (der == null) {
            return null;
        }
        let obj: any = DER.parse(der);
        if (as3.is(obj, Array)) {
            let arr: any[] = as3.as(obj, Array);
            // arr[0] is Version. should be 0. should be checked. shoulda woulda coulda.
            return new RSAKey(as3.cast(arr[1], BigInteger), arr[2].valueOf() | 0, as3.cast(arr[3], BigInteger), as3.cast(arr[4], BigInteger), as3.cast(arr[5], BigInteger), as3.cast(arr[6], BigInteger), as3.cast(arr[7], BigInteger), as3.cast(arr[8], BigInteger));
        } else {
            // dunno
            return null;
        }
    }

    /**
     * Read a structure encoded according to some spec somewhere
     * Also, follows some chunk from
     * ftp://ftp.rsasecurity.com/pub/pkcs/ascii/pkcs-1v2.asc
     * section 11.1
     *
     * @param str
     * @return
     *
     */
    public static readRSAPublicKey(str: string): RSAKey {
        let der: ByteArray = PEM.extractBinary(PEM.RSA_PUBLIC_KEY_HEADER, PEM.RSA_PUBLIC_KEY_FOOTER, str);
        if (der == null) {
            return null;
        }
        let obj: any = DER.parse(der);
        if (as3.is(obj, Array)) {
            let arr: any[] = as3.as(obj, Array);
            // arr[0] = [ <some crap that means "rsaEncryption">, null ]; ( apparently, that's an X-509 Algorithm Identifier.
            if (arr[0][0].toString() != OID.RSA_ENCRYPTION) {
                return null;
            }
            // arr[1] is a ByteArray begging to be parsed as DER
            arr[1].position = 1;
            // there's a 0x00 byte up front. find out why later. like, read a spec.
            obj = DER.parse(as3.cast(arr[1], ByteArray));
            if (as3.is(obj, Array)) {
                arr = as3.as(obj, Array);
                // arr[0] = modulus
                // arr[1] = public expt.
                return new RSAKey(as3.cast(arr[0], BigInteger), arr[1] | 0);
            } else {
                return null;
            }
        } else {
            // dunno
            return null;
        }
    }

    public static readCertIntoArray(str: string): ByteArray {
        let tmp: ByteArray = PEM.extractBinary(PEM.CERTIFICATE_HEADER, PEM.CERTIFICATE_FOOTER, str);
        return tmp;
    }

    private static extractBinary(header: string, footer: string, str: string): ByteArray {
        let i: int = str.indexOf(header);
        if (i == -1) {
            return null;
        }
        i += header.length;
        let j: int = str.indexOf(footer);
        if (j == -1) {
            return null;
        }
        let b64: string = str.substring(i, j);
        // remove whitesapces.
        b64 = b64.replace(/\s/mg, '');
        // decode
        return Base64.decodeToByteArray(b64);
    }
}

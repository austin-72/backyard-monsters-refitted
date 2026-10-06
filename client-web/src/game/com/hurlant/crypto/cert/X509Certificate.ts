import * as as3 from "as3";
import { ASObject } from "as3";
import { ByteArray } from "flash/utils";
import { ArrayUtil, Base64, BigInteger, ByteString, DER, IHash, MD2, MD5, OID, ObjectIdentifier, PEM, PrintableString, RSAKey, SHA1, Sequence, Type, X509CertificateCollection } from "@game";

export class X509Certificate extends ASObject {
    static {
        as3.fields(this, { _loaded: false, _param: undefined, _obj: null });
    }

    private _loaded: boolean;
    private _param: any;
    private _obj: any;

    public $ctor(p?: any): void {
        super.$ctor();
        this._loaded = false;
        this._param = p;
    }

    private load(): void {
        if (this._loaded) {
            return;
        }
        let p: any = this._param;
        let b: ByteArray = null;
        if (as3.is(p, String)) {
            b = PEM.readCertIntoArray(as3.as(p, String));
        } else if (p instanceof ByteArray) {
            b = as3.cast(p, ByteArray);
        }
        if (b != null) {
            this._obj = DER.parse(b, Type.TLS_CERT);
            this._loaded = true;
        } else {
            throw new Error("Invalid x509 Certificate parameter: " + p);
        }
    }

    public isSigned(store: X509CertificateCollection, CAs: X509CertificateCollection, time: Date = null): boolean {
        this.load();
        // check timestamps first. cheapest.
        if (time == null) {
            time = new Date();
        }
        let notBefore: Date = this.getNotBefore();
        let notAfter: Date = this.getNotAfter();
        if (time.getTime() < notBefore.getTime()) {
            return false;
        }
        // cert isn't born yet.
        if (time.getTime() > notAfter.getTime()) {
            return false;
        }
        // cert died of old age.
        // check signature.
        let subject: string = this.getIssuerPrincipal();
        // try from CA first, since they're treated better.
        let parent: X509Certificate = CAs.getCertificate(subject);
        let parentIsAuthoritative: boolean = false;
        if (parent == null) {
            parent = store.getCertificate(subject);
            if (parent == null) {
                return false;
            }
        } else {
            parentIsAuthoritative = true;
        }
        if (parent == this) {
            // pathological case. avoid infinite loop
            return false;
        }
        if (!(parentIsAuthoritative && parent.isSelfSigned(time)) && !parent.isSigned(store, CAs, time)) {
            return false;
        }
        let key: RSAKey = parent.getPublicKey();
        return this.verifyCertificate(key);
    }

    public isSelfSigned(time: Date): boolean {
        this.load();

        let key: RSAKey = this.getPublicKey();
        return this.verifyCertificate(key);
    }

    private verifyCertificate(key: RSAKey): boolean {
        let algo: string = this.getAlgorithmIdentifier();
        let hash: IHash = null;
        let oid: string = null;
        switch (algo) {
            case OID.SHA1_WITH_RSA_ENCRYPTION:
                hash = new SHA1();
                oid = OID.SHA1_ALGORITHM;
                break;
            case OID.MD2_WITH_RSA_ENCRYPTION:
                hash = new MD2();
                oid = OID.MD2_ALGORITHM;
                break;
            case OID.MD5_WITH_RSA_ENCRYPTION:
                hash = new MD5();
                oid = OID.MD5_ALGORITHM;
                break;
            default:
                return false;
        }
        let data: ByteArray = as3.cast(this._obj.signedCertificate_bin, ByteArray);
        let buf: ByteArray = new ByteArray();
        key.verify(as3.cast(this._obj.encrypted, ByteArray), buf, this._obj.encrypted.length >>> 0);
        buf.position = 0;
        data = hash.hash(data);
        let obj: any = DER.parse(buf, Type.RSA_SIGNATURE);
        if (obj.algorithm.algorithmId.toString() != oid) {
            return false;
        }
        if (!ArrayUtil.equals(as3.cast(obj.hash, ByteArray), data)) {
            return false;
        }
        return true;
    }

    /**
     * This isn't used anywhere so far.
     * It would become useful if we started to offer facilities
     * to generate and sign X509 certificates.
     *
     * @param key
     * @param algo
     * @return
     *
     */
    private signCertificate(key: RSAKey, algo: string): ByteArray {
        let hash: IHash = null;
        let oid: string = null;
        switch (algo) {
            case OID.SHA1_WITH_RSA_ENCRYPTION:
                hash = new SHA1();
                oid = OID.SHA1_ALGORITHM;
                break;
            case OID.MD2_WITH_RSA_ENCRYPTION:
                hash = new MD2();
                oid = OID.MD2_ALGORITHM;
                break;
            case OID.MD5_WITH_RSA_ENCRYPTION:
                hash = new MD5();
                oid = OID.MD5_ALGORITHM;
                break;
            default:
                return null;
        }
        let data: ByteArray = as3.cast(this._obj.signedCertificate_bin, ByteArray);
        data = hash.hash(data);
        let seq1: Sequence = new Sequence();
        seq1[0] = new Sequence();
        seq1[0][0] = new ObjectIdentifier(0, 0, oid);
        seq1[0][1] = null;
        seq1[1] = new ByteString();
        seq1[1].writeBytes(data);
        data = seq1.toDER();
        let buf: ByteArray = new ByteArray();
        key.sign(data, buf, data.length);
        return buf;
    }

    public getPublicKey(): RSAKey {
        this.load();
        let pk: ByteArray = as3.as(this._obj.signedCertificate.subjectPublicKeyInfo.subjectPublicKey, ByteArray);
        pk.position = 0;
        let rsaKey: any = DER.parse(pk, [{ name: "N" }, { name: "E" }]);
        return new RSAKey(as3.cast(rsaKey.N, BigInteger), rsaKey.E.valueOf() | 0);
    }

    /**
     * Returns a subject principal, as an opaque base64 string.
     * This is only used as a hash key for known certificates.
     *
     * Note that this assumes X509 DER-encoded certificates are uniquely encoded,
     * as we look for exact matches between Issuer and Subject fields.
     *
     */
    public getSubjectPrincipal(): string {
        this.load();
        return Base64.encodeByteArray(as3.cast(this._obj.signedCertificate.subject_bin, ByteArray));
    }

    /**
     * Returns an issuer principal, as an opaque base64 string.
     * This is only used to quickly find matching parent certificates.
     *
     * Note that this assumes X509 DER-encoded certificates are uniquely encoded,
     * as we look for exact matches between Issuer and Subject fields.
     *
     */
    public getIssuerPrincipal(): string {
        this.load();
        return Base64.encodeByteArray(as3.cast(this._obj.signedCertificate.issuer_bin, ByteArray));
    }

    public getAlgorithmIdentifier(): string {
        return as3.str(this._obj.algorithmIdentifier.algorithmId.toString());
    }

    public getNotBefore(): Date {
        return as3.cast(this._obj.signedCertificate.validity.notBefore.date, Date);
    }

    public getNotAfter(): Date {
        return as3.cast(this._obj.signedCertificate.validity.notAfter.date, Date);
    }

    public getCommonName(): string {
        let subject: Sequence = as3.cast(this._obj.signedCertificate.subject, Sequence);
        return (as3.as(subject.findAttributeValue(OID.COMMON_NAME), PrintableString)).getString();
    }
}

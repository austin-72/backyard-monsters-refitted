import * as as3 from "as3";
import { ASObject } from "as3";
import { X509Certificate } from "@game";

export class X509CertificateCollection extends ASObject {
    static {
        as3.fields(this, { _map: null });
    }

    private _map: any;

    public $ctor(): void {
        super.$ctor();
        this._map = {};
    }

    /**
     * Mostly meant for built-in CA loading.
     * This entry-point allows to index CAs without parsing them.
     *
     * @param name		A friendly name. not currently used
     * @param subject	base64 DER encoded Subject principal for the Cert
     * @param pem		PEM encoded certificate data
     *
     */
    public addPEMCertificate(name: string, subject: string, pem: string): void {
        this._map[subject] = new X509Certificate(pem);
    }

    /**
     * Adds a X509 certificate to the collection.
     * This call will force the certificate to be parsed.
     *
     * @param cert		A X509 certificate
     *
     */
    public addCertificate(cert: X509Certificate): void {
        let subject: string = cert.getSubjectPrincipal();
        this._map[subject] = cert;
    }

    /**
     * Returns a X509 Certificate present in the collection, given
     * a base64 DER encoded X500 Subject principal
     *
     * @param subject	A Base64 DER-encoded Subject principal
     * @return 			A matching certificate, or null.
     *
     */
    public getCertificate(subject: string): X509Certificate {
        return as3.cast(this._map[subject], X509Certificate);
    }
}

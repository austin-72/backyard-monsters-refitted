import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { CipherSuites, MozillaRootCertificates, PEM, RSAKey, TLSSecurityParameters, X509CertificateCollection } from "@game";

export class TLSConfig extends ASObject {
    static {
        as3.fields(this, { entity: 0, certificate: null, privateKey: null, cipherSuites: null, compressions: null, ignoreCommonNameMismatch: false, trustAllCertificates: false, trustSelfSignedCertificates: false, promptUserForAcceptCert: false, CAStore: null, localKeyStore: null, version: 0 });
    }

    public entity: uint;
    // SERVER | CLIENT
    public certificate: ByteArray;
    public privateKey: RSAKey;
    public cipherSuites: any[];
    public compressions: any[];
    public ignoreCommonNameMismatch: boolean;
    public trustAllCertificates: boolean;
    public trustSelfSignedCertificates: boolean;
    public promptUserForAcceptCert: boolean;
    public CAStore: X509CertificateCollection;
    public localKeyStore: X509CertificateCollection;
    public version: uint;

    public $ctor(entity?: uint, cipherSuites: any[] = null, compressions: any[] = null, certificate: ByteArray = null, privateKey: RSAKey = null, CAStore: X509CertificateCollection = null, ver: uint = 0): void {
        super.$ctor();
        this.entity = entity;
        this.cipherSuites = cipherSuites;
        this.compressions = compressions;
        this.certificate = certificate;
        this.privateKey = privateKey;
        this.CAStore = CAStore;
        this.version = ver;
        // default settings.
        if (cipherSuites == null) {
            this.cipherSuites = CipherSuites.getDefaultSuites();
        }
        if (compressions == null) {
            this.compressions = [TLSSecurityParameters.COMPRESSION_NULL];
        }

        if (CAStore == null) {
            this.CAStore = new MozillaRootCertificates();
        }

        if (ver == 0x00) {
            // Default to TLS
            this.version = TLSSecurityParameters.PROTOCOL_VERSION;
        }
    }

    public setPEMCertificate(cert: string, key: string = null): void {
        if (key == null) {
            key = cert;
        }
        this.certificate = PEM.readCertIntoArray(cert);
        this.privateKey = PEM.readRSAPrivateKey(key);
    }
}

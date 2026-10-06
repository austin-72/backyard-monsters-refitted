import * as as3 from "as3";
import { ASObject, trace, uint } from "as3";
import { ByteArray, IDataOutput } from "flash/utils";
import { BulkCiphers, CipherSuites, Hex, ISecurityParameters, KeyExchanges, MACs, MD5, RSAKey, SHA1, TLSConnectionState, TLSEngine, TLSPRF } from "@game";

export class TLSSecurityParameters extends ASObject implements ISecurityParameters {
    static {
        as3.implement(this, [ISecurityParameters]);
        as3.fields(this, { cert: null, key: null, entity: 0, bulkCipher: 0, cipherType: 0, keySize: 0, keyMaterialLength: 0, IVSize: 0, macAlgorithm: 0, hashSize: 0, compression: 0, masterSecret: null, clientRandom: null, serverRandom: null, ignoreCNMismatch: true, trustAllCerts: false, trustSelfSigned: false, tlsDebug: false, keyExchange: 0 });
    }

    // COMPRESSION
    public static readonly COMPRESSION_NULL: uint = 0;

    // This is probably not smart. Revise this to use all settings from TLSConfig, since this shouldn't really know about
    // user settings, those are best handled from the engine at a session level.
    public static IGNORE_CN_MISMATCH: boolean = true;
    public static ENABLE_USER_CLIENT_CERTIFICATE: boolean = false;
    public static USER_CERTIFICATE: string = null;
    public static readonly PROTOCOL_VERSION: uint = 769;
    private cert: ByteArray;
    // Local Cert
    private key: RSAKey;
    // local key
    private entity: uint;
    // SERVER | CLIENT
    private bulkCipher: uint;
    // BULK_CIPHER_*
    private cipherType: uint;
    // STREAM_CIPHER | BLOCK_CIPHER
    private keySize: uint;
    private keyMaterialLength: uint;
    private IVSize: uint;
    private macAlgorithm: uint;
    // MAC_*
    private hashSize: uint;
    private compression: uint;
    // COMPRESSION_NULL
    private masterSecret: ByteArray;
    // 48 bytes
    private clientRandom: ByteArray;
    // 32 bytes
    private serverRandom: ByteArray;
    // 32 bytes
    private ignoreCNMismatch: boolean;
    private trustAllCerts: boolean;
    private trustSelfSigned: boolean;
    private tlsDebug: boolean;
    // not strictly speaking part of this, but yeah.
    public keyExchange: uint;

    public $ctor(entity?: uint, localCert: ByteArray = null, localKey: RSAKey = null): void {
        super.$ctor();
        this.entity = entity;
        this.reset();
        this.key = localKey;
        this.cert = localCert;
    }

    public get version(): uint {
        return TLSSecurityParameters.PROTOCOL_VERSION;
    }

    public reset(): void {
        this.bulkCipher = BulkCiphers.NULL;
        this.cipherType = BulkCiphers.BLOCK_CIPHER;
        this.macAlgorithm = MACs.NULL;
        this.compression = TLSSecurityParameters.COMPRESSION_NULL;
        this.masterSecret = null;
    }

    public getBulkCipher(): uint {
        return this.bulkCipher;
    }

    public getCipherType(): uint {
        return this.cipherType;
    }

    public getMacAlgorithm(): uint {
        return this.macAlgorithm;
    }

    public setCipher(cipher: uint): void {
        this.bulkCipher = CipherSuites.getBulkCipher(cipher);
        this.cipherType = BulkCiphers.getType(this.bulkCipher);
        this.keySize = BulkCiphers.getExpandedKeyBytes(this.bulkCipher);
        // 8
        this.keyMaterialLength = BulkCiphers.getKeyBytes(this.bulkCipher);
        // 5
        this.IVSize = BulkCiphers.getIVSize(this.bulkCipher);

        this.keyExchange = CipherSuites.getKeyExchange(cipher);

        this.macAlgorithm = CipherSuites.getMac(cipher);
        this.hashSize = MACs.getHashSize(this.macAlgorithm);
    }

    public setCompression(algo: uint): void {
        this.compression = algo;
    }

    public setPreMasterSecret(secret: ByteArray): void {
        // compute master_secret
        let seed: ByteArray = new ByteArray();
        seed.writeBytes(this.clientRandom, 0, this.clientRandom.length);
        seed.writeBytes(this.serverRandom, 0, this.serverRandom.length);
        let prf: TLSPRF = new TLSPRF(secret, "master secret", seed);
        this.masterSecret = new ByteArray();
        prf.nextBytes(as3.cast(this.masterSecret, IDataOutput), 48);
        if (this.tlsDebug) {
            trace("Master Secret: " + Hex.fromArray(this.masterSecret, true));
        }
    }

    public setClientRandom(secret: ByteArray): void {
        this.clientRandom = secret;
    }

    public setServerRandom(secret: ByteArray): void {
        this.serverRandom = secret;
    }

    public get useRSA(): boolean {
        return KeyExchanges.useRSA(this.keyExchange);
    }

    public computeVerifyData(side: uint, handshakeMessages: ByteArray): ByteArray {
        let seed: ByteArray = new ByteArray();
        let md5: MD5 = new MD5();
        if (this.tlsDebug) {
            trace("Handshake value: " + Hex.fromArray(handshakeMessages, true));
        }
        seed.writeBytes(md5.hash(handshakeMessages), 0, md5.getHashSize());
        let sha: SHA1 = new SHA1();
        seed.writeBytes(sha.hash(handshakeMessages), 0, sha.getHashSize());
        if (this.tlsDebug) {
            trace("Seed in: " + Hex.fromArray(seed, true));
        }
        let prf: TLSPRF = new TLSPRF(this.masterSecret, (side == TLSEngine.CLIENT) ? "client finished" : "server finished", seed);
        let out: ByteArray = new ByteArray();
        prf.nextBytes(as3.cast(out, IDataOutput), 12);
        if (this.tlsDebug) {
            trace("Finished out: " + Hex.fromArray(out, true));
        }
        out.position = 0;
        return out;
    }

    // client side certficate check - This is probably incorrect somehow
    public computeCertificateVerify(side: uint, handshakeMessages: ByteArray): ByteArray {
        let seed: ByteArray = new ByteArray();
        let md5: MD5 = new MD5();
        seed.writeBytes(md5.hash(handshakeMessages), 0, md5.getHashSize());
        let sha: SHA1 = new SHA1();
        seed.writeBytes(sha.hash(handshakeMessages), 0, sha.getHashSize());

        // Now that I have my hashes of existing handshake messages (which I'm not sure about the length of yet) then
        // Sign that with my private key
        seed.position = 0;
        let out: ByteArray = new ByteArray();
        this.key.sign(seed, out, seed.bytesAvailable);
        out.position = 0;
        return out;
    }

    public getConnectionStates(): any {
        if (this.masterSecret != null) {
            let seed: ByteArray = new ByteArray();
            seed.writeBytes(this.serverRandom, 0, this.serverRandom.length);
            seed.writeBytes(this.clientRandom, 0, this.clientRandom.length);
            let prf: TLSPRF = new TLSPRF(this.masterSecret, "key expansion", seed);

            let client_write_MAC: ByteArray = new ByteArray();
            prf.nextBytes(as3.cast(client_write_MAC, IDataOutput), this.hashSize);
            let server_write_MAC: ByteArray = new ByteArray();
            prf.nextBytes(as3.cast(server_write_MAC, IDataOutput), this.hashSize);
            let client_write_key: ByteArray = new ByteArray();
            prf.nextBytes(as3.cast(client_write_key, IDataOutput), this.keyMaterialLength);
            let server_write_key: ByteArray = new ByteArray();
            prf.nextBytes(as3.cast(server_write_key, IDataOutput), this.keyMaterialLength);
            let client_write_IV: ByteArray = new ByteArray();
            prf.nextBytes(as3.cast(client_write_IV, IDataOutput), this.IVSize);
            let server_write_IV: ByteArray = new ByteArray();
            prf.nextBytes(as3.cast(server_write_IV, IDataOutput), this.IVSize);

            let client_write: TLSConnectionState = new TLSConnectionState(this.bulkCipher, this.cipherType, this.macAlgorithm, client_write_MAC, client_write_key, client_write_IV);
            let server_write: TLSConnectionState = new TLSConnectionState(this.bulkCipher, this.cipherType, this.macAlgorithm, server_write_MAC, server_write_key, server_write_IV);

            if (this.entity == TLSEngine.CLIENT) {
                return { read: server_write, write: client_write };
            } else {
                return { read: client_write, write: server_write };
            }
        } else {
            return { read: new TLSConnectionState(), write: new TLSConnectionState() };
        }
    }
}

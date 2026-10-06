import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { ByteArray } from "flash/utils";
import { BulkCiphers, CipherSuites, Hex, ISecurityParameters, KeyExchanges, MACs, MD5, SHA1, SSLConnectionState, TLSEngine } from "@game";

export class SSLSecurityParameters extends ASObject implements ISecurityParameters {
    static {
        as3.implement(this, [ISecurityParameters]);
        as3.fields(this, { entity: 0, bulkCipher: 0, cipherType: 0, keySize: 0, keyMaterialLength: 0, keyBlock: null, IVSize: 0, MAC_length: 0, macAlgorithm: 0, hashSize: 0, compression: 0, masterSecret: null, clientRandom: null, serverRandom: null, pad_1: null, pad_2: null, ignoreCNMismatch: true, trustAllCerts: false, trustSelfSigned: false, keyExchange: 0 });
    }

    // COMPRESSION
    public static readonly COMPRESSION_NULL: uint = 0;
    public static readonly PROTOCOL_VERSION: uint = 768;
    private entity: uint;
    // SERVER | CLIENT
    private bulkCipher: uint;
    // BULK_CIPHER_*
    private cipherType: uint;
    // STREAM_CIPHER | BLOCK_CIPHER
    private keySize: uint;
    private keyMaterialLength: uint;
    private keyBlock: ByteArray;
    private IVSize: uint;
    private MAC_length: uint;
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
    private pad_1: ByteArray;
    // varies
    private pad_2: ByteArray;
    // varies
    private ignoreCNMismatch: boolean;
    private trustAllCerts: boolean;
    private trustSelfSigned: boolean;
    // not strictly speaking part of this, but yeah.
    public keyExchange: uint;

    public $ctor(entity?: uint, localCert: ByteArray = null, localKey: ByteArray = null): void {
        super.$ctor();
        this.entity = entity;
        this.reset();
    }

    public get version(): uint {
        return SSLSecurityParameters.PROTOCOL_VERSION;
    }

    public reset(): void {
        this.bulkCipher = BulkCiphers.NULL;
        this.cipherType = BulkCiphers.BLOCK_CIPHER;
        this.macAlgorithm = MACs.NULL;
        this.compression = SSLSecurityParameters.COMPRESSION_NULL;
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
        this.pad_1 = new ByteArray();
        this.pad_2 = new ByteArray();
        for (let x: int = 0; x < 48; x++) {
            this.pad_1.writeByte(0x36);
            this.pad_2.writeByte(0x5c);
        }
    }

    public setCompression(algo: uint): void {
        this.compression = algo;
    }

    public setPreMasterSecret(secret: ByteArray): void {
        /* Warning! Following code may cause madness
        Tread not here, unless ye be men of valor.
        
         ***** Official Prophylactic Comment ******
        (to protect the unwary...this code actually works, that's all you need to know)
        
        This does two things, computes the master secret, and generates the keyBlock
        
        
        To compute the master_secret, the following algorithm is used.
        for SSL 3, this means
        master = MD5( premaster + SHA1('A' + premaster + client_random + server_random ) ) +
        MD5( premaster + SHA1('BB' + premaster + client_random + server_random ) ) +
        MD5( premaster + SHA1('CCC' + premaster + client_random + server_random ) )
         */
        let tempHashA: ByteArray = new ByteArray();
        // temporary hash, gets reused a lot
        let tempHashB: ByteArray = new ByteArray();

        // temporary hash, gets reused a lot
        let shaHash: ByteArray = null;
        let mdHash: ByteArray = null;

        let i: int = 0;
        let j: int = 0;

        let sha: SHA1 = new SHA1();
        let md: MD5 = new MD5();

        let k: ByteArray = new ByteArray();

        k.writeBytes(secret);
        k.writeBytes(this.clientRandom);
        k.writeBytes(this.serverRandom);

        this.masterSecret = new ByteArray();
        let pad_char: uint = 65;

        for (i = 0; i < 3; i++) {
            // SHA portion
            tempHashA.position = 0;

            for (j = 0; j < i + 1; j++) {
                tempHashA.writeByte(pad_char);
            }
            pad_char++;

            tempHashA.writeBytes(k);
            shaHash = sha.hash(tempHashA);

            // MD5 portion
            tempHashB.position = 0;
            tempHashB.writeBytes(secret);
            tempHashB.writeBytes(shaHash);
            mdHash = md.hash(tempHashB);

            // copy into my key
            this.masterSecret.writeBytes(mdHash);
        }

        // *************** END MASTER SECRET **************
        // More prophylactic comments
        // *************** START KEY BLOCK ****************
        // So here, I'm setting up the keyBlock array that I will derive MACs, keys, and IVs from.
        // Rebuild k (hash seed)
        k.position = 0;
        k.writeBytes(this.masterSecret);
        k.writeBytes(this.serverRandom);
        k.writeBytes(this.clientRandom);

        this.keyBlock = new ByteArray();

        tempHashA = new ByteArray();
        tempHashB = new ByteArray();
        // now for 16 iterations to get 256 bytes (16 * 16), better to have more than not enough
        pad_char = 65;
        for (i = 0; i < 16; i++) {
            tempHashA.position = 0;

            for (j = 0; j < i + 1; j++) {
                tempHashA.writeByte(pad_char);
            }
            pad_char++;
            tempHashA.writeBytes(k);
            shaHash = sha.hash(tempHashA);

            tempHashB.position = 0;
            tempHashB.writeBytes(this.masterSecret);
            tempHashB.writeBytes(shaHash, 0);
            mdHash = md.hash(tempHashB);

            this.keyBlock.writeBytes(mdHash);
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

    // This is the Finished message
    // if you value your sanity, stay away...far away
    public computeVerifyData(side: uint, handshakeMessages: ByteArray): ByteArray {
        // for SSL 3.0, this consists of
        // finished = md5( masterSecret + pad2 + md5( handshake + sender + masterSecret + pad1 ) ) +
        // sha1( masterSecret + pad2 + sha1( handshake + sender + masterSecret + pad1 ) )
        // trace("Handshake messages: " + Hex.fromArray(handshakeMessages));
        let sha: SHA1 = new SHA1();
        let md: MD5 = new MD5();
        let k: ByteArray = new ByteArray();
        // handshake + sender + masterSecret + pad1
        let j: ByteArray = new ByteArray();

        // masterSecret + pad2 + k
        let innerKey: ByteArray = null;
        let outerKey: ByteArray = new ByteArray();

        let hashSha: ByteArray = null;
        let hashMD: ByteArray = null;

        let sideBytes: ByteArray = new ByteArray();
        if (side == TLSEngine.CLIENT) {
            sideBytes.writeUnsignedInt(1129074260);
        } else {
            sideBytes.writeUnsignedInt(1397904978);
        }

        // Do the SHA1 part of the routine first
        this.masterSecret.position = 0;
        k.writeBytes(handshakeMessages);
        k.writeBytes(sideBytes);
        k.writeBytes(this.masterSecret);
        k.writeBytes(this.pad_1, 0, 40);

        // limited to 40 chars for SHA1
        innerKey = sha.hash(k);

        // trace("Inner SHA Key: " + Hex.fromArray(innerKey));
        j.writeBytes(this.masterSecret);
        j.writeBytes(this.pad_2, 0, 40);
        // limited to 40 chars for SHA1
        j.writeBytes(innerKey);

        hashSha = sha.hash(j);

        // trace("Outer SHA Key: " + Hex.fromArray(hashSha));
        // Rebuild k for MD5
        k = new ByteArray();

        k.writeBytes(handshakeMessages);
        k.writeBytes(sideBytes);
        k.writeBytes(this.masterSecret);
        k.writeBytes(this.pad_1);

        // Take the whole length of pad_1 & pad_2 for MD5
        innerKey = md.hash(k);

        // trace("Inner MD5 Key: " + Hex.fromArray(innerKey));
        j = new ByteArray();
        j.writeBytes(this.masterSecret);
        j.writeBytes(this.pad_2);
        // see above re: 48 byte pad
        j.writeBytes(innerKey);

        hashMD = md.hash(j);

        // trace("Outer MD5 Key: " + Hex.fromArray(hashMD));
        outerKey.writeBytes(hashMD, 0, hashMD.length);
        outerKey.writeBytes(hashSha, 0, hashSha.length);
        let out: string = Hex.fromArray(outerKey);
        // trace("Finished Message: " + out);
        outerKey.position = 0;

        return outerKey;
    }

    public computeCertificateVerify(side: uint, handshakeMessages: ByteArray): ByteArray {
        // TODO: Implement this, but I don't forsee it being necessary at this point in time, since for purposes
        // of the override, I'm only going to use TLS
        return null;
    }

    public getConnectionStates(): any {
        if (this.masterSecret != null) {
            // so now, I have to derive the actual keys from the keyblock that I generated in setPremasterSecret.
            // for MY purposes, I need RSA-AES 128/256 + SHA
            // so I'm gonna have keylen = 32, minlen = 32, mac_length = 20, iv_length = 16
            // but...I can get this data from the settings returned in the constructor when this object is
            // It strikes me that TLS does this more elegantly...
            let mac_length: int = as3.as(this.hashSize, Number) | 0;
            let key_length: int = as3.as(this.keySize, Number) | 0;
            let iv_length: int = as3.as(this.IVSize, Number) | 0;

            let client_write_MAC: ByteArray = new ByteArray();
            let server_write_MAC: ByteArray = new ByteArray();
            let client_write_key: ByteArray = new ByteArray();
            let server_write_key: ByteArray = new ByteArray();
            let client_write_IV: ByteArray = new ByteArray();
            let server_write_IV: ByteArray = new ByteArray();

            // Derive the keys from the keyblock
            // Get the MACs first
            this.keyBlock.position = 0;
            this.keyBlock.readBytes(client_write_MAC, 0, mac_length >>> 0);
            this.keyBlock.readBytes(server_write_MAC, 0, mac_length >>> 0);

            // keyBlock.position is now at MAC_length * 2
            // then get the keys
            this.keyBlock.readBytes(client_write_key, 0, key_length >>> 0);
            this.keyBlock.readBytes(server_write_key, 0, key_length >>> 0);

            // keyBlock.position is now at (MAC_length * 2) + (keySize * 2)
            // and then the IVs
            this.keyBlock.readBytes(client_write_IV, 0, iv_length >>> 0);
            this.keyBlock.readBytes(server_write_IV, 0, iv_length >>> 0);

            // reset this in case it's needed, for some reason or another, but I doubt it
            this.keyBlock.position = 0;

            let client_write: SSLConnectionState = new SSLConnectionState(this.bulkCipher, this.cipherType, this.macAlgorithm, client_write_MAC, client_write_key, client_write_IV);
            let server_write: SSLConnectionState = new SSLConnectionState(this.bulkCipher, this.cipherType, this.macAlgorithm, server_write_MAC, server_write_key, server_write_IV);

            if (this.entity == TLSEngine.CLIENT) {
                return { read: server_write, write: client_write };
            } else {
                return { read: client_write, write: server_write };
            }
        } else {
            return { read: new SSLConnectionState(), write: new SSLConnectionState() };
        }
    }
}

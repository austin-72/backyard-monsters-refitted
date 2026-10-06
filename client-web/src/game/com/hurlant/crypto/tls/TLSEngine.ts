import * as as3 from "as3";
import { int, trace, uint } from "as3";
import { Event, EventDispatcher, ProgressEvent } from "flash/events";
import { ByteArray, IDataInput, IDataOutput, clearTimeout, setTimeout } from "flash/utils";
import { ArrayUtil, IConnectionState, ISecurityParameters, Random, SSLSecurityParameters, TLSConfig, TLSError, TLSEvent, TLSSecurityParameters, X509Certificate, X509CertificateCollection } from "@game";

export class TLSEngine extends EventDispatcher {
    static {
        as3.fields(this, { protocol_version: 0, _entity: 0, _config: null, _state: 0, _securityParameters: null, _currentReadState: null, _currentWriteState: null, _pendingReadState: null, _pendingWriteState: null, _handshakePayloads: null, _handshakeRecords: null, _iStream: null, _oStream: null, _store: null, _otherCertificate: null, _otherIdentity: null, _myCertficate: null, _myIdentity: null, _packetQueue: null, protocolHandlers: null, handshakeHandlersServer: null, handshakeHandlersClient: null, _entityHandshakeHandlers: null, _handshakeCanContinue: true, _handshakeQueue: null, sendClientCert: false, _writeScheduler: 0 });
    }

    public static readonly SERVER: uint = 0;
    public static readonly CLIENT: uint = 1;

    private static readonly PROTOCOL_HANDSHAKE: uint = 22;
    private static readonly PROTOCOL_ALERT: uint = 21;
    private static readonly PROTOCOL_CHANGE_CIPHER_SPEC: uint = 20;
    private static readonly PROTOCOL_APPLICATION_DATA: uint = 23;

    private static readonly STATE_NEW: uint = 0;
    // brand new. nothing happened yet
    private static readonly STATE_NEGOTIATING: uint = 1;
    // we're figuring out what to use
    private static readonly STATE_READY: uint = 2;
    // we're ready for AppData stuff to go over us.
    private static readonly STATE_CLOSED: uint = 3;

    // /////// handshake handling
    // session identifier
    // peer certificate
    // compression method
    // cipher spec
    // master secret
    // is resumable
    private static readonly HANDSHAKE_HELLO_REQUEST: uint = 0;
    private static readonly HANDSHAKE_CLIENT_HELLO: uint = 1;
    private static readonly HANDSHAKE_SERVER_HELLO: uint = 2;
    private static readonly HANDSHAKE_CERTIFICATE: uint = 11;
    private static readonly HANDSHAKE_SERVER_KEY_EXCHANGE: uint = 12;
    private static readonly HANDSHAKE_CERTIFICATE_REQUEST: uint = 13;
    private static readonly HANDSHAKE_HELLO_DONE: uint = 14;
    private static readonly HANDSHAKE_CERTIFICATE_VERIFY: uint = 15;
    private static readonly HANDSHAKE_CLIENT_KEY_EXCHANGE: uint = 16;
    private static readonly HANDSHAKE_FINISHED: uint = 20;
    public protocol_version: uint;
    // we're done done.
    private _entity: uint;
    // SERVER | CLIENT
    private _config: TLSConfig;
    private _state: uint;
    private _securityParameters: ISecurityParameters;
    private _currentReadState: IConnectionState;
    private _currentWriteState: IConnectionState;
    private _pendingReadState: IConnectionState;
    private _pendingWriteState: IConnectionState;
    private _handshakePayloads: ByteArray;
    private _handshakeRecords: ByteArray;
    // For client-side certificate verify
    private _iStream: IDataInput;
    private _oStream: IDataOutput;
    // temporary store for X509 certs received by this engine.
    private _store: X509CertificateCollection;
    // the main certificate received from the other side.
    private _otherCertificate: X509Certificate;
    // If this isn't null, we expect this identity to be found in the Cert's Subject CN.
    private _otherIdentity: string;
    // The client-side cert
    private _myCertficate: X509Certificate;
    // My Identity
    private _myIdentity: string;
    private _packetQueue: any[];
    // Protocol handler map, provides a mapping of protocol types to individual packet handlers
    private protocolHandlers: any;
    // Server handshake handler map
    private handshakeHandlersServer: any;
    // Client handshake handler map
    private handshakeHandlersClient: any;
    private _entityHandshakeHandlers: any;
    private _handshakeCanContinue: boolean;
    // For handling cases where I might need to pause processing during a handshake (cert issues, etc.).
    private _handshakeQueue: any[];
    private sendClientCert: boolean;
    private _writeScheduler: uint;

    /**
     *
     * @param config		A TLSConfig instance describing how we're supposed to work
     * @param iStream		An input stream to read TLS data from
     * @param oStream		An output stream to write TLS data to
     * @param otherIdentity	An optional identifier. If set, this will be checked against the Subject CN of the other side's certificate.
     *
     */
    public $ctor(config?: any /* TLSConfig */, iStream?: IDataInput, oStream?: IDataOutput, otherIdentity: string = null): void {
        this._packetQueue = [];
        this.protocolHandlers = { 23: as3.bind(this, this.parseApplicationData), 22: as3.bind(this, this.parseHandshake), 21: as3.bind(this, this.parseAlert), 20: as3.bind(this, this.parseChangeCipherSpec) };
        this.handshakeHandlersServer = { 0: as3.bind(this, this.notifyStateError), 1: as3.bind(this, this.parseHandshakeClientHello), 2: as3.bind(this, this.notifyStateError), 11: as3.bind(this, this.loadCertificates), 12: as3.bind(this, this.notifyStateError), 13: as3.bind(this, this.notifyStateError), 14: as3.bind(this, this.notifyStateError), 15: as3.bind(this, this.notifyStateError), 16: as3.bind(this, this.parseHandshakeClientKeyExchange), 20: as3.bind(this, this.verifyHandshake) };
        this.handshakeHandlersClient = { 0: as3.bind(this, this.parseHandshakeHello), 1: as3.bind(this, this.notifyStateError), 2: as3.bind(this, this.parseHandshakeServerHello), 11: as3.bind(this, this.loadCertificates), 12: as3.bind(this, this.parseServerKeyExchange), 13: as3.bind(this, this.setStateRespondWithCertificate), 14: as3.bind(this, this.sendClientAck), 15: as3.bind(this, this.notifyStateError), 16: as3.bind(this, this.notifyStateError), 20: as3.bind(this, this.verifyHandshake) };
        this._handshakeQueue = [];
        super.$ctor();
        this._entity = config.entity;
        this._config = config;
        this._iStream = iStream;
        this._oStream = oStream;
        this._otherIdentity = otherIdentity;

        this._state = TLSEngine.STATE_NEW;

        // Pick the right set of callbacks
        this._entityHandshakeHandlers = this._entity == TLSEngine.CLIENT ? this.handshakeHandlersClient : this.handshakeHandlersServer;

        // setting up new security parameters needs to be controlled by...something.
        if (this._config.version == SSLSecurityParameters.PROTOCOL_VERSION) {
            this._securityParameters = new SSLSecurityParameters(this._entity);
        } else {
            this._securityParameters = new TLSSecurityParameters(this._entity, this._config.certificate, this._config.privateKey);
        }
        this.protocol_version = this._config.version;

        // So this...why is it here, other than to preclude a possible null pointer situation?
        let states: any = this._securityParameters.getConnectionStates();

        this._currentReadState = as3.cast(states.read, IConnectionState);
        this._currentWriteState = as3.cast(states.write, IConnectionState);

        this._handshakePayloads = new ByteArray();

        this._store = new X509CertificateCollection();
    }

    public get peerCertificate(): X509Certificate {
        return this._otherCertificate;
    }

    /**
     * This starts the TLS negotiation for a TLS Client.
     *
     * This is a no-op for a TLS Server.
     *
     */
    public start(): void {
        if (this._entity == TLSEngine.CLIENT) {
            try {
                this.startHandshake();
            } catch ($error) {
                if ($error instanceof TLSError) {
                    const e: TLSError = $error;
                    this.handleTLSError(e);
                } else {
                    throw $error;
                }
            }
        }
    }

    public dataAvailable(e: any = null): void {
        if (this._state == TLSEngine.STATE_CLOSED) {
            return;
        }
        // ignore
        try {
            this.parseRecord(this._iStream);
        } catch ($error) {
            if ($error instanceof TLSError) {
                const e: TLSError = $error;
                this.handleTLSError(e);
            } else {
                throw $error;
            }
        }
    }

    public close(e: TLSError = null): void {
        if (this._state == TLSEngine.STATE_CLOSED) {
            return;
        }
        // ignore
        // ok. send an Alert to let the peer know
        let rec: ByteArray = new ByteArray();
        if (e == null && this._state != TLSEngine.STATE_READY) {
            // use canceled while handshaking. be nice about it
            rec[0] = 1;
            rec[1] = TLSError.user_canceled;
            this.sendRecord(TLSEngine.PROTOCOL_ALERT, rec);
        }
        rec[0] = 2;
        if (e == null) {
            rec[1] = TLSError.close_notify;
        } else {
            rec[1] = e.errorID;
            trace("TLSEngine shutdown triggered by " + e);
        }
        this.sendRecord(TLSEngine.PROTOCOL_ALERT, rec);

        this._state = TLSEngine.STATE_CLOSED;
        this.dispatchEvent(new Event(Event.CLOSE));
    }

    private parseRecord(stream: IDataInput): void {
        let p: ByteArray = null;
        while (this._state != TLSEngine.STATE_CLOSED && stream.bytesAvailable > 4) {
            if (this._packetQueue.length > 0) {
                let packet: any = this._packetQueue.shift();
                p = as3.cast(packet.data, ByteArray);
                if (stream.bytesAvailable + p.length >= packet.length) {
                    // we have a whole packet. put together.
                    stream.readBytes(p, p.length, (packet.length - p.length) >>> 0);
                    this.parseOneRecord(packet.type >>> 0, packet.length >>> 0, p);
                    // do another loop to parse any leftover record
                    continue;
                } else {
                    // not enough. grab the data and park it.
                    stream.readBytes(p, p.length, stream.bytesAvailable);
                    this._packetQueue.push(packet);
                    continue;
                }
            }

            let type: uint = stream.readByte() >>> 0;
            let ver: uint = stream.readShort() >>> 0;
            let length: uint = stream.readShort() >>> 0;
            if (length > 16384 + 2048) {
                // support compression and encryption overhead.
                throw new TLSError("Excessive TLS Record length: " + length, TLSError.record_overflow);
            }
            // Can pretty much assume that if I'm here, I've got a default config, so let's use it.
            if (ver != this._securityParameters.version) {
                throw new TLSError("Unsupported TLS version: " + ver.toString(16), TLSError.protocol_version);
            }

            p = new ByteArray();
            let actualLength: uint = Math.min(stream.bytesAvailable, length) >>> 0;
            stream.readBytes(p, 0, actualLength);
            if (actualLength == length) {
                this.parseOneRecord(type, length, p);
            } else {
                this._packetQueue.push({ type: type, length: length, data: p });
            }
        }
    }

    // PROTOCOL_CHANGE_CIPHER_SPEC
    /**
     * Modified to support the notion of a handler map(see above ), since it makes for better clarity (IMHO of course).
     */
    private parseOneRecord(type: uint, length: uint, p: ByteArray): void {
        p = this._currentReadState.decrypt(type, length, p);
        if (p.length > 16384) {
            throw new TLSError("Excessive Decrypted TLS Record length: " + p.length, TLSError.record_overflow);
        }
        if (this.protocolHandlers.hasOwnProperty(type)) {
            while (p != null) {
                p = as3.cast(this.protocolHandlers[type](p), ByteArray);
            }
        } else {
            throw new TLSError("Unsupported TLS Record Content Type: " + type.toString(16), TLSError.unexpected_message);
        }
    }

    /**
     * The handshake is always started by the client.
     */
    private startHandshake(): void {
        this._state = TLSEngine.STATE_NEGOTIATING;
        // reset some other handshake state. XXX
        this.sendClientHello();
    }

    /**
     * Handle the incoming handshake packet.
     *
     */
    private parseHandshake(p: ByteArray): ByteArray {
        if (p.length < 4) {
            trace("Handshake packet is way too short. bailing.");
            return null;
        }

        p.position = 0;

        let rec: ByteArray = p;
        let type: uint = rec.readUnsignedByte();
        let tmp: uint = rec.readUnsignedByte();
        let length: uint = ((tmp << 16) | rec.readUnsignedShort()) >>> 0;
        if (length + 4 > p.length) {
            // partial read.
            trace("Handshake packet is incomplete. bailing.");
            return null;
        }

        // we need to copy the record, to have a valid FINISHED exchange.
        if (type != TLSEngine.HANDSHAKE_FINISHED) {
            this._handshakePayloads.writeBytes(p, 0, (length + 4) >>> 0);
        }

        // Surf the handler map and find the right handler for this handshake packet type.
        // I modified the individual handlers so they encapsulate all possible knowledge
        // about the incoming packet type, so no previous handling or massaging of the data
        // is required, as was the case using the switch statement. BP
        if (this._entityHandshakeHandlers.hasOwnProperty(type)) {
            if (as3.is(this._entityHandshakeHandlers[type], Function)) {
                this._entityHandshakeHandlers[type](rec);
            }
        } else {
            throw new TLSError("Unimplemented or unknown handshake type!", TLSError.internal_error);
        }

        // Get set up for the next packet.
        if (length + 4 < p.length) {
            let n: ByteArray = new ByteArray();
            n.writeBytes(p, (length + 4) >>> 0, (p.length - (length + 4)) >>> 0);
            return n;
        } else {
            return null;
        }
    }

    /**
     * Throw an error when the detected handshake state isn't a valid state for the given entity type (client vs. server, etc. ).
     * This really should abort the handshake, since there's no case in which a server should EVER be confused about the type of entity it is. BP
     */
    private notifyStateError(rec: ByteArray): void {
        throw new TLSError("Invalid handshake state for a TLS Entity type of " + this._entity, TLSError.internal_error);
    }

    /**
     * two unimplemented functions
     */
    private parseClientKeyExchange(rec: ByteArray): void {
        throw new TLSError("ClientKeyExchange is currently unimplemented!", TLSError.internal_error);
    }

    private parseServerKeyExchange(rec: ByteArray): void {
        throw new TLSError("ServerKeyExchange is currently unimplemented!", TLSError.internal_error);
    }

    /**
     * Test the server's Finished message for validity against the data we know about. Only slightly rewritten. BP
     */
    private verifyHandshake(rec: ByteArray): void {
        // Get the Finished message
        let verifyData: ByteArray = new ByteArray();
        // This, in the vain hope that noboby is using SSL 2 anymore
        if (this._securityParameters.version == SSLSecurityParameters.PROTOCOL_VERSION) {
            rec.readBytes(verifyData, 0, 36);
        } else {
            // presuming TLS
            rec.readBytes(verifyData, 0, 12);
        }

        let data: ByteArray = this._securityParameters.computeVerifyData((1 - this._entity) >>> 0, this._handshakePayloads);

        if (ArrayUtil.equals(verifyData, data)) {
            this._state = TLSEngine.STATE_READY;
            this.dispatchEvent(new TLSEvent(TLSEvent.READY));
        } else {
            throw new TLSError("Invalid Finished mac.", TLSError.bad_record_mac);
        }
    }

    // enforceClient/enforceServer removed in favor of state-driven function maps
    /**
     * Handle a HANDSHAKE_HELLO
     */
    private parseHandshakeHello(rec: ByteArray): void {
        if (this._state != TLSEngine.STATE_READY) {
            trace("Received an HELLO_REQUEST before being in state READY. ignoring.");
            return;
        }
        this._handshakePayloads = new ByteArray();
        this.startHandshake();
    }

    /**
     * Handle a HANDSHAKE_CLIENT_KEY_EXCHANGE
     */
    private parseHandshakeClientKeyExchange(rec: ByteArray): void {
        if (this._securityParameters.useRSA) {
            // skip 2 bytes for length.
            let len: uint = rec.readShort() >>> 0;
            let cipher: ByteArray = new ByteArray();
            rec.readBytes(cipher, 0, len);
            let preMasterSecret: ByteArray = new ByteArray();
            this._config.privateKey.decrypt(cipher, preMasterSecret, len);
            this._securityParameters.setPreMasterSecret(preMasterSecret);

            // now is a good time to get our pending states
            let o: any = this._securityParameters.getConnectionStates();
            this._pendingReadState = as3.cast(o.read, IConnectionState);
            this._pendingWriteState = as3.cast(o.write, IConnectionState);
        } else {
            throw new TLSError("parseHandshakeClientKeyExchange not implemented for DH modes.", TLSError.internal_error);
        }
    }

    /**
     * Handle HANDSHAKE_SERVER_HELLO - client-side
     */
    private parseHandshakeServerHello(rec: IDataInput): void {
        let ver: uint = rec.readShort() >>> 0;
        if (ver != this._securityParameters.version) {
            throw new TLSError("Unsupported TLS version: " + ver.toString(16), TLSError.protocol_version);
        }
        let random: ByteArray = new ByteArray();
        rec.readBytes(random, 0, 32);
        let session_length: uint = rec.readByte() >>> 0;
        let session: ByteArray = new ByteArray();
        if (session_length > 0) {
            // some implementations don't assign a session ID
            rec.readBytes(session, 0, session_length);
        }

        this._securityParameters.setCipher(rec.readShort() >>> 0);
        this._securityParameters.setCompression(rec.readByte() >>> 0);
        this._securityParameters.setServerRandom(random);
    }

    /**
     *  Handle HANDSHAKE_CLIENT_HELLO - server side
     */
    private parseHandshakeClientHello(rec: IDataInput): void {
        let i: uint = 0;
        let ret: any = null;
        let ver: uint = rec.readShort() >>> 0;
        if (ver != this._securityParameters.version) {
            throw new TLSError("Unsupported TLS version: " + ver.toString(16), TLSError.protocol_version);
        }

        let random: ByteArray = new ByteArray();
        rec.readBytes(random, 0, 32);
        let session_length: uint = rec.readByte() >>> 0;
        let session: ByteArray = new ByteArray();
        if (session_length > 0) {
            // some implementations don't assign a session ID
            rec.readBytes(session, 0, session_length);
        }
        let suites: any[] = [];

        let suites_length: uint = rec.readShort() >>> 0;
        for (i = 0; i < suites_length / 2; i++) {
            suites.push(rec.readShort());
        }

        let compressions: any[] = [];

        let comp_length: uint = rec.readByte() >>> 0;
        for (i = 0; i < comp_length; i++) {
            compressions.push(rec.readByte());
        }

        ret = { random: random, session: session, suites: suites, compressions: compressions };

        let sofar: uint = (2 + 32 + 1 + session_length + 2 + suites_length + 1 + comp_length) >>> 0;
        let extensions: any[] = [];
        if (sofar < Object.length) {
            // we have extensions. great.
            let ext_total_length: uint = rec.readShort() >>> 0;
            while (ext_total_length > 0) {
                let ext_type: uint = rec.readShort() >>> 0;
                let ext_length: uint = rec.readShort() >>> 0;
                let ext_data: ByteArray = new ByteArray();
                rec.readBytes(ext_data, 0, ext_length);
                ext_total_length = (ext_total_length - (4 + ext_length)) >>> 0;
                extensions.push({ type: ext_type, length: ext_length, data: ext_data });
            }
        }
        ret.ext = extensions;

        this.sendServerHello(ret);
        this.sendCertificate();
        // TODO: Modify to handle case of requesting a certificate from the client, for "client authentication",
        // and testing purposes, will probably never actually need it.
        this.sendServerHelloDone();
    }

    private sendClientHello(): void {
        let i: int = 0;
        let rec: ByteArray = new ByteArray();
        // version - modified to support version attribute from ISecurityParameters
        rec.writeShort(this._securityParameters.version);
        // random
        let prng: Random = new Random();
        let clientRandom: ByteArray = new ByteArray();
        prng.nextBytes(clientRandom, 32);
        this._securityParameters.setClientRandom(clientRandom);
        rec.writeBytes(clientRandom, 0, 32);
        // session
        rec.writeByte(32);
        prng.nextBytes(rec, 32);
        // Cipher suites
        let cs: any[] = this._config.cipherSuites;
        rec.writeShort((2 * cs.length) | 0);
        for (i = 0; i < cs.length; i++) {
            rec.writeShort(cs[i] | 0);
        }
        // Compression
        cs = this._config.compressions;
        rec.writeByte(cs.length);
        for (i = 0; i < cs.length; i++) {
            rec.writeByte(cs[i] | 0);
        }
        // no extensions, yet.
        rec.position = 0;
        this.sendHandshake(TLSEngine.HANDSHAKE_CLIENT_HELLO, rec.length, as3.cast(rec, IDataInput));
    }

    private findMatch(a1: any[], a2: any[]): int {
        for (let i: int = 0; i < a1.length; i++) {
            let e: uint = a1[i] >>> 0;
            if (a2.indexOf(e) > -1) {
                return e;
            }
        }
        return -1;
    }

    private sendServerHello(v: any): void {
        let cipher: int = this.findMatch(this._config.cipherSuites, as3.cast(v.suites, Array));
        if (cipher == -1) {
            throw new TLSError("No compatible cipher found.", TLSError.handshake_failure);
        }
        this._securityParameters.setCipher(cipher >>> 0);

        let comp: int = this.findMatch(this._config.compressions, as3.cast(v.compressions, Array));
        if (comp == 1) {
            throw new TLSError("No compatible compression method found.", TLSError.handshake_failure);
        }
        this._securityParameters.setCompression(comp >>> 0);
        this._securityParameters.setClientRandom(as3.cast(v.random, ByteArray));

        let rec: ByteArray = new ByteArray();
        rec.writeShort(this._securityParameters.version);
        let prng: Random = new Random();
        let serverRandom: ByteArray = new ByteArray();
        prng.nextBytes(serverRandom, 32);
        this._securityParameters.setServerRandom(serverRandom);
        rec.writeBytes(serverRandom, 0, 32);
        // session
        rec.writeByte(32);
        prng.nextBytes(rec, 32);
        // Cipher suite
        rec.writeShort(v.suites[0] | 0);
        // Compression
        rec.writeByte(v.compressions[0] | 0);
        rec.position = 0;
        this.sendHandshake(TLSEngine.HANDSHAKE_SERVER_HELLO, rec.length, as3.cast(rec, IDataInput));
    }

    private setStateRespondWithCertificate(r: ByteArray = null): void {
        this.sendClientCert = true;
    }

    private sendCertificate(r: ByteArray = null): void {
        let cert: ByteArray = this._config.certificate;
        let len: uint = 0;
        let len2: uint = 0;
        let rec: ByteArray = new ByteArray();
        // Look for a certficate chain, if we have one, send it, if we don't, send an empty record.
        if (cert != null) {
            len = cert.length;
            len2 = (cert.length + 3) >>> 0;
            rec.writeByte(len2 >> 16);
            rec.writeShort(len2 & 65535);
            rec.writeByte(len >> 16);
            rec.writeShort(len & 65535);
            rec.writeBytes(cert);
        } else {
            rec.writeShort(0);
            rec.writeByte(0);
        }
        rec.position = 0;
        this.sendHandshake(TLSEngine.HANDSHAKE_CERTIFICATE, rec.length, as3.cast(rec, IDataInput));
    }

    private sendCertificateVerify(): void {
        let rec: ByteArray = new ByteArray();
        // Encrypt the handshake payloads here
        let data: ByteArray = this._securityParameters.computeCertificateVerify(this._entity, this._handshakePayloads);
        data.position = 0;
        this.sendHandshake(TLSEngine.HANDSHAKE_CERTIFICATE_VERIFY, data.length, as3.cast(data, IDataInput));
    }

    private sendServerHelloDone(): void {
        let rec: ByteArray = new ByteArray();
        this.sendHandshake(TLSEngine.HANDSHAKE_HELLO_DONE, rec.length, as3.cast(rec, IDataInput));
    }

    private sendClientKeyExchange(): void {
        if (this._securityParameters.useRSA) {
            let p: ByteArray = new ByteArray();
            p.writeShort(this._securityParameters.version);
            let prng: Random = new Random();
            prng.nextBytes(p, 46);
            p.position = 0;

            let preMasterSecret: ByteArray = new ByteArray();
            preMasterSecret.writeBytes(p, 0, p.length);
            preMasterSecret.position = 0;
            this._securityParameters.setPreMasterSecret(preMasterSecret);

            let enc_key: ByteArray = new ByteArray();
            this._otherCertificate.getPublicKey().encrypt(preMasterSecret, enc_key, preMasterSecret.length);

            enc_key.position = 0;
            let rec: ByteArray = new ByteArray();

            // TLS requires the size of the premaster key be sent BUT
            // SSL 3.0 does not
            if (this._securityParameters.version > 0x0300) {
                rec.writeShort(enc_key.length);
            }
            rec.writeBytes(enc_key, 0, enc_key.length);

            rec.position = 0;

            this.sendHandshake(TLSEngine.HANDSHAKE_CLIENT_KEY_EXCHANGE, rec.length, as3.cast(rec, IDataInput));

            // now is a good time to get our pending states
            let o: any = this._securityParameters.getConnectionStates();
            this._pendingReadState = as3.cast(o.read, IConnectionState);
            this._pendingWriteState = as3.cast(o.write, IConnectionState);
        } else {
            throw new TLSError("Non-RSA Client Key Exchange not implemented.", TLSError.internal_error);
        }
    }

    private sendFinished(): void {
        let data: ByteArray = this._securityParameters.computeVerifyData(this._entity, this._handshakePayloads);
        data.position = 0;
        this.sendHandshake(TLSEngine.HANDSHAKE_FINISHED, data.length, as3.cast(data, IDataInput));
    }

    private sendHandshake(type: uint, len: uint, payload: IDataInput): void {
        let rec: ByteArray = new ByteArray();
        rec.writeByte(type);
        rec.writeByte(0);
        rec.writeShort(len);
        payload.readBytes(rec, rec.position, len);
        this._handshakePayloads.writeBytes(rec, 0, rec.length);
        this.sendRecord(TLSEngine.PROTOCOL_HANDSHAKE, rec);
    }

    private sendChangeCipherSpec(): void {
        let rec: ByteArray = new ByteArray();
        rec[0] = 1;
        this.sendRecord(TLSEngine.PROTOCOL_CHANGE_CIPHER_SPEC, rec);

        // right after, switch the cipher for writing.
        this._currentWriteState = this._pendingWriteState;
        this._pendingWriteState = null;
    }

    public sendApplicationData(data: ByteArray, offset: uint = 0, length: uint = 0): void {
        let rec: ByteArray = new ByteArray();
        let len: uint = length;
        // BIG FAT WARNING: Patch from Arlen Cuss ALA As3crypto group on Google code.
        // This addresses data overflow issues when the packet size hits the max length boundary.
        if (len == 0) {
            len = data.length;
        }
        while (len > 16384) {
            rec.position = 0;
            rec.writeBytes(data, offset, 16384);
            rec.position = 0;
            this.sendRecord(TLSEngine.PROTOCOL_APPLICATION_DATA, rec);
            offset = (offset + 16384) >>> 0;
            len = (len - 16384) >>> 0;
        }
        rec.position = 0;
        rec.writeBytes(data, offset, len);
        // trace("Data I'm sending..." + Hex.fromArray( data ));
        rec.position = 0;
        this.sendRecord(TLSEngine.PROTOCOL_APPLICATION_DATA, rec);
    }

    private sendRecord(type: uint, payload: ByteArray): void {
        // encrypt
        payload = this._currentWriteState.encrypt(type, payload);

        this._oStream.writeByte(type);
        this._oStream.writeShort(this._securityParameters.version);
        this._oStream.writeShort(payload.length);
        this._oStream.writeBytes(payload, 0, payload.length);

        this.scheduleWrite();
    }

    private scheduleWrite(): void {
        if (this._writeScheduler != 0) {
            return;
        }
        this._writeScheduler = setTimeout(as3.bind(this, this.commitWrite), 0);
    }

    private commitWrite(): void {
        clearTimeout(this._writeScheduler);
        this._writeScheduler = 0;
        if (this._state != TLSEngine.STATE_CLOSED) {
            this.dispatchEvent(new ProgressEvent(ProgressEvent.SOCKET_DATA));
        }
    }

    private sendClientAck(rec: ByteArray): void {
        if (this._handshakeCanContinue) {
            // If I have a pending cert request, send it
            if (this.sendClientCert) {
                this.sendCertificate();
            }
            // send a client key exchange
            this.sendClientKeyExchange();
            // Send the certificate verify, if we have one
            if (this._config.certificate != null) {
                this.sendCertificateVerify();
            }
            // send a change cipher spec
            this.sendChangeCipherSpec();
            // send a finished
            this.sendFinished();
        }
    }

    /**
     * Vaguely gross function that parses a RSA key out of a certificate.
     *
     * As long as that certificate looks just the way we expect it to.
     *
     */
    private loadCertificates(rec: ByteArray): void {
        let tmp: uint = rec.readByte() >>> 0;
        let certs_len: uint = ((tmp << 16) | rec.readShort()) >>> 0;
        let certs: any[] = [];

        while (certs_len > 0) {
            tmp = rec.readByte() >>> 0;
            let cert_len: uint = ((tmp << 16) | rec.readShort()) >>> 0;
            let cert: ByteArray = new ByteArray();
            rec.readBytes(cert, 0, cert_len);
            certs.push(cert);
            certs_len = (certs_len - (3 + cert_len)) >>> 0;
        }

        let firstCert: X509Certificate = null;
        for (let i: int = 0; i < certs.length; i++) {
            let x509: X509Certificate = new X509Certificate(certs[i]);
            this._store.addCertificate(x509);
            if (firstCert == null) {
                firstCert = x509;
            }
        }

        // Test first for trust override parameters
        // This nice trust override stuff comes from Joey Parrish via As3crypto forums
        let certTrusted: boolean = false;
        if (this._config.trustAllCertificates) {
            certTrusted = true;
        } else if (this._config.trustSelfSignedCertificates) {
            // Self-signed certs
            certTrusted = firstCert.isSelfSigned(new Date());
        } else {
            // Certs with a signer in the CA store - realistically, I should setup an event chain to handle this
            certTrusted = firstCert.isSigned(this._store, this._config.CAStore);
        }

        // Good so far
        if (certTrusted) {
            // ok, that's encouraging. now for the hostname match.
            if (this._otherIdentity == null || this._config.ignoreCommonNameMismatch) {
                // we don't care who we're talking with. groovy.
                this._otherCertificate = firstCert;
            } else {
                // use regex to handle wildcard certs
                let commonName: string = firstCert.getCommonName();
                // replace all regex special characters with escaped version, except for asterisk
                // replace the asterisk with a regex sequence to match one or more non-dot characters
                let commonNameRegex: RegExp = new RegExp(commonName.replace(/[\^\\\-$.[\]|()?+{}]/g, "\\$&").replace(/\*/g, "[^.]+"), "gi");
                if (commonNameRegex.exec(this._otherIdentity)) {
                    this._otherCertificate = firstCert;
                } else {
                    if (this._config.promptUserForAcceptCert) {
                        this._handshakeCanContinue = false;
                        this.dispatchEvent(new TLSEvent(TLSEvent.PROMPT_ACCEPT_CERT));
                    } else {
                        throw new TLSError("Invalid common name: " + firstCert.getCommonName() + ", expected " + this._otherIdentity, TLSError.bad_certificate);
                    }
                }
            }
        } else {
            // Let's ask the user if we can accept this cert. I'm not certain of the behaviour in case of timeouts,
            // so I probably need to handle the case by killing and restarting the connection rather than continuing if it becomes
            // an issue. We shall see. BP
            if (this._config.promptUserForAcceptCert) {
                this._handshakeCanContinue = false;
                this.dispatchEvent(new TLSEvent(TLSEvent.PROMPT_ACCEPT_CERT));
            } else {
                // Cannot continue, die.
                throw new TLSError("Cannot verify certificate", TLSError.bad_certificate);
            }
        }
    }

    // Accept the peer cert, and keep going
    public acceptPeerCertificate(): void {
        this._handshakeCanContinue = true;
        this.sendClientAck(null);
    }

    // Step off biotch! No trust for you!
    public rejectPeerCertificate(): void {
        throw new TLSError("Peer certificate not accepted!", TLSError.bad_certificate);
    }

    private parseAlert(p: ByteArray): void {
        // throw new Error("Alert not implemented.");
        // 7.2
        trace("GOT ALERT! type=" + p[1]);
        this.close();
    }

    private parseChangeCipherSpec(p: ByteArray): void {
        p.readUnsignedByte();
        if (this._pendingReadState == null) {
            throw new TLSError("Not ready to Change Cipher Spec, damnit.", TLSError.unexpected_message);
        }
        this._currentReadState = this._pendingReadState;
        this._pendingReadState = null;
    }

    private parseApplicationData(p: ByteArray): void {
        if (this._state != TLSEngine.STATE_READY) {
            throw new TLSError("Too soon for data!", TLSError.unexpected_message);
            return;
        }
        this.dispatchEvent(new TLSEvent(TLSEvent.DATA, p));
    }

    private handleTLSError(e: TLSError): void {
        // basic rules to keep things simple:
        // - Make a good faith attempt at notifying peers
        // - TLSErrors are always fatal.
        // BP: Meh...not always. Common Name mismatches appear to be common on servers. Instead of closing, let's pause, and ask for confirmation
        // before we tear the connection down.
        this.close(e);
    }
}

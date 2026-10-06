import * as as3 from "as3";
import { int, uint } from "as3";
import { Event, IOErrorEvent, ProgressEvent, SecurityErrorEvent } from "flash/events";
import { ObjectEncoding, Socket } from "flash/net";
import { ByteArray, Endian, IDataInput, IDataOutput, clearTimeout, setTimeout } from "flash/utils";
import { TLSConfig, TLSEngine, TLSEvent, TLSSocketEvent, X509Certificate } from "@game";

export class TLSSocket extends Socket implements IDataInput, IDataOutput {
    static {
        as3.implement(this, [IDataInput, IDataOutput]);
        as3.fields(this, { _endian: null, _objectEncoding: 0, _iStream: null, _oStream: null, _iStream_cursor: 0, _socket: null, _config: null, _engine: null, _ready: false, _writeScheduler: 0 });
    }

    public static readonly ACCEPT_PEER_CERT_PROMPT: string = "acceptPeerCertificatePrompt";
    private _endian: string;
    private _objectEncoding: uint;
    private _iStream: ByteArray;
    private _oStream: ByteArray;
    private _iStream_cursor: uint;
    private _socket: Socket;
    private _config: TLSConfig;
    private _engine: TLSEngine;
    private _ready: boolean;
    private _writeScheduler: uint;

    public $ctor(host: string = null, port: int = 0, config: TLSConfig = null): void {
        super.$ctor();
        this._config = config;
        if (host != null && port != 0) {
            this.connect(host, port);
        }
    }

    public override get bytesAvailable(): uint {
        return this._iStream.bytesAvailable;
    }

    public override get connected(): boolean {
        return Boolean(this._socket && this._socket.connected);
    }

    public override get endian(): string {
        return this._endian;
    }

    public override set endian(value: string) {
        this._endian = value;
        this._iStream.endian = value;
        this._oStream.endian = value;
    }

    public override get objectEncoding(): uint {
        return this._objectEncoding;
    }

    public override set objectEncoding(value: uint) {
        this._objectEncoding = value;
        this._iStream.objectEncoding = value;
        this._oStream.objectEncoding = value;
    }

    private onTLSData(event: TLSEvent): void {
        if (this._iStream.position == this._iStream.length) {
            this._iStream.position = 0;
            this._iStream.length = 0;
            this._iStream_cursor = 0;
        }
        let cursor: uint = this._iStream.position;
        this._iStream.position = this._iStream_cursor;
        this._iStream.writeBytes(event.data);
        this._iStream_cursor = this._iStream.position;
        this._iStream.position = cursor;
        this.dispatchEvent(new ProgressEvent(ProgressEvent.SOCKET_DATA, false, false, event.data.length));
    }

    private onTLSReady(event: TLSEvent): void {
        this._ready = true;
        this.scheduleWrite();
    }

    private onTLSClose(event: Event): void {
        this.dispatchEvent(event);
        // trace("Received TLS close");
        this.close();
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
        if (this._ready) {
            this._engine.sendApplicationData(this._oStream);
            this._oStream.length = 0;
        }
    }

    public override close(): void {
        this._ready = false;
        this._engine.close();
        if (this._socket.connected) {
            this._socket.flush();
            this._socket.close();
        }
    }

    public setTLSConfig(config: TLSConfig): void {
        this._config = config;
    }

    public override connect(host: string, port: int): void {
        this.init(new Socket(), this._config, host);
        this._socket.connect(host, port);
        this._engine.start();
    }

    public releaseSocket(): void {
        this._socket.removeEventListener(Event.CONNECT, as3.bind(this, this.dispatchEvent));
        this._socket.removeEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.dispatchEvent));
        this._socket.removeEventListener(SecurityErrorEvent.SECURITY_ERROR, as3.bind(this, this.dispatchEvent));
        this._socket.removeEventListener(Event.CLOSE, as3.bind(this, this.dispatchEvent));
        this._socket.removeEventListener(ProgressEvent.SOCKET_DATA, as3.bind(this._engine, this._engine.dataAvailable));
        this._socket = null;
    }

    public reinitialize(host: string, config: TLSConfig): void {
        // Reinitialize the connection using new values
        // but re-use the existing socket
        // Doubt this is useful in any valid context other than my specific case (VMWare)
        let ba: ByteArray = new ByteArray();

        if (this._socket.bytesAvailable > 0) {
            this._socket.readBytes(ba, 0, this._socket.bytesAvailable);
        }
        // Do nothing with it.
        this._iStream = new ByteArray();
        this._oStream = new ByteArray();
        this._iStream_cursor = 0;
        this.objectEncoding = ObjectEncoding.DEFAULT;
        this.endian = Endian.BIG_ENDIAN;

        /*
        _socket.addEventListener(Event.CONNECT, dispatchEvent);
        _socket.addEventListener(IOErrorEvent.IO_ERROR, dispatchEvent);
        _socket.addEventListener(SecurityErrorEvent.SECURITY_ERROR, dispatchEvent);
        _socket.addEventListener(Event.CLOSE, dispatchEvent);
         */
        if (config == null) {
            config = new TLSConfig(TLSEngine.CLIENT);
        }

        this._engine = new TLSEngine(config, as3.cast(this._socket, IDataInput), as3.cast(this._socket, IDataOutput), host);
        this._engine.addEventListener(TLSEvent.DATA, as3.bind(this, this.onTLSData));
        this._engine.addEventListener(TLSEvent.READY, as3.bind(this, this.onTLSReady));
        this._engine.addEventListener(Event.CLOSE, as3.bind(this, this.onTLSClose));
        this._engine.addEventListener(ProgressEvent.SOCKET_DATA, (e: any): void => {
            this._socket.flush();
        });
        this._socket.addEventListener(ProgressEvent.SOCKET_DATA, as3.bind(this._engine, this._engine.dataAvailable));
        this._engine.addEventListener(TLSEvent.PROMPT_ACCEPT_CERT, as3.bind(this, this.onAcceptCert));

        this._ready = false;
        this._engine.start();
    }

    public startTLS(socket: Socket, host: string, config: TLSConfig = null): void {
        if (!socket.connected) {
            throw new Error("Cannot STARTTLS on a socket that isn't connected.");
        }
        this.init(socket, config, host);
        this._engine.start();
    }

    private init(socket: Socket, config: TLSConfig, host: string): void {
        this._iStream = new ByteArray();
        this._oStream = new ByteArray();
        this._iStream_cursor = 0;
        this.objectEncoding = ObjectEncoding.DEFAULT;
        this.endian = Endian.BIG_ENDIAN;
        this._socket = socket;
        this._socket.addEventListener(Event.CONNECT, as3.bind(this, this.dispatchEvent));
        this._socket.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.dispatchEvent));
        this._socket.addEventListener(SecurityErrorEvent.SECURITY_ERROR, as3.bind(this, this.dispatchEvent));
        this._socket.addEventListener(Event.CLOSE, as3.bind(this, this.dispatchEvent));

        if (config == null) {
            config = new TLSConfig(TLSEngine.CLIENT);
        }
        this._engine = new TLSEngine(config, as3.cast(this._socket, IDataInput), as3.cast(this._socket, IDataOutput), host);
        this._engine.addEventListener(TLSEvent.DATA, as3.bind(this, this.onTLSData));
        this._engine.addEventListener(TLSEvent.PROMPT_ACCEPT_CERT, as3.bind(this, this.onAcceptCert));
        this._engine.addEventListener(TLSEvent.READY, as3.bind(this, this.onTLSReady));
        this._engine.addEventListener(Event.CLOSE, as3.bind(this, this.onTLSClose));
        this._engine.addEventListener(ProgressEvent.SOCKET_DATA, (e: any): void => {
            if (this.connected) {
                this._socket.flush();
            }
        });
        this._socket.addEventListener(ProgressEvent.SOCKET_DATA, as3.bind(this._engine, this._engine.dataAvailable));

        this._ready = false;
    }

    public override flush(): void {
        this.commitWrite();
        this._socket.flush();
    }

    public override readBoolean(): boolean {
        return this._iStream.readBoolean();
    }

    public override readByte(): int {
        return this._iStream.readByte();
    }

    public override readBytes(bytes: ByteArray, offset: uint = 0, length: uint = 0): void {
        this._iStream.readBytes(bytes, offset, length);
    }

    public override readDouble(): number {
        return this._iStream.readDouble();
    }

    public override readFloat(): number {
        return this._iStream.readFloat();
    }

    public override readInt(): int {
        return this._iStream.readInt();
    }

    public override readMultiByte(length: uint, charSet: string): string {
        return this._iStream.readMultiByte(length, charSet);
    }

    public override readObject(): any {
        return this._iStream.readObject();
    }

    public override readShort(): int {
        return this._iStream.readShort();
    }

    public override readUnsignedByte(): uint {
        return this._iStream.readUnsignedByte();
    }

    public override readUnsignedInt(): uint {
        return this._iStream.readUnsignedInt();
    }

    public override readUnsignedShort(): uint {
        return this._iStream.readUnsignedShort();
    }

    public override readUTF(): string {
        return this._iStream.readUTF();
    }

    public override readUTFBytes(length: uint): string {
        return this._iStream.readUTFBytes(length);
    }

    public override writeBoolean(value: boolean): void {
        this._oStream.writeBoolean(value);
        this.scheduleWrite();
    }

    public override writeByte(value: int): void {
        this._oStream.writeByte(value);
        this.scheduleWrite();
    }

    public override writeBytes(bytes: ByteArray, offset: uint = 0, length: uint = 0): void {
        this._oStream.writeBytes(bytes, offset, length);
        this.scheduleWrite();
    }

    public override writeDouble(value: number): void {
        this._oStream.writeDouble(value);
        this.scheduleWrite();
    }

    public override writeFloat(value: number): void {
        this._oStream.writeFloat(value);
        this.scheduleWrite();
    }

    public override writeInt(value: int): void {
        this._oStream.writeInt(value);
        this.scheduleWrite();
    }

    public override writeMultiByte(value: string, charSet: string): void {
        this._oStream.writeMultiByte(value, charSet);
        this.scheduleWrite();
    }

    public override writeObject(object: any): void {
        this._oStream.writeObject(object);
        this.scheduleWrite();
    }

    public override writeShort(value: int): void {
        this._oStream.writeShort(value);
        this.scheduleWrite();
    }

    public override writeUnsignedInt(value: uint): void {
        this._oStream.writeUnsignedInt(value);
        this.scheduleWrite();
    }

    public override writeUTF(value: string): void {
        this._oStream.writeUTF(value);
        this.scheduleWrite();
    }

    public override writeUTFBytes(value: string): void {
        this._oStream.writeUTFBytes(value);
        this.scheduleWrite();
    }

    public getPeerCertificate(): X509Certificate {
        return this._engine.peerCertificate;
    }

    public onAcceptCert(event: TLSEvent): void {
        this.dispatchEvent(new TLSSocketEvent(this._engine.peerCertificate));
    }

    // These are just a passthroughs to the engine. Encapsulation, et al
    public acceptPeerCertificate(event: Event): void {
        this._engine.acceptPeerCertificate();
    }

    public rejectPeerCertificate(event: Event): void {
        this._engine.rejectPeerCertificate();
    }
}

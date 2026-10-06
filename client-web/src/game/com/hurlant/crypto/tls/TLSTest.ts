import * as as3 from "as3";
import { ASObject, int, trace, uint } from "as3";
import { Event, ProgressEvent } from "flash/events";
import { Socket } from "flash/net";
import { ByteArray, IDataInput, IDataOutput, getTimer } from "flash/utils";
import { Hex, PEM, SSLSecurityParameters, TLSConfig, TLSEngine, TLSSocket, X509Certificate, X509CertificateCollection } from "@game";

export class TLSTest extends ASObject {
    static {
        as3.fields(this, { myDebugData: null, myCert: null, myKey: null });
    }

    public myDebugData: string;
    // [Embed(source="/src/host.cert",mimeType="application/octet-stream")]
    public myCert: any;
    // [Embed(source="/src/host.key",mimeType="application/octet-stream")]
    public myKey: any;

    public $ctor(host: string = null, port: int = 0, type: int = 0): void {
        super.$ctor();
        // loopback();
        if (host != null) {
            if (type == 0) {
                // SSL 3.0
                this.connectLoginYahooCom();
            } else {
                this.connectLocalTLS(host, port);
            }
        } else {
            this.testSocket();
        }
    }

    public connectLoginYahooCom(): void {
        let s: Socket = null;
        trace("Connecting test socket");
        s = new Socket("esx.bluebearllc.net", 903);

        let clientConfig: TLSConfig = new TLSConfig(TLSEngine.CLIENT, null, null, null, null, null, SSLSecurityParameters.PROTOCOL_VERSION);

        let client: TLSEngine = new TLSEngine(clientConfig, as3.cast(s, IDataInput), as3.cast(s, IDataOutput));
        // hook some events.
        s.addEventListener(ProgressEvent.SOCKET_DATA, as3.bind(client, client.dataAvailable));
        client.addEventListener(ProgressEvent.SOCKET_DATA, (e: any): void => {
            s.flush();
        });
        client.start();
    }

    public connectLocalTLS(host: string, port: int): void {
        let s: Socket = null;
        s = new Socket(host, port);

        let clientConfig: TLSConfig = new TLSConfig(TLSEngine.CLIENT);

        let client: TLSEngine = new TLSEngine(clientConfig, as3.cast(s, IDataInput), as3.cast(s, IDataOutput));
        // hook some events.
        s.addEventListener(ProgressEvent.SOCKET_DATA, as3.bind(client, client.dataAvailable));
        client.addEventListener(ProgressEvent.SOCKET_DATA, (e: any): void => {
            s.flush();
        });

        client.start();
    }

    public connectLocalSSL(host: string, port: int): void {
        let s: Socket = null;
        s = new Socket(host, port);

        let clientConfig: TLSConfig = new TLSConfig(TLSEngine.CLIENT, null, null, null, null, null, SSLSecurityParameters.PROTOCOL_VERSION);

        let client: TLSEngine = new TLSEngine(clientConfig, as3.cast(s, IDataInput), as3.cast(s, IDataOutput));
        // hook some events.
        s.addEventListener(ProgressEvent.SOCKET_DATA, as3.bind(client, client.dataAvailable));
        client.addEventListener(ProgressEvent.SOCKET_DATA, (e: any): void => {
            s.flush();
        });

        client.start();
    }

    public loopback(): void {
        let server_write: ByteArray = null;
        let client_write: ByteArray = null;
        let server_write_cursor: uint = 0;
        let client_write_cursor: uint = 0;
        let server: TLSEngine = null;
        let client: TLSEngine = null;
        server_write = new ByteArray();
        client_write = new ByteArray();
        server_write_cursor = 0;
        client_write_cursor = 0;

        let clientConfig: TLSConfig = new TLSConfig(TLSEngine.CLIENT, null, null, null, null, null, SSLSecurityParameters.PROTOCOL_VERSION);
        let serverConfig: TLSConfig = new TLSConfig(TLSEngine.SERVER, null, null, null, null, null, SSLSecurityParameters.PROTOCOL_VERSION);

        let cert: ByteArray = as3.cast(new this.myCert(), ByteArray);
        let key: ByteArray = as3.cast(new this.myKey(), ByteArray);
        serverConfig.setPEMCertificate(cert.readUTFBytes(cert.length), key.readUTFBytes(key.length));
        // tmp, for debugging. currently useless
        cert.position = 0;
        key.position = 0;
        clientConfig.setPEMCertificate(cert.readUTFBytes(cert.length), key.readUTFBytes(key.length));
        // put the server cert in the client's trusted store, to keep things happy.
        clientConfig.CAStore = new X509CertificateCollection();
        cert.position = 0;
        let x509: X509Certificate = new X509Certificate(PEM.readCertIntoArray(cert.readUTFBytes(cert.length)));
        clientConfig.CAStore.addCertificate(x509);

        server = new TLSEngine(serverConfig, as3.cast(client_write, IDataInput), as3.cast(server_write, IDataOutput));
        client = new TLSEngine(clientConfig, as3.cast(server_write, IDataInput), as3.cast(client_write, IDataOutput));

        server.addEventListener(ProgressEvent.SOCKET_DATA, (e: any = null): void => {
            trace("server wrote something!");
            trace(Hex.fromArray(server_write));
            let l: uint = server_write.position;
            server_write.position = server_write_cursor;
            client.dataAvailable(e);
            server_write.position = l;
            server_write_cursor = l;
        });
        client.addEventListener(ProgressEvent.SOCKET_DATA, (e: any = null): void => {
            trace("client wrote something!");
            trace(Hex.fromArray(client_write));
            let l: uint = client_write.position;
            client_write.position = client_write_cursor;
            server.dataAvailable(e);
            client_write.position = l;
            client_write_cursor = l;
        });

        server.start();
        client.start();
    }

    public testSocket(): void {
        let hosts: any[] = null;
        let i: int = 0;
        hosts = ["bugs.adobe.com", "login.yahoo.com", "login.live.com", "banking.wellsfargo.com", "www.bankofamerica.com"];
        i = 0;
        (function next(): void {
            this.testHost(as3.str(hosts[i++]), next);
        })();
    }

    private testHost(hostArg: string, next: Function): void {
        let t1: int = 0;
        let host: string = null;
        let t: TLSSocket = null;
        if (hostArg == null) {
            return;
        }
        t1 = getTimer();

        host = hostArg;
        t = new TLSSocket();
        t.connect(host, 4433);
        t.writeUTFBytes("GET / HTTP/1.0\nHost: " + host + "\n\n");
        t.addEventListener(Event.CLOSE, (e: any): void => {
            let s: string = t.readUTFBytes(t.bytesAvailable);
            trace("Response from " + host + ": " + s.length + " characters");
            let bytes: ByteArray = new ByteArray();
            t.readBytes(bytes, 0, t.bytesAvailable);
            trace(Hex.fromArray(bytes));
            trace("Time used = " + (getTimer() - t1) + "ms");
            next();
        });
    }
}

import * as as3 from "as3";
import { Event } from "flash/events";
import { X509Certificate } from "@game";

export class TLSSocketEvent extends Event {
    static {
        as3.fields(this, { cert: null });
    }

    public static readonly PROMPT_ACCEPT_CERT: string = "promptAcceptCert";
    public cert: X509Certificate;

    public $ctor(cert: any /* X509Certificate */ = null): void {
        super.$ctor(TLSSocketEvent.PROMPT_ACCEPT_CERT, false, false);
        this.cert = cert;
    }
}

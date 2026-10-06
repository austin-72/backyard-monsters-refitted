import { ErrorEvent } from "flash/events";

export class WebSocketErrorEvent extends ErrorEvent {
    public static readonly CONNECTION_FAIL: string = "connectionFail";
    public static readonly ABNORMAL_CLOSE: string = "abnormalClose";

    public $ctor(type?: string, bubbles: boolean = false, cancelable: boolean = false, text: string = ""): void {
        super.$ctor(type, bubbles, cancelable, text);
    }
}

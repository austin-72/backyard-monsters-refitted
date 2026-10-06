import * as as3 from "as3";
import { Event } from "flash/events";
import { WebSocketFrame, WebSocketMessage } from "@game";

export class WebSocketEvent extends Event {
    static {
        as3.fields(this, { message: null, frame: null });
    }

    public static readonly OPEN: string = "open";
    public static readonly CLOSED: string = "closed";
    public static readonly MESSAGE: string = "message";
    public static readonly FRAME: string = "frame";
    public static readonly PING: string = "ping";
    public static readonly PONG: string = "pong";
    public message: WebSocketMessage;
    public frame: WebSocketFrame;

    public $ctor(type?: string, bubbles: boolean = false, cancelable: boolean = false): void {
        super.$ctor(type, bubbles, cancelable);
    }
}

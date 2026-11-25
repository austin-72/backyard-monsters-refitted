import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ARCADE, GLOBAL, KEYS, WebSocket, WebSocketErrorEvent, WebSocketEvent } from "@game";
import { getTimer, setTimeout } from "flash/utils";

/**
 * Inferno-only: the Devil's Arcade's socket (server/src/services/arcade/hub.ts, /arcade/ws on the game's own
 * address). The game asks the server for a ticket over HTTP (ARCADE.ticket), then opens the socket with it.
 * Messages are JSON objects with a type `t`; whoever is playing sets `handler` (and `onLost`) to hear them.
 * Messages sent before the socket is open wait for it.
 */
export class ArcadeNet extends ASObject {
    private static _ws: WebSocket = null;

    private static _open: boolean = false;

    private static _connecting: boolean = false;

    private static _pending: any[] = [];

    private static _waiters: any[] = [];

    /** The player's own user id, as the socket said hello. */
    public static uid: int = 0;

    /** Hears every message: function(msg:Object):void. */
    public static handler: Function = null;

    /** Called when the socket is lost (or could not open): function(message:String):void. (QoL #235: the messages
     * are in the player's language: io_t3a_net_lost, io_t3a_net_unreachable) */
    public static onLost: Function = null;

    /** Counts connection attempts: a close ends the one under way. */
    private static _attempt: int = 0;

    /**
     * Inferno-only (QoL #367): the relay match under way (its room; 0: none), from its "start" (`grace`: how long the
     * server keeps the seat when the connection drops). Lost meanwhile, the socket opens again and asks for the
     * seat back ({t: "resume", room}) instead of ending the match; the handler hears {t: "reconnecting"} and then
     * {t: "reconnected"} (or the match's end, or onLost when it couldn't).
     */
    private static _ioRoom: int = 0;

    private static _ioGraceMs: int = 0;

    /** Coming back now: until when (getTimer), and what the game sent meanwhile (sent once the seat is back). */
    private static _ioResuming: boolean = false;

    private static _ioResumeUntil: int = 0;

    private static _ioResumeQueue: any[] = [];

    /** The server said the arcade was opened somewhere else: that one plays, this one doesn't come back. */
    private static _ioElsewhere: boolean = false;

    /** Counts the times a match was come back to (a timer from an earlier one ends nothing). */
    private static _ioResumeSerial: int = 0;

    /** QoL #367: coming back after a dropped connection. */
    public static get ioResuming(): boolean {
        return ArcadeNet._ioResuming;
    }

    public static get connected(): boolean {
        return ArcadeNet._open;
    }

    /** Opens the socket if it isn't (then calls onReady(null), or onReady("why not")). */
    public static connect(onReady: Function = null): void {
        let attempt: int = 0;
        if (ArcadeNet._open) {
            if (onReady != null) {
                onReady(null);
            }
            return;
        }
        if (onReady != null) {
            ArcadeNet._waiters.push(onReady);
        }
        if (ArcadeNet._connecting) {
            return;
        }
        ArcadeNet._connecting = true;
        attempt = (++ArcadeNet._attempt) | 0;
        ARCADE.ticket((r: any): void => {
            // (closed while the ticket was asked for: no socket opened that nobody listens to; 9 October)
            if (attempt != ArcadeNet._attempt) {
                return;
            }
            if (r.error) {
                ArcadeNet.fail(String(r.error));
                return;
            }
            let base: string = GLOBAL.serverUrl;
            if (base.charAt(base.length - 1) != "/") {
                base += "/";
            }
            let url: string = base.replace(/^http/, "ws") + String(r.path) + "?ticket=" + String(r.ticket);
            let origin: string = base.replace(/\/$/, "");
            try {
                ArcadeNet._ws = new WebSocket(url, origin, null, 10000);
            } catch (e) {
                ArcadeNet.fail(KEYS.Get("io_t3a_net_unreachable"));
                return;
            }
            ArcadeNet._ws.addEventListener(WebSocketEvent.OPEN, ArcadeNet.onOpen);
            ArcadeNet._ws.addEventListener(WebSocketEvent.MESSAGE, ArcadeNet.onMessage);
            ArcadeNet._ws.addEventListener(WebSocketEvent.CLOSED, ArcadeNet.onClosed);
            ArcadeNet._ws.addEventListener(WebSocketErrorEvent.CONNECTION_FAIL, ArcadeNet.onError);
            ArcadeNet._ws.addEventListener(WebSocketErrorEvent.ABNORMAL_CLOSE, ArcadeNet.onError);
            ArcadeNet._ws.connect();
        });
    }

    private static fail(message: string): void {
        ArcadeNet._connecting = false;
        ArcadeNet._open = false;
        let w: any[] = ArcadeNet._waiters;
        ArcadeNet._waiters = [];
        ArcadeNet._pending = [];
        for (let f of as3.values(w)) {
            f(message);
        }
    }

    private static onOpen(e: WebSocketEvent): void {
        ArcadeNet._open = true;
        // (QoL #367: a socket of this game's own again)
        ArcadeNet._ioElsewhere = false;
        ArcadeNet._connecting = false;
        for (const $value of as3.values(ArcadeNet._pending)) {
            let raw: string = as3.str($value);
            ArcadeNet._ws.sendUTF(raw);
        }
        ArcadeNet._pending = [];
        let w: any[] = ArcadeNet._waiters;
        ArcadeNet._waiters = [];
        for (let f of as3.values(w)) {
            f(null);
        }
    }

    private static onMessage(e: WebSocketEvent): void {
        let raw: string = e.message ? e.message.utf8Data : null;
        if (!raw) {
            return;
        }
        let msg: any = null;
        try {
            msg = JSON.parse(raw);
        } catch (err) {
            return;
        }
        if (!msg) {
            return;
        }
        if (msg.t == "hi") {
            ArcadeNet.uid = msg.uid | 0;
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #367: the match a dropped connection may come back to)
            if (msg.t == "start") {
                ArcadeNet._ioRoom = (msg.grace | 0) > 0 ? msg.room | 0 : 0;
                ArcadeNet._ioGraceMs = ((msg.grace | 0) * 1000) | 0;
            } else if (msg.t == "end" || msg.t == "out") {
                ArcadeNet._ioRoom = 0;
            } else if (msg.t == "err" && msg.elsewhere) {
                ArcadeNet._ioElsewhere = true;
                ArcadeNet._ioRoom = 0;
            } else if (msg.t == "resumed") {
                ArcadeNet.ioResumed(msg);
                return;
            }
        }
        if (ArcadeNet.handler != null) {
            ArcadeNet.handler(msg);
        }
    }

    private static onClosed(e: WebSocketEvent): void {
        ArcadeNet.lost(KEYS.Get("io_t3a_net_lost"));
    }

    private static onError(e: WebSocketErrorEvent): void {
        if (!ArcadeNet._open) {
            ArcadeNet.fail(KEYS.Get("io_t3a_net_unreachable"));
            return;
        }
        ArcadeNet.lost(KEYS.Get("io_t3a_net_lost"));
    }

    private static lost(message: string): void {
        let was: boolean = ArcadeNet._open;
        ArcadeNet._open = false;
        ArcadeNet._connecting = false;
        // (QoL #367: in a relay match, back to it if the server still keeps the seat; lost again while coming back:
        // tried again, until the grace is up)
        if (was && GLOBAL.INFERNO_ONLY && ArcadeNet._ioRoom > 0 && !ArcadeNet._ioElsewhere) {
            ArcadeNet.ioDetach(ArcadeNet._ws);
            ArcadeNet._ws = null;
            if (ArcadeNet._ioResuming) {
                setTimeout((): void => {
                    ArcadeNet.ioTryResume(message);
                }, 1000);
            } else {
                ArcadeNet.ioStartResume(message);
            }
            return;
        }
        ArcadeNet._ws = null;
        if (was && ArcadeNet.onLost != null) {
            ArcadeNet.onLost(message);
        }
    }

    /** QoL #367: a socket no longer listened to (a late close or error from it ended the next one). */
    private static ioDetach(ws: WebSocket): void {
        if (!ws) {
            return;
        }
        ws.removeEventListener(WebSocketEvent.OPEN, ArcadeNet.onOpen);
        ws.removeEventListener(WebSocketEvent.MESSAGE, ArcadeNet.onMessage);
        ws.removeEventListener(WebSocketEvent.CLOSED, ArcadeNet.onClosed);
        ws.removeEventListener(WebSocketErrorEvent.CONNECTION_FAIL, ArcadeNet.onError);
        ws.removeEventListener(WebSocketErrorEvent.ABNORMAL_CLOSE, ArcadeNet.onError);
        try {
            ws.close();
        } catch (e) {
        }
    }

    /** QoL #367: the connection dropped mid-match: tries to open again within the seat's grace. */
    private static ioStartResume(message: string): void {
        let serial: int = (++ArcadeNet._ioResumeSerial) | 0;
        ArcadeNet._ioResuming = true;
        ArcadeNet._ioResumeQueue = [];
        // (a second short of the server's: the seat is asked for while it still waits)
        ArcadeNet._ioResumeUntil = (getTimer() + Math.max(2000, ArcadeNet._ioGraceMs - 1000)) | 0;
        if (ArcadeNet.handler != null) {
            ArcadeNet.handler({ "t": "reconnecting", "s": (ArcadeNet._ioGraceMs / 1000) | 0 });
        }
        ArcadeNet.ioTryResume(message);
        // (no answer in time: the match is lost, as before)
        setTimeout((): void => {
            if (ArcadeNet._ioResuming && serial == ArcadeNet._ioResumeSerial) {
                ArcadeNet.ioGiveUp(message);
            }
        }, Math.max(3000, ArcadeNet._ioGraceMs + 1500));
    }

    private static ioTryResume(message: string): void {
        if (!ArcadeNet._ioResuming) {
            return;
        }
        if (getTimer() > ArcadeNet._ioResumeUntil) {
            ArcadeNet.ioGiveUp(message);
            return;
        }
        let room: int = ArcadeNet._ioRoom;
        ArcadeNet.connect((err: string): void => {
            if (!ArcadeNet._ioResuming || room != ArcadeNet._ioRoom) {
                return;
            }
            if (err) {
                setTimeout((): void => {
                    ArcadeNet.ioTryResume(message);
                }, 1500);
                return;
            }
            // (the first thing on the new socket: what the game sent meanwhile goes after it, ioResumed)
            if (ArcadeNet._ws) {
                ArcadeNet._ws.sendUTF(JSON.stringify({ "t": "resume", "room": room }));
            }
        });
    }

    /** QoL #367: the server's answer to "resume": the seat back (the queued messages go now), or the match's end. */
    private static ioResumed(msg: any): void {
        if (!ArcadeNet._ioResuming) {
            return;
        }
        ArcadeNet._ioResuming = false;
        let queued: any[] = ArcadeNet._ioResumeQueue;
        ArcadeNet._ioResumeQueue = [];
        if (msg.ok) {
            for (const $value of as3.values(queued)) {
                ArcadeNet.send($value);
            }
            if (ArcadeNet.handler != null) {
                ArcadeNet.handler({ "t": "reconnected" });
            }
            return;
        }
        ArcadeNet._ioRoom = 0;
        // (it ended meanwhile: its result, as if it had come)
        if (msg.end && ArcadeNet.handler != null) {
            ArcadeNet.handler(msg.end);
            return;
        }
        if (ArcadeNet.onLost != null) {
            ArcadeNet.onLost(KEYS.Get("io_t3a_net_lost"));
        }
    }

    private static ioGiveUp(message: string): void {
        if (!ArcadeNet._ioResuming) {
            return;
        }
        ArcadeNet._ioResuming = false;
        ArcadeNet._ioResumeQueue = [];
        ArcadeNet._ioRoom = 0;
        if (ArcadeNet.onLost != null) {
            ArcadeNet.onLost(message);
        }
    }

    public static send(msg: any): void {
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #367: out of the match, or another asked for: nothing to come back to; coming back, what the game
            // sends is kept for the seat, in order)
            if (msg && (msg.t == "x" || msg.t == "q")) {
                ArcadeNet._ioRoom = 0;
                ArcadeNet._ioResuming = false;
                ArcadeNet._ioResumeQueue = [];
            } else if (ArcadeNet._ioResuming) {
                if (ArcadeNet._ioResumeQueue.length < 300) {
                    ArcadeNet._ioResumeQueue.push(msg);
                }
                return;
            }
        }
        let raw: string = JSON.stringify(msg);
        if (ArcadeNet._open && ArcadeNet._ws) {
            ArcadeNet._ws.sendUTF(raw);
        } else if (ArcadeNet._connecting) {
            ArcadeNet._pending.push(raw);
        }
    }

    /** Closes the socket (leaving the arcade). */
    public static close(): void {
        ArcadeNet._attempt++;
        // (QoL #367: nothing to come back to)
        ArcadeNet._ioRoom = 0;
        ArcadeNet._ioResuming = false;
        ArcadeNet._ioResumeQueue = [];
        ArcadeNet._ioElsewhere = false;
        ArcadeNet._connecting = false;
        ArcadeNet.handler = null;
        ArcadeNet.onLost = null;
        ArcadeNet._pending = [];
        ArcadeNet._waiters = [];
        if (ArcadeNet._ws) {
            let ws: WebSocket = ArcadeNet._ws;
            ArcadeNet._ws = null;
            ArcadeNet._open = false;
            ArcadeNet._connecting = false;
            // (its events no more: a late close or error from it, after the arcade was opened again, ended the
            // new connection and told the new window it was lost; 9 October)
            ws.removeEventListener(WebSocketEvent.OPEN, ArcadeNet.onOpen);
            ws.removeEventListener(WebSocketEvent.MESSAGE, ArcadeNet.onMessage);
            ws.removeEventListener(WebSocketEvent.CLOSED, ArcadeNet.onClosed);
            ws.removeEventListener(WebSocketErrorEvent.CONNECTION_FAIL, ArcadeNet.onError);
            ws.removeEventListener(WebSocketErrorEvent.ABNORMAL_CLOSE, ArcadeNet.onError);
            try {
                ws.close();
            } catch (e) {
            }
        }
    }
}

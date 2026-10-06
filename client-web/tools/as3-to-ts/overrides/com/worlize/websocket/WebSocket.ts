/**
 * DELIBERATE DEVIATION (see DEVIATIONS.md): the Flash client ran this library's
 * own WebSocket protocol implementation over flash.net.Socket (raw TCP), which
 * browsers do not allow. This replacement keeps the library's public API and
 * events but uses the browser's native WebSocket. It is copied over the
 * converter's output by tools/as3-to-ts/cli.ts.
 */
import * as as3 from "as3";
import { int, uint } from "as3";
import { EventDispatcher } from "flash/events";
import { ByteArray } from "flash/utils";
import { WebSocketConfig, WebSocketErrorEvent, WebSocketEvent, WebSocketMessage, WebSocketState } from "@game";
import { runtimeHooks } from "../../../../flash/_runtime";

export class WebSocket extends EventDispatcher {
    static {
        as3.fields(this, { config: null, debug: false });
    }

    public config: WebSocketConfig;
    public debug: boolean;
    declare private $uri: string;
    declare private $origin: string;
    declare private $protocols: string[];
    declare private $timeout: uint;
    declare private $ws: globalThis.WebSocket | null;
    declare private $state: int;
    declare private $failed: boolean;

    public $ctor(uri: string, origin: string, protocols: any = null, timeout: uint = 10000): void {
        super.$ctor();
        this.config = new WebSocketConfig();
        this.$uri = uri;
        this.$origin = origin;
        this.$protocols = protocols == null ? [] : Array.isArray(protocols) ? protocols.map(String) : [String(protocols)];
        this.$timeout = timeout;
        this.$ws = null;
        this.$state = WebSocketState.INIT;
        this.$failed = false;
    }

    public connect(): void {
        if (this.$ws) return;
        // Pages served over https may only open secure sockets.
        let url = this.$uri;
        if (typeof location !== "undefined" && location.protocol === "https:" && url.startsWith("ws://")) url = "wss://" + url.slice(5);
        let ws: globalThis.WebSocket;
        try {
            ws = new globalThis.WebSocket(url, this.$protocols.length ? this.$protocols : undefined);
        } catch (e: any) {
            this.$fail(WebSocketErrorEvent.CONNECTION_FAIL, String(e?.message ?? e));
            return;
        }
        ws.binaryType = "arraybuffer";
        this.$ws = ws;
        this.$state = WebSocketState.CONNECTING;
        const timer = setTimeout(() => {
            if (this.$state === WebSocketState.CONNECTING) { ws.close(); this.$fail(WebSocketErrorEvent.CONNECTION_FAIL, "Connection timeout"); }
        }, this.$timeout || 10000);
        ws.onopen = () => {
            clearTimeout(timer);
            this.$state = WebSocketState.OPEN;
            runtimeHooks.defer(() => this.dispatchEvent(new WebSocketEvent(WebSocketEvent.OPEN)));
        };
        ws.onmessage = (ev) => {
            const msg = new WebSocketMessage();
            if (typeof ev.data === "string") {
                msg.type = WebSocketMessage.TYPE_UTF8;
                msg.utf8Data = ev.data;
            } else {
                msg.type = WebSocketMessage.TYPE_BINARY;
                msg.binaryData = ByteArray.$from(new Uint8Array(ev.data as ArrayBuffer));
            }
            runtimeHooks.defer(() => {
                const e = new WebSocketEvent(WebSocketEvent.MESSAGE);
                e.message = msg;
                this.dispatchEvent(e);
            });
        };
        ws.onerror = () => {
            clearTimeout(timer);
            if (this.$state === WebSocketState.CONNECTING) this.$fail(WebSocketErrorEvent.CONNECTION_FAIL, "Unable to connect");
        };
        ws.onclose = (ev) => {
            clearTimeout(timer);
            const wasOpen = this.$state === WebSocketState.OPEN;
            this.$state = WebSocketState.CLOSED;
            this.$ws = null;
            runtimeHooks.defer(() => {
                if (wasOpen && !ev.wasClean) this.dispatchEvent(new WebSocketErrorEvent(WebSocketErrorEvent.ABNORMAL_CLOSE, false, false, `Close code ${ev.code}`));
                this.dispatchEvent(new WebSocketEvent(WebSocketEvent.CLOSED));
            });
        };
    }

    private $fail(type: string, text: string): void {
        if (this.$failed) return;
        this.$failed = true;
        this.$state = WebSocketState.CLOSED;
        runtimeHooks.defer(() => this.dispatchEvent(new WebSocketErrorEvent(type, false, false, text)));
    }

    public get readyState(): int { return this.$state; }
    public get bufferedAmount(): int { return this.$ws?.bufferedAmount ?? 0; }
    public get uri(): string { return this.$uri; }
    public get protocol(): string { return this.$ws?.protocol || null; }
    public get extensions(): any[] { return []; }
    public get host(): string { try { return new URL(this.$uri).hostname; } catch { return null; } }
    public get port(): uint { try { const u = new URL(this.$uri); return Number(u.port || (u.protocol === "wss:" ? 443 : 80)) >>> 0; } catch { return 0; } }
    public get resource(): string { try { const u = new URL(this.$uri); return u.pathname + u.search; } catch { return "/"; } }
    public get secure(): boolean { return this.$uri.startsWith("wss:"); }
    public get connected(): boolean { return this.$state === WebSocketState.OPEN; }
    public set useNullMask(_v: boolean) {}
    public get useNullMask(): boolean { return false; }

    public sendUTF(data: string): void {
        if (this.$ws && this.$state === WebSocketState.OPEN) this.$ws.send(String(data));
    }
    public sendBytes(data: ByteArray): void {
        if (this.$ws && this.$state === WebSocketState.OPEN) this.$ws.send(data.$toUint8Array());
    }
    /** Browsers answer pings themselves; application-level pings are not exposed. */
    public ping(_payload: ByteArray = null): void {}
    public close(_waitForServer: boolean = true): void {
        if (this.$ws) {
            this.$state = WebSocketState.CLOSED;
            this.$ws.close(1000);
        }
    }
}

import * as as3 from "as3";
import { Vector, int } from "as3";
import { EventDispatcher, TimerEvent } from "flash/events";
import { Dictionary, Timer } from "flash/utils";
import { Channel, Chat, ChatEvent, ChatWire, ClientMessageType, IAuthenticationSystem, IChatSystem, ServerMessageType, WebSocket, WebSocketErrorEvent, WebSocketEvent } from "@game";

export class WSChatSystem extends EventDispatcher implements IChatSystem {
    static {
        as3.implement(this, [IChatSystem]);
        as3.fields(this, { _ws: null, _host: null, _port: 0, _connected: false, _loggedIn: false, _rooms: null, _pingTimer: null, _pendingUserId: null });
    }

    private _ws: WebSocket;
    private _host: string;
    private _port: int;
    private _connected: boolean;
    private _loggedIn: boolean;
    private _rooms: Vector<string>;
    private _pingTimer: Timer;
    private _pendingUserId: string;

    public $ctor(host?: any /* string */, port?: int): void {
        this._rooms = new Vector<string>(0, false, String);
        super.$ctor();
        this._host = host;
        this._port = port;
    }

    // ── IChatSystem: Connection ───────────────────────────────────────────
    public connect(): boolean {
        this._ws = new WebSocket("ws://" + this._host + ":" + this._port + "/", "http://" + this._host);
        this._ws.addEventListener(WebSocketEvent.OPEN, as3.bind(this, this.onWsOpen));
        this._ws.addEventListener(WebSocketEvent.MESSAGE, as3.bind(this, this.onWsMessage));
        this._ws.addEventListener(WebSocketEvent.CLOSED, as3.bind(this, this.onWsClose));
        this._ws.addEventListener(WebSocketErrorEvent.CONNECTION_FAIL, as3.bind(this, this.onWsError));
        this._ws.addEventListener(WebSocketErrorEvent.ABNORMAL_CLOSE, as3.bind(this, this.onWsError));
        this._ws.connect();
        this._pingTimer = new Timer(90000);
        this._pingTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onPingTimer));
        this._pingTimer.start();
        return true;
    }

    public disconnect(): void {
        if (this._pingTimer) {
            this._pingTimer.stop();
            this._pingTimer = null;
        }
        if (this._ws) {
            this._ws.close();
        }
        this._connected = false;
        this._loggedIn = false;
    }

    public get isConnected(): boolean {
        return this._connected;
    }

    // ── IChatSystem: Authentication ───────────────────────────────────────
    public login(auth: IAuthenticationSystem): void {
        let userId: string = auth.User.Name;
        this._pendingUserId = userId;
        if (this._connected) {
            this.sendAuth(userId);
        }
    }

    public logout(): void {
        this.disconnect();
    }

    public get isLoggedIn(): boolean {
        return this._loggedIn;
    }

    // ── IChatSystem: Channels ─────────────────────────────────────────────
    public join(channel: Channel, password: string = null, createIfMissing: boolean = false): void {
        this.sendJson({ type: ClientMessageType.JOIN, channel: channel.Name });
    }

    public leave(channel: Channel, autocleanup: boolean = false): void {
        this.sendJson({ type: ClientMessageType.LEAVE, channel: channel.Name });
        let idx: int = this._rooms.indexOf(channel.Name) | 0;
        if (idx != -1) {
            this._rooms.splice(idx, 1);
        }
    }

    public get roomNames(): Vector<string> {
        return this._rooms;
    }

    // ── IChatSystem: Messaging ────────────────────────────────────────────
    public say(channel: Channel, message: string): void {
        this.sendJson({ type: ClientMessageType.SAY, channel: channel.Name, message: message });
    }

    public adminMessage(message: string): void {
    }

    // ── IChatSystem: Display names ────────────────────────────────────────
    public setDisplayNameUserVar(displayName: string): void {
        this.sendJson({ type: ClientMessageType.UPDATE_NAME, displayName: displayName });
    }

    public updateDisplayName(channel: Channel, userId: string, displayName: string): void {
        this.sendJson({ type: ClientMessageType.UPDATE_NAME, displayName: displayName });
    }

    public updateDisplayNameDirect(channel: Channel, recipientId: string, userId: string, displayName: string): void {
    }

    public get numUsers(): int {
        return 0;
    }

    // ── IChatSystem: Ignore list ──────────────────────────────────────────
    public showIgnore(): void {
        this.sendJson({ type: ClientMessageType.GET_IGNORE, action: "show" });
    }

    /** At login: the list, to apply quietly. */
    public getIgnore(): void {
        this.sendJson({ type: ClientMessageType.GET_IGNORE, action: "sync" });
    }

    /** `target` a user id; or "" with `displayName` a player's name (the /ignore command). */
    public ignore(target: string, displayName: string): void {
        if (target != null && target.length > 0) {
            this.sendJson({ type: ClientMessageType.IGNORE, targetId: target });
        } else {
            this.sendJson({ type: ClientMessageType.IGNORE, targetName: displayName });
        }
    }

    /** A user id, or a player's name. */
    public unignore(target: string): void {
        if (/^\d+$/.test(target)) {
            this.sendJson({ type: ClientMessageType.UNIGNORE, targetId: target });
        } else {
            this.sendJson({ type: ClientMessageType.UNIGNORE, targetName: target });
        }
    }

    // ── IChatSystem: Utility ──────────────────────────────────────────────
    public list(filter: string = null): void {
    }

    public members(channel: Channel): void {
    }

    public error(code: string, message: string): void {
    }

    public moderate(action: string, params: any): void {
        let msg: any = { type: action };
        for (let key in params) {
            msg[key] = params[key];
        }
        this.sendJson(msg);
    }

    // ── WebSocket event handlers ──────────────────────────────────────────
    private onWsOpen(e: WebSocketEvent): void {
        this._connected = true;
        this.dispatchEvent(new ChatEvent(ChatEvent.CONNECT, true));
        if (this._pendingUserId != null) {
            this.sendAuth(this._pendingUserId);
        }
    }

    private onWsClose(e: WebSocketEvent): void {
        this._connected = false;
        this._loggedIn = false;
    }

    private onWsError(e: WebSocketErrorEvent): void {
        this._connected = false;
        this._loggedIn = false;
        let params: Dictionary = new Dictionary();
        params.set("reason", e.text != null ? e.text : "connection error");
        this.dispatchEvent(new ChatEvent(ChatEvent.CONNECT, false, params));
    }

    private onWsMessage(e: WebSocketEvent): void {
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

        switch (as3.as(msg.type, String)) {
            case ServerMessageType.AUTH_OK:
                this._loggedIn = true;
                let okParams: Dictionary = new Dictionary();
                okParams.set("displayname", msg.displayName != null ? String(msg.displayName) : null);
                okParams.set("role", msg.role != null ? String(msg.role) : null);
                okParams.set("relogin", msg.refresh == true);
                this.dispatchEvent(new ChatEvent(ChatEvent.LOGIN, true, okParams));
                break;
            case ServerMessageType.AUTH_FAIL:
                this._loggedIn = false;
                let failParams: Dictionary = new Dictionary();
                failParams.set("reason", msg.reason);
                this.dispatchEvent(new ChatEvent(ChatEvent.LOGIN, false, failParams));
                break;
            default:
                ChatWire.dispatch(this, msg, this._rooms);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private onPingTimer(e: TimerEvent): void {
        if (this._connected) {
            this.sendJson({ type: ClientMessageType.PING });
        }
    }

    private sendAuth(userId: string): void {
        let token: string = Chat._chatToken;
        if (token == null || token.length == 0) {
            let failParams: Dictionary = new Dictionary();
            failParams.set("reason", "no_chat_token");
            this.dispatchEvent(new ChatEvent(ChatEvent.LOGIN, false, failParams));
            return;
        }
        this.sendJson({ type: ClientMessageType.AUTH, userId: Number(userId) | 0, token: token });
        this._pendingUserId = null;
    }

    private sendJson(obj: any): void {
        if (!this._connected || !this._ws) {
            return;
        }
        this._ws.sendUTF(JSON.stringify(obj));
    }
}

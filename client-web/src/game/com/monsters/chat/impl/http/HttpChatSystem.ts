import * as as3 from "as3";
import { Vector, int } from "as3";
import { Event, EventDispatcher, IOErrorEvent, SecurityErrorEvent, TimerEvent } from "flash/events";
import { URLLoader, URLRequest, URLRequestMethod, URLVariables } from "flash/net";
import { Dictionary, Timer, setTimeout } from "flash/utils";
import { BYMChat, Channel, Chat, ChatEvent, ChatWire, ClientMessageType, IAuthenticationSystem, IChatSystem, LOGGER, ServerMessageType } from "@game";

/**
 * The chat protocol over plain HTTP polling, for servers that can only be reached through a web
 * tunnel (see chatHttpBridge.ts on the server). It speaks exactly the JSON messages the WebSocket
 * transport does: what would have been written to the socket is queued and POSTed to /chat/poll,
 * and whatever the server had waiting comes back in the reply. No socket, so no Flash socket
 * policy (port 843) and no chat port. Everything below the transport is HttpChatSystem's code.
 */
export class HttpChatSystem extends EventDispatcher implements IChatSystem {
    static {
        as3.implement(this, [IChatSystem]);
        as3.fields(this, { _url: null, _sid: null, _outgoing: null, _inFlight: false, _failures: 0, _userId: null, _pollTimer: null, _connected: false, _loggedIn: false, _rooms: null, _pendingUserId: null, _relogin: false });
    }

    private static readonly POLL_MS: int = 2500;

    /** After sending something, ask again this soon so a reply to it (or your own line) shows up quickly. */
    private static readonly QUICK_POLL_MS: int = 300;
    private _url: string;
    private _sid: string;
    private _outgoing: any[];
    private _inFlight: boolean;
    private _failures: int;
    private _userId: string;
    private _pollTimer: Timer;
    private _connected: boolean;
    private _loggedIn: boolean;
    private _rooms: Vector<string>;
    private _pendingUserId: string;
    /** A login again after the server forgot the session: the channels are rejoined here, not by the game. */
    private _relogin: boolean;

    public $ctor(serverUrl?: any /* string */): void {
        this._outgoing = [];
        this._rooms = new Vector<string>(0, false, String);
        super.$ctor();
        this._url = serverUrl + "chat/poll";
    }

    // ── IChatSystem: Connection ───────────────────────────────────────────
    public connect(): boolean {
        this._connected = true;
        this._pollTimer = new Timer(HttpChatSystem.POLL_MS);
        this._pollTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onPollTimer));
        this._pollTimer.start();
        // Listeners are attached right after connect() returns, so report success on the next tick.
        setTimeout((): void => {
            this.dispatchEvent(new ChatEvent(ChatEvent.CONNECT, true));
            if (this._pendingUserId != null) {
                this.sendAuth(this._pendingUserId);
            }
        }, 1);
        return true;
    }

    public disconnect(): void {
        if (this._pollTimer) {
            this._pollTimer.stop();
            this._pollTimer.removeEventListener(TimerEvent.TIMER, as3.bind(this, this.onPollTimer));
            this._pollTimer = null;
        }
        this._outgoing = [];
        this._sid = null;
        this._connected = false;
        this._loggedIn = false;
    }

    public get isConnected(): boolean {
        return this._connected;
    }

    // ── IChatSystem: Authentication ───────────────────────────────────────
    public login(auth: IAuthenticationSystem): void {
        let userId: string = auth.User.Name;
        this._userId = userId;
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

    /** At login: the list, to apply quietly (nothing is written in the chat). */
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

    /** A user id, or a player's name (the /unignore command). */
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
    /** One message from the server, already parsed (ChatWire turns the rest into events, as for the socket). */
    private handleServerMessage(msg: any): void {
        if (!msg) {
            return;
        }
        switch (as3.as(msg.type, String)) {
            case ServerMessageType.AUTH_OK:
                this._loggedIn = true;
                let okParams: Dictionary = new Dictionary();
                okParams.set("displayname", msg.displayName != null ? String(msg.displayName) : null);
                okParams.set("role", msg.role != null ? String(msg.role) : null);
                okParams.set("relogin", this._relogin || msg.refresh == true);
                this._relogin = false;
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
        if (!this._connected) {
            return;
        }
        this._outgoing.push(obj);
        // Pings only keep a socket open; a poll already does that.
        if (this._outgoing.length > 40) {
            this._outgoing.shift();
        }
        setTimeout(as3.bind(this, this.poll), HttpChatSystem.QUICK_POLL_MS);
    }

    private onPollTimer(e: TimerEvent): void {
        this.poll();
    }

    private poll(): void {
        let loader: URLLoader = null;
        let sending: any[] = null;
        loader = null;
        let request: URLRequest = null;
        let vars: URLVariables = null;
        sending = null;
        if (!this._connected || this._inFlight) {
            return;
        }
        // Nothing to say and not logged in yet: there is nothing to wait for either.
        if (this._outgoing.length == 0 && !this._loggedIn && this._sid == null) {
            return;
        }
        sending = this._outgoing;
        this._outgoing = [];
        vars = new URLVariables();
        vars.sid = this._sid != null ? this._sid : "";
        vars.out = JSON.stringify(sending);
        request = new URLRequest(this._url);
        request.method = URLRequestMethod.POST;
        request.data = vars;
        loader = new URLLoader();
        this._inFlight = true;
        loader.addEventListener(Event.COMPLETE, (e: Event): void => {
            this._inFlight = false;
            this._failures = 0;
            this.onPollReply(String(loader.data), sending);
        });
        let failed: Function = (e: Event): void => {
            this._inFlight = false;
            // Put back what was not delivered, newest last, and try again on the next tick.
            this._outgoing = sending.concat(this._outgoing);
            if (++this._failures == 8) {
                LOGGER.Log("err", "HttpChatSystem: chat polling keeps failing: " + e.toString());
            }
        };
        loader.addEventListener(IOErrorEvent.IO_ERROR, failed);
        loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, failed);
        try {
            loader.load(request);
        } catch (err) {
            this._inFlight = false;
        }
    }

    private onPollReply(raw: string, sent: any[]): void {
        let reply: any = null;
        let incoming: any[] = null;
        let room: string = null;
        let rejoin: Vector<string> = null;
        let item: any = null;
        try {
            reply = JSON.parse(raw);
        } catch (err) {
            return;
        }
        if (!reply || reply.error != 0) {
            return;
        }
        if (reply.fresh == 1 && this._sid != null && this._loggedIn && this._userId != null) {
            // The server forgot this session (it restarted, or the game sat paused too long). Do what
            // a dropped socket would need: authenticate again and rejoin the channels we were in. An
            // alliance channel is asked for as "alliance" (the server works out which is the player's:
            // it refuses its real name), and what was sent into the forgotten session goes again.
            this._loggedIn = false;
            this._relogin = true;
            rejoin = as3.cast(this._rooms.slice(), Vector);
            as3.vsetLength(this._rooms, 0);
            this._sid = String(reply.sid);
            this.sendAuth(this._userId);
            for (room of (rejoin ?? [])) {
                this.sendJson({ type: ClientMessageType.JOIN, channel: BYMChat.isAllianceChannel(room) ? "alliance" : room });
            }
            for (item of as3.values(sent || [])) {
                if (item && item.type != ClientMessageType.AUTH && item.type != ClientMessageType.JOIN && item.type != ClientMessageType.PING) {
                    this.sendJson(item);
                }
            }
            return;
        }
        this._sid = String(reply.sid);
        incoming = as3.as(reply["in"], Array);
        if (incoming) {
            for (let message of as3.values(incoming)) {
                this.handleServerMessage(message);
            }
        }
    }
}

import * as as3 from "as3";
import { Vector, int } from "as3";
import { Event, EventDispatcher, HTTPStatusEvent, IOErrorEvent, SecurityErrorEvent, TimerEvent } from "flash/events";
import { URLLoader, URLRequest, URLRequestMethod, URLVariables } from "flash/net";
import { Dictionary, Timer, getTimer, setTimeout } from "flash/utils";
import { BYMChat, Channel, Chat, ChatEvent, ChatWire, ClientMessageType, GLOBAL, IAuthenticationSystem, IChatSystem, IoBugReport, IoServerHold, LOGGER, ServerMessageType } from "@game";

/**
 * The chat protocol over plain HTTP polling, for servers that can only be reached through a web
 * tunnel (see chatHttpBridge.ts on the server). It speaks exactly the JSON messages the WebSocket
 * transport does: what would have been written to the socket is queued and POSTed to /chat/poll,
 * and whatever the server had waiting comes back in the reply. No socket, so no Flash socket
 * policy (port 843) and no chat port. Everything below the transport is HttpChatSystem's code.
 *
 * Inferno-only (7 October, the user's: lines often didn't send, or said they couldn't and still did): a reply
 * lost on the way (a tunnel timeout) used to mean the lines went again, posted twice or refused as too fast,
 * and what the server had sent back was lost; a poll that never came back stopped the chat for good. Now each
 * message sent is numbered (`n`: the server skips one it already handled) and the server's are numbered too
 * (`s`, kept by the server until `ack` says they arrived: sent again, skipped here if already had). A poll that
 * takes over 15 s is given up and sent again; a refused one goes again too; lines waiting go as soon as the
 * poll before them is back.
 */
export class HttpChatSystem extends EventDispatcher implements IChatSystem {
    static {
        as3.implement(this, [IChatSystem]);
        as3.fields(this, { _url: null, _sid: null, _outgoing: null, _inFlight: false, _failures: 0, _userId: null, _pollTimer: null, _lastGood: 0, _connected: false, _loggedIn: false, _rooms: null, _pendingUserId: null, _relogin: false, _n: 0, _ack: 0, _pollId: 0, _flightSays: false, _ioPollLater: null });
    }

    private static readonly POLL_MS: int = 2500;

    /** After sending something, ask again this soon so a reply to it (or your own line) shows up quickly. */
    private static readonly QUICK_POLL_MS: int = 300;

    private static readonly POLL_TIMEOUT_MS: int = 15000;
    private _url: string;
    private _sid: string;
    private _outgoing: any[];
    private _inFlight: boolean;
    private _failures: int;
    private _userId: string;
    private _pollTimer: Timer;
    /** (getTimer) when a poll was last answered: the report of polls that keep failing says how long ago */
    private _lastGood: int;
    /** (16 October) the poll, put off while the server restarts (IoServerHold) */
    private _ioPollLater: Function;
    private _connected: boolean;
    private _loggedIn: boolean;
    private _rooms: Vector<string>;
    private _pendingUserId: string;
    /** A login again after the server forgot the session: the channels are rejoined here, not by the game. */
    private _relogin: boolean;
    /** The last number given to a message sent (n). */
    private _n: int;
    /** The highest numbered message from the server handled (s): sent as `ack`. */
    private _ack: int;
    /** Which poll is the one in flight (a reply to an older one, given up on, is still read but changes nothing else). */
    private _pollId: int;
    /** The poll in flight carries a line said. */
    private _flightSays: boolean;

    public $ctor(serverUrl?: any /* string */): void {
        this._outgoing = [];
        this._rooms = new Vector<string>(0, false, String);
        super.$ctor();
        this._url = serverUrl + "chat/poll";
    }

    /** A line said is still on its way: waiting to go, or in a poll not answered yet (BYMChat.ioAwait). */
    public pendingSay(): boolean {
        for (let m of as3.values(this._outgoing)) {
            if (m && m.type == ClientMessageType.SAY) {
                return true;
            }
        }
        return this._inFlight && this._flightSays;
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
        // (a copy with its own number: the server skips a number it has already handled)
        let m: any = {};
        for (let k in obj) {
            if (k != "n") {
                m[k] = obj[k];
            }
        }
        m.n = ++this._n;
        this._outgoing.push(m);
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
        let id: int = 0;
        let settled: boolean = false;
        let httpStatus: int = 0;
        let startedAt: int = 0;
        let retry: Function = null;
        loader = null;
        let request: URLRequest = null;
        let vars: URLVariables = null;
        sending = null;
        if (!this._connected || this._inFlight) {
            return;
        }
        // (Inferno-only, 16 October: the server restarting: polled again once it is back, nothing counted as failed)
        if (GLOBAL.INFERNO_ONLY && IoServerHold.holding) {
            IoServerHold.later(this._ioPollLater || (this._ioPollLater = as3.bind(this, this.poll)));
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
        vars.ack = this._ack;
        request = new URLRequest(this._url);
        request.method = URLRequestMethod.POST;
        request.data = vars;
        loader = new URLLoader();
        this._inFlight = true;
        this._flightSays = false;
        for (let said of as3.values(sending)) {
            if (said && said.type == ClientMessageType.SAY) {
                this._flightSays = true;
            }
        }
        id = (++this._pollId) | 0;
        settled = false;
        // (9 October, bug reports 81 and 82: the report said only "Stream Error"; now what the server answered)
        httpStatus = -1;
        startedAt = getTimer();
        // Not delivered (or not known to be): put back, newest last, and tried again soon. The numbers stay the
        // same, so a line that did arrive is not posted twice.
        retry = (why: string): void => {
            if (settled) {
                return;
            }
            settled = true;
            if (id == this._pollId) {
                this._inFlight = false;
            }
            this._outgoing = sending.concat(this._outgoing);
            if (++this._failures == 8) {
                // (25 November, bug reports #101 and #103: when the player's other requests are failing or crawling
                // too, it is their connection: written down, not reported)
                LOGGER.Log(GLOBAL.INFERNO_ONLY && IoBugReport.connectionPoor() ? "log" : "err", "HttpChatSystem: chat polling keeps failing: " + why + " | " + this._failures + " in a row, last answer " + (this._lastGood > 0 ? (((getTimer() - this._lastGood) / 1000) | 0) + " s ago" : "never") + ", this one after " + (getTimer() - startedAt) + " ms" + (this._sid != null ? ", session " + this._sid.substr(0, 6) : ", no session yet") + (this._loggedIn ? ", logged in" : ", not logged in"));
            }
            setTimeout(as3.bind(this, this.poll), Math.min(5000, 400 * this._failures));
        };
        loader.addEventListener(Event.COMPLETE, (e: Event): void => {
            // (a reply to a poll given up on is still read: it is numbered, so nothing is had twice)
            let late: boolean = settled;
            settled = true;
            if (id == this._pollId) {
                this._inFlight = false;
            }
            if (!this.onPollReply(String(loader.data), sending) && !late) {
                // refused (busy, too many requests): what it carried goes again
                this._outgoing = sending.concat(this._outgoing);
                setTimeout(as3.bind(this, this.poll), Math.min(5000, 400 * ++this._failures));
                return;
            }
            if (!late) {
                this._failures = 0;
            }
            this._lastGood = getTimer();
            if (this._outgoing.length > 0) {
                setTimeout(as3.bind(this, this.poll), 30);
            }
        });
        loader.addEventListener(HTTPStatusEvent.HTTP_STATUS, (e: HTTPStatusEvent): void => {
            httpStatus = e.status;
        });
        let failed: Function = (e: Event): void => {
            let why: string = as3.str(e.toString());
            if (httpStatus > 0) {
                // what the server said (a refusal: too many requests, chat full; or the proxy's error page)
                let said: string = as3.is(loader.data, String) ? String(loader.data).replace(/\s+/g, " ").substr(0, 120) : "";
                why = "HTTP " + httpStatus + (said ? " \"" + said + "\"" : "") + " (" + why + ")";
            } else if (httpStatus == 0) {
                // no answer at all: the network (the web player keeps the browser's own reason)
                let net: string = loader.hasOwnProperty("$netError") ? String(loader["$netError"]) : "";
                why = "no answer" + (net ? " (" + net + ")" : "") + " (" + why + ")";
            }
            retry(why);
        };
        loader.addEventListener(IOErrorEvent.IO_ERROR, failed);
        loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, failed);
        setTimeout((): void => {
            if (!settled) {
                try {
                    loader.close();
                } catch (err) {
                }
                retry("no reply in " + HttpChatSystem.POLL_TIMEOUT_MS + " ms");
            }
        }, HttpChatSystem.POLL_TIMEOUT_MS);
        try {
            loader.load(request);
        } catch (err) {
            retry(err.message);
        }
    }

    /** A poll's reply: false if it was refused (nothing in it handled), true otherwise. */
    private onPollReply(raw: string, sent: any[]): boolean {
        let reply: any = null;
        let incoming: any[] = null;
        let room: string = null;
        let rejoin: Vector<string> = null;
        let item: any = null;
        try {
            reply = JSON.parse(raw);
        } catch (err) {
            return false;
        }
        if (!reply || reply.error != 0) {
            return false;
        }
        if (reply.fresh == 1) {
            // a new session numbers its messages from 1
            this._ack = 0;
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
            // (what the new session answered to the lines it got before logging in is not wanted: marked as had)
            for (item of as3.values(as3.as(reply["in"], Array) || [])) {
                if (item && item.s != undefined && (item.s | 0) > this._ack) {
                    this._ack = item.s | 0;
                }
            }
            this.sendAuth(this._userId);
            for (room of (rejoin ?? [])) {
                this.sendJson({ type: ClientMessageType.JOIN, channel: BYMChat.isAllianceChannel(room) ? "alliance" : room });
            }
            for (item of as3.values(sent || [])) {
                if (item && item.type != ClientMessageType.AUTH && item.type != ClientMessageType.JOIN && item.type != ClientMessageType.PING) {
                    this.sendJson(item);
                }
            }
            return true;
        }
        this._sid = String(reply.sid);
        incoming = as3.as(reply["in"], Array);
        if (incoming) {
            for (let message of as3.values(incoming)) {
                // (numbered: one already had, from a reply that did arrive after all, is skipped)
                if (message && message.s != undefined) {
                    if ((message.s | 0) <= this._ack) {
                        continue;
                    }
                    this._ack = message.s | 0;
                }
                this.handleServerMessage(message);
            }
        }
        return true;
    }
}

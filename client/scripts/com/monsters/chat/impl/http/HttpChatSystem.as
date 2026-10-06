package com.monsters.chat.impl.http {
    import com.monsters.chat.Channel;
    import com.monsters.chat.Chat;
    import com.monsters.chat.ChatData;
    import com.monsters.chat.ChatEvent;
    import com.monsters.chat.ChatRoom;
    import com.monsters.chat.ChatUser;
    import com.monsters.chat.IAuthenticationSystem;
    import com.monsters.chat.IChatSystem;
    import com.monsters.chat.BYMChat;
    import com.monsters.chat.impl.ChatWire;
    import com.monsters.chat.impl.ws.AllianceMessageType;
    import com.monsters.chat.impl.ws.ClientMessageType;
    import com.monsters.chat.impl.ws.ServerMessageType;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.events.SecurityErrorEvent;
    import flash.net.URLLoader;
    import flash.net.URLRequest;
    import flash.net.URLRequestMethod;
    import flash.net.URLVariables;
    import flash.utils.setTimeout;
    import flash.events.EventDispatcher;
    import flash.events.TimerEvent;
    import flash.utils.Dictionary;
    import flash.utils.Timer;

    /**
     * The chat protocol over plain HTTP polling, for servers that can only be reached through a web
     * tunnel (see chatHttpBridge.ts on the server). It speaks exactly the JSON messages the WebSocket
     * transport does: what would have been written to the socket is queued and POSTed to /chat/poll,
     * and whatever the server had waiting comes back in the reply. No socket, so no Flash socket
     * policy (port 843) and no chat port. Everything below the transport is HttpChatSystem's code.
     */
    public class HttpChatSystem extends EventDispatcher implements IChatSystem {
        private static const POLL_MS:int = 2500;

        /** After sending something, ask again this soon so a reply to it (or your own line) shows up quickly. */
        private static const QUICK_POLL_MS:int = 300;

        private var _url:String;
        private var _sid:String = null;
        private var _outgoing:Array = [];
        private var _inFlight:Boolean = false;
        private var _failures:int = 0;
        private var _userId:String = null;
        private var _pollTimer:Timer = null;

        private var _connected:Boolean = false;
        private var _loggedIn:Boolean = false;
        private var _rooms:Vector.<String> = new Vector.<String>();

        private var _pendingUserId:String = null;

        /** A login again after the server forgot the session: the channels are rejoined here, not by the game. */
        private var _relogin:Boolean = false;

        public function HttpChatSystem(serverUrl:String) {
            _url = serverUrl + "chat/poll";
        }

        // ── IChatSystem: Connection ───────────────────────────────────────────

        public function connect():Boolean {
            _connected = true;
            _pollTimer = new Timer(POLL_MS);
            _pollTimer.addEventListener(TimerEvent.TIMER, onPollTimer);
            _pollTimer.start();
            // Listeners are attached right after connect() returns, so report success on the next tick.
            setTimeout(function():void {
                    dispatchEvent(new ChatEvent(ChatEvent.CONNECT, true));
                    if (_pendingUserId != null)
                        sendAuth(_pendingUserId);
                }, 1);
            return true;
        }

        public function disconnect():void {
            if (_pollTimer) {
                _pollTimer.stop();
                _pollTimer.removeEventListener(TimerEvent.TIMER, onPollTimer);
                _pollTimer = null;
            }
            _outgoing = [];
            _sid = null;
            _connected = false;
            _loggedIn = false;
        }

        public function get isConnected():Boolean {
            return _connected;
        }

        // ── IChatSystem: Authentication ───────────────────────────────────────

        public function login(auth:IAuthenticationSystem):void {
            var userId:String = auth.User.Name;
            _userId = userId;
            _pendingUserId = userId;
            if (_connected)
                sendAuth(userId);
        }

        public function logout():void {
            disconnect();
        }
        public function get isLoggedIn():Boolean {
            return _loggedIn;
        }

        // ── IChatSystem: Channels ─────────────────────────────────────────────

        public function join(channel:Channel, password:String = null, createIfMissing:Boolean = false):void {
            sendJson({type: ClientMessageType.JOIN, channel: channel.Name});
        }

        public function leave(channel:Channel, autocleanup:Boolean = false):void {
            sendJson({type: ClientMessageType.LEAVE, channel: channel.Name});
            var idx:int = _rooms.indexOf(channel.Name);
            if (idx != -1)
                _rooms.splice(idx, 1);
        }

        public function get roomNames():Vector.<String> {
            return _rooms;
        }

        // ── IChatSystem: Messaging ────────────────────────────────────────────

        public function say(channel:Channel, message:String):void {
            sendJson({type: ClientMessageType.SAY, channel: channel.Name, message: message});
        }

        public function adminMessage(message:String):void {
        }

        // ── IChatSystem: Display names ────────────────────────────────────────

        public function setDisplayNameUserVar(displayName:String):void {
            sendJson({type: ClientMessageType.UPDATE_NAME, displayName: displayName});
        }

        public function updateDisplayName(channel:Channel, userId:String, displayName:String):void {
            sendJson({type: ClientMessageType.UPDATE_NAME, displayName: displayName});
        }

        public function updateDisplayNameDirect(channel:Channel, recipientId:String, userId:String, displayName:String):void {
        }

        public function get numUsers():int {
            return 0;
        }

        // ── IChatSystem: Ignore list ──────────────────────────────────────────

        public function showIgnore():void {
            sendJson({type: ClientMessageType.GET_IGNORE, action: "show"});
        }

        /** At login: the list, to apply quietly (nothing is written in the chat). */
        public function getIgnore():void {
            sendJson({type: ClientMessageType.GET_IGNORE, action: "sync"});
        }

        /** `target` a user id; or "" with `displayName` a player's name (the /ignore command). */
        public function ignore(target:String, displayName:String):void {
            if (target != null && target.length > 0) {
                sendJson({type: ClientMessageType.IGNORE, targetId: target});
            }
            else {
                sendJson({type: ClientMessageType.IGNORE, targetName: displayName});
            }
        }

        /** A user id, or a player's name (the /unignore command). */
        public function unignore(target:String):void {
            if (/^\d+$/.test(target)) {
                sendJson({type: ClientMessageType.UNIGNORE, targetId: target});
            }
            else {
                sendJson({type: ClientMessageType.UNIGNORE, targetName: target});
            }
        }

        // ── IChatSystem: Utility ──────────────────────────────────────────────

        public function list(filter:String = null):void {
        }
        public function members(channel:Channel):void {
        }
        public function error(code:String, message:String):void {
        }

        public function moderate(action:String, params:Object):void {
            var msg:Object = {type: action};
            for (var key:String in params) {
                msg[key] = params[key];
            }
            sendJson(msg);
        }

        // ── WebSocket event handlers ──────────────────────────────────────────

        /** One message from the server, already parsed (ChatWire turns the rest into events, as for the socket). */
        private function handleServerMessage(msg:Object):void {
            if (!msg)
                return;
            switch (msg.type as String) {
                case ServerMessageType.AUTH_OK:
                    _loggedIn = true;
                    var okParams:Dictionary = new Dictionary();
                    okParams["displayname"] = msg.displayName != null ? String(msg.displayName) : null;
                    okParams["role"] = msg.role != null ? String(msg.role) : null;
                    okParams["relogin"] = _relogin || msg.refresh == true;
                    _relogin = false;
                    dispatchEvent(new ChatEvent(ChatEvent.LOGIN, true, okParams));
                    break;
                case ServerMessageType.AUTH_FAIL:
                    _loggedIn = false;
                    var failParams:Dictionary = new Dictionary();
                    failParams["reason"] = msg.reason;
                    dispatchEvent(new ChatEvent(ChatEvent.LOGIN, false, failParams));
                    break;
                default:
                    ChatWire.dispatch(this, msg, _rooms);
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private function sendAuth(userId:String):void {
            var token:String = Chat._chatToken;
            if (token == null || token.length == 0) {
                var failParams:Dictionary = new Dictionary();
                failParams["reason"] = "no_chat_token";
                dispatchEvent(new ChatEvent(ChatEvent.LOGIN, false, failParams));
                return;
            }
            sendJson({type: ClientMessageType.AUTH, userId: int(userId), token: token});
            _pendingUserId = null;
        }

        private function sendJson(obj:Object):void {
            if (!_connected)
                return;
            _outgoing.push(obj);
            // Pings only keep a socket open; a poll already does that.
            if (_outgoing.length > 40)
                _outgoing.shift();
            setTimeout(poll, QUICK_POLL_MS);
        }

        private function onPollTimer(e:TimerEvent):void {
            poll();
        }

        private function poll():void {
            var loader:URLLoader = null;
            var request:URLRequest = null;
            var vars:URLVariables = null;
            var sending:Array = null;
            if (!_connected || _inFlight)
                return;
            // Nothing to say and not logged in yet: there is nothing to wait for either.
            if (_outgoing.length == 0 && !_loggedIn && _sid == null)
                return;
            sending = _outgoing;
            _outgoing = [];
            vars = new URLVariables();
            vars.sid = _sid != null ? _sid : "";
            vars.out = JSON.stringify(sending);
            request = new URLRequest(_url);
            request.method = URLRequestMethod.POST;
            request.data = vars;
            loader = new URLLoader();
            _inFlight = true;
            loader.addEventListener(Event.COMPLETE, function(e:Event):void {
                    _inFlight = false;
                    _failures = 0;
                    onPollReply(String(loader.data), sending);
                });
            var failed:Function = function(e:Event):void {
                    _inFlight = false;
                    // Put back what was not delivered, newest last, and try again on the next tick.
                    _outgoing = sending.concat(_outgoing);
                    if (++_failures == 8)
                        LOGGER.Log("err", "HttpChatSystem: chat polling keeps failing: " + e.toString());
                };
            loader.addEventListener(IOErrorEvent.IO_ERROR, failed);
            loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR, failed);
            try {
                loader.load(request);
            }
            catch (err:Error) {
                _inFlight = false;
            }
        }

        private function onPollReply(raw:String, sent:Array):void {
            var reply:Object = null;
            var incoming:Array = null;
            var room:String = null;
            var rejoin:Vector.<String> = null;
            var item:Object = null;
            try {
                reply = JSON.parse(raw);
            }
            catch (err:*) {
                return;
            }
            if (!reply || reply.error != 0)
                return;
            if (reply.fresh == 1 && _sid != null && _loggedIn && _userId != null) {
                // The server forgot this session (it restarted, or the game sat paused too long). Do what
                // a dropped socket would need: authenticate again and rejoin the channels we were in. An
                // alliance channel is asked for as "alliance" (the server works out which is the player's:
                // it refuses its real name), and what was sent into the forgotten session goes again.
                _loggedIn = false;
                _relogin = true;
                rejoin = _rooms.slice();
                _rooms.length = 0;
                _sid = String(reply.sid);
                sendAuth(_userId);
                for each (room in rejoin)
                    sendJson({type: ClientMessageType.JOIN, channel: BYMChat.isAllianceChannel(room) ? "alliance" : room});
                for each (item in sent || []) {
                    if (item && item.type != ClientMessageType.AUTH && item.type != ClientMessageType.JOIN && item.type != ClientMessageType.PING)
                        sendJson(item);
                }
                return;
            }
            _sid = String(reply.sid);
            incoming = reply["in"] as Array;
            if (incoming) {
                for each (var message:Object in incoming)
                    handleServerMessage(message);
            }
        }
    }
}

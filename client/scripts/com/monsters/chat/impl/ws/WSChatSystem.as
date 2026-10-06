package com.monsters.chat.impl.ws {
    import com.monsters.chat.Channel;
    import com.monsters.chat.Chat;
    import com.monsters.chat.ChatData;
    import com.monsters.chat.ChatEvent;
    import com.monsters.chat.ChatRoom;
    import com.monsters.chat.ChatUser;
    import com.monsters.chat.IAuthenticationSystem;
    import com.monsters.chat.IChatSystem;
    import com.monsters.chat.impl.ChatWire;
    import com.worlize.websocket.WebSocket;
    import com.worlize.websocket.WebSocketErrorEvent;
    import com.worlize.websocket.WebSocketEvent;
    import flash.events.EventDispatcher;
    import flash.events.TimerEvent;
    import flash.utils.Dictionary;
    import flash.utils.Timer;

    public class WSChatSystem extends EventDispatcher implements IChatSystem {
        private var _ws:WebSocket;
        private var _host:String;
        private var _port:int;
        private var _connected:Boolean = false;
        private var _loggedIn:Boolean = false;
        private var _rooms:Vector.<String> = new Vector.<String>();

        private var _pingTimer:Timer = null;

        private var _pendingUserId:String = null;

        public function WSChatSystem(host:String, port:int) {
            _host = host;
            _port = port;
        }

        // ── IChatSystem: Connection ───────────────────────────────────────────

        public function connect():Boolean {
            _ws = new WebSocket("ws://" + _host + ":" + _port + "/", "http://" + _host);
            _ws.addEventListener(WebSocketEvent.OPEN, onWsOpen);
            _ws.addEventListener(WebSocketEvent.MESSAGE, onWsMessage);
            _ws.addEventListener(WebSocketEvent.CLOSED, onWsClose);
            _ws.addEventListener(WebSocketErrorEvent.CONNECTION_FAIL, onWsError);
            _ws.addEventListener(WebSocketErrorEvent.ABNORMAL_CLOSE, onWsError);
            _ws.connect();
            _pingTimer = new Timer(90000);
            _pingTimer.addEventListener(TimerEvent.TIMER, onPingTimer);
            _pingTimer.start();
            return true;
        }

        public function disconnect():void {
            if (_pingTimer) {
                _pingTimer.stop();
                _pingTimer = null;
            }
            if (_ws)
                _ws.close();
            _connected = false;
            _loggedIn = false;
        }

        public function get isConnected():Boolean {
            return _connected;
        }

        // ── IChatSystem: Authentication ───────────────────────────────────────

        public function login(auth:IAuthenticationSystem):void {
            var userId:String = auth.User.Name;
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

        /** At login: the list, to apply quietly. */
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

        /** A user id, or a player's name. */
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

        private function onWsOpen(e:WebSocketEvent):void {
            _connected = true;
            dispatchEvent(new ChatEvent(ChatEvent.CONNECT, true));
            if (_pendingUserId != null)
                sendAuth(_pendingUserId);
        }

        private function onWsClose(e:WebSocketEvent):void {
            _connected = false;
            _loggedIn = false;
        }

        private function onWsError(e:WebSocketErrorEvent):void {
            _connected = false;
            _loggedIn = false;
            var params:Dictionary = new Dictionary();
            params["reason"] = e.text != null ? e.text : "connection error";
            dispatchEvent(new ChatEvent(ChatEvent.CONNECT, false, params));
        }

        private function onWsMessage(e:WebSocketEvent):void {
            var raw:String = e.message ? e.message.utf8Data : null;
            if (!raw)
                return;

            var msg:Object;
            try {
                msg = JSON.parse(raw);
            }
            catch (err:*) {
                return;
            }

            switch (msg.type as String) {
                case ServerMessageType.AUTH_OK:
                    _loggedIn = true;
                    var okParams:Dictionary = new Dictionary();
                    okParams["displayname"] = msg.displayName != null ? String(msg.displayName) : null;
                    okParams["role"] = msg.role != null ? String(msg.role) : null;
                    okParams["relogin"] = msg.refresh == true;
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

        private function onPingTimer(e:TimerEvent):void {
            if (_connected)
                sendJson({type: ClientMessageType.PING});
        }

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
            if (!_connected || !_ws)
                return;
            _ws.sendUTF(JSON.stringify(obj));
        }
    }
}

package com.monsters.chat.impl.http {
    import com.monsters.chat.Channel;
    import com.monsters.chat.Chat;
    import com.monsters.chat.ChatData;
    import com.monsters.chat.ChatEvent;
    import com.monsters.chat.ChatRoom;
    import com.monsters.chat.ChatUser;
    import com.monsters.chat.IAuthenticationSystem;
    import com.monsters.chat.IChatSystem;
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
        private var _pendingIgnoreAction:String = "show";
        private var _pendingIgnoreTarget:String = null;

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
            _pendingIgnoreAction = "show";
            _pendingIgnoreTarget = null;
            sendJson({type: ClientMessageType.GET_IGNORE});
        }
        public function getIgnore():void {
            _pendingIgnoreAction = "show";
            _pendingIgnoreTarget = null;
            sendJson({type: ClientMessageType.GET_IGNORE});
        }

        public function ignore(target:String, displayName:String):void {
            _pendingIgnoreAction = "add";
            _pendingIgnoreTarget = target;
            sendJson({type: ClientMessageType.IGNORE, targetId: target});
        }

        public function unignore(target:String):void {
            _pendingIgnoreAction = "remove";
            _pendingIgnoreTarget = target;
            sendJson({type: ClientMessageType.UNIGNORE, targetId: target});
        }

        // ── IChatSystem: Utility ──────────────────────────────────────────────

        public function list(filter:String = null):void {
        }
        public function members(channel:Channel):void {
        }
        public function error(code:String, message:String):void {
        }

        // ── WebSocket event handlers ──────────────────────────────────────────

        /** One message from the server, already parsed. Identical handling to the WebSocket transport. */
        private function handleServerMessage(msg:Object):void {
            if (!msg)
                return;

            var type:String = msg.type as String;

            switch (type) {
                case ServerMessageType.AUTH_OK:
                    _loggedIn = true;
                    dispatchEvent(new ChatEvent(ChatEvent.LOGIN, true));
                    break;

                case ServerMessageType.AUTH_FAIL:
                    _loggedIn = false;
                    var failParams:Dictionary = new Dictionary();
                    failParams["reason"] = msg.reason;
                    dispatchEvent(new ChatEvent(ChatEvent.LOGIN, false, failParams));
                    break;

                case ServerMessageType.JOINED:
                    var channelName:String = msg.channel as String;
                    if (_rooms.indexOf(channelName) == -1)
                        _rooms.push(channelName);
                    var joinParams:Dictionary = new Dictionary();
                    joinParams["channel"] = new Channel(channelName, "system");
                    dispatchEvent(new ChatEvent(ChatEvent.JOIN, true, joinParams));
                    if (msg.history && msg.history is Array) {
                        var history:Array = msg.history as Array;
                        for each (var entry:Object in history) {
                            var histUserId:String = String(int(entry.userId));
                            updateNameMap(histUserId, String(entry.displayName));
                            dispatchSay(channelName, histUserId, String(entry.body), entry.picSquare as String, Number(entry.ts), String(entry.displayName), entry.messageType as String, int(entry.allianceImage));
                        }
                    }
                    break;

                case ServerMessageType.MESSAGE:
                    var senderIdStr:String = String(int(msg.userId));
                    updateNameMap(senderIdStr, msg.displayName as String);
                    dispatchSay(msg.channel as String, senderIdStr, msg.body as String, msg.picSquare as String, Number(msg.ts), msg.displayName as String, msg.messageType as String, int(msg.allianceImage));
                    break;

                case ServerMessageType.USER_ENTER:
                    var enterIdStr:String = String(int(msg.userId));
                    var enterDisplayName:String = msg.displayName as String;
                    updateNameMap(enterIdStr, enterDisplayName);
                    var enterParams:Dictionary = new Dictionary();
                    enterParams["user"] = new ChatUser(int(msg.userId), enterDisplayName);
                    enterParams["room"] = new ChatRoom(0, msg.channel as String);
                    dispatchEvent(new ChatEvent(ChatEvent.USER_ENTER, true, enterParams));
                    break;

                case ServerMessageType.USER_EXIT:
                    var exitId:int = int(msg.userId);
                    var exitParams:Dictionary = new Dictionary();
                    exitParams["user"] = new ChatUser(exitId, String(exitId));
                    exitParams["room"] = new ChatRoom(0, msg.channel as String);
                    dispatchEvent(new ChatEvent(ChatEvent.USER_EXIT, true, exitParams));
                    break;

                case ServerMessageType.IGNORE_LIST:
                    var rawList:Array = msg.list as Array;
                    var ignoreParams:Dictionary = new Dictionary();
                    ignoreParams["action"] = _pendingIgnoreAction;
                    ignoreParams["target"] = _pendingIgnoreTarget;
                    if (_pendingIgnoreAction == "show") {
                        // "show" display loop expects ChatData objects with getUtfString()
                        var chatDataList:Array = [];
                        for each (var item:Object in rawList) {
                            var cd:ChatData = new ChatData();
                            cd.putUtfString("target", String(item.target));
                            cd.putUtfString("displayname", item.displayname ? String(item.displayname) : "");
                            chatDataList.push(cd);
                        }
                        ignoreParams["ignore_list"] = chatDataList;
                    }
                    else {
                        // add/remove: userIsIgnored() calls indexOf(userId) on this array — must be strings
                        var stringList:Array = [];
                        for each (var item2:Object in rawList)
                            stringList.push(String(item2.target));
                        ignoreParams["ignore_list"] = stringList;
                    }
                    dispatchEvent(new ChatEvent(ChatEvent.IGNORE, true, ignoreParams));
                    _pendingIgnoreAction = "show";
                    _pendingIgnoreTarget = null;
                    break;
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

        private function updateNameMap(userId:String, displayName:String):void {
            var params:Dictionary = new Dictionary();
            params["userid"] = userId;
            params["displayname"] = displayName;
            dispatchEvent(new ChatEvent(ChatEvent.UPDATE_NAME, true, params));
        }

        private function dispatchSay(channelName:String, userId:String, body:String, picSquare:String = null, ts:Number = 0, displayName:String = null, messageType:String = null, allianceImage:int = 0):void {
            var params:Dictionary = new Dictionary();
            params["channel"] = new Channel(channelName, "system");
            params["user"] = userId;
            params["message"] = body;
            params["picsquare"] = picSquare;
            params["ts"] = ts;
            params["messagetype"] = messageType == null ? AllianceMessageType.MESSAGE : messageType;
            params["allianceimage"] = allianceImage;
            params["displayname"] = displayName;
            dispatchEvent(new ChatEvent(ChatEvent.SAY, true, params));
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
                    onPollReply(String(loader.data));
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

        private function onPollReply(raw:String):void {
            var reply:Object = null;
            var incoming:Array = null;
            var room:String = null;
            var rejoin:Vector.<String> = null;
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
                // a dropped socket would need: authenticate again and rejoin the channels we were in.
                _loggedIn = false;
                rejoin = _rooms.slice();
                _sid = String(reply.sid);
                sendAuth(_userId);
                for each (room in rejoin)
                    sendJson({type: ClientMessageType.JOIN, channel: room});
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

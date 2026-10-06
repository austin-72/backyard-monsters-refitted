package com.monsters.chat {
    import com.monsters.chat.ui.*;
    import flash.display.*;
    import flash.events.*;
    import flash.geom.*;
    import flash.ui.Keyboard;
    import flash.utils.Dictionary;
    import flash.utils.Timer;
    import flash.utils.setTimeout;
    import gs.TweenLite;
    import com.monsters.chat.ChatData;
    import com.monsters.chat.impl.http.HttpChatSystem;
    import com.monsters.chat.impl.ws.WSChatSystem;
    import com.monsters.chat.impl.ws.AllianceMessageType;
    import com.monsters.alliances.ALLIANCES;
    import com.monsters.mailbox.Message;
    import com.monsters.mailbox.model.Contact;
    import com.monsters.leaderboards.IoLeaderboards;

    public class BYMChat extends Sprite {

        private static var _chat:IChatSystem = null;

        public static var _userRecord:UserRecord = null;

        public static const WIDTH:int = 380;

        private static var _serverInited:Boolean = false;

        private static var _displayNameMap:Dictionary = new Dictionary();

        private static const ALLIANCE_CHANNEL_PREFIX:String = "chat:alliance:";

        public const GLOBAL_CHANNEL:Channel = new Channel("World", "system");

        public const IGNORE_LIST_CHANNEL:Channel = new Channel("IgnoreList", "system");

        private var _auth:AS_Login = null;

        private var _joinAttempts:int = 0;

        private const DELAY_INITIAL:int = 1000;

        private const DELAY_INCREASE:int = 500;

        private const DELAY_DECREASE:int = 500;

        private const DELAY_DECREASE_TIME:int = 1000;

        private var delay:int = 1000;

        public var initialized:Boolean = false;

        private var _sectorBaseName:String = null;

        private const MESSAGE_QUEUE_SIZE:int = 2;

        private var messageQueue:Array;

        public var sector_channel:Channel = null;

        private var default_chat_channel:String = "sector";

        private var _ignore_list:Array = null;

        public var chatBox:ChatBox;

        private var _chatHost:String;

        private var _chatPort:int;

        private var _isConnected:Boolean = false;

        private var _isJoined:Boolean = false;

        private var _hideX:int;

        private var _hideY:int;

        private var _showX:int;

        private var _showY:int;

        public var _open:Boolean = true;

        public var isLoggingOut:Boolean = false;

        private var isLoggingOutTimer:Number = 5;

        private var globalChatTimer:Timer = null;

        private var globalChatLastSent:Date = null;

        private var overheat:Boolean = false;

        private var messageQueueTimer:Timer = null;

        private var messageQueueLastCheck:Date = null;

        public function BYMChat(param1:ChatBox, param2:String) {
            this.messageQueue = new Array();
            super();
            this.chatBox = param1;
            addChild(param1 as MovieClip);
            param1.addEventListener(KeyboardEvent.KEY_DOWN, this.keyboardEventHandler);
            var _loc3_:String = param2 == null || param2 == "" ? "localhost" : param2;
            var _loc4_:int = 3002;
            var _loc5_:Array;
            if ((_loc5_ = _loc3_.split(":")).length > 1) {
                _loc3_ = String(_loc5_[0]);
                _loc4_ = int(_loc5_[1]);
            }
            this._chatHost = _loc3_;
            this._chatPort = _loc4_;
            if (GLOBAL.StatGet("chatmin") == 1) {
                this._open = false;
            }
            else {
                this._open = true;
            }
        }

        /**
         * The dock's chat transport, shared with any other feature that needs a
         * channel on the same connection. The server allows one socket per player,
         * so a second WSChatSystem would authenticate and close this one.
         */
        public static function get chatSystem():IChatSystem {
            return _chat;
        }

        /**
         * Whether a channel belongs to alliance chat rather than the global dock.
         */
        public static function isAllianceChannel(param1:String):Boolean {
            return param1 != null && param1.indexOf(ALLIANCE_CHANNEL_PREFIX) == 0;
        }

        public static function get serverInited():Boolean {
            return _serverInited;
        }

        public function get IsAnimating():Boolean {
            return this.chatBox._animating;
        }

        public function get IsConnected():Boolean {
            return this._isConnected;
        }

        public function get IsJoined():Boolean {
            return this._isJoined;
        }

        public function initServer():void {
            try {
                // Server flag io_chathttp: chat rides on ordinary web requests instead of a socket, which is
                // the only way it can work through a web-only tunnel (no chat port, no Flash socket policy).
                if (GLOBAL._flags && GLOBAL._flags.io_chathttp == 1) {
                    _chat = new HttpChatSystem(GLOBAL.serverUrl);
                }
                else {
                    _chat = new WSChatSystem(this._chatHost, this._chatPort);
                }
                _chat.connect();
                _chat.addEventListener(ChatEvent.CONNECT, this.onConnect);
                _chat.addEventListener(ChatEvent.LOGIN, this.onLogin);
                _chat.addEventListener(ChatEvent.JOIN, this.onJoin);
                _chat.addEventListener(ChatEvent.LEAVE, this.onLeave);
                _chat.addEventListener(ChatEvent.SAY, this.onSay);
                _chat.addEventListener(ChatEvent.LIST, this.onList);
                _chat.addEventListener(ChatEvent.MEMBERS, this.onMembers);
                _chat.addEventListener(ChatEvent.IGNORE, this.onIgnore);
                _chat.addEventListener(ChatEvent.IGNOREERROR, this.onIgnoreError);
                _chat.addEventListener(ChatEvent.UPDATE_NAME, this.onUpdateName);
                _chat.addEventListener(ChatEvent.USER_ENTER, this.onUserEnter);
                _chat.addEventListener(ChatEvent.USER_EXIT, this.onUserExit);
                _chat.addEventListener(ChatEvent.SERVER_ERROR, this.ioOnServerError);
                _chat.addEventListener(ChatEvent.DELETED, this.ioOnDeleted);
                _chat.addEventListener(ChatEvent.NOTICE, this.ioOnNotice);
                _serverInited = true;
            }
            catch (e:*) {
                displayUnavailable("init failed");
            }
        }

        public function init():void {
            this.chatBox.init();
            this.toggleVisibleB();
            this.initialized = true;
        }

        private function keyboardEventHandler(param1:KeyboardEvent):void {
            if (param1.keyCode == Keyboard.ENTER) {
                this.processInput();
            }
        }

        public function broadcastDisplayNameUpdate(param1:int):void {
            if (this.sector_channel == null) {
                return;
            }
            if (_userRecord == null) {
                return;
            }
            _chat.setDisplayNameUserVar("[" + param1 + "] " + _userRecord.Id);
            _chat.updateDisplayName(this.sector_channel, _userRecord.Name, "[" + param1 + "] " + _userRecord.Id);
        }

        private function clearChat():void {
            if (GLOBAL.INFERNO_ONLY) {
                this.ioClear(IO_GLOBAL);
                return;
            }
            this.chatBox.clearChat();
        }

        public function SendMessage():void {
            this.processInput();
        }

        private function processInput():void {
            var _loc2_:String = null;
            var _loc3_:String = null;
            var _loc4_:String = null;
            var _loc5_:int = 0;
            var _loc1_:String = this.chatBox.inputText;
            if (GLOBAL.INFERNO_ONLY) {
                this.ioProcessInput(_loc1_);
                return;
            }
            if (_loc1_.length > 0) {
                _loc1_ = _loc1_.replace(/\s+/g, " ");
                _loc2_ = null;
                _loc3_ = null;
                _loc4_ = null;
                if (_loc1_.charAt(0) == "/") {
                    if ((_loc5_ = _loc1_.search(/\s+/)) == -1) {
                        _loc2_ = _loc1_;
                        _loc1_ = "";
                    }
                    else {
                        _loc2_ = _loc1_.substring(0, _loc5_);
                        _loc1_ = _loc1_.slice(_loc5_ + 1);
                        _loc1_ = _loc1_.replace(/^\s+/, "");
                    }
                    switch (_loc2_) {
                        case "/entersector":
                            this.clearChat();
                            this.enter_sector(_loc1_, true);
                            break;
                        case "/l":
                        case "/list":
                        case "/ignored":
                        case "/listignored":
                        case "/igd":
                            _chat.showIgnore();
                            break;
                        case "/?":
                        case "/h":
                        case "/help":
                            this.system_message("<b>- Commands -</b>\n" + "To list ignored users: /list");
                            break;
                        default:
                            this.default_chat(_loc1_);
                    }
                }
                else {
                    this.default_chat(_loc1_);
                }
            }
            this.chatBox.clearInputText();
        }

        public function connect():void {
            if (!this._isConnected) {
                _chat.connect();
            }
        }

        public function login(param1:String, param2:String, param3:int):void {
            _userRecord = new UserRecord(param1, param2);
            this._auth = new AS_Login(_userRecord);
            this._auth.authenticate();
            if (this._isConnected) {
                _chat.login(this._auth);
            }
        }

        public function logout():void {
            if (_chat) {
                _chat.logout();
                this.isLoggingOut = true;
                TweenLite.delayedCall(3, this.logoutDelayCB);
            }
        }

        public function logoutDelayCB():void {
            this.isLoggingOut = false;
            this.chatBox.UpdateChatStatus();
        }

        public function disableChat():void {
            this._joinAttempts = 0;
            _serverInited = false;
            this._isConnected = false;
            this._isJoined = false;
            this.logout();
            if (GLOBAL.INFERNO_ONLY) {
                this._ioAllianceChannel = null;
                this._ioGlobalJoined = null;
                this.ioClear(IO_ALLIANCE);
            }
            this.clearChat();
            this.chatBox.EnableInput(false);
            this.system_message("Chat is currently disconnected.");
        }

        public function system_message(param1:String):void {
            this.showChatMessage(null, null, param1);
        }

        public function default_chat(param1:String):void {
            if (!this._isConnected) {
                return;
            }
            if (GLOBAL.INFERNO_ONLY && this._ioMode == IO_ALLIANCE) {
                if (this._ioAllianceChannel != null) {
                    _chat.say(this._ioAllianceChannel, param1);
                }
                else {
                    this.system_message("You are not in an alliance.");
                }
                return;
            }
            switch (this.default_chat_channel) {
                case "sector":
                case "combat":
                    this.sector_chat(param1);
                    break;
                default:
                    this.sector_chat(param1);
            }
        }

        public function global_chat(param1:String):void {
            var _loc2_:Boolean = false;
            var _loc3_:String = null;
            if (!this._isConnected) {
                LOGGER.Log("err", "BYMChat.global_chat(): not connected");
                return;
            }
            if (this.globalChatTimer == null) {
                _chat.say(this.GLOBAL_CHANNEL, param1);
                this.delay += this.DELAY_INCREASE;
                this.globalChatLastSent = new Date();
                this.globalChatTimer = new Timer(250);
                this.globalChatTimer.addEventListener(TimerEvent.TIMER, this.globalChatListener);
                this.globalChatTimer.start();
            }
            else if (this.messageQueue.length < this.MESSAGE_QUEUE_SIZE) {
                _loc2_ = false;
                for each (_loc3_ in this.messageQueue) {
                    if (_loc3_ == param1) {
                        _loc2_ = true;
                    }
                }
                if (!_loc2_) {
                    this.messageQueue.push(param1);
                }
            }
            else {
                this.system_message("<font color=\"#FF0000\">Your comlink is overheating.</font>");
                this.overheat = true;
            }
            if (this.messageQueueTimer != null) {
                this.messageQueueTimer.stop();
                this.messageQueueTimer = null;
            }
        }

        private function globalChatListener(param1:TimerEvent):void {
            var _loc4_:String = null;
            var _loc2_:Date = new Date();
            var _loc3_:Number = _loc2_.time - this.globalChatLastSent.time;
            if (_loc3_ > this.delay) {
                if (this.messageQueue.length > 0) {
                    _loc4_ = this.messageQueue.shift() as String;
                    _chat.say(this.GLOBAL_CHANNEL, _loc4_);
                    this.globalChatLastSent = new Date();
                    this.delay += this.DELAY_INCREASE;
                    if (this.messageQueue.length == 0) {
                        if (this.messageQueueTimer != null) {
                            this.messageQueueTimer.stop();
                            this.messageQueueTimer = null;
                        }
                        this.messageQueueLastCheck = new Date();
                        this.messageQueueTimer = new Timer(250);
                        this.messageQueueTimer.addEventListener(TimerEvent.TIMER, this.messageQueueListener);
                        this.messageQueueTimer.start();
                        if (this.globalChatTimer != null) {
                            this.globalChatTimer.stop();
                            this.globalChatTimer = null;
                        }
                    }
                }
                else if (this.globalChatTimer != null) {
                    this.globalChatTimer.stop();
                    this.globalChatTimer = null;
                }
            }
        }

        private function messageQueueListener(param1:TimerEvent):void {
            var _loc2_:Date = new Date();
            var _loc3_:Number = _loc2_.time - this.messageQueueLastCheck.time;
            if (_loc3_ > this.DELAY_DECREASE_TIME) {
                this.messageQueueLastCheck = new Date();
                this.delay -= this.DELAY_DECREASE;
                if (this.delay <= this.DELAY_INITIAL) {
                    if (this.messageQueueTimer != null) {
                        this.messageQueueTimer.stop();
                        this.messageQueueTimer = null;
                        if (this.overheat) {
                            this.system_message("<font color=\"0x00FFFF\">Your comlink cools down.</font>");
                            this.overheat = false;
                        }
                    }
                }
            }
        }

        public function enter_sector(param1:String, param2:Boolean = false):void {
            var _loc3_:Array = null;
            var _loc4_:int = 0;
            if (!param2) {
                if (this._joinAttempts >= 10) {
                    LOGGER.Log("err", "BYMChat.enter_sector: failed to connect to 10 chat rooms; giving up");
                    this.displayUnavailable("unable to find open chat room");
                    return;
                }
                _loc3_ = param1.split(/(\d+)/);
                if (_loc3_.length == 0) {
                    LOGGER.Log("err", "BYMChat.enter_sector(): invalid sectorName");
                    this.displayUnavailable("invalid chat room");
                    return;
                }
                this._sectorBaseName = _loc3_[0];
                _loc4_ = int(_loc3_[1]);
                if (this._joinAttempts > 0) {
                    _loc4_++;
                }
                ++this._joinAttempts;
                _loc4_ %= Chat.NUM_CHAT_ROOMS;
                param1 = this._sectorBaseName + _loc4_.toString();
            }
            if (this.sector_channel != null && this.sector_channel.Name == param1) {
                return;
            }
            if (this._isConnected) {
                if (this.sector_channel != null) {
                    _chat.leave(this.sector_channel);
                }
            }
            this.sector_channel = new Channel(param1, "system");
            if (this._isConnected) {
                this.joinSector();
            }
        }

        private function clearDisplayNameMap():void {
            _displayNameMap = new Dictionary();
        }

        public function sector_chat(param1:String):void {
            if (!this._isConnected) {
                LOGGER.Log("err", "BYMChat.sector_chat(): not connected");
                return;
            }
            if (this.sector_channel != null) {
                _chat.say(this.sector_channel, param1);
            }
            else {
                _chat.error(ChatEvent.SAY, "Not in a sector channel.");
            }
        }

        public function private_chat(param1:String, param2:String):void {
            if (!this._isConnected) {
                LOGGER.Log("err", "BYMChat.private_chat(): not connected");
                return;
            }
            if (this.userIsIgnored(param1)) {
                return;
            }
            var _loc3_:Channel = new Channel(param1, "private");
            _chat.say(_loc3_, param2);
        }

        private function onConnect(param1:ChatEvent):void {
            var reason:String = null;
            var chatEvent:ChatEvent = param1;
            try {
                this._isConnected = chatEvent.Success;
                if (!this._isConnected) {
                    reason = chatEvent.Get("reason") as String;
                    this.displayUnavailable(reason != null ? reason : "connection failed");
                }
                else if (this._auth != null && _chat != null) {
                    _chat.login(this._auth);
                }
                else {
                    this.displayUnavailable();
                }
            }
            catch (e:Error) {
                reason = chatEvent.Get("reason") as String;
                displayUnavailable(reason != null ? reason : "connect failed");
                LOGGER.Log("err", "BYMChat.onConnect: " + e.message + "\n" + e.getStackTrace());
            }
        }

        private function onLogin(param1:ChatEvent):void {
            var _loc2_:String = null;
            if (param1.Success) {
                if (GLOBAL.INFERNO_ONLY) {
                    var shown:String = param1.Get("displayname") as String;
                    if (shown) {
                        this._ioMyName = shown.replace(/^\s*\[[^\]]*\]\s*/, "");
                    }
                    this._ioMyRole = param1.Get("role") as String;
                    if (param1.Get("relogin") == true) {
                        return; // (the transport is rejoining the channels itself)
                    }
                }
                if (GLOBAL.INFERNO_ONLY) {
                    _chat.getIgnore(); // (first: the history that comes with the joins is then filtered by it)
                }
                this.joinSector();
                if (!GLOBAL.INFERNO_ONLY) {
                    _chat.getIgnore();
                }
                this.ioJoinAlliance();
            }
            else {
                _loc2_ = param1.Get("reason") as String;
                this.displayUnavailable(_loc2_ != null ? _loc2_ : "login failed");
                // The reason the chat server gave. A login it no longer accepts (expired, replaced by a login
                // elsewhere, no chat token yet) is an answer, not a bug: only other reasons are reported.
                if (_loc2_ == "invalid_token" || _loc2_ == "user_not_found" || _loc2_ == "no_chat_token") {
                    LOGGER.Log("log", "Chat login refused: " + _loc2_);
                }
                else {
                    LOGGER.Log("err", "Chat login failed: \'" + _loc2_ + "\'");
                }
            }
        }

        public function joinGlobal():void {
            this.clearChat();
            _chat.join(this.GLOBAL_CHANNEL);
        }

        public function joinSector():void {
            if (this.sector_channel != null) {
                this.clearDisplayNameMap();
                _chat.join(this.sector_channel);
                this.default_chat_channel = "sector";
            }
        }

        private function onJoin(param1:ChatEvent):void {
            var _loc2_:Channel = null;
            if (param1.Success) {
                _loc2_ = param1.Get("channel") as Channel;
                if (GLOBAL.INFERNO_ONLY) {
                    // The channel's recent history follows this event straight away: not new messages.
                    this.ioReplayStart();
                }
                if (isAllianceChannel(_loc2_.Name)) {
                    if (GLOBAL.INFERNO_ONLY && (this._ioAllianceChannel == null || this._ioAllianceChannel.Name != _loc2_.Name)) {
                        if (this._ioAllianceChannel != null || this._ioLogs[IO_ALLIANCE].length > 0) {
                            // another alliance than the one this tab showed: its own conversation
                            this.ioClear(IO_ALLIANCE);
                            this._ioLastTs[IO_ALLIANCE] = 0;
                        }
                        this._ioAllianceChannel = _loc2_;
                        if (this._ioMode == IO_ALLIANCE) {
                            this.chatBox.ioSetLines(this._ioLogs[IO_ALLIANCE]);
                        }
                        this.ioUpdateTabs();
                    }
                    if (GLOBAL.INFERNO_ONLY && this._ioPendingAlliance != null) {
                        // A location shared to the alliance before its channel had been joined.
                        _chat.say(this._ioAllianceChannel, this._ioPendingAlliance);
                        this.ioAwait(this._ioPendingAlliance, IO_ALLIANCE);
                        this._ioPendingAlliance = null;
                    }
                    return;
                }
                if (GLOBAL.INFERNO_ONLY) {
                    // Joined again (the link to the server came back, or the Alliances window joined): the
                    // history that follows is only what was missed. Only a first join starts afresh.
                    if (this._ioGlobalJoined != _loc2_.Name) {
                        var first:Boolean = this._ioGlobalJoined == null;
                        this.ioClear(IO_GLOBAL);
                        this._ioLastTs[IO_GLOBAL] = 0;
                        this._ioGlobalJoined = _loc2_.Name;
                        if (first) {
                            this.ioShow(IO_GLOBAL, this.ioSystemLine("Welcome to Global chat. Type /help for commands; click a name for more."), false);
                        }
                    }
                }
                else {
                    this.clearChat();
                    this.system_message("Joined channel " + _loc2_.Name + ".");
                    this.system_message("Type /h for help.");
                }
                _chat.setDisplayNameUserVar("[" + BASE.BaseLevel().level + "] " + _userRecord.Id);
                _chat.updateDisplayName(_loc2_, _userRecord.Name, "[" + BASE.BaseLevel().level + "] " + _userRecord.Id);
                this.chatBox.EnableInput(true);
                this._isJoined = true;
            }
            else {
                this.clearChat();
                this.system_message("Join attempt " + this._joinAttempts + " failed. Trying again.");
                this.enter_sector(this._sectorBaseName);
            }
        }

        private function onLeave(param1:ChatEvent):void {
            if (GLOBAL.INFERNO_ONLY && param1.Success && param1.Get("server") == true) {
                // Moved out of an alliance channel by the server (left, kicked, or the alliance is gone).
                var gone:Channel = param1.Get("channel") as Channel;
                if (gone != null && isAllianceChannel(gone.Name) && this._ioAllianceChannel != null && this._ioAllianceChannel.Name == gone.Name) {
                    this._ioAllianceChannel = null;
                    this.ioClear(IO_ALLIANCE);
                    this._ioLastTs[IO_ALLIANCE] = 0;
                    this.ioShow(IO_ALLIANCE, this.ioSystemLine("You are no longer in this alliance."), false);
                    if (this._ioMode == IO_ALLIANCE) {
                        this.chatBox.ioSetLines(this._ioLogs[IO_ALLIANCE].concat([this.ioSystemLine("Join an alliance to chat with its members here.")]));
                    }
                }
                return;
            }
            if (!param1.Success) {
                LOGGER.Log("err", "BYMChat.onLeave() " + param1.Success + ": \'" + param1.Get("error") + "\'");
            }
        }

        private function onSay(param1:ChatEvent):void {
            var _loc2_:Channel = null;
            var _loc3_:String = null;
            var _loc4_:String = null;
            if (param1.Success) {
                _loc2_ = param1.Get("channel") as Channel;
                if (isAllianceChannel(_loc2_.Name)) {
                    if (GLOBAL.INFERNO_ONLY) {
                        this.ioAllianceSay(_loc2_, param1);
                    }
                    return;
                }
                if (GLOBAL.INFERNO_ONLY) {
                    this.ioGlobalSay(_loc2_, param1);
                    return;
                }
                _loc3_ = param1.Get("user") as String;
                _loc4_ = param1.Get("message") as String;
                if (this.userIsIgnored(_loc3_)) {
                    return;
                }
                this.showChatMessage(_loc2_, _loc3_, _loc4_);
            }
            else {
                LOGGER.Log("err", "BYMChat.onSay() " + param1.Success + ": \'" + param1.Get("error") + "\'");
            }
        }

        private function onList(param1:ChatEvent):void {
            if (!param1.Success) {
                LOGGER.Log("err", "BYMChat.onList() " + param1.Success + ": \'" + param1.Get("error") + "\'");
            }
        }

        private function onMembers(param1:ChatEvent):void {
            if (!param1.Success) {
                LOGGER.Log("err", "BYMChat.onMembers() " + param1.Success + ": \'" + param1.Get("error") + "\'");
            }
        }

        private function onIgnore(param1:ChatEvent):void {
            var _loc2_:String = null;
            var _loc3_:String = null;
            var _loc4_:String = null;
            var _loc5_:Array = null;
            var _loc6_:ChatData = null;
            var _loc7_:String = null;
            var _loc8_:String = null;
            if (GLOBAL.INFERNO_ONLY && param1.Success) {
                this.ioOnIgnore(param1);
                return;
            }
            if (param1.Success) {
                _loc2_ = param1.Get("action") as String;
                _loc3_ = param1.Get("target") as String;
                _loc4_ = param1.Get("displayname") as String;
                if (_loc2_ != "show") {
                    this._ignore_list = param1.Get("ignore_list") as Array;
                }
                if (_loc4_ == null) {
                    _loc4_ = this.fetchDisplayName(_loc3_);
                }
                if (_loc2_ == "add") {
                    this.system_message("\'" + _loc4_ + "\' (id: " + _loc3_ + ") is now being ignored.");
                }
                else if (_loc2_ == "remove") {
                    this.system_message("\'" + _loc4_ + "\' (id: " + _loc3_ + ") is no longer ignored.");
                }
                else if (_loc2_ == "show") {
                    if ((_loc5_ = param1.Get("ignore_list") as Array).length == 0) {
                        this.system_message("You are not ignoring any users.");
                    }
                    else {
                        this.system_message("<b><font color=\"#0000FF\">List of ignored users:</font></b>");
                        for each (_loc6_ in _loc5_) {
                            _loc7_ = String(_loc6_.getUtfString("target"));
                            if ((_loc8_ = _loc6_.getUtfString("displayname")) == null || _loc8_.length == 0) {
                                _loc8_ = this.fetchDisplayName(_loc7_);
                            }
                            if (_loc8_ != null) {
                                this.showIgnoreListMessage(_loc7_, _loc8_);
                            }
                            else {
                                this.showIgnoreListMessage(_loc7_, "");
                            }
                        }
                    }
                }
            }
            else {
                LOGGER.Log("err", "BYMChat.onIgnore() " + param1.Success + ": \'" + param1.Get("error") + "\'");
            }
        }

        private function onIgnoreError(param1:ChatEvent):void {
            var _loc2_:String = param1.Get("reason") as String;
            if (_loc2_ == "ignorelistfull") {
                this.system_message("Ignore list full. You must remove someone from your list before adding another.");
            }
        }

        private function onUpdateName(param1:ChatEvent):void {
            var _loc2_:String = param1.Get("userid") as String;
            var _loc3_:String = param1.Get("displayname") as String;
            _displayNameMap[_loc2_] = _loc3_;
        }

        private function onUserEnter(param1:ChatEvent):void {
            var _loc2_:ChatUser = param1.Get("user") as ChatUser;
            var _loc3_:ChatRoom = param1.Get("room") as ChatRoom;
            if (_loc3_ != null && isAllianceChannel(_loc3_.name)) {
                return;
            }
            if (this.sector_channel == null) {
                LOGGER.Log("err", "BYMChat.onUserEnter(): No sector has been joined yet");
                return;
            }
            if (_userRecord == null) {
                LOGGER.Log("err", "BYMChat.onUserEnter(): No user record available");
                return;
            }
            if (_loc2_.name == _userRecord.Name) {
                return;
            }
            _chat.updateDisplayNameDirect(this.sector_channel, _loc2_.name, _userRecord.Name, "[" + BASE.BaseLevel().level + "] " + _userRecord.Id);
        }

        private function onUserExit(param1:ChatEvent):void {
            var _loc2_:ChatUser = param1.Get("user") as ChatUser;
            var _loc3_:ChatRoom = param1.Get("room") as ChatRoom;
            if (_loc3_ != null && isAllianceChannel(_loc3_.name)) {
                return;
            }
            delete _displayNameMap[_loc2_.name];
        }

        public function toggleVisible(...rest):void {
            this._open = !this._open;
            this.toggleVisibleB();
            GLOBAL.StatSet("chatvis", this._open ? 1 : 0);
        }

        public function toggleVisibleB(...rest):void {
            this.position();
            this.chatBox.update();
        }

        public function show():void {
            this.visible = true;
        }

        public function hide():void {
            this.visible = true;
        }

        public function showUnavailableInYourArea():void {
            this.chatBox.disableChatBoxForAB();
            this.system_message("Chat is currently unavailable in your area.");
        }

        public function showInvalidName():void {
            this.chatBox.disableChatBoxForAB();
            this.system_message("Chat is currently unavailable. (EC:13)");
        }

        public function fetchDisplayName(param1:String):String {
            // (a player not seen yet has no name here: null, not "undefined")
            var _loc2_:* = _displayNameMap[param1];
            return _loc2_ == null ? null : String(_loc2_);
        }

        public function toggleMinimizedStat(param1:Boolean = true):void {
            if (param1 == true) {
                if (GLOBAL.StatGet("chatmin") != 1) {
                    GLOBAL.StatSet("chatmin", 1);
                }
            }
            else if (GLOBAL.StatGet("chatmin") != 0) {
                GLOBAL.StatSet("chatmin", 0);
            }
        }

        private function showIgnoreListMessage(param1:String, param2:String):void {
            var _loc3_:* = "<i>\'" + param2 + "\' (id: " + param1 + ")</i>";
            this.chatBox.push(_loc3_, param2, param1, "IgnoreList");
        }

        private function showChatMessage(param1:Channel, param2:String, param3:String):void {
            var _loc4_:* = null;
            var _loc5_:String = null;
            var _loc6_:* = null;
            var _loc7_:String = null;
            if (param3 == "") {
                return;
            }
            if (GLOBAL.INFERNO_ONLY) {
                // (players' lines take another way in: ioGlobalSay / ioAllianceSay. These are the game's own.)
                if (param2 == null) {
                    this.ioShow(this._ioMode, this.ioSystemLine(param3), false);
                }
                return;
            }
            if (param2 == null) {
                param3 = ProfanityFilter.filterMessage(param3);
                _loc4_ = "<i>" + param3 + "</i>";
                _loc5_ = "System";
            }
            else {
                // A player's words are shown as text: markup in them would be drawn (giant fonts, links).
                param3 = ioEsc(ProfanityFilter.filterMessage(param3));
                if ((_loc7_ = this.fetchDisplayName(param2)) == null) {
                    return;
                }
                _loc7_ = ioEsc(_loc7_);
                if (param2 == "Administrator") {
                    _loc4_ = "<b><font color=\"#FF0000\">Admin: </font></b>";
                    _loc6_ = "<b><font color=\"#FF0000\">Admin: </font></b>";
                    _loc5_ = "Administrator";
                }
                else if (param2 == "Moderator") {
                    _loc4_ = "<b><font color=\"#FF0000\">Mod: </font></b>";
                    _loc6_ = "<b><font color=\"#FF0000\">Mod: </font></b>";
                    _loc5_ = "Moderator";
                }
                else if (param1.Type == "private") {
                    _loc4_ = "<b><font color=\"#076bbf\">";
                    _loc6_ = "<b><font color=\"#076bbf\">";
                    if (_userRecord.Name == param2) {
                        _loc4_ += "to " + _loc7_ + ": ";
                        _loc6_ += "to " + _loc7_ + ": ";
                    }
                    else {
                        _loc4_ += _loc7_ + ": ";
                        _loc6_ += _loc7_ + ": ";
                    }
                    _loc4_ += "</font></b>";
                    _loc6_ += "</font></b>";
                    _loc5_ = "Private";
                }
                else {
                    _loc4_ = "<font color=\"#000000\">";
                    _loc6_ = "<font color=\"#000000\">";
                    _loc4_ += "<b>" + _loc7_ + ":</b> ";
                    _loc6_ += "<b>" + _loc7_ + ":</b> ";
                    _loc4_ += "</font>";
                    _loc6_ += "</font>";
                    _loc5_ = "Default";
                }
                _loc4_ += param3;
            }
            this.chatBox.push(_loc4_, _loc6_, param2, _loc5_);
        }

        // ---------------------------------------------------------------------------------------------
        // Inferno-only: Global / Alliance tabs. The dock also joins the player's alliance channel (the
        // same one the Alliances window shows), keeps a transcript per tab, and counts the messages not
        // seen yet: on the other tab, or on this one while the chat is minimised. The counts show on the
        // tabs as "Global (3)". Enter sends to the tab that is showing.
        // ---------------------------------------------------------------------------------------------

        public static const IO_GLOBAL:String = "global";

        public static const IO_ALLIANCE:String = "alliance";

        private static const IO_LOG_MAX:int = 60;

        /** The server's flood limit (chatRooms.ts), kept here too: a line it would refuse stays in the box. */
        private static const IO_RATE_MS:int = 500;

        private static const IO_RATE_BURST:int = 3;

        /** Lines the server writes into Global for everyone (chat/chatBroadcasts.ts). */
        private static const IO_BROADCASTS:Array = ["announce", "casino", "milestone", "event"];

        private var _ioMode:String = IO_GLOBAL;

        /** Each tab's transcript: line objects (ChatBox.ioMakeLine draws them). */
        private var _ioLogs:Object = {"global": [], "alliance": []};

        private var _ioUnread:Object = {"global": 0, "alliance": 0};

        private var _ioMentions:Object = {"global": 0, "alliance": 0};

        /** The newest server line each tab has (epoch ms): a channel's history sent again is only what's newer. */
        private var _ioLastTs:Object = {"global": 0, "alliance": 0};

        private var _ioAllianceChannel:Channel = null;

        /** The Global room joined last (a join of the same one again keeps the transcript). */
        private var _ioGlobalJoined:String = null;

        /** The player's own name, as the server knows it (lines that mention it are highlighted). */
        private var _ioMyName:String = null;

        private var _ioSendDue:Number = 0;

        private var _ioLastSent:Object = null;

        private var _ioIgnoreNames:Object = {};

        /** "admin", "mod" or null: staff get Delete line and Mute in the name menu (chat/chatModeration.ts). */
        private var _ioMyRole:String = null;

        public function get ioMyRole():String {
            return this._ioMyRole;
        }

        public function get ioMode():String {
            return this._ioMode;
        }

        /** A player's words as text: the chat lines are drawn from HTML, so <, > and & must not be markup. */
        public static function ioEsc(param1:String):String {
            if (param1 == null) {
                return "";
            }
            return param1.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        /** The server's time now, in milliseconds (the lines carry its time). */
        public static function ioNow():Number {
            var t:int = GLOBAL.Timestamp();
            return t > 0 ? t * 1000 : new Date().time;
        }

        /** "Name", "@Name" as a word, any capitals: group 2 is the name. */
        private static function ioMentionRe(param1:String):RegExp {
            var safe:String = param1.replace(/[.*+?^${}()|\[\]\\\/]/g, "\\$&");
            return new RegExp("(^|[^A-Za-z0-9_])(@?" + safe + ")(?![A-Za-z0-9_])", "gi");
        }

        /** A line the game writes itself (notices, help): shown on the tab it is put on, not counted. */
        private function ioSystemLine(param1:String):Object {
            return {"html": "<i>" + param1 + "</i>", "kind": "system", "ts": ioNow()};
        }

        private static function ioTs(param1:*):Number {
            var ts:Number = Number(param1);
            if (isNaN(ts) || ts <= 0) {
                return 0;
            }
            return ts < 100000000000 ? ts * 1000 : ts; // (seconds, from an older server)
        }

        /** A player's line: "[12] Name: words", mentions of the player picked out. */
        private function ioPlayerLine(param1:String, param2:String, param3:String, param4:Number, param5:String = null, param6:String = null, param7:String = null):Object {
            var name:String = param2 ? param2 : this.fetchDisplayName(param1);
            if (!name) {
                name = "Player " + param1;
            }
            var plain:String = name.replace(/^\s*\[[^\]]*\]\s*/, "");
            // Staff wear a badge: [Admin] or [Mod] (the server says who they are; names can't pretend to it)
            var badge:String = param6 == "admin" ? "<font color=\"#C0281C\"><b>[Admin]</b></font> " : (param6 == "mod" ? "<font color=\"#1F5FA8\"><b>[Mod]</b></font> " : "");
            var label:String = badge + "<font color=\"#000000\"><b>" + ioEsc(name) + ":</b> </font>";
            var own:Boolean = LOGIN._playerID > 0 && param1 == String(LOGIN._playerID);
            var text:String = ioEsc(ProfanityFilter.filterMessage(param3));
            var mention:Boolean = false;
            if (!own && this._ioMyName) {
                if (ioMentionRe(this._ioMyName).test(param3)) {
                    mention = true;
                    text = text.replace(ioMentionRe(ioEsc(this._ioMyName)), "$1<b><font color=\"#B34700\">$2</font></b>");
                }
            }
            return {"html": label + text, "label": label, "user": param1, "name": plain, "kind": own ? "own" : (mention ? "mention" : "player"), "ts": param4, "mention": mention, "id": param5, "role": param6, "channel": param7};
        }

        /** An announcement, a big win, a milestone: a banner line of its own colour. */
        private function ioBroadcastLine(param1:String, param2:String, param3:Number):Object {
            // (words, not symbols: the game's fonts have no stars or diamonds; the colour tells them apart)
            // ("event": a server event starting or ending, the Wart Bloom)
            var head:String = param1 == "casino" ? "Brimstone Pit:" : (param1 == "milestone" ? "Milestone:" : (param1 == "event" ? "Event:" : "Announcement:"));
            return {"html": "<b>" + head + "</b> " + ioEsc(param2), "kind": param1, "ts": param3};
        }

        /** Joins the alliance channel ("alliance" resolves to the player's own) when in an alliance. */
        public function ioJoinAlliance():void {
            if (!GLOBAL.INFERNO_ONLY || _chat == null || this._ioAllianceChannel != null) {
                return;
            }
            if (ALLIANCES._allianceID > 0) {
                _chat.join(new Channel("alliance", "system"));
            }
        }

        private function ioGlobalSay(param1:Channel, param2:ChatEvent):void {
            var user:String = param2.Get("user") as String;
            var message:String = param2.Get("message") as String;
            if (message == null || message == "") {
                return;
            }
            var ts:Number = ioTs(param2.Get("ts"));
            if (this._ioReplay && ts > 0 && ts <= this._ioLastTs[IO_GLOBAL]) {
                return; // (history sent again: shown already)
            }
            var type:String = param2.Get("messagetype") as String;
            if (IO_BROADCASTS.indexOf(type) != -1 || int(user) <= 0) {
                var line:Object = this.ioBroadcastLine(IO_BROADCASTS.indexOf(type) != -1 ? type : "announce", message, ts);
                this.ioShow(IO_GLOBAL, line, true);
                if (!this._ioReplay && this._ioAllianceChannel != null) {
                    // (shown on the Alliance tab too, so it is seen whichever is up)
                    this.ioShow(IO_ALLIANCE, {"html": line.html, "kind": line.kind, "ts": line.ts, "mirror": true}, false);
                }
                return;
            }
            if (!this._ioReplay) {
                this.ioArrived(IO_GLOBAL, user);
            }
            if (this.userIsIgnored(user)) {
                return;
            }
            this.ioShow(IO_GLOBAL, this.ioPlayerLine(user, param2.Get("displayname") as String, message, ts, param2.Get("id") as String, param2.Get("role") as String, param1.Name), true);
        }

        private function ioAllianceSay(param1:Channel, param2:ChatEvent):void {
            var user:String = param2.Get("user") as String;
            var message:String = param2.Get("message") as String;
            if (message == null || message == "") {
                return;
            }
            if (this._ioAllianceChannel == null) {
                this._ioAllianceChannel = param1;
            }
            if (param1.Name != this._ioAllianceChannel.Name) {
                return; // (an alliance the player has just left)
            }
            var ts:Number = ioTs(param2.Get("ts"));
            if (this._ioReplay && ts > 0 && ts <= this._ioLastTs[IO_ALLIANCE]) {
                return;
            }
            var messageType:String = param2.Get("messagetype") as String;
            if (messageType != null && messageType != AllianceMessageType.MESSAGE) {
                // A shout (joined, left, promoted...): a sentence the server wrote, in its type's colour.
                this.ioShow(IO_ALLIANCE, {"html": ioEsc(ProfanityFilter.filterMessage(message)), "kind": "shout_" + messageType, "ts": ts, "id": param2.Get("id") as String, "channel": param1.Name}, true);
                if (messageType == "pinned" && !this._ioReplay) {
                    ALLIANCES.ioPinsChanged(); // (the Alliances window's Board count)
                }
                return;
            }
            if (!this._ioReplay) {
                this.ioArrived(IO_ALLIANCE, user);
            }
            if (user != null && this.userIsIgnored(user)) {
                return;
            }
            this.ioShow(IO_ALLIANCE, this.ioPlayerLine(user, param2.Get("displayname") as String, message, ts, param2.Get("id") as String, param2.Get("role") as String, param1.Name), true);
        }

        /** Adds a line to a tab's transcript: drawn if that tab is up, counted if not seen. */
        private function ioShow(param1:String, param2:Object, param3:Boolean):void {
            var log:Array = this._ioLogs[param1];
            log.push(param2);
            if (log.length > IO_LOG_MAX) {
                log.shift();
            }
            if (param2.ts > 0 && !param2.mirror && param2.kind != "system" && param2.ts > this._ioLastTs[param1]) {
                this._ioLastTs[param1] = param2.ts;
            }
            if (param1 == this._ioMode) {
                this.chatBox.ioAppend(param2);
            }
            if (param3 && param2.kind != "own" && !this._ioReplay && (param1 != this._ioMode || !this._open)) {
                this._ioUnread[param1] = int(this._ioUnread[param1]) + 1;
                if (param2.mention) {
                    this._ioMentions[param1] = int(this._ioMentions[param1]) + 1;
                }
                this.ioUpdateTabs();
            }
        }

        private var _ioReplay:Boolean = false;

        /** Lines until the end of this frame's work are a channel's history, sent when it is joined. */
        private function ioReplayStart():void {
            this._ioReplay = true;
            setTimeout(function():void {
                    _ioReplay = false;
                }, 0);
        }

        private function ioClear(param1:String):void {
            this._ioLogs[param1] = [];
            this._ioUnread[param1] = 0;
            this._ioMentions[param1] = 0;
            if (param1 == this._ioMode) {
                this.chatBox.ioSetLines([]);
            }
            this.ioUpdateTabs();
        }

        /** An ignored player's lines go from both transcripts at once. */
        private function ioPurge(param1:String):void {
            for each (var tab:String in [IO_GLOBAL, IO_ALLIANCE]) {
                this._ioLogs[tab] = (this._ioLogs[tab] as Array).filter(function(line:Object, i:int, a:Array):Boolean {
                        return line.user != param1 || line.kind == "ignorelist";
                    });
            }
            this.chatBox.ioSetLines(this._ioLogs[this._ioMode]);
        }

        /** A tab was clicked. */
        public function ioSwitch(param1:String):void {
            if (param1 == this._ioMode) {
                this.ioSeen();
                return;
            }
            if (param1 == IO_ALLIANCE && this._ioAllianceChannel == null) {
                this.ioJoinAlliance();
            }
            this._ioMode = param1;
            var lines:Array = this._ioLogs[param1];
            if (param1 == IO_ALLIANCE && this._ioAllianceChannel == null && ALLIANCES._allianceID <= 0) {
                lines = lines.concat([this.ioSystemLine("Join an alliance to chat with its members here.")]);
            }
            this.chatBox.ioSetLines(lines);
            this.ioSeen();
        }

        /** The showing tab has been seen (switched to, or the chat opened). */
        public function ioSeen():void {
            if (this._open) {
                this._ioUnread[this._ioMode] = 0;
                this._ioMentions[this._ioMode] = 0;
            }
            this.ioUpdateTabs();
        }

        private function ioUpdateTabs():void {
            if (this.chatBox) {
                this.chatBox.ioSetTabs(this._ioMode, int(this._ioUnread[IO_GLOBAL]), int(this._ioUnread[IO_ALLIANCE]), int(this._ioMentions[IO_GLOBAL]), int(this._ioMentions[IO_ALLIANCE]));
            }
        }

        // ---- typing

        private function ioProcessInput(param1:String):void {
            var text:String = String(param1 || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
            if (text.length == 0) {
                this.chatBox.clearInputText();
                return;
            }
            if (text.charAt(0) == "/") {
                this.chatBox.clearInputText();
                this.ioCommand(text);
                return;
            }
            if (this.ioSend(text)) {
                this.chatBox.clearInputText();
            }
        }

        /** Sends a line to the tab that is up. False (the words stay in the box) when it cannot go now. */
        private function ioSend(param1:String):Boolean {
            if (!this._isConnected || _chat == null || !_chat.isLoggedIn) {
                this.ioShow(this._ioMode, this.ioSystemLine("Chat is reconnecting. Your message is still in the box: press Enter again in a moment."), false);
                return false;
            }
            var channel:Channel = this._ioMode == IO_ALLIANCE ? this._ioAllianceChannel : this.sector_channel;
            if (channel == null) {
                this.ioShow(this._ioMode, this.ioSystemLine(this._ioMode == IO_ALLIANCE ? "You are not in an alliance." : "Chat is still connecting. Press Enter again in a moment."), false);
                return false;
            }
            var now:Number = new Date().time;
            var due:Number = Math.max(now, this._ioSendDue) + IO_RATE_MS;
            if (due - now > IO_RATE_MS * IO_RATE_BURST) {
                this.ioShow(this._ioMode, this.ioSystemLine("Slow down a little: wait a moment, then press Enter again."), false);
                return false;
            }
            this._ioSendDue = due;
            this._ioLastSent = {"text": param1, "tab": this._ioMode, "at": now};
            _chat.say(channel, param1);
            this.ioAwait(param1, this._ioMode);
            return true;
        }

        // ---- Inferno-only (3 October, bug report A2): a line sent that never comes back from the server (the
        // chat had just reconnected and was not in the room yet) is not lost silently: after a few seconds
        // it goes back in the box, and the chat says so.

        private static const IO_AWAIT_MS:int = 6000;

        private var _ioAwaiting:Object = null;

        private function ioAwait(param1:String, param2:String):void {
            var waiting:Object = {"text": param1, "tab": param2, "at": new Date().time};
            this._ioAwaiting = waiting;
            setTimeout(function():void {
                    if (_ioAwaiting != waiting) {
                        return; // (it arrived, or another line was sent since)
                    }
                    if (_ioPendingAlliance != null && String(waiting.tab) == IO_ALLIANCE) {
                        ioAwait(String(waiting.text), IO_ALLIANCE); // (still joining the room: it goes once in)
                        return;
                    }
                    _ioAwaiting = null;
                    ioShow(String(waiting.tab), ioSystemLine("That message didn't get through: it's back in the box. Press Enter to send it again."), false);
                    if (chatBox && chatBox.inputText == "") {
                        chatBox.ioSetInput(String(waiting.text));
                    }
                }, IO_AWAIT_MS);
        }

        /** A line of the player's own came back: the one waiting has arrived. */
        private function ioArrived(param1:String, param2:String):void {
            if (this._ioAwaiting != null && param2 != null && String(this._ioAwaiting.tab) == param1 && (int(param2) == LOGIN._playerID || String(param2) == String(LOGIN._playerID))) {
                this._ioAwaiting = null;
            }
        }

        private function ioSay(param1:String):void {
            this.ioShow(this._ioMode, this.ioSystemLine(param1), false);
        }

        private function ioCommand(param1:String):void {
            var space:int = param1.indexOf(" ");
            var command:String = (space < 0 ? param1 : param1.substr(0, space)).toLowerCase();
            var arg:String = space < 0 ? "" : param1.substr(space + 1).replace(/^\s+|\s+$/g, "").replace(/^@/, "");
            var online:Boolean = this._isConnected && _chat != null && _chat.isLoggedIn;
            switch (command) {
                case "/ignore":
                    if (!arg) {
                        this.ioSay("Type /ignore and a player's name, for example: /ignore Name");
                    }
                    else if (!online) {
                        this.ioSay("Chat is reconnecting. Try that again in a moment.");
                    }
                    else {
                        _chat.ignore("", arg);
                    }
                    break;
                case "/unignore":
                    if (!arg) {
                        this.ioSay("Type /unignore and a player's name, for example: /unignore Name");
                    }
                    else if (!online) {
                        this.ioSay("Chat is reconnecting. Try that again in a moment.");
                    }
                    else {
                        _chat.unignore(this.ioIgnoredIdByName(arg) || arg);
                    }
                    break;
                case "/l":
                case "/list":
                case "/ignored":
                case "/listignored":
                case "/igd":
                    if (online) {
                        _chat.showIgnore();
                    }
                    break;
                case "/clear":
                    this.ioClear(this._ioMode);
                    break;
                case "/mute":
                case "/unmute":
                    if (!this._ioMyRole) {
                        this.ioSay("Only admins and chat moderators can mute.");
                    }
                    else if (!arg) {
                        this.ioSay(command == "/mute" ? "Type /mute, a player's name and the minutes, for example: /mute Name 60" : "Type /unmute and a player's name.");
                    }
                    else if (online) {
                        var parts:Array = arg.split(" ");
                        var minutes:int = command == "/unmute" ? 0 : (parts.length > 1 && int(parts[parts.length - 1]) > 0 ? int(parts.pop()) : 60);
                        this.ioMute(null, minutes, command == "/unmute" ? arg : parts.join(" "));
                    }
                    break;
                case "/?":
                case "/h":
                case "/help":
                    this.ioSay("<b>Chat commands</b><br>/ignore Name: hide a player's messages<br>/unignore Name: show them again<br>/list: the players you ignore<br>/clear: empty this tab<br>" + (this._ioMyRole ? "/mute Name minutes, /unmute Name: moderation (or click a name)<br>" : "") + "Click a player's name to message them, jump to their yard or find them on the leaderboards. Lines that mention you are highlighted.");
                    break;
                default:
                    this.ioSay("There is no command " + ioEsc(command) + ". Type /help for the list.");
            }
        }

        private function ioIgnoredIdByName(param1:String):String {
            var wanted:String = param1.toLowerCase();
            for (var id:String in this._ioIgnoreNames) {
                if (String(this._ioIgnoreNames[id]).toLowerCase() == wanted) {
                    return id;
                }
            }
            return null;
        }

        /** The server refused something (chatProtocol.ts ErrorCode): said in the chat, never lost silently. */
        private function ioOnServerError(param1:ChatEvent):void {
            if (!GLOBAL.INFERNO_ONLY) {
                return;
            }
            var code:String = param1.Get("code") as String;
            var name:String = ioEsc(param1.Get("name") ? String(param1.Get("name")) : "");
            var recent:Boolean = this._ioLastSent != null && new Date().time - Number(this._ioLastSent.at) < 15000;
            switch (code) {
                case "rate_limited":
                    this.ioSay("That message was not sent: it came too fast after the last ones.");
                    this.ioRestoreLast();
                    break;
                case "muted":
                    this.ioSay("You are muted in chat for " + int(param1.Get("minutes")) + " more minute(s).");
                    break;
                case "not_in_channel":
                    // (the link to the room was lost: join again, and send the line again once in)
                    if (recent && this._ioLastSent.tab == IO_ALLIANCE) {
                        this._ioPendingAlliance = String(this._ioLastSent.text);
                        _chat.join(new Channel("alliance", "system"));
                    }
                    else if (this.sector_channel != null) {
                        _chat.join(this.sector_channel);
                        this.ioSay("Reconnecting to chat. Send that again in a moment.");
                        this.ioRestoreLast();
                    }
                    break;
                case "user_not_found":
                    this.ioSay("There is no player called " + name + ".");
                    break;
                case "cannot_ignore_self":
                    this.ioSay("You can't ignore yourself.");
                    break;
                case "ignore_list_full":
                    this.ioSay("Your ignore list is full (100 players). Unignore someone first: /list");
                    break;
                case "not_ignored":
                    this.ioSay(name + " is not on your ignore list.");
                    break;
                case "server_error":
                    this.ioSay("Chat had a hiccup. Please try that again.");
                    break;
                case "not_allowed":
                    this.ioSay("You can't do that to this player or line.");
                    break;
            }
        }

        /** The line just refused goes back in the box, if the player has not started another. */
        private function ioRestoreLast():void {
            if (this._ioLastSent != null && this.chatBox.inputText == "") {
                this.chatBox.ioSetInput(String(this._ioLastSent.text));
            }
        }

        /** The ignore list from the server: applied (always), and said ("show", "add", "remove"). */
        private function ioOnIgnore(param1:ChatEvent):void {
            var ids:Array = param1.Get("ignore_ids") as Array || [];
            var names:Object = param1.Get("ignore_names") || {};
            this._ignore_list = ids;
            this._ioIgnoreNames = names;
            var target:String = param1.Get("target") as String;
            var who:String = ioEsc(param1.Get("displayname") ? String(param1.Get("displayname")) : String(names[target] || ""));
            switch (String(param1.Get("action"))) {
                case "sync":
                    break;
                case "add":
                    this.ioSay("You are ignoring " + who + " now: their messages are hidden. To undo: /unignore " + who);
                    if (target) {
                        this.ioPurge(target);
                    }
                    break;
                case "remove":
                    this.ioSay(who + " is no longer ignored.");
                    break;
                default:
                    if (ids.length == 0) {
                        this.ioSay("You are not ignoring anyone.");
                        break;
                    }
                    this.ioSay("<b>Players you ignore</b> (click a name to unignore):");
                    for each (var id:String in ids) {
                        var shown:String = ioEsc(names[id] ? String(names[id]) : "Player " + id);
                        this.ioShow(this._ioMode, {"html": "<b>" + shown + "</b>", "label": "<b>" + shown + "</b>", "user": id, "name": String(names[id] || id), "kind": "ignorelist", "ts": 0}, false);
                    }
            }
        }

        /** A player's name was clicked in the chat: the menu (message, ignore, jump, leaderboards). */
        public function ioNameClicked(param1:String, param2:String, param3:Number, param4:Number, param5:Object = null):void {
            if (!param1 || int(param1) <= 0) {
                return;
            }
            var line:Object = param5 || {};
            IoChatMenu.Show(param1, param2, this.userIsIgnored(param1), param3, param4, {"staff": this._ioMyRole, "lineId": line.lineId, "channel": line.channel, "targetRole": line.role});
        }

        // ---- moderation (admins and chat moderators: the server checks every request)

        /** A line deleted for everyone (the name menu's Delete line). */
        public function ioDeleteLine(param1:String, param2:String):void {
            if (_chat != null && param1 && param2) {
                _chat.moderate("delete", {"channel": param1, "id": param2});
            }
        }

        /** A player muted for some minutes (0: unmuted). */
        public function ioMute(param1:String, param2:int, param3:String = null):void {
            if (_chat == null) {
                return;
            }
            if (param3 != null) {
                _chat.moderate("mute", {"targetName": param3, "minutes": param2});
            }
            else {
                _chat.moderate("mute", {"targetId": param1, "minutes": param2});
            }
        }

        /** A line a moderator deleted: off both tabs, at once. */
        private function ioOnDeleted(param1:ChatEvent):void {
            var id:String = param1.Get("id") as String;
            if (!GLOBAL.INFERNO_ONLY || !id) {
                return;
            }
            var hit:Boolean = false;
            for each (var tab:String in [IO_GLOBAL, IO_ALLIANCE]) {
                var before:int = (this._ioLogs[tab] as Array).length;
                this._ioLogs[tab] = (this._ioLogs[tab] as Array).filter(function(line:Object, i:int, a:Array):Boolean {
                        return line.id != id;
                    });
                if ((this._ioLogs[tab] as Array).length != before && tab == this._ioMode) {
                    hit = true;
                }
            }
            if (hit) {
                this.chatBox.ioSetLines(this._ioLogs[this._ioMode]);
            }
        }

        private function ioOnNotice(param1:ChatEvent):void {
            if (GLOBAL.INFERNO_ONLY) {
                this.ioSay(ioEsc(String(param1.Get("text"))));
            }
        }

        /** A location shared to the alliance while its channel was still being joined (sent on the join). */
        private var _ioPendingAlliance:String = null;

        /**
         * A location shared from the map room (IoMapShare): the token for it goes to a tab's channel, after
         * whatever has been typed into the chat box (the player's own words for it, if any). Switches to that
         * tab so the line shows. Returns "" when it went, or why it could not.
         */
        public function ioShareLocation(param1:String, param2:String):String {
            if (!this._isConnected || _chat == null) {
                return "The chat is not connected right now.";
            }
            if (param1 == IO_ALLIANCE && ALLIANCES._allianceID <= 0 && this._ioAllianceChannel == null) {
                return "You are not in an alliance.";
            }
            if (param1 == IO_GLOBAL && this.sector_channel == null) {
                return "The chat is not connected right now.";
            }
            var lead:String = this.chatBox.inputText ? this.chatBox.inputText.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "") : "";
            if (lead.charAt(0) == "/") {
                lead = ""; // a chat command half typed is not a message
            }
            // The server keeps 200 characters of a line: the location must not be the part cut off.
            if (lead.length + 1 + param2.length > 200) {
                lead = lead.substr(0, Math.max(0, 199 - param2.length));
            }
            var message:String = lead.length > 0 ? lead + " " + param2 : param2;
            this.chatBox.clearInputText();
            if (param1 != this._ioMode) {
                this.ioSwitch(param1);
            }
            this._ioLastSent = {"text": message, "tab": param1, "at": new Date().time};
            if (param1 == IO_ALLIANCE) {
                if (this._ioAllianceChannel != null) {
                    _chat.say(this._ioAllianceChannel, message);
                    this.ioAwait(message, param1);
                }
                else {
                    this._ioPendingAlliance = message;
                    this.ioJoinAlliance();
                }
            }
            else {
                this.sector_chat(message);
            }
            if (!this._open) {
                this.toggleVisible(); // the chat was minimised: open it, so the line is seen going
            }
            return "";
        }

        /** A player's name in the chat was clicked: write them an in-game message. */
        public static function ioMessagePlayer(param1:String, param2:String):void {
            if (!param1 || int(param1) <= 0 || param1 == String(LOGIN._playerID)) {
                return;
            }
            var message:Message = new Message();
            message.picker.preloadSelection(new Contact(param1, {
                        "first_name": param2,
                        "last_name": "",
                        "pic_square": ""
                    }));
            message.requestType = "message";
            message.body_txt.text = "";
            GLOBAL.BlockerAdd();
            GLOBAL._layerWindows.addChild(message);
        }

        public function ignoreUser(param1:String = null, param2:String = null):void {
            if (param1 != null && (!GLOBAL.INFERNO_ONLY || int(param1) > 0)) {
                GLOBAL.Message(KEYS.Get("chat_ignore") + " \'" + param2 + "\' (id: " + param1 + ")<br><br>" + KEYS.Get("chat_ignore_confirm"), KEYS.Get("btn_yes"), _chat.ignore, [param1, param2]);
            }
        }

        public function unignoreUser(param1:String):void {
            if (param1 != null) {
                _chat.unignore(param1);
            }
        }

        public function position():void {
            var _loc6_:int = 0;
            var _loc7_:int = 0;
            var _loc1_:int = GLOBAL._ROOT.stage.stageWidth;
            var _loc2_:int = GLOBAL._ROOT.stage.stageHeight;
            var _loc3_:int = 0;
            var _loc4_:int = 0;
            var _loc5_:Rectangle = new Rectangle(0 - (_loc1_ - GLOBAL._SCREENINIT.width) / 2 + 0, 0 - (_loc2_ - GLOBAL._SCREENINIT.height) / 2 + _loc4_, _loc1_, _loc2_);
            this._hideX = _loc5_.x;
            this._showX = _loc5_.x;
            this._showY = GLOBAL._SCREENINIT.height + (_loc2_ - GLOBAL._SCREENINIT.height) / 2 - 30;
            this._hideY = GLOBAL._SCREENINIT.height + (_loc2_ - GLOBAL._SCREENINIT.height) / 2 - 30;
            this._hideX += _loc3_;
            this._showX += _loc3_;
            this._showY += _loc4_;
            this._hideY += _loc4_;
            if (this._open) {
                _loc6_ = this._showX;
                _loc7_ = this._showY;
            }
            else {
                _loc6_ = this._hideX;
                _loc7_ = this._hideY;
            }
            x = _loc6_;
            y = _loc7_;
            this.chatBox.update();
        }

        public function fetchIDFromDisplayName(param1:String, param2:Boolean):String {
            var _loc3_:String = null;
            if (param1 == null || param1.length == 0) {
                return "";
            }
            for each (_loc3_ in _displayNameMap) {
                if (_displayNameMap[_loc3_] != null && _displayNameMap[_loc3_].toString() == param1) {
                    return _loc3_;
                }
            }
            if (param2) {
                for (_loc3_ in _displayNameMap) {
                    if (_displayNameMap[_loc3_] != null && _displayNameMap[_loc3_].indexOf(param1) != -1) {
                        return _loc3_;
                    }
                }
            }
            return "";
        }

        public function userIsIgnored(param1:String):Boolean {
            if (this._ignore_list == null) {
                return false;
            }
            if (this._ignore_list.indexOf(param1) == -1) {
                return false;
            }
            return true;
        }

        public function displayUnavailable(param1:String = null):void {
            this.clearChat();
            if (param1 != null) {
                this.system_message("Chat is currently unavailable. Reason: " + param1);
            }
            else {
                this.system_message("Chat is currently unavailable.");
            }
        }

        public function get roomNames():Vector.<String> {
            if (_chat != null) {
                return _chat.roomNames;
            }
            return new Vector.<String>();
        }

        public function chatInputHasFocus():Boolean {
            if (Boolean(stage) && Boolean(this.chatBox)) {
                return stage.focus == this.chatBox.input;
            }
            return false;
        }
    }
}

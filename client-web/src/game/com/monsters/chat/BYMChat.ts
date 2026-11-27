import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { KeyboardEvent, TimerEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { Keyboard } from "flash/ui";
import { TextField } from "flash/text";
import { Dictionary, Timer, setTimeout } from "flash/utils";
import { IoFormat, ALLIANCES, AS_Login, ArcadeWindow, IoEventsCalendar, AllianceMessageType, BASE, Channel, Chat, ChatBox, IoEmotes, ChatData, ChatEvent, ChatRoom, ChatUser, Contact, GLOBAL, HttpChatSystem, IChatSystem, IoChatMenu, IoDave, KEYS, LOGGER, LOGIN, TweenLite, UserRecord, WSChatSystem, com_monsters_mailbox_Message as Message, IoLeaderboards, IoWhosOnline, IoChangelog, SOUNDS, IoToast, URLLoaderApi } from "@game";

export class BYMChat extends Sprite {
    static {
        as3.fields(this, { GLOBAL_CHANNEL: null, IGNORE_LIST_CHANNEL: null, _auth: null, _joinAttempts: 0, DELAY_INITIAL: 1000, DELAY_INCREASE: 500, DELAY_DECREASE: 500, DELAY_DECREASE_TIME: 1000, delay: 1000, initialized: false, _sectorBaseName: null, MESSAGE_QUEUE_SIZE: 2, messageQueue: null, sector_channel: null, default_chat_channel: "sector", _ignore_list: null, chatBox: null, _chatHost: null, _chatPort: 0, _isConnected: false, _isJoined: false, _hideX: 0, _hideY: 0, _showX: 0, _showY: 0, _open: true, isLoggingOut: false, isLoggingOutTimer: 5, globalChatTimer: null, globalChatLastSent: null, overheat: false, messageQueueTimer: null, messageQueueLastCheck: null, _ioMode: null, _ioLogs: null, _ioUnread: null, _ioMentions: null, _ioLastTs: null, _ioAllianceChannel: null, _ioGlobalJoined: null, _ioMyName: null, _ioSendDue: 0, _ioLastSent: null, _ioIgnoreNames: null, _ioMyRole: null, _ioReplay: false, _ioAwaiting: null, _ioPendingAlliance: null, _ioPendingGlobal: null, _ioChat2Timer: null });
    }

    private static _chat: IChatSystem = null;

    public static _userRecord: UserRecord = null;

    public static readonly WIDTH: int = 380;

    private static _serverInited: boolean = false;

    private static _displayNameMap: Dictionary = new Dictionary();

    private static readonly ALLIANCE_CHANNEL_PREFIX: string = "chat:alliance:";

    // ---------------------------------------------------------------------------------------------
    // Inferno-only: Global / Alliance tabs. The dock also joins the player's alliance channel (the
    // same one the Alliances window shows), keeps a transcript per tab, and counts the messages not
    // seen yet: on the other tab, or on this one while the chat is minimised. The counts show on the
    // tabs as "Global (3)". Enter sends to the tab that is showing.
    // ---------------------------------------------------------------------------------------------
    public static readonly IO_GLOBAL: string = "global";

    public static readonly IO_ALLIANCE: string = "alliance";

    /** Inferno-only (QoL #151): where the tab last used is kept (this browser). */
    public static readonly IO_TAB_KEY: string = "bymr-chat-tab";

    private static _ioTabRestored: boolean = false;

    // (QoL #147: 120, as the chat box shows; the alliance keeps 200 lines and 50 notices now)
    private static readonly IO_LOG_MAX: int = 120;

    /** The server's flood limit (chatRooms.ts), kept here too: a line it would refuse stays in the box. */
    private static readonly IO_RATE_MS: int = 500;

    private static readonly IO_RATE_BURST: int = 3;

    /** Lines the server writes into Global for everyone (chat/chatBroadcasts.ts). */
    private static readonly IO_BROADCASTS: any[] = ["announce", "casino", "milestone", "event"];

    // ---- Inferno-only (3 October, bug report A2): a line sent that never comes back from the server (the
    // chat had just reconnected and was not in the room yet) is not lost silently: after a few seconds
    // it goes back in the box, and the chat says so.
    private static readonly IO_AWAIT_MS: int = 6000;
    public GLOBAL_CHANNEL: Channel;
    public IGNORE_LIST_CHANNEL: Channel;
    private _auth: AS_Login;
    private _joinAttempts: int;
    private DELAY_INITIAL: int;
    private DELAY_INCREASE: int;
    private DELAY_DECREASE: int;
    private DELAY_DECREASE_TIME: int;
    private delay: int;
    public initialized: boolean;
    private _sectorBaseName: string;
    private MESSAGE_QUEUE_SIZE: int;
    private messageQueue: any[];
    public sector_channel: Channel;
    private default_chat_channel: string;
    private _ignore_list: any[];
    public chatBox: ChatBox;
    private _chatHost: string;
    private _chatPort: int;
    private _isConnected: boolean;
    private _isJoined: boolean;
    private _hideX: int;
    private _hideY: int;
    private _showX: int;
    private _showY: int;
    public _open: boolean;
    public isLoggingOut: boolean;
    private isLoggingOutTimer: number;
    private globalChatTimer: Timer;
    private globalChatLastSent: Date;
    private overheat: boolean;
    private messageQueueTimer: Timer;
    private messageQueueLastCheck: Date;
    private _ioMode: string;
    /** Each tab's transcript: line objects (ChatBox.ioMakeLine draws them). */
    private _ioLogs: any;
    private _ioUnread: any;
    private _ioMentions: any;

    /** Inferno-only (QoL #194): mentions of the player not seen yet, both tabs. */
    public ioMentionsWaiting(): int {
        return this._ioMentions ? ((this._ioMentions.global | 0) + (this._ioMentions.alliance | 0)) | 0 : 0;
    }
    /** The newest server line each tab has (epoch ms): a channel's history sent again is only what's newer. */
    private _ioLastTs: any;
    private _ioAllianceChannel: Channel;
    /** The Global room joined last (a join of the same one again keeps the transcript). */
    private _ioGlobalJoined: string;
    /** The player's own name, as the server knows it (lines that mention it are highlighted). */
    private _ioMyName: string;
    private _ioSendDue: number;
    private _ioLastSent: any;
    private _ioIgnoreNames: any;
    /** "admin", "mod" or null: staff get Delete line and Mute in the name menu (chat/chatModeration.ts). */
    private _ioMyRole: string;
    private _ioReplay: boolean;
    private _ioAwaiting: any;
    /** A location shared to the alliance while its channel was still being joined (sent on the join). */
    private _ioPendingAlliance: string;
    /** A Global line refused while not in the room ("not_in_channel"): sent once the room is joined again. */
    private _ioPendingGlobal: string;
    /** Inferno-only (QoL #477): asks every minute whether the player appears offline and how many are online. */
    private _ioChat2Timer: Timer;

    public $ctor(param1?: ChatBox, param2?: string): void {
        this.GLOBAL_CHANNEL = new Channel("World", "system");
        this.IGNORE_LIST_CHANNEL = new Channel("IgnoreList", "system");
        this._ioMode = BYMChat.IO_GLOBAL;
        this._ioLogs = { "global": [], "alliance": [] };
        this._ioUnread = { "global": 0, "alliance": 0 };
        this._ioMentions = { "global": 0, "alliance": 0 };
        this._ioLastTs = { "global": 0, "alliance": 0 };
        this._ioIgnoreNames = {};
        this.messageQueue = new Array();
        super.$ctor();
        this.chatBox = param1;
        this.addChild(as3.as(param1, MovieClip));
        param1.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.keyboardEventHandler));
        let _loc3_: string = param2 == null || param2 == "" ? "localhost" : param2;
        let _loc4_: int = 3002;
        let _loc5_: any[] = null;
        if ((_loc5_ = _loc3_.split(":")).length > 1) {
            _loc3_ = String(_loc5_[0]);
            _loc4_ = _loc5_[1] | 0;
        }
        this._chatHost = _loc3_;
        this._chatPort = _loc4_;
        if (GLOBAL.StatGet("chatmin") == 1) {
            this._open = false;
        } else {
            this._open = true;
        }
    }

    /**
     * The dock's chat transport, shared with any other feature that needs a
     * channel on the same connection. The server allows one socket per player,
     * so a second WSChatSystem would authenticate and close this one.
     */
    public static get chatSystem(): IChatSystem {
        return BYMChat._chat;
    }

    /**
     * Whether a channel belongs to alliance chat rather than the global dock.
     */
    public static isAllianceChannel(param1: string): boolean {
        return param1 != null && param1.indexOf(BYMChat.ALLIANCE_CHANNEL_PREFIX) == 0;
    }

    public static get serverInited(): boolean {
        return BYMChat._serverInited;
    }

    public get IsAnimating(): boolean {
        return this.chatBox._animating;
    }

    public get IsConnected(): boolean {
        return this._isConnected;
    }

    public get IsJoined(): boolean {
        return this._isJoined;
    }

    public initServer(): void {
        try {
            // Server flag io_chathttp: chat rides on ordinary web requests instead of a socket, which is
            // the only way it can work through a web-only tunnel (no chat port, no Flash socket policy).
            if (GLOBAL._flags && GLOBAL._flags.io_chathttp == 1) {
                BYMChat._chat = new HttpChatSystem(GLOBAL.serverUrl);
            } else {
                BYMChat._chat = new WSChatSystem(this._chatHost, this._chatPort);
            }
            BYMChat._chat.connect();
            BYMChat._chat.addEventListener(ChatEvent.CONNECT, as3.bind(this, this.onConnect));
            BYMChat._chat.addEventListener(ChatEvent.LOGIN, as3.bind(this, this.onLogin));
            BYMChat._chat.addEventListener(ChatEvent.JOIN, as3.bind(this, this.onJoin));
            BYMChat._chat.addEventListener(ChatEvent.LEAVE, as3.bind(this, this.onLeave));
            BYMChat._chat.addEventListener(ChatEvent.SAY, as3.bind(this, this.onSay));
            BYMChat._chat.addEventListener(ChatEvent.LIST, as3.bind(this, this.onList));
            BYMChat._chat.addEventListener(ChatEvent.MEMBERS, as3.bind(this, this.onMembers));
            BYMChat._chat.addEventListener(ChatEvent.IGNORE, as3.bind(this, this.onIgnore));
            BYMChat._chat.addEventListener(ChatEvent.IGNOREERROR, as3.bind(this, this.onIgnoreError));
            BYMChat._chat.addEventListener(ChatEvent.UPDATE_NAME, as3.bind(this, this.onUpdateName));
            BYMChat._chat.addEventListener(ChatEvent.USER_ENTER, as3.bind(this, this.onUserEnter));
            BYMChat._chat.addEventListener(ChatEvent.USER_EXIT, as3.bind(this, this.onUserExit));
            BYMChat._chat.addEventListener(ChatEvent.SERVER_ERROR, as3.bind(this, this.ioOnServerError));
            BYMChat._chat.addEventListener(ChatEvent.DELETED, as3.bind(this, this.ioOnDeleted));
            BYMChat._chat.addEventListener(ChatEvent.NOTICE, as3.bind(this, this.ioOnNotice));
            BYMChat._serverInited = true;
        } catch (e) {
            this.displayUnavailable(KEYS.Get("io_t3m_ch_r_init"));
        }
    }

    public init(): void {
        this.chatBox.init();
        this.toggleVisibleB();
        this.initialized = true;
    }

    private keyboardEventHandler(param1: KeyboardEvent): void {
        if (param1.keyCode == Keyboard.ENTER) {
            this.processInput();
        }
    }

    public broadcastDisplayNameUpdate(param1: int): void {
        if (this.sector_channel == null) {
            return;
        }
        if (BYMChat._userRecord == null) {
            return;
        }
        BYMChat._chat.setDisplayNameUserVar("[" + param1 + "] " + BYMChat._userRecord.Id);
        BYMChat._chat.updateDisplayName(this.sector_channel, BYMChat._userRecord.Name, "[" + param1 + "] " + BYMChat._userRecord.Id);
    }

    private clearChat(): void {
        if (GLOBAL.INFERNO_ONLY) {
            this.ioClear(BYMChat.IO_GLOBAL);
            return;
        }
        this.chatBox.clearChat();
    }

    public SendMessage(): void {
        this.processInput();
    }

    private processInput(): void {
        let _loc2_: string = null;
        let _loc3_: string = null;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        let _loc1_: string = this.chatBox.inputText;
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
                } else {
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
                        BYMChat._chat.showIgnore();
                        break;
                    case "/?":
                    case "/h":
                    case "/help":
                        this.system_message("<b>- Commands -</b>\n" + "To list ignored users: /list");
                        break;
                    default:
                        this.default_chat(_loc1_);
                }
            } else {
                this.default_chat(_loc1_);
            }
        }
        this.chatBox.clearInputText();
    }

    public connect(): void {
        if (!this._isConnected) {
            BYMChat._chat.connect();
        }
    }

    public login(param1: string, param2: string, param3: int): void {
        BYMChat._userRecord = new UserRecord(param1, param2);
        this._auth = new AS_Login(BYMChat._userRecord);
        this._auth.authenticate();
        if (this._isConnected) {
            BYMChat._chat.login(this._auth);
        }
    }

    public logout(): void {
        if (BYMChat._chat) {
            BYMChat._chat.logout();
            this.isLoggingOut = true;
            TweenLite.delayedCall(3, as3.bind(this, this.logoutDelayCB));
        }
    }

    public logoutDelayCB(): void {
        this.isLoggingOut = false;
        this.chatBox.UpdateChatStatus();
    }

    public disableChat(): void {
        this._joinAttempts = 0;
        BYMChat._serverInited = false;
        this._isConnected = false;
        this._isJoined = false;
        this.logout();
        if (GLOBAL.INFERNO_ONLY) {
            this._ioAllianceChannel = null;
            this._ioGlobalJoined = null;
            this.ioClear(BYMChat.IO_ALLIANCE);
            // (QoL #477: chat switched off: no more asking)
            if (this._ioChat2Timer != null) {
                this._ioChat2Timer.stop();
                this._ioChat2Timer = null;
            }
        }
        this.clearChat();
        this.chatBox.EnableInput(false);
        this.system_message(KEYS.Get("io_t3m_ch_disconnected"));
    }

    public system_message(param1: string): void {
        this.showChatMessage(null, null, param1);
    }

    public default_chat(param1: string): void {
        if (!this._isConnected) {
            return;
        }
        if (GLOBAL.INFERNO_ONLY && this._ioMode == BYMChat.IO_ALLIANCE) {
            if (this._ioAllianceChannel != null) {
                BYMChat._chat.say(this._ioAllianceChannel, param1);
            } else {
                this.system_message(KEYS.Get("io_t3m_ch_no_alliance"));
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

    public global_chat(param1: string): void {
        let _loc2_: boolean = false;
        let _loc3_: string = null;
        if (!this._isConnected) {
            LOGGER.Log("err", "BYMChat.global_chat(): not connected");
            return;
        }
        if (this.globalChatTimer == null) {
            BYMChat._chat.say(this.GLOBAL_CHANNEL, param1);
            this.delay += this.DELAY_INCREASE;
            this.globalChatLastSent = new Date();
            this.globalChatTimer = new Timer(250);
            this.globalChatTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.globalChatListener));
            this.globalChatTimer.start();
        } else if (this.messageQueue.length < this.MESSAGE_QUEUE_SIZE) {
            _loc2_ = false;
            for (const $value of as3.values(this.messageQueue)) {
                _loc3_ = as3.str($value);
                if (_loc3_ == param1) {
                    _loc2_ = true;
                }
            }
            if (!_loc2_) {
                this.messageQueue.push(param1);
            }
        } else {
            this.system_message("<font color=\"#FF0000\">" + KEYS.Get("io_t3m_ch_overheat") + "</font>");
            this.overheat = true;
        }
        if (this.messageQueueTimer != null) {
            this.messageQueueTimer.stop();
            this.messageQueueTimer = null;
        }
    }

    private globalChatListener(param1: TimerEvent): void {
        let _loc4_: string = null;
        let _loc2_: Date = new Date();
        let _loc3_: number = _loc2_.getTime() - this.globalChatLastSent.getTime();
        if (_loc3_ > this.delay) {
            if (this.messageQueue.length > 0) {
                _loc4_ = as3.as(this.messageQueue.shift(), String);
                BYMChat._chat.say(this.GLOBAL_CHANNEL, _loc4_);
                this.globalChatLastSent = new Date();
                this.delay += this.DELAY_INCREASE;
                if (this.messageQueue.length == 0) {
                    if (this.messageQueueTimer != null) {
                        this.messageQueueTimer.stop();
                        this.messageQueueTimer = null;
                    }
                    this.messageQueueLastCheck = new Date();
                    this.messageQueueTimer = new Timer(250);
                    this.messageQueueTimer.addEventListener(TimerEvent.TIMER, as3.bind(this, this.messageQueueListener));
                    this.messageQueueTimer.start();
                    if (this.globalChatTimer != null) {
                        this.globalChatTimer.stop();
                        this.globalChatTimer = null;
                    }
                }
            } else if (this.globalChatTimer != null) {
                this.globalChatTimer.stop();
                this.globalChatTimer = null;
            }
        }
    }

    private messageQueueListener(param1: TimerEvent): void {
        let _loc2_: Date = new Date();
        let _loc3_: number = _loc2_.getTime() - this.messageQueueLastCheck.getTime();
        if (_loc3_ > this.DELAY_DECREASE_TIME) {
            this.messageQueueLastCheck = new Date();
            this.delay -= this.DELAY_DECREASE;
            if (this.delay <= this.DELAY_INITIAL) {
                if (this.messageQueueTimer != null) {
                    this.messageQueueTimer.stop();
                    this.messageQueueTimer = null;
                    if (this.overheat) {
                        this.system_message("<font color=\"0x00FFFF\">" + KEYS.Get("io_t3m_ch_cooldown") + "</font>");
                        this.overheat = false;
                    }
                }
            }
        }
    }

    public enter_sector(param1: string, param2: boolean = false): void {
        let _loc3_: any[] = null;
        let _loc4_: int = 0;
        if (!param2) {
            if (this._joinAttempts >= 10) {
                LOGGER.Log("err", "BYMChat.enter_sector: failed to connect to 10 chat rooms; giving up");
                this.displayUnavailable(KEYS.Get("io_t3m_ch_r_noroom"));
                return;
            }
            _loc3_ = param1.split(/(\d+)/);
            if (_loc3_.length == 0) {
                LOGGER.Log("err", "BYMChat.enter_sector(): invalid sectorName");
                this.displayUnavailable(KEYS.Get("io_t3m_ch_r_badroom"));
                return;
            }
            this._sectorBaseName = as3.str(_loc3_[0]);
            _loc4_ = _loc3_[1] | 0;
            if (this._joinAttempts > 0) {
                _loc4_++;
            }
            ++this._joinAttempts;
            _loc4_ = (_loc4_ % Chat.NUM_CHAT_ROOMS) | 0;
            param1 = this._sectorBaseName + _loc4_.toString();
        }
        if (this.sector_channel != null && this.sector_channel.Name == param1) {
            return;
        }
        if (this._isConnected) {
            if (this.sector_channel != null) {
                BYMChat._chat.leave(this.sector_channel);
            }
        }
        this.sector_channel = new Channel(param1, "system");
        if (this._isConnected) {
            this.joinSector();
        }
    }

    private clearDisplayNameMap(): void {
        BYMChat._displayNameMap = new Dictionary();
    }

    public sector_chat(param1: string): void {
        if (!this._isConnected) {
            LOGGER.Log("err", "BYMChat.sector_chat(): not connected");
            return;
        }
        if (this.sector_channel != null) {
            BYMChat._chat.say(this.sector_channel, param1);
        } else {
            BYMChat._chat.error(ChatEvent.SAY, "Not in a sector channel.");
        }
    }

    public private_chat(param1: string, param2: string): void {
        if (!this._isConnected) {
            LOGGER.Log("err", "BYMChat.private_chat(): not connected");
            return;
        }
        if (this.userIsIgnored(param1)) {
            return;
        }
        let _loc3_: Channel = new Channel(param1, "private");
        BYMChat._chat.say(_loc3_, param2);
    }

    private onConnect(param1: ChatEvent): void {
        let reason: string = null;
        let chatEvent: ChatEvent = param1;
        try {
            this._isConnected = chatEvent.Success;
            if (!this._isConnected) {
                reason = as3.as(chatEvent.Get("reason"), String);
                this.displayUnavailable(reason != null ? reason : KEYS.Get("io_t3m_ch_r_connection"));
            } else if (this._auth != null && BYMChat._chat != null) {
                BYMChat._chat.login(this._auth);
            } else {
                this.displayUnavailable();
            }
        } catch (e) {
            reason = as3.as(chatEvent.Get("reason"), String);
            this.displayUnavailable(reason != null ? reason : KEYS.Get("io_t3m_ch_r_connect"));
            LOGGER.Log("err", "BYMChat.onConnect: " + e.message + "\n" + e.getStackTrace());
        }
    }

    private onLogin(param1: ChatEvent): void {
        let _loc2_: string = null;
        if (param1.Success) {
            if (GLOBAL.INFERNO_ONLY) {
                let shown: string = as3.as(param1.Get("displayname"), String);
                if (shown) {
                    this._ioMyName = shown.replace(/^\s*\[[^\]]*\]\s*/, "");
                }
                this._ioMyRole = as3.as(param1.Get("role"), String);
                // (QoL #477: the bar's Offline chip and online count)
                this.ioChat2StartPresence();
                if (param1.Get("relogin") == true) {
                    return;
                }
            }
            if (GLOBAL.INFERNO_ONLY) {
                BYMChat._chat.getIgnore();
            }
            this.joinSector();
            if (!GLOBAL.INFERNO_ONLY) {
                BYMChat._chat.getIgnore();
            }
            this.ioJoinAlliance();
            // (QoL #151: back on the tab last used, once a session)
            if (GLOBAL.INFERNO_ONLY && !BYMChat._ioTabRestored) {
                BYMChat._ioTabRestored = true;
                let last: string = null;
                try {
                    last = window.localStorage.getItem(BYMChat.IO_TAB_KEY);
                } catch (e) {
                }
                if (last == BYMChat.IO_ALLIANCE && ALLIANCES._allianceID > 0 && this._ioMode != last) {
                    this.ioSwitch(last);
                }
            }
        } else {
            _loc2_ = as3.as(param1.Get("reason"), String);
            this.displayUnavailable(_loc2_ != null ? _loc2_ : KEYS.Get("io_t3m_ch_r_login"));
            // The reason the chat server gave. A login it no longer accepts (expired, replaced by a login
            // elsewhere, no chat token yet) is an answer, not a bug: only other reasons are reported.
            if (_loc2_ == "invalid_token" || _loc2_ == "user_not_found" || _loc2_ == "no_chat_token") {
                LOGGER.Log("log", "Chat login refused: " + _loc2_);
            } else {
                LOGGER.Log("err", "Chat login failed: \'" + _loc2_ + "\'");
            }
        }
    }

    public joinGlobal(): void {
        this.clearChat();
        BYMChat._chat.join(this.GLOBAL_CHANNEL);
    }

    public joinSector(): void {
        if (this.sector_channel != null) {
            this.clearDisplayNameMap();
            BYMChat._chat.join(this.sector_channel);
            this.default_chat_channel = "sector";
        }
    }

    private onJoin(param1: ChatEvent): void {
        let _loc2_: Channel = null;
        if (param1.Success) {
            _loc2_ = as3.as(param1.Get("channel"), Channel);
            if (GLOBAL.INFERNO_ONLY) {
                // The channel's recent history follows this event straight away: not new messages.
                this.ioReplayStart();
            }
            if (BYMChat.isAllianceChannel(_loc2_.Name)) {
                if (GLOBAL.INFERNO_ONLY && (this._ioAllianceChannel == null || this._ioAllianceChannel.Name != _loc2_.Name)) {
                    if (this._ioAllianceChannel != null || this._ioLogs[BYMChat.IO_ALLIANCE].length > 0) {
                        // another alliance than the one this tab showed: its own conversation
                        this.ioClear(BYMChat.IO_ALLIANCE);
                        this._ioLastTs[BYMChat.IO_ALLIANCE] = 0;
                    }
                    this._ioAllianceChannel = _loc2_;
                    if (this._ioMode == BYMChat.IO_ALLIANCE) {
                        this.chatBox.ioSetLines(as3.cast(this._ioLogs[BYMChat.IO_ALLIANCE], Array));
                    }
                    this.ioUpdateTabs();
                }
                if (GLOBAL.INFERNO_ONLY && this._ioPendingAlliance != null) {
                    // A location shared to the alliance before its channel had been joined.
                    BYMChat._chat.say(this._ioAllianceChannel, this._ioPendingAlliance);
                    this.ioAwait(this._ioPendingAlliance, BYMChat.IO_ALLIANCE);
                    this._ioPendingAlliance = null;
                }
                return;
            }
            if (GLOBAL.INFERNO_ONLY) {
                // Joined again (the link to the server came back, or the Alliances window joined): the
                // history that follows is only what was missed. Only a first join starts afresh.
                if (this._ioGlobalJoined != _loc2_.Name) {
                    let first: boolean = this._ioGlobalJoined == null;
                    this.ioClear(BYMChat.IO_GLOBAL);
                    this._ioLastTs[BYMChat.IO_GLOBAL] = 0;
                    this._ioGlobalJoined = _loc2_.Name;
                    if (first) {
                        this.ioShow(BYMChat.IO_GLOBAL, this.ioSystemLine(KEYS.Get("io_t3m_ch_welcome")), false);
                    }
                }
            } else {
                this.clearChat();
                this.system_message("Joined channel " + _loc2_.Name + ".");
                this.system_message("Type /h for help.");
            }
            BYMChat._chat.setDisplayNameUserVar("[" + BASE.BaseLevel().level + "] " + BYMChat._userRecord.Id);
            BYMChat._chat.updateDisplayName(_loc2_, BYMChat._userRecord.Name, "[" + BASE.BaseLevel().level + "] " + BYMChat._userRecord.Id);
            this.chatBox.EnableInput(true);
            this._isJoined = true;
            if (GLOBAL.INFERNO_ONLY && this._ioPendingGlobal != null) {
                // A line refused while the link to the room was down: sent now that it is back.
                BYMChat._chat.say(_loc2_, this._ioPendingGlobal);
                this.ioAwait(this._ioPendingGlobal, BYMChat.IO_GLOBAL);
                this._ioPendingGlobal = null;
            }
        } else {
            this.clearChat();
            this.system_message(KEYS.Get("io_t3m_ch_join_retry", { "v1": this._joinAttempts }));
            this.enter_sector(this._sectorBaseName);
        }
    }

    private onLeave(param1: ChatEvent): void {
        if (GLOBAL.INFERNO_ONLY && param1.Success && param1.Get("server") == true) {
            // Moved out of an alliance channel by the server (left, kicked, or the alliance is gone).
            let gone: Channel = as3.as(param1.Get("channel"), Channel);
            if (gone != null && BYMChat.isAllianceChannel(gone.Name) && this._ioAllianceChannel != null && this._ioAllianceChannel.Name == gone.Name) {
                this._ioAllianceChannel = null;
                this.ioClear(BYMChat.IO_ALLIANCE);
                this._ioLastTs[BYMChat.IO_ALLIANCE] = 0;
                this.ioShow(BYMChat.IO_ALLIANCE, this.ioSystemLine(KEYS.Get("io_t3m_ch_left_alliance")), false);
                if (this._ioMode == BYMChat.IO_ALLIANCE) {
                    this.chatBox.ioSetLines(as3.cast(this._ioLogs[BYMChat.IO_ALLIANCE].concat([this.ioSystemLine(KEYS.Get("io_t3m_ch_join_alliance"))]), Array));
                }
            }
            return;
        }
        if (!param1.Success) {
            LOGGER.Log("err", "BYMChat.onLeave() " + param1.Success + ": \'" + param1.Get("error") + "\'");
        }
    }

    private onSay(param1: ChatEvent): void {
        let _loc2_: Channel = null;
        let _loc3_: string = null;
        let _loc4_: string = null;
        if (param1.Success) {
            _loc2_ = as3.as(param1.Get("channel"), Channel);
            if (BYMChat.isAllianceChannel(_loc2_.Name)) {
                if (GLOBAL.INFERNO_ONLY) {
                    this.ioAllianceSay(_loc2_, param1);
                }
                return;
            }
            if (GLOBAL.INFERNO_ONLY) {
                this.ioGlobalSay(_loc2_, param1);
                return;
            }
            _loc3_ = as3.as(param1.Get("user"), String);
            _loc4_ = as3.as(param1.Get("message"), String);
            if (this.userIsIgnored(_loc3_)) {
                return;
            }
            this.showChatMessage(_loc2_, _loc3_, _loc4_);
        } else {
            LOGGER.Log("err", "BYMChat.onSay() " + param1.Success + ": \'" + param1.Get("error") + "\'");
        }
    }

    private onList(param1: ChatEvent): void {
        if (!param1.Success) {
            LOGGER.Log("err", "BYMChat.onList() " + param1.Success + ": \'" + param1.Get("error") + "\'");
        }
    }

    private onMembers(param1: ChatEvent): void {
        if (!param1.Success) {
            LOGGER.Log("err", "BYMChat.onMembers() " + param1.Success + ": \'" + param1.Get("error") + "\'");
        }
    }

    private onIgnore(param1: ChatEvent): void {
        let _loc2_: string = null;
        let _loc3_: string = null;
        let _loc4_: string = null;
        let _loc5_: any[] = null;
        let _loc6_: ChatData = null;
        let _loc7_: string = null;
        let _loc8_: string = null;
        if (GLOBAL.INFERNO_ONLY && param1.Success) {
            this.ioOnIgnore(param1);
            return;
        }
        if (param1.Success) {
            _loc2_ = as3.as(param1.Get("action"), String);
            _loc3_ = as3.as(param1.Get("target"), String);
            _loc4_ = as3.as(param1.Get("displayname"), String);
            if (_loc2_ != "show") {
                this._ignore_list = as3.as(param1.Get("ignore_list"), Array);
            }
            if (_loc4_ == null) {
                _loc4_ = this.fetchDisplayName(_loc3_);
            }
            if (_loc2_ == "add") {
                this.system_message("\'" + _loc4_ + "\' (id: " + _loc3_ + ") is now being ignored.");
            } else if (_loc2_ == "remove") {
                this.system_message("\'" + _loc4_ + "\' (id: " + _loc3_ + ") is no longer ignored.");
            } else if (_loc2_ == "show") {
                if ((_loc5_ = as3.as(param1.Get("ignore_list"), Array)).length == 0) {
                    this.system_message("You are not ignoring any users.");
                } else {
                    this.system_message("<b><font color=\"#0000FF\">List of ignored users:</font></b>");
                    for (_loc6_ of as3.values(_loc5_)) {
                        _loc7_ = String(_loc6_.getUtfString("target"));
                        if ((_loc8_ = _loc6_.getUtfString("displayname")) == null || _loc8_.length == 0) {
                            _loc8_ = this.fetchDisplayName(_loc7_);
                        }
                        if (_loc8_ != null) {
                            this.showIgnoreListMessage(_loc7_, _loc8_);
                        } else {
                            this.showIgnoreListMessage(_loc7_, "");
                        }
                    }
                }
            }
        } else {
            LOGGER.Log("err", "BYMChat.onIgnore() " + param1.Success + ": \'" + param1.Get("error") + "\'");
        }
    }

    private onIgnoreError(param1: ChatEvent): void {
        let _loc2_: string = as3.as(param1.Get("reason"), String);
        if (_loc2_ == "ignorelistfull") {
            this.system_message(KEYS.Get("io_t3m_ch_ignore_full_old"));
        }
    }

    private onUpdateName(param1: ChatEvent): void {
        let _loc2_: string = as3.as(param1.Get("userid"), String);
        let _loc3_: string = as3.as(param1.Get("displayname"), String);
        BYMChat._displayNameMap.set(_loc2_, _loc3_);
    }

    private onUserEnter(param1: ChatEvent): void {
        let _loc2_: ChatUser = as3.as(param1.Get("user"), ChatUser);
        let _loc3_: ChatRoom = as3.as(param1.Get("room"), ChatRoom);
        if (_loc3_ != null && BYMChat.isAllianceChannel(_loc3_.name)) {
            return;
        }
        if (this.sector_channel == null) {
            LOGGER.Log("err", "BYMChat.onUserEnter(): No sector has been joined yet");
            return;
        }
        if (BYMChat._userRecord == null) {
            LOGGER.Log("err", "BYMChat.onUserEnter(): No user record available");
            return;
        }
        if (_loc2_.name == BYMChat._userRecord.Name) {
            return;
        }
        BYMChat._chat.updateDisplayNameDirect(this.sector_channel, _loc2_.name, BYMChat._userRecord.Name, "[" + BASE.BaseLevel().level + "] " + BYMChat._userRecord.Id);
    }

    private onUserExit(param1: ChatEvent): void {
        let _loc2_: ChatUser = as3.as(param1.Get("user"), ChatUser);
        let _loc3_: ChatRoom = as3.as(param1.Get("room"), ChatRoom);
        if (_loc3_ != null && BYMChat.isAllianceChannel(_loc3_.name)) {
            return;
        }
        BYMChat._displayNameMap.delete(_loc2_.name);
    }

    public toggleVisible(...rest: any[]): void {
        this._open = !this._open;
        this.toggleVisibleB();
        GLOBAL.StatSet("chatvis", this._open ? 1 : 0);
    }

    public toggleVisibleB(...rest: any[]): void {
        this.position();
        this.chatBox.update();
    }

    public show(): void {
        this.visible = true;
    }

    public hide(): void {
        this.visible = true;
    }

    public showUnavailableInYourArea(): void {
        this.chatBox.disableChatBoxForAB();
        this.system_message(KEYS.Get("io_t3m_ch_unavail_area"));
    }

    public showInvalidName(): void {
        this.chatBox.disableChatBoxForAB();
        this.system_message(KEYS.Get("io_t3m_ch_unavail_ec13"));
    }

    public fetchDisplayName(param1: string): string {
        // (a player not seen yet has no name here: null, not "undefined")
        let _loc2_: any = BYMChat._displayNameMap.get(param1);
        return _loc2_ == null ? null : String(_loc2_);
    }

    public toggleMinimizedStat(param1: boolean = true): void {
        if (param1 == true) {
            if (GLOBAL.StatGet("chatmin") != 1) {
                GLOBAL.StatSet("chatmin", 1);
            }
        } else if (GLOBAL.StatGet("chatmin") != 0) {
            GLOBAL.StatSet("chatmin", 0);
        }
    }

    private showIgnoreListMessage(param1: string, param2: string): void {
        let _loc3_: any = "<i>\'" + param2 + "\' (id: " + param1 + ")</i>";
        this.chatBox.push(as3.str(_loc3_), param2, param1, "IgnoreList");
    }

    private showChatMessage(param1: Channel, param2: string, param3: string): void {
        let _loc4_: any = null;
        let _loc5_: string = null;
        let _loc6_: any = null;
        let _loc7_: string = null;
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
            // (Inferno-only, 7 October: no word filter in chat, the user's call; ProfanityFilter is no longer used)
            _loc4_ = "<i>" + param3 + "</i>";
            _loc5_ = "System";
        } else {
            // A player's words are shown as text: markup in them would be drawn (giant fonts, links).
            param3 = BYMChat.ioEsc(param3);
            if ((_loc7_ = this.fetchDisplayName(param2)) == null) {
                return;
            }
            _loc7_ = BYMChat.ioEsc(_loc7_);
            if (param2 == "Administrator") {
                _loc4_ = "<b><font color=\"#FF0000\">Admin: </font></b>";
                _loc6_ = "<b><font color=\"#FF0000\">Admin: </font></b>";
                _loc5_ = "Administrator";
            } else if (param2 == "Moderator") {
                _loc4_ = "<b><font color=\"#FF0000\">Mod: </font></b>";
                _loc6_ = "<b><font color=\"#FF0000\">Mod: </font></b>";
                _loc5_ = "Moderator";
            } else if (param1.Type == "private") {
                _loc4_ = "<b><font color=\"#076bbf\">";
                _loc6_ = "<b><font color=\"#076bbf\">";
                if (BYMChat._userRecord.Name == param2) {
                    _loc4_ += "to " + _loc7_ + ": ";
                    _loc6_ += "to " + _loc7_ + ": ";
                } else {
                    _loc4_ += _loc7_ + ": ";
                    _loc6_ += _loc7_ + ": ";
                }
                _loc4_ += "</font></b>";
                _loc6_ += "</font></b>";
                _loc5_ = "Private";
            } else {
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
        this.chatBox.push(as3.str(_loc4_), as3.str(_loc6_), param2, _loc5_);
    }

    public get ioMyRole(): string {
        return this._ioMyRole;
    }

    public get ioMode(): string {
        return this._ioMode;
    }

    /** A player's words as text: the chat lines are drawn from HTML, so <, > and & must not be markup. */
    public static ioEsc(param1: string): string {
        if (param1 == null) {
            return "";
        }
        return param1.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    /** The server's time now, in milliseconds (the lines carry its time). */
    public static ioNow(): number {
        let t: int = GLOBAL.Timestamp();
        return t > 0 ? t * 1000 : new Date().getTime();
    }

    /** "Name", "@Name" as a word, any capitals: group 2 is the name. */
    private static ioMentionRe(param1: string): RegExp {
        let safe: string = param1.replace(/[.*+?^${}()|\[\]\\\/]/g, "\\$&");
        return new RegExp("(^|[^A-Za-z0-9_])(@?" + safe + ")(?![A-Za-z0-9_])", "gi");
    }

    /** A line the game writes itself (notices, help): shown on the tab it is put on, not counted. */
    private ioSystemLine(param1: string): any {
        return { "html": "<i>" + param1 + "</i>", "kind": "system", "ts": BYMChat.ioNow() };
    }

    private static ioTs(param1: any): number {
        let ts: number = Number(param1);
        if (isNaN(ts) || ts <= 0) {
            return 0;
        }
        return ts < 100000000000 ? ts * 1000 : ts;
    }

    /**
     * Inferno-only (13 October): the colour of an alliance tag in chat, by how the player stands with that alliance:
     * their own, friendly, hostile, or any other (the world map's colours, darker for the light chat lines).
     */
    public static ioTagColor(param1: int): string {
        if (!param1) {
            return "#555555";
        }
        if (ALLIANCES._allianceID && param1 == ALLIANCES._allianceID) {
            return "#2A6FC9";
        }
        // (the stance this alliance set towards that one: the map's colours are from it too)
        let mine: any = ALLIANCES._myAlliance as any;
        let rel: any = mine && mine.relationships ? mine.relationships[param1] : 0;
        let stance: int = Number(rel) | 0;
        if (stance < 0) {
            return IoFormat.relHtml(-1, "#CC2E14", false);
        }
        if (stance > 0) {
            return IoFormat.relHtml(1, "#178A0C", false);
        }
        return "#9A7400";
    }

    /** Inferno-only (13 October): "[TAG] " in its colour (brackets black), or "" for a player with no alliance. */
    public static ioTagHtml(param1: string, param2: int): string {
        if (!param1) {
            return "";
        }
        return "<font color=\"#000000\"><b>[</b></font><font color=\"" + BYMChat.ioTagColor(param2) + "\"><b>" + BYMChat.ioEsc(param1) + "</b></font><font color=\"#000000\"><b>]</b></font> ";
    }

    /**
     * A player's line: "[TAG] Name: words" (13 October: the alliance's tag, coloured by how the player stands with it,
     * in place of the yard level; a green or grey dot before it: online or not), mentions of the player picked out.
     * `param9`: { tag, aid, online } from the server.
     */
    private ioPlayerLine(param1: string, param2: string, param3: string, param4: number, param5: string = null, param6: string = null, param7: string = null, param8: string = null, param9: any = null): any {
        let name: string = param2 ? param2 : this.fetchDisplayName(param1);
        if (!name) {
            name = KEYS.Get("io_t3m_ch_player_n", { "v1": param1 });
        }
        // (a line from before 13 October still carries "[12] " before the name: dropped)
        let plain: string = name.replace(/^\s*\[[^\]]*\]\s*/, "");
        let tagHtml: string = param9 ? BYMChat.ioTagHtml(param9.tag, param9.aid | 0) : "";
        // Staff wear a badge: [Admin] or [Mod] (the server says who they are; names can't pretend to it)
        let badge: string = param6 == "admin" ? "<font color=\"#C0281C\"><b>[Admin]</b></font> " : (param6 == "mod" ? "<font color=\"#1F5FA8\"><b>[Mod]</b></font> " : "");
        // (10 October: the name in the colour the player chose in the D.A.V.E. Club; the server sends only its own)
        // (12 October: only the name itself is in the colour; the level before it and the colon stay black)
        let nameColor: string = param8 && /^#[0-9A-Fa-f]{6}$/.test(param8) ? param8 : "#000000";
        let before: string = tagHtml;
        let label: string = badge + "<font color=\"#000000\"><b>" + before + "<font color=\"" + nameColor + "\">" + BYMChat.ioEsc(plain) + "</font>:</b> </font>";
        // (12 October: a name effect, opened by inviting friends: shaded letter by letter; ChatBox moves the moving ones)
        let fx: string = IoDave.fxOf(param8) ? param8 : null;
        let fxHtml: string = null;
        if (fx) {
            fxHtml = IoDave.fxHtml(fx, plain, 0);
            label = badge + "<font color=\"#000000\"><b>" + before + fxHtml + ":</b> </font>";
        }
        let own: boolean = LOGIN._playerID > 0 && param1 == String(LOGIN._playerID);
        let text: string = BYMChat.ioEsc(param3);
        let mention: boolean = false;
        if (!own && this._ioMyName) {
            if (BYMChat.ioMentionRe(this._ioMyName).test(param3)) {
                mention = true;
                text = text.replace(BYMChat.ioMentionRe(BYMChat.ioEsc(this._ioMyName)), "$1<b><font color=\"#B34700\">$2</font></b>");
            }
        }
        // (Inferno-only, QoL #149: @all from the alliance's leader or an officer calls everyone; @officers, the staff.
        // The server marks it (ping) only when the speaker is staff.)
        let ping: string = param9 ? as3.str(param9.ping) : null;
        if (!own && GLOBAL.INFERNO_ONLY && (ping == "all" || (ping == "officers" && ALLIANCES.ioIsStaff()))) {
            mention = true;
            text = text.replace(/(^|\s)(@(?:all|officers))\b/i, "$1<b><font color=\"#B34700\">$2</font></b>");
        }
        let dot: string = param9 && param9.online != null ? (param9.online ? "on" : "off") : null;
        return { "html": label + text, "label": label, "user": param1, "name": plain, "kind": own ? "own" : (mention ? "mention" : "player"), "ts": param4, "mention": mention, "id": param5, "role": param6, "channel": param7, "fx": fx && IoDave.fxMoves(fx) ? fx : null, "fxText": plain, "fxHtml": fxHtml, "dot": dot, "tag": param9 ? param9.tag : null, "aid": param9 ? (param9.aid | 0) : 0, "body": param3 };
    }

    /** Inferno-only (13 October): the speaker's alliance tag and online state, as the server sent them. */
    private static ioWho(param1: ChatEvent): any {
        let online: string = as3.as(param1.Get("online"), String);
        return { "tag": as3.as(param1.Get("alliancetag"), String), "aid": Number(param1.Get("allianceid")) | 0, "online": online == null ? null : online == "1", "ping": as3.as(param1.Get("ping"), String) };
    }

    /**
     * (24 October) The Wart Bloom's lines (and the Pit's, the arcade's and the milestones' below) come from the server in English (services/events/wartBloomTimes.ts
     * bloomStartText, bloomEndText): in another language, said in it (io_ev_bloom_start, io_ev_bloom_end), the time
     * in its own short units. Any other line is left as it came.
     */
    public static ioEventInLanguage(text: string): string {
        let lang: string = String(KEYS.ioLanguage || "english");
        if (!text || lang == "english") {
            return text;
        }
        let secs = (span: string): number => {
            let n: number = 0;
            let re: RegExp = /(\d+)\s*(day|hour|minute)s?/g;
            let m: any = null;
            while ((m = re.exec(span)) != null) {
                n += Number(m[1]) * (m[2] == "day" ? 86400 : m[2] == "hour" ? 3600 : 60);
            }
            return n;
        };
        let start: any = /^Wart Bloom! For the next (.+?), warts grow ([\d.]+) times as fast in your main yard\.$/.exec(text);
        if (start && secs(start[1]) > 0) {
            return KEYS.Get("io_ev_bloom_start", { "v1": GLOBAL.ioDuration(secs(start[1])), "v2": start[2] });
        }
        let end: any = /^The Wart Bloom is over: warts grow at their usual pace again\. The next one starts in (.+)\.$/.exec(text);
        if (end && secs(end[1]) > 0) {
            return KEYS.Get("io_ev_bloom_end", { "v1": GLOBAL.ioDuration(secs(end[1])) });
        }
        // (the Pit's big wins, the arcade's calls for rivals and players' milestones: chatBroadcasts.ts noteCasinoWin,
        // arcade/hub.ts, noteMilestone. Names of players, games and tribes stay as they came.)
        let tiers: any = { "BIG WIN": "io_bc_tier_big", "MEGA WIN": "io_bc_tier_mega", "EPIC WIN": "io_bc_tier_epic" };
        let m2: any = null;
        if ((m2 = /^(.+) hit the JACKPOT on (.+): ([\d,]+) Shiny!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_jackpot", { "v1": m2[1], "v2": m2[2], "v3": m2[3] });
        }
        if ((m2 = /^(BIG WIN|MEGA WIN|EPIC WIN)! (.+) won ([\d,]+) Shiny on (.+?)( \(x[\d.,]+\))?!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_tierwin", { "v1": KEYS.Get(tiers[m2[1]]), "v2": m2[2], "v3": m2[3], "v4": m2[4], "v5": m2[5] || "" });
        }
        if ((m2 = /^(.+) won ([\d,]+) Shiny on (.+?)( \(x[\d.,]+\))?!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_win", { "v1": m2[1], "v2": m2[2], "v3": m2[3], "v4": m2[4] || "" });
        }
        if ((m2 = /^(.+) conquered Moloch's Gauntlet this month!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_gauntlet", { "v1": m2[1] });
        }
        if ((m2 = /^(.+) knocked on (?:the )?(.+?)(?:'s|') door\.\.\. TRICK! ([\d,]+) Zagnoids are coming for their yard!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_tot_trick", { "v1": m2[1], "v2": m2[2], "v3": m2[3] });
        }
        if ((m2 = /^(.+) destroyed all ([\d,]+) Zagnoids sent by (.+), and got a treat after all!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_tot_won", { "v1": m2[1], "v2": m2[2], "v3": m2[3] });
        }
        if ((m2 = /^(.+) is looking for a Hellgate Defense Co-op partner at the Devil's Arcade!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_arc_coop", { "v1": m2[1] });
        }
        if ((m2 = /^(.+) is looking for an? (.+) rival at the Devil's Arcade!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_arc_rival", { "v1": m2[1], "v2": m2[2] });
        }
        if ((m2 = /^(.+) is waiting for players in (.+) at the Devil's Arcade!$/.exec(text)) != null) {
            return KEYS.Get("io_bc_arc_wait", { "v1": m2[1], "v2": m2[2] });
        }
        return text;
    }

    /** An announcement, a big win, a milestone: a banner line of its own colour. */
    private ioBroadcastLine(param1: string, param2: string, param3: number): any {
        // (words, not symbols: the game's fonts have no stars or diamonds; the colour tells them apart)
        // ("event": a server event starting or ending, the Wart Bloom)
        let head: string = KEYS.Get(param1 == "casino" ? "io_t3m_ch_h_pit" : (param1 == "milestone" ? "io_t3m_ch_h_milestone" : (param1 == "event" ? "io_t3m_ch_h_event" : "io_t3m_ch_h_announce")));
        // (QoL #372: a player looking for an arcade rival: a JOIN pill, read from the server's English before the line
        // is said in the player's language)
        let join: any = GLOBAL.INFERNO_ONLY && param1 == "event" ? ArcadeWindow.ioJoinOf(param2) : null;
        if (GLOBAL.INFERNO_ONLY) {
            param2 = BYMChat.ioEventInLanguage(param2);
        }
        let html: string = "<b>" + head + "</b> " + BYMChat.ioEsc(param2);
        if (GLOBAL.INFERNO_ONLY && param1 == "event") {
            // (QoL #372: a player looking for an arcade rival: a JOIN pill, not on one's own line)
            if (join && String(join.name) != String(this._ioMyName || "")) {
                html += " [arcade:" + join.game + ":" + join.mode + "]";
            }
        }
        return { "html": html, "kind": param1, "ts": param3 };
    }

    /** Joins the alliance channel ("alliance" resolves to the player's own) when in an alliance. */
    public ioJoinAlliance(): void {
        if (!GLOBAL.INFERNO_ONLY || BYMChat._chat == null || this._ioAllianceChannel != null) {
            return;
        }
        if (ALLIANCES._allianceID > 0) {
            BYMChat._chat.join(new Channel("alliance", "system"));
        }
    }

    private ioGlobalSay(param1: Channel, param2: ChatEvent): void {
        let user: string = as3.as(param2.Get("user"), String);
        let message: string = as3.as(param2.Get("message"), String);
        if (message == null || message == "") {
            return;
        }
        let ts: number = BYMChat.ioTs(param2.Get("ts"));
        if (this._ioReplay && ts > 0 && ts <= this._ioLastTs[BYMChat.IO_GLOBAL]) {
            return;
        }
        let type: string = as3.as(param2.Get("messagetype"), String);
        if (BYMChat.IO_BROADCASTS.indexOf(type) != -1 || (Number(user) | 0) <= 0) {
            let line: any = this.ioBroadcastLine(BYMChat.IO_BROADCASTS.indexOf(type) != -1 ? type : "announce", message, ts);
            // (26 October: with its id, so the server can take it back: an arcade call whose player stopped waiting)
            line.id = as3.as(param2.Get("id"), String);
            this.ioShow(BYMChat.IO_GLOBAL, line, true);
            if (!this._ioReplay && this._ioAllianceChannel != null) {
                // (shown on the Alliance tab too, so it is seen whichever is up)
                this.ioShow(BYMChat.IO_ALLIANCE, { "html": line.html, "kind": line.kind, "ts": line.ts, "mirror": true, "id": line.id }, false);
            }
            return;
        }
        if (!this._ioReplay) {
            this.ioArrived(BYMChat.IO_GLOBAL, user);
        }
        if (this.userIsIgnored(user)) {
            return;
        }
        this.ioShow(BYMChat.IO_GLOBAL, this.ioPlayerLine(user, as3.as(param2.Get("displayname"), String), message, ts, as3.as(param2.Get("id"), String), as3.as(param2.Get("role"), String), param1.Name, as3.as(param2.Get("color"), String), BYMChat.ioWho(param2)), true);
    }

    /**
     * Inferno-only (22 October): a power-up's planned start in a shout is written by the server as {at:N} (seconds),
     * {in:N} for "starts soon": shown here in the player's own clock ("Sat 8:00 PM"; "at 8:00 PM, in 14 min").
     */
    public static ioShoutTimes(message: string): string {
        if (!message || message.indexOf("{") < 0) {
            return message;
        }
        // (the shouts' sentences are the server's, in English: the times only are the player's)
        return message.replace(/\{at:(\d+)\}/g, (m: string, n: string): string => "on " + GLOBAL.ioClock(Number(n))).replace(/\{in:(\d+)\}/g, (m: string, n: string): string => "at " + GLOBAL.ioClock(Number(n), false) + " (in " + GLOBAL.ioDuration(Math.max(60, Number(n) - GLOBAL.Timestamp())) + ")");
    }

    private ioAllianceSay(param1: Channel, param2: ChatEvent): void {
        let user: string = as3.as(param2.Get("user"), String);
        let message: string = as3.as(param2.Get("message"), String);
        if (message == null || message == "") {
            return;
        }
        if (this._ioAllianceChannel == null) {
            this._ioAllianceChannel = param1;
        }
        if (param1.Name != this._ioAllianceChannel.Name) {
            return;
        }
        let ts: number = BYMChat.ioTs(param2.Get("ts"));
        if (this._ioReplay && ts > 0 && ts <= this._ioLastTs[BYMChat.IO_ALLIANCE]) {
            return;
        }
        let messageType: string = as3.as(param2.Get("messagetype"), String);
        if (messageType != null && messageType != AllianceMessageType.MESSAGE) {
            // A shout (joined, left, promoted...): a sentence the server wrote, in its type's colour.
            this.ioShow(BYMChat.IO_ALLIANCE, { "html": BYMChat.ioEsc(BYMChat.ioShoutTimes(message)), "kind": "shout_" + messageType, "ts": ts, "id": as3.as(param2.Get("id"), String), "channel": param1.Name }, true);
            if (messageType == "pinned" && !this._ioReplay) {
                ALLIANCES.ioPinsChanged();
            }
            return;
        }
        if (!this._ioReplay) {
            this.ioArrived(BYMChat.IO_ALLIANCE, user);
        }
        if (user != null && this.userIsIgnored(user)) {
            return;
        }
        this.ioShow(BYMChat.IO_ALLIANCE, this.ioPlayerLine(user, as3.as(param2.Get("displayname"), String), message, ts, as3.as(param2.Get("id"), String), as3.as(param2.Get("role"), String), param1.Name, as3.as(param2.Get("color"), String), BYMChat.ioWho(param2)), true);
    }

    /** Adds a line to a tab's transcript: drawn if that tab is up, counted if not seen. */
    private ioShow(param1: string, param2: any, param3: boolean): void {
        let log: any[] = as3.cast(this._ioLogs[param1], Array);
        log.push(param2);
        if (log.length > BYMChat.IO_LOG_MAX) {
            log.shift();
        }
        if (param2.ts > 0 && !param2.mirror && param2.kind != "system" && param2.ts > this._ioLastTs[param1]) {
            this._ioLastTs[param1] = param2.ts;
        }
        if (param1 == this._ioMode) {
            this.chatBox.ioAppend(param2);
        }
        if (param3 && param2.kind != "own" && !this._ioReplay && (param1 != this._ioMode || !this._open)) {
            this._ioUnread[param1] = (this._ioUnread[param1] | 0) + 1;
            if (param2.mention) {
                this._ioMentions[param1] = (this._ioMentions[param1] | 0) + 1;
                // (QoL #635: a sound for it, when the page's settings ask)
                SOUNDS.ioNotify("mention");
            }
            this.ioUpdateTabs();
        }
    }

    /** Lines until the end of this frame's work are a channel's history, sent when it is joined. */
    private ioReplayStart(): void {
        this._ioReplay = true;
        setTimeout((): void => {
            this._ioReplay = false;
        }, 0);
    }

    private ioClear(param1: string): void {
        this._ioLogs[param1] = [];
        this._ioUnread[param1] = 0;
        this._ioMentions[param1] = 0;
        if (param1 == this._ioMode) {
            this.chatBox.ioSetLines([]);
        }
        this.ioUpdateTabs();
    }

    /** An ignored player's lines go from both transcripts at once. */
    private ioPurge(param1: string): void {
        for (const $value of as3.values([BYMChat.IO_GLOBAL, BYMChat.IO_ALLIANCE])) {
            let tab: string = as3.str($value);
            this._ioLogs[tab] = (as3.as(this._ioLogs[tab], Array)).filter((line: any, i: int, a: any[]): boolean => {
                return line.user != param1 || line.kind == "ignorelist";
            });
        }
        this.chatBox.ioSetLines(as3.cast(this._ioLogs[this._ioMode], Array));
    }

    /** A tab was clicked. */
    public ioSwitch(param1: string): void {
        if (param1 == this._ioMode) {
            this.ioSeen();
            return;
        }
        if (param1 == BYMChat.IO_ALLIANCE && this._ioAllianceChannel == null) {
            this.ioJoinAlliance();
        }
        this._ioMode = param1;
        try {
            window.localStorage.setItem(BYMChat.IO_TAB_KEY, param1);
        } catch (e) {
        }
        let lines: any[] = as3.cast(this._ioLogs[param1], Array);
        if (param1 == BYMChat.IO_ALLIANCE && this._ioAllianceChannel == null && ALLIANCES._allianceID <= 0) {
            lines = lines.concat([this.ioSystemLine(KEYS.Get("io_t3m_ch_join_alliance"))]);
        }
        this.chatBox.ioSetLines(lines);
        this.ioSeen();
    }

    /** The showing tab has been seen (switched to, or the chat opened). */
    public ioSeen(): void {
        if (this._open) {
            this._ioUnread[this._ioMode] = 0;
            this._ioMentions[this._ioMode] = 0;
        }
        this.ioUpdateTabs();
    }

    private ioUpdateTabs(): void {
        if (this.chatBox) {
            this.chatBox.ioSetTabs(this._ioMode, this._ioUnread[BYMChat.IO_GLOBAL] | 0, this._ioUnread[BYMChat.IO_ALLIANCE] | 0, this._ioMentions[BYMChat.IO_GLOBAL] | 0, this._ioMentions[BYMChat.IO_ALLIANCE] | 0);
        }
    }

    // ---- typing
    private ioProcessInput(param1: string): void {
        let text: string = String(param1 || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        if (text.length == 0) {
            this.chatBox.clearInputText();
            return;
        }
        if (text.charAt(0) == "/") {
            this.chatBox.clearInputText();
            this.ioCommand(text);
            return;
        }
        // (QoL #157: ":grin:" becomes the emote; left as typed if the line would no longer fit)
        let coded: string = IoEmotes.ioChat2Shortcodes(text);
        if (coded.length <= 200) {
            text = coded;
        }
        if (this.ioSend(text)) {
            this.chatBox.clearInputText();
        }
    }

    /**
     * Inferno-only (14 October): an emote from the picker, sent at once to the tab that is up, after whatever is typed
     * in the box (cut so the line fits its 200 characters).
     */
    /** Inferno-only (QoL #541): the server keeps 5 emotes a line. */
    public static readonly IO_EMOTES_A_LINE: int = 5;

    /** QoL #541: an emote put in the box at the cursor (sent with the line). How many the line has now; 0 when full. */
    public ioAddEmote(id: string): int {
        let input: TextField = this.chatBox && this.chatBox.input ? this.chatBox.input : null;
        if (!input) {
            return 0;
        }
        let text: string = String(input.text);
        let have: int = (text.match(/\[e:[a-z0-9_]+\]/g) || []).length | 0;
        let token: string = IoEmotes.token(id);
        if (have >= BYMChat.IO_EMOTES_A_LINE || text.length + token.length + 1 > 200) {
            return 0;
        }
        let at: int = Math.max(0, Math.min(text.length, input.caretIndex | 0)) | 0;
        if (input.stage && input.stage.focus != input) {
            at = text.length;
        }
        let before: string = text.substr(0, at);
        let piece: string = (before.length && before.charAt(before.length - 1) != " " ? " " : "") + token;
        input.text = before + piece + text.substr(at);
        let caret: int = (at + piece.length) | 0;
        input.setSelection(caret, caret);
        return (have + 1) | 0;
    }

    public ioSendEmote(id: string): void {
        let token: string = IoEmotes.token(id);
        let typed: string = String(this.chatBox && this.chatBox.input ? this.chatBox.input.text : "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        if (typed.charAt(0) == "/") {
            typed = "";
        }
        // (Inferno-only, QoL #157: ":grin:" in the words typed first becomes the emote too)
        if (GLOBAL.INFERNO_ONLY) {
            typed = IoEmotes.ioChat2Shortcodes(typed);
        }
        let room: int = (200 - token.length - 1) | 0;
        if (typed.length > room) {
            typed = typed.substr(0, room);
        }
        if (this.ioSend(typed ? typed + " " + token : token)) {
            this.chatBox.clearInputText();
        }
    }

    /** Sends a line to the tab that is up. False (the words stay in the box) when it cannot go now. */
    private ioSend(param1: string): boolean {
        if (!this._isConnected || BYMChat._chat == null || !BYMChat._chat.isLoggedIn) {
            this.ioShow(this._ioMode, this.ioSystemLine(KEYS.Get("io_t3m_ch_reconnecting_kept")), false);
            return false;
        }
        let channel: Channel = this._ioMode == BYMChat.IO_ALLIANCE ? this._ioAllianceChannel : this.sector_channel;
        if (channel == null) {
            this.ioShow(this._ioMode, this.ioSystemLine(this._ioMode == BYMChat.IO_ALLIANCE ? KEYS.Get("io_t3m_ch_no_alliance") : KEYS.Get("io_t3m_ch_still_connecting")), false);
            return false;
        }
        let now: number = new Date().getTime();
        let due: number = Math.max(now, this._ioSendDue) + BYMChat.IO_RATE_MS;
        if (due - now > BYMChat.IO_RATE_MS * BYMChat.IO_RATE_BURST) {
            this.ioShow(this._ioMode, this.ioSystemLine(KEYS.Get("io_t3m_ch_slow_down")), false);
            return false;
        }
        this._ioSendDue = due;
        this._ioLastSent = { "text": param1, "tab": this._ioMode, "at": now };
        BYMChat._chat.say(channel, param1);
        this.ioAwait(param1, this._ioMode);
        // (QoL #157: the picker shows these first next time)
        IoEmotes.ioChat2Used(IoEmotes.idsIn(param1));
        return true;
    }

    private ioAwait(param1: string, param2: string): void {
        let waiting: any = null;
        waiting = { "text": param1, "tab": param2, "at": new Date().getTime() };
        this._ioAwaiting = waiting;
        setTimeout((): void => {
            if (this._ioAwaiting != waiting) {
                return;
            }
            if (this._ioPendingAlliance != null && String(waiting.tab) == BYMChat.IO_ALLIANCE) {
                this.ioAwait(String(waiting.text), BYMChat.IO_ALLIANCE);
                // (still joining the room: it goes once in)
                return;
            }
            if (this._ioPendingGlobal != null && String(waiting.tab) == BYMChat.IO_GLOBAL) {
                this.ioAwait(String(waiting.text), BYMChat.IO_GLOBAL);
                // (joining the room again: it goes once in)
                return;
            }
            // (Inferno-only, 7 October: over the polling link a slow reply is not a lost line. Still on its
            // way: wait on. Taken by the server: it went, its copy back is just late; a refusal comes as its
            // own error. Saying "didn't get through" then made players send lines that had gone, twice.)
            if (BYMChat._chat instanceof HttpChatSystem) {
                if (as3.cast(BYMChat._chat, HttpChatSystem).pendingSay()) {
                    this.ioAwait(String(waiting.text), String(waiting.tab));
                } else {
                    this._ioAwaiting = null;
                }
                return;
            }
            this._ioAwaiting = null;
            this.ioShow(String(waiting.tab), this.ioSystemLine(KEYS.Get("io_t3m_ch_not_through")), false);
            if (this.chatBox && this.chatBox.inputText == "") {
                this.chatBox.ioSetInput(String(waiting.text));
            }
        }, BYMChat.IO_AWAIT_MS);
    }

    /** A line of the player's own came back: the one waiting has arrived. */
    private ioArrived(param1: string, param2: string): void {
        if (this._ioAwaiting != null && param2 != null && String(this._ioAwaiting.tab) == param1 && ((Number(param2) | 0) == LOGIN._playerID || String(param2) == String(LOGIN._playerID))) {
            this._ioAwaiting = null;
        }
    }

    private ioSay(param1: string): void {
        this.ioShow(this._ioMode, this.ioSystemLine(param1), false);
    }

    private ioCommand(param1: string): void {
        let space: int = param1.indexOf(" ");
        let command: string = (space < 0 ? param1 : param1.substr(0, space)).toLowerCase();
        let arg: string = space < 0 ? "" : param1.substr(space + 1).replace(/^\s+|\s+$/g, "").replace(/^@/, "");
        let online: boolean = this._isConnected && BYMChat._chat != null && BYMChat._chat.isLoggedIn;
        switch (command) {
            case "/ignore":
                if (!arg) {
                    this.ioSay(KEYS.Get("io_t3m_ch_use_ignore"));
                } else if (!online) {
                    this.ioSay(KEYS.Get("io_t3m_ch_reconnecting"));
                } else {
                    BYMChat._chat.ignore("", arg);
                }
                break;
            case "/unignore":
                if (!arg) {
                    this.ioSay(KEYS.Get("io_t3m_ch_use_unignore"));
                } else if (!online) {
                    this.ioSay(KEYS.Get("io_t3m_ch_reconnecting"));
                } else {
                    BYMChat._chat.unignore(this.ioIgnoredIdByName(arg) || arg);
                }
                break;
            case "/l":
            case "/list":
            case "/ignored":
            case "/listignored":
            case "/igd":
                if (online) {
                    BYMChat._chat.showIgnore();
                }
                break;
            case "/clear":
                this.ioClear(this._ioMode);
                break;
            case "/mute":
            case "/unmute":
                if (!this._ioMyRole) {
                    this.ioSay(KEYS.Get("io_t3m_ch_mute_staff"));
                } else if (!arg) {
                    this.ioSay(command == "/mute" ? KEYS.Get("io_t3m_ch_use_mute") : KEYS.Get("io_t3m_ch_use_unmute"));
                } else if (online) {
                    let parts: any[] = arg.split(" ");
                    // (QoL #153: "/mute Name 60 the reason": the words after the minutes are the reason the player is shown)
                    let at: int = -1;
                    for (let k: int = 1; k < parts.length && at < 0; k++) {
                        if (/^\d+$/.test(String(parts[k])) && (parts[k] | 0) > 0) {
                            at = k;
                        }
                    }
                    if (command == "/unmute") {
                        this.ioMute(null, 0, arg);
                    } else if (at < 0) {
                        this.ioMute(null, 60, parts.join(" "));
                    } else {
                        this.ioMute(null, parts[at] | 0, parts.slice(0, at).join(" "), parts.slice(at + 1).join(" "));
                    }
                }
                break;
            case "/online":
                // (QoL #156: who's online, the list)
                IoWhosOnline.Show();
                break;
            case "/events":
                // (QoL #105: the events calendar)
                IoEventsCalendar.Show();
                break;
            case "/msg":
            case "/who":
                if (!arg) {
                    if (command == "/who") {
                        IoWhosOnline.Show();
                    } else {
                        this.ioSay(KEYS.Get("io_t3m_ch_use_msg"));
                    }
                    break;
                }
                let seen: any = this.ioSpeakerByName(arg);
                if (!seen) {
                    this.ioSay(KEYS.Get("io_t3m_ch_no_speaker", { "v1": BYMChat.ioEsc(arg) }));
                } else if (command == "/msg") {
                    BYMChat.ioMessagePlayer(String(seen.user), String(seen.name));
                } else {
                    IoLeaderboards.ShowPlayer(seen.user | 0, String(seen.name));
                }
                break;
            case "/guide":
                // (QoL #652: the player guide, the Change Log)
                GLOBAL.gotoURL(GLOBAL.serverUrl + (GLOBAL.INFERNO_ONLY && LOGIN.token ? "guide/more#k=" + encodeURIComponent(LOGIN.token) : "guide")); // (QoL #653: the guide, with the chapters this player may read)
                break;
            case "/faq":
            case "/schedule":
            case "/shiny":
            case "/rules": // (QoL #643)
                // (QoL #644-#646: the players' help pages)
                GLOBAL.gotoURL(GLOBAL.serverUrl + command.substr(1));
                break;
            case "/changes":
            case "/changelog":
                IoChangelog.Show();
                break;
            case "/?":
            case "/h":
            case "/help":
                this.ioSay(KEYS.Get("io_t3m_ch_help") + (this._ioMyRole ? KEYS.Get("io_t3m_ch_help_mute") : "") + KEYS.Get("io_t3m_ch_help_tail") + (ALLIANCES.ioIsStaff() ? KEYS.Get("io_t3m_ch_help_staff") : "") + (GLOBAL.INFERNO_ONLY ? "<br>" + KEYS.Get("io_chat2_help") + "<br>" + KEYS.Get("io_ev2_chat_help") + (this._ioMyRole ? "<br>" + KEYS.Get("io_chat2_help_mod") : "") : ""));
                break;
            default:
                this.ioSay(KEYS.Get("io_t3m_ch_no_command", { "v1": BYMChat.ioEsc(command) }));
        }
    }

    /** The latest line in either tab by a player of that name (any capitals): {user, name}, or null. */
    private ioSpeakerByName(param1: string): any {
        let wanted: string = param1.toLowerCase();
        for (let tab of [this._ioMode, BYMChat.IO_GLOBAL, BYMChat.IO_ALLIANCE]) {
            let log: any[] = as3.as(this._ioLogs ? this._ioLogs[tab] : null, Array) || [];
            for (let i: int = (log.length - 1) | 0; i >= 0; i--) {
                let line: any = log[i];
                if (line && line.name && (Number(line.user) | 0) > 0 && String(line.name).toLowerCase() == wanted) {
                    return { "user": Number(line.user) | 0, "name": String(line.name) };
                }
            }
        }
        return null;
    }

    private ioIgnoredIdByName(param1: string): string {
        let wanted: string = param1.toLowerCase();
        for (let id in this._ioIgnoreNames) {
            if (String(this._ioIgnoreNames[id]).toLowerCase() == wanted) {
                return id;
            }
        }
        return null;
    }

    /** The server refused something (chatProtocol.ts ErrorCode): said in the chat, never lost silently. */
    private ioOnServerError(param1: ChatEvent): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        let code: string = as3.as(param1.Get("code"), String);
        let name: string = BYMChat.ioEsc(param1.Get("name") ? String(param1.Get("name")) : "");
        let recent: boolean = this._ioLastSent != null && new Date().getTime() - Number(this._ioLastSent.at) < 15000;
        switch (code) {
            case "rate_limited":
                this.ioSay(KEYS.Get("io_t3m_ch_rate_limited"));
                this.ioRestoreLast();
                break;
            case "muted":
                // (13 October: no minutes: the account is banned, server chat/chatRooms.ts)
                // (QoL #262: and why, when the admin said)
                let why: string = param1.Get("reason") ? BYMChat.ioEsc(String(param1.Get("reason"))) : "";
                // (QoL #153: muted just now, by a moderator or an admin: said at once, in the chat and over the yard)
                if (GLOBAL.INFERNO_ONLY && param1.Get("fresh") == true && (param1.Get("minutes") | 0) > 0) {
                    let told: string = KEYS.Get("io_chat2_muted_now", { "v1": param1.Get("minutes") | 0 }) + (why ? " " + KEYS.Get("io_chat2_mute_reason", { "v1": why }) : "");
                    this.ioSay(told);
                    IoToast.Show(told, 8000);
                    break;
                }
                this.ioSay((param1.Get("minutes") | 0) > 0 ? KEYS.Get("io_t3m_ch_muted_for", { "v1": param1.Get("minutes") | 0 }) + (why ? KEYS.Get("io_t3m_ch_reason", { "v1": why }) : "") : KEYS.Get("io_t3m_ch_banned"));
                break;
            case "not_in_channel":
                // (the link to the room was lost: join again, and send the line again once in)
                if (recent && this._ioLastSent.tab == BYMChat.IO_ALLIANCE) {
                    this._ioPendingAlliance = String(this._ioLastSent.text);
                    BYMChat._chat.join(new Channel("alliance", "system"));
                } else if (this.sector_channel != null) {
                    // (Inferno-only, 7 October: Global too is joined again and the line sent once in, as the
                    // alliance's; it used to go back in the box for the player to send again)
                    if (recent && this._ioLastSent.tab == BYMChat.IO_GLOBAL) {
                        this._ioPendingGlobal = String(this._ioLastSent.text);
                    }
                    BYMChat._chat.join(this.sector_channel);
                    if (this._ioPendingGlobal == null) {
                        this.ioSay(KEYS.Get("io_t3m_ch_resend"));
                        this.ioRestoreLast();
                    }
                }
                break;
            case "user_not_found":
                this.ioSay(KEYS.Get("io_t3m_ch_no_player", { "v1": name }));
                break;
            case "cannot_ignore_self":
                this.ioSay(KEYS.Get("io_t3m_ch_ignore_self"));
                break;
            case "ignore_list_full":
                this.ioSay(KEYS.Get("io_t3m_ch_ignore_full"));
                break;
            case "not_ignored":
                this.ioSay(KEYS.Get("io_t3m_ch_not_ignored", { "v1": name }));
                break;
            case "server_error":
                this.ioSay(KEYS.Get("io_t3m_ch_hiccup"));
                break;
            case "not_allowed":
                this.ioSay(KEYS.Get("io_t3m_ch_not_allowed"));
                break;
        }
    }

    /** The line just refused goes back in the box, if the player has not started another. */
    private ioRestoreLast(): void {
        if (this._ioLastSent != null && this.chatBox.inputText == "") {
            this.chatBox.ioSetInput(String(this._ioLastSent.text));
        }
    }

    /** The ignore list from the server: applied (always), and said ("show", "add", "remove"). */
    private ioOnIgnore(param1: ChatEvent): void {
        let ids: any[] = as3.as(param1.Get("ignore_ids"), Array) || [];
        let names: any = param1.Get("ignore_names") || {};
        this._ignore_list = ids;
        this._ioIgnoreNames = names;
        let target: string = as3.as(param1.Get("target"), String);
        let who: string = BYMChat.ioEsc(param1.Get("displayname") ? String(param1.Get("displayname")) : String(names[target] || ""));
        switch (String(param1.Get("action"))) {
            case "sync":
                break;
            case "add":
                this.ioSay(KEYS.Get("io_t3m_ch_ignoring", { "v1": who }));
                if (target) {
                    this.ioPurge(target);
                }
                break;
            case "remove":
                this.ioSay(KEYS.Get("io_t3m_ch_unignored", { "v1": who }));
                break;
            default:
                if (ids.length == 0) {
                    this.ioSay(KEYS.Get("io_t3m_ch_ignore_none"));
                    break;
                }
                this.ioSay(KEYS.Get("io_t3m_ch_ignore_list"));
                for (const $value of as3.values(ids)) {
                    let id: string = as3.str($value);
                    let shown: string = BYMChat.ioEsc(names[id] ? String(names[id]) : KEYS.Get("io_t3m_ch_player_n", { "v1": id }));
                    this.ioShow(this._ioMode, { "html": "<b>" + shown + "</b>", "label": "<b>" + shown + "</b>", "user": id, "name": String(names[id] || id), "kind": "ignorelist", "ts": 0 }, false);
                }
        }
    }

    /** A player's name was clicked in the chat: the menu (message, ignore, jump, leaderboards). */
    public ioNameClicked(param1: string, param2: string, param3: number, param4: number, param5: any = null): void {
        if (!param1 || (Number(param1) | 0) <= 0) {
            return;
        }
        let line: any = param5 || {};
        IoChatMenu.Show(param1, param2, this.userIsIgnored(param1), param3, param4, { "staff": this._ioMyRole, "lineId": line.lineId, "channel": line.channel, "targetRole": line.role, "tag": line.tag, "aid": line.aid | 0, "online": line.dot == null ? null : line.dot == "on", "text": line.body != null ? String(line.body) : null });
    }

    // ---- moderation (admins and chat moderators: the server checks every request)
    /** A line deleted for everyone (the name menu's Delete line). */
    public ioDeleteLine(param1: string, param2: string): void {
        if (BYMChat._chat != null && param1 && param2) {
            BYMChat._chat.moderate("delete", { "channel": param1, "id": param2 });
        }
    }

    /** A player muted for some minutes (0: unmuted). */
    public ioMute(param1: string, param2: int, param3: string = null, param4: string = null): void {
        if (BYMChat._chat == null) {
            return;
        }
        let msg: any = param3 != null ? { "targetName": param3, "minutes": param2 } : { "targetId": param1, "minutes": param2 };
        // (Inferno-only, QoL #153: the reason, shown to the player at once)
        if (GLOBAL.INFERNO_ONLY && param4) {
            msg.reason = param4;
        }
        BYMChat._chat.moderate("mute", msg);
    }

    /** Inferno-only (QoL #153): a player's last lines in a room deleted for everyone (the name menu). */
    public ioChat2Purge(param1: string, param2: string, param3: int = 10): void {
        if (GLOBAL.INFERNO_ONLY && BYMChat._chat != null && param1 && param2) {
            BYMChat._chat.moderate("purge", { "channel": param1, "targetId": param2, "count": param3 });
        }
    }

    /** Inferno-only (QoL #153): the name menu's "Mute with a reason": the command in the box, for the reason to be typed. */
    public ioChat2MuteWithReason(param1: string): void {
        if (!GLOBAL.INFERNO_ONLY || !this.chatBox) {
            return;
        }
        this.chatBox.ioSetInput("/mute " + param1 + " 60 ");
        try {
            if (this.chatBox.input && this.chatBox.input.stage) {
                this.chatBox.input.stage.focus = this.chatBox.input;
            }
        } catch (e) {
        }
        this.chatBox.ioOpen();
        this.ioSay(KEYS.Get("io_chat2_mute_hint"));
    }

    /**
     * Inferno-only (QoL #152): a line reported to the admins (the name menu's "Report this line"). The server takes the
     * line and those around it from the room's history; the words shown here only if it is gone from there.
     */
    public ioChat2Report(param1: string, param2: string, param3: string, param4: string = null): void {
        if (!GLOBAL.INFERNO_ONLY || BYMChat._chat == null || !param1 || !param2) {
            return;
        }
        if (!this._isConnected || !BYMChat._chat.isLoggedIn) {
            this.ioSay(KEYS.Get("io_chat2_reconnecting"));
            return;
        }
        let msg: any = { "channel": param1, "id": param2, "targetId": param3 };
        if (param4) {
            msg.text = IoEmotes.plain(param4).substr(0, 300);
        }
        BYMChat._chat.moderate("report", msg);
    }

    /** Inferno-only (QoL #184): the ignore list asked for again, quietly (a letter's sender was just blocked). */
    public ioChat2SyncIgnore(): void {
        if (GLOBAL.INFERNO_ONLY && BYMChat._chat != null && this._isConnected && BYMChat._chat.isLoggedIn) {
            BYMChat._chat.getIgnore();
        }
    }

    /** Inferno-only (QoL #477): asks at once, then every minute, while the chat is signed in. */
    private ioChat2StartPresence(): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (this._ioChat2Timer == null) {
            this._ioChat2Timer = new Timer(60000);
            this._ioChat2Timer.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
                this.ioChat2AskPresence();
            });
            this._ioChat2Timer.start();
        }
        this.ioChat2AskPresence();
    }

    private ioChat2AskPresence(): void {
        if (!this.chatBox || !GLOBAL.serverUrl) {
            return;
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "chat/online", [["v", 1], ["brief", 1]], (r: any): void => {
            if (r && !r.error && r.online != null && this.chatBox) {
                this.chatBox.ioChat2Presence(!!r.hidden, r.online | 0);
                // (27 November, 72's bug report: the dots on the lines follow who is online now)
                if (as3.is(r.ids, Array)) {
                    this.chatBox.ioDotsLive(r.ids);
                }
            }
        }, (e: any): void => {
        });
    }

    /** A line a moderator deleted: off both tabs, at once. */
    private ioOnDeleted(param1: ChatEvent): void {
        let id: string = null;
        id = as3.as(param1.Get("id"), String);
        if (!GLOBAL.INFERNO_ONLY || !id) {
            return;
        }
        let hit: boolean = false;
        for (const $value of as3.values([BYMChat.IO_GLOBAL, BYMChat.IO_ALLIANCE])) {
            let tab: string = as3.str($value);
            let before: int = (as3.as(this._ioLogs[tab], Array)).length;
            this._ioLogs[tab] = (as3.as(this._ioLogs[tab], Array)).filter((line: any, i: int, a: any[]): boolean => {
                return line.id != id;
            });
            if ((as3.as(this._ioLogs[tab], Array)).length != before && tab == this._ioMode) {
                hit = true;
            }
        }
        if (hit) {
            this.chatBox.ioSetLines(as3.cast(this._ioLogs[this._ioMode], Array));
        }
    }

    private ioOnNotice(param1: ChatEvent): void {
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #152, #153: the game's own words for it when the server names them)
            let key: string = as3.as(param1.Get("key"), String);
            if (key && key.indexOf("io_") == 0) {
                let said: string = KEYS.Get(key, { "v1": BYMChat.ioEsc(String(param1.Get("v1") || "")), "v2": BYMChat.ioEsc(String(param1.Get("v2") || "")) });
                if (said && said != key) {
                    this.ioSay(said);
                    return;
                }
            }
            this.ioSay(BYMChat.ioEsc(String(param1.Get("text"))));
        }
    }

    /**
     * A location shared from the map room (IoMapShare): the token for it goes to a tab's channel, after
     * whatever has been typed into the chat box (the player's own words for it, if any). Switches to that
     * tab so the line shows. Returns "" when it went, or why it could not.
     */
    public ioShareLocation(param1: string, param2: string): string {
        if (!this._isConnected || BYMChat._chat == null) {
            return KEYS.Get("io_t3m_ch_not_connected");
        }
        if (param1 == BYMChat.IO_ALLIANCE && ALLIANCES._allianceID <= 0 && this._ioAllianceChannel == null) {
            return KEYS.Get("io_t3m_ch_no_alliance");
        }
        if (param1 == BYMChat.IO_GLOBAL && this.sector_channel == null) {
            return KEYS.Get("io_t3m_ch_not_connected");
        }
        let lead: string = this.chatBox.inputText ? this.chatBox.inputText.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "") : "";
        if (lead.charAt(0) == "/") {
            lead = "";
        }
        // The server keeps 200 characters of a line: the location must not be the part cut off.
        if (lead.length + 1 + param2.length > 200) {
            lead = lead.substr(0, Math.max(0, 199 - param2.length));
        }
        let message: string = lead.length > 0 ? lead + " " + param2 : param2;
        this.chatBox.clearInputText();
        if (param1 != this._ioMode) {
            this.ioSwitch(param1);
        }
        this._ioLastSent = { "text": message, "tab": param1, "at": new Date().getTime() };
        if (param1 == BYMChat.IO_ALLIANCE) {
            if (this._ioAllianceChannel != null) {
                BYMChat._chat.say(this._ioAllianceChannel, message);
                this.ioAwait(message, param1);
            } else {
                this._ioPendingAlliance = message;
                this.ioJoinAlliance();
            }
        } else {
            this.sector_chat(message);
        }
        if (!this._open) {
            this.toggleVisible();
        }
        return "";
    }

    /** A player's name in the chat was clicked: write them an in-game message. */
    public static ioMessagePlayer(param1: string, param2: string): void {
        if (!param1 || (Number(param1) | 0) <= 0 || param1 == String(LOGIN._playerID)) {
            return;
        }
        let message: Message = new Message();
        message.picker.preloadSelection(new Contact(param1, { "first_name": param2, "last_name": "", "pic_square": "" }));
        message.requestType = "message";
        message.body_txt.text = "";
        GLOBAL.BlockerAdd();
        GLOBAL._layerWindows.addChild(message);
    }

    public ignoreUser(param1: string = null, param2: string = null): void {
        if (param1 != null && (!GLOBAL.INFERNO_ONLY || (Number(param1) | 0) > 0)) {
            // (Inferno-only, QoL #184: one block list: their letters are blocked too, and Unignore undoes both)
            GLOBAL.Message(KEYS.Get("chat_ignore") + " \'" + param2 + "\' (id: " + param1 + ")<br><br>" + KEYS.Get("chat_ignore_confirm") + (GLOBAL.INFERNO_ONLY ? "<br>" + KEYS.Get("io_chat2_ignore_mail") : ""), KEYS.Get("btn_yes"), as3.bind(BYMChat._chat, BYMChat._chat.ignore), [param1, param2]);
        }
    }

    public unignoreUser(param1: string): void {
        if (param1 != null) {
            BYMChat._chat.unignore(param1);
        }
    }

    public position(): void {
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc1_: int = GLOBAL._ROOT.stage.stageWidth;
        let _loc2_: int = GLOBAL._ROOT.stage.stageHeight;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: Rectangle = new Rectangle(0 - (_loc1_ - GLOBAL._SCREENINIT.width) / 2 + 0, 0 - (_loc2_ - GLOBAL._SCREENINIT.height) / 2 + _loc4_, _loc1_, _loc2_);
        this._hideX = _loc5_.x | 0;
        this._showX = _loc5_.x | 0;
        this._showY = (GLOBAL._SCREENINIT.height + (_loc2_ - GLOBAL._SCREENINIT.height) / 2 - 30) | 0;
        this._hideY = (GLOBAL._SCREENINIT.height + (_loc2_ - GLOBAL._SCREENINIT.height) / 2 - 30) | 0;
        this._hideX += _loc3_;
        this._showX += _loc3_;
        this._showY += _loc4_;
        this._hideY += _loc4_;
        if (this._open) {
            _loc6_ = this._showX;
            _loc7_ = this._showY;
        } else {
            _loc6_ = this._hideX;
            _loc7_ = this._hideY;
        }
        this.x = _loc6_;
        this.y = _loc7_;
        this.chatBox.update();
    }

    public fetchIDFromDisplayName(param1: string, param2: boolean): string {
        let _loc3_: string = null;
        if (param1 == null || param1.length == 0) {
            return "";
        }
        for (const $value of (BYMChat._displayNameMap?.values() ?? [])) {
            _loc3_ = as3.str($value);
            if (BYMChat._displayNameMap.get(_loc3_) != null && BYMChat._displayNameMap.get(_loc3_).toString() == param1) {
                return _loc3_;
            }
        }
        if (param2) {
            for (const $value of (BYMChat._displayNameMap?.keys() ?? [])) {
                _loc3_ = as3.str($value);
                if (BYMChat._displayNameMap.get(_loc3_) != null && BYMChat._displayNameMap.get(_loc3_).indexOf(param1) != -1) {
                    return _loc3_;
                }
            }
        }
        return "";
    }

    public userIsIgnored(param1: string): boolean {
        if (this._ignore_list == null) {
            return false;
        }
        if (this._ignore_list.indexOf(param1) == -1) {
            return false;
        }
        return true;
    }

    public displayUnavailable(param1: string = null): void {
        this.clearChat();
        if (param1 != null) {
            this.system_message(KEYS.Get("io_t3m_ch_unavail_reason", { "v1": param1 }));
        } else {
            this.system_message(KEYS.Get("io_t3m_ch_unavail"));
        }
    }

    public get roomNames(): Vector<string> {
        if (BYMChat._chat != null) {
            return BYMChat._chat.roomNames;
        }
        return new Vector<string>(0, false, String);
    }

    public chatInputHasFocus(): boolean {
        if (Boolean(this.stage) && Boolean(this.chatBox)) {
            return this.stage.focus == this.chatBox.input;
        }
        return false;
    }
}

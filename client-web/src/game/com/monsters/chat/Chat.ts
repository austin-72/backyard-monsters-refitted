import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObjectContainer, StageDisplayState } from "flash/display";
import { BASE, BYMChat, ChatBox, GLOBAL, LOGIN, MapRoomManager, TUTORIAL } from "@game";

export class Chat extends ASObject {
    public static _bymChat: BYMChat = null;

    public static readonly NUM_CHAT_ROOMS: int = 300;

    public static _chatInited: boolean = false;

    public static _chatEnabled: boolean = true;

    public static _validName: boolean = true;

    public static _chatServers: any[] = null;

    public static _chatToken: string = null;

    /** Server-issued channel key, echoed back on join. Set from base load response. */
    public static _chatChannel: string = null;

    public static _chatBlackList: any[] = null;

    public static _chatWhiteList: any[] = null;

    public static _countryCodeBlackList: any[] = null;

    public static _chatServer: string = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static initChat(): void {
        if (Chat._chatInited) {
            if (Chat._bymChat != null) {
                Chat._bymChat.show();
            }
            if (Chat._bymChat.IsConnected) {
                if (Chat._chatChannel != null && (Chat._bymChat.sector_channel == null || Chat._bymChat.sector_channel.Name != Chat._chatChannel)) {
                    Chat._bymChat.enter_sector(Chat._chatChannel, true);
                }
                return;
            }
        }
        if (Chat._chatServers == null || Chat._chatServers.length == 0) {
            return;
        }
        if (!Chat.flagsShouldChatExist()) {
            if (Chat._bymChat != null) {
                Chat._bymChat.logout();
                Chat._bymChat.hide();
                Chat._bymChat = null;
                Chat._chatInited = false;
            }
            return;
        }
        if (!Chat._chatEnabled || Chat._chatServers.length == 0) {
            if (Chat._bymChat != null) {
                Chat._bymChat.logout();
                Chat._bymChat.hide();
                Chat._bymChat = null;
                Chat._chatInited = false;
            }
            return;
        }
        Chat._chatServer = as3.str(Chat._chatServers[0]);
        if (Chat._bymChat == null) {
            Chat._bymChat = new BYMChat(new ChatBox(), Chat._chatServer);
            Chat._bymChat.system_message("Connecting to chat");
            Chat._chatInited = true;
            GLOBAL._layerUI.addChild(Chat._bymChat);
        }
        Chat._bymChat.init();
        if (!Chat.chatUserIsInABTest()) {
            Chat._bymChat.disableChat();
            Chat._bymChat.showUnavailableInYourArea();
            return;
        }
        if (TUTORIAL._stage >= TUTORIAL._endstage && Chat.flagsShouldChatExist()) {
            if (Chat._chatEnabled && !Chat._bymChat.IsConnected && Chat._bymChat._open) {
                Chat.connectAndLogin();
            }
        } else {
            Chat._bymChat.disableChat();
        }
    }

    /**
     * Brings the chat transport up for features that need a channel but are not
     * the chat dock. initChat() only connects when the dock is open, so alliance
     * chat would otherwise be unusable whenever the player has it minimised.
     * Connecting does not reveal the dock - show() only sets visibility, and the
     * minimised state is held separately in _open.
     */
    public static ensureConnected(): void {
        Chat.initChat();
        if (Chat._bymChat != null && !Chat._bymChat.IsConnected && !BYMChat.serverInited) {
            Chat.connectAndLogin();
        }
    }

    public static connectAndLogin(): void {
        if (!Chat._chatInited) {
            return;
        }
        if (!Chat._validName) {
            return;
        }
        if (Chat._bymChat == null || BYMChat.serverInited || Chat._bymChat.IsConnected || Chat._bymChat.IsJoined) {
            return;
        }
        if (Chat._chatChannel == null || Chat._chatChannel.length == 0) {
            Chat._bymChat.displayUnavailable();
            return;
        }
        if (Chat._bymChat) {
            let _loc1_: string = Chat.getFirstNameLastInitial();
            if (_loc1_ == null || _loc1_.length == 0) {
                Chat._validName = false;
                Chat._bymChat.showInvalidName();
                return;
            }
            Chat._bymChat.initServer();
            Chat._bymChat.login(_loc1_, as3.str(LOGIN._playerID.toString()), BASE.BaseLevel().level | 0);
            Chat._bymChat.show();
            Chat._bymChat.enter_sector(Chat._chatChannel, true);
        }
    }

    private static getFirstNameLastInitial(): string {
        let _loc1_: string = LOGIN._playerName;
        if (_loc1_ != null && _loc1_.length > 0) {
            _loc1_ = _loc1_.replace(/ /, "_");
            let _loc2_: string = LOGIN._playerLastName;
            if (_loc2_ != null && _loc2_.length > 0) {
                _loc2_ = _loc2_.substr(0, 1);
                if (_loc2_.length == 1) {
                    _loc2_ = _loc2_.toUpperCase();
                    if (_loc2_ != null && _loc2_.length == 1) {
                        _loc2_ = _loc2_.replace(/ /, "_");
                    }
                }
                if (_loc2_ == null || _loc2_.length != 1) {
                    return null;
                }
            }
            return _loc1_ + _loc2_;
        }
        return null;
    }

    public static setChatPosition(param1: DisplayObjectContainer = null, param2: number = NaN, param3: number = NaN): void {
        if (Chat._bymChat != null) {
            if (!isNaN(param2)) {
                Chat._bymChat.x = param2;
            }
            if (!isNaN(param3)) {
                Chat._bymChat.y = param3;
            }
            if (param1 != null) {
                param1.addChild(Chat._bymChat);
            }
            Chat._bymChat.position();
            Chat._bymChat.show();
        }
    }

    public static chatUserIsInABTest(): boolean {
        if (GLOBAL._flags) {
            if (GLOBAL._flags.hasOwnProperty("chatwhitelist")) {
                Chat._chatWhiteList = String(GLOBAL._flags.chatwhitelist).split(",");
            }
            if (GLOBAL._flags.hasOwnProperty("chatblacklist")) {
                Chat._chatBlackList = String(GLOBAL._flags.chatblacklist).split(",");
            }
            if (GLOBAL._flags.hasOwnProperty("countrycodeblacklist")) {
                Chat._countryCodeBlackList = String(GLOBAL._flags.countrycodeblacklist).split(",");
            }
        }
        if (Chat._chatWhiteList != null && Chat._chatWhiteList.indexOf(LOGIN._playerID.toString()) != -1) {
            return true;
        }
        if (Chat._chatBlackList != null && Chat._chatBlackList.indexOf(LOGIN._playerID.toString()) != -1) {
            return false;
        }
        if (Chat._countryCodeBlackList != null && Chat._countryCodeBlackList.indexOf(GLOBAL._countryCode) != -1) {
            return false;
        }
        if (!Chat._chatEnabled) {
            return false;
        }
        return true;
    }

    public static flagsShouldChatDisplay(): boolean {
        if (GLOBAL._flags == null) {
            return false;
        }
        if (!GLOBAL._flags.hasOwnProperty("chat")) {
            return false;
        }
        if (GLOBAL._flags.chat != 2) {
            return false;
        }
        if (MapRoomManager.instance.isInMapRoom2 && MapRoomManager.instance.isOpen && GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN) {
            return false;
        }
        return true;
    }

    public static flagsShouldChatExist(): boolean {
        if (GLOBAL._flags == null) {
            return false;
        }
        if (!GLOBAL._flags.hasOwnProperty("chat")) {
            return false;
        }
        if (GLOBAL._flags.chat <= 0) {
            return false;
        }
        if (!Chat.chatUserIsInABTest()) {
            return false;
        }
        return true;
    }
}

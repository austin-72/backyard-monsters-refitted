import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, IOErrorEvent } from "flash/events";
import { ExternalInterface } from "flash/external";
import { Capabilities } from "flash/system";
import { AuthForm, BASE, BYMDevConfig, EnumYardType, GAME, GLOBAL, IoSavedAccounts, KEYS, LOGGER, MapRoomManager, PLEASEWAIT, POPUPS, Player, RADIO, SecNum, URLLoaderApi, md5 } from "@game";

export class LOGIN extends ASObject {
    public static _playerID: int = 0;

    public static _playerName: string = null;

    public static _playerLastName: string = null;

    public static _playerPic: string = null;

    public static _timePlayed: int = 0;

    public static _playerLevel: int = 0;

    public static _email: string = null;

    public static _proxymail: string = null;

    public static _settings: any = null;

    public static _digits: any[] = null;

    public static _sumdigit: int = 0;

    public static _inferno: int = 0;

    public static authForm: AuthForm = null;

    public static token: string = null;

    /**
     * Inferno-only: a login is on its way (or has succeeded and the game is loading). The login button
     * clicked again (or Enter pressed twice) sent a second login: two yards were loaded at once and the first
     * one's bottom bar was taken down under it (bug reports #56, #58).
     */
    private static _ioLoginPending: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Login(): void {
        if (GAME.token) {
            PLEASEWAIT.Show("Logging in...");
            GLOBAL.eventDispatcher.addEventListener(KEYS.LANGUAGE_FILE_LOADED, LOGIN.onLanguageLoaded);
            GLOBAL.LanguageSetup();
        } else {
            LOGIN.authForm = new AuthForm();
            GLOBAL._layerTop.addChild(LOGIN.authForm);
        }
    }

    private static onLanguageLoaded(event: Event): void {
        GLOBAL.eventDispatcher.removeEventListener(KEYS.LANGUAGE_FILE_LOADED, LOGIN.onLanguageLoaded);

        let authInfo: any[] = [["token", GAME.sharedObj.data.token]];
        LOGIN.AuthenticateUser(authInfo);
    }

    public static AuthenticateUser(authInfo: any[]): void {
        let handleLoadSuccessful: Function = null;
        let handleLoadError: Function = null;
        if (GLOBAL._local) {
            if (GLOBAL.INFERNO_ONLY) {
                if (LOGIN._ioLoginPending) {
                    return;
                }
                LOGIN._ioLoginPending = true;
            }
            handleLoadSuccessful = (serverData: any): void => {
                if (serverData.hasOwnProperty("error") && serverData.error != 0) {
                    LOGIN._ioLoginPending = false;
                    GLOBAL.Message(as3.str(serverData.error));
                    return;
                }

                if (serverData.error == 0) {
                    if (GLOBAL.INFERNO_ONLY) {
                        // Remember this account (email and name only, never the password) for the
                        // login page's account list.
                        // The server sends the email back with every login (password or saved token).
                        let ioEmail: string = serverData.email ? String(serverData.email) : null;
                        for (let ioPair of as3.values(authInfo)) {
                            if (!ioEmail && ioPair && ioPair[0] == "email") {
                                ioEmail = String(ioPair[1]);
                            }
                        }
                        if (ioEmail) {
                            IoSavedAccounts.remember(ioEmail, serverData.username ? String(serverData.username) : "");
                        }
                    }
                    if (GLOBAL._local) {
                        // Set token
                        LOGIN.token = as3.str(serverData.token);

                        new URLLoaderApi().load(GLOBAL._apiURL + "bm/getnewmap", [["token", LOGIN.token]], (mapData: any): void => {
                            MapRoomManager.instance.init(Boolean(mapData.newmap), as3.str(mapData.mapheaderurl));
                            LOGIN.Process(serverData);
                        }, GLOBAL.INFERNO_ONLY ? (param1: any = null): void => {
                            // (Inferno-only: the login can be tried again)
                            LOGIN._ioLoginPending = false;
                            GLOBAL.Message("An error occurred during login on the server.");
                        } : null);
                    } else {
                        // ToDo: Implement if we are running in a browser.
                        ExternalInterface.call("setItem", "authToken", LOGIN.token);
                    }
                }
            };
            handleLoadError = (error: IOErrorEvent): void => {
                LOGIN._ioLoginPending = false;
                GLOBAL._layerTop.addChild(GLOBAL.Message("An error occurred during login on the server."));
            };
            new URLLoaderApi().load(GLOBAL._apiURL + "player/getinfo", [["version", GLOBAL._version.Get()]].concat(authInfo), handleLoadSuccessful, handleLoadError);
        } else {
            ExternalInterface.addCallback("loginsuccessful", (param1: string): void => {
                let _loc2_: any = JSON.parse(param1);
                GLOBAL.WaitHide();
                if (_loc2_.error == 0) {
                    if (LOGIN.checkHash(param1)) {
                        LOGIN.Process(_loc2_);
                    } else {
                        LOGGER.Log("err", "JSLogin", true);
                        GLOBAL.ErrorMessage("JSLogin");
                    }
                } else {
                    GLOBAL.ErrorMessage(as3.str(_loc2_.error), GLOBAL.ERROR_ORANGE_BOX_ONLY);
                }
            });
            if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
                GLOBAL.CallJSWithClient("cc.initApplication", "loginsuccessful", [GLOBAL._version.Get()]);
            } else {
                GLOBAL.CallJS("cc.initApplication", [GLOBAL._version.Get(), "loginsuccessful"]);
            }
            LOGIN.logFlashCapabilities();
        }
    }

    public static Process(serverData: any): void {
        let _loc2_: any = null;
        if (serverData.version != GLOBAL._version.Get()) {
            LOGIN.handleVersionMismatch(serverData);
        } else {
            LOGIN.handleUserLogin(serverData);
        }
    }

    private static handleUserLogin(serverData: any): void {
        if (LOGIN.authForm) {
            LOGIN.authForm.disposeUI();
            LOGIN.authForm = null;
        }
        if (serverData) {
            GLOBAL.player = new Player();
            GLOBAL.player.ID = serverData.userid | 0;
            GLOBAL.player.name = as3.str(serverData.username);
            GLOBAL.player.lastName = as3.str(serverData.last_name);
            GLOBAL.player.picture = as3.str(serverData.pic_square);
            GLOBAL.player.timePlayed = serverData.timeplayed | 0;
            GLOBAL.player.email = as3.str(serverData.email);
            LOGIN._playerID = serverData.userid | 0;
            LOGIN._playerName = as3.str(serverData.username);
            LOGIN._playerLastName = as3.str(serverData.last_name);
            LOGIN._playerPic = as3.str(serverData.pic_square);
            LOGIN._timePlayed = serverData.timeplayed | 0;
            LOGIN._email = as3.str(serverData.email);
            if (serverData.stats) {
                if (serverData.stats.inferno != undefined) {
                    LOGIN._inferno = serverData.stats.inferno | 0;
                }
            }
            GLOBAL._friendCount = serverData.friendcount | 0;
            GLOBAL._sessionCount = serverData.sessioncount | 0;
            GLOBAL._addTime = serverData.addtime | 0;
            GLOBAL._mapVersion = serverData.mapversion | 0;
            GLOBAL._mailVersion = serverData.mailversion | 0;
            GLOBAL._soundVersion = serverData.soundversion | 0;
            GLOBAL._languageVersion = serverData.languageversion | 0;
            GLOBAL._appid = as3.str(serverData.app_id);
            GLOBAL._tpid = as3.str(serverData.tpid);
            GLOBAL._currencyURL = as3.str(serverData.currency_url);
            if (serverData.bookmarks) {
                MapRoomManager.instance.bookmarkData = serverData.bookmarks;
            } else {
                MapRoomManager.instance.bookmarkData = {};
            }
            if (serverData.settings) {
                LOGIN._settings = serverData.settings;
                RADIO.Setup(LOGIN._settings);
            }
            if (serverData.proxy_email) {
                LOGIN._proxymail = as3.str(serverData.proxy_email);
            }
            if (!serverData.languageversion) {
                GLOBAL._languageVersion = 8;
            }
            if (serverData.sendgift == 1) {
                GLOBAL._canGift = true;
            }
            if (serverData.sendinvite == 1) {
                GLOBAL._canInvite = true;
            }
            BASE._isFan = serverData.isfan | 0;
            if (serverData.ncpCandidate == 1) {
                GLOBAL._fbcncp = serverData.ncpCandidate | 0;
            }
            POPUPS.Setup();
            LOGIN.Digits(LOGIN._playerID);
            LOGIN.Done();
        }
    }

    private static handleVersionMismatch(serverData: any): void {
        if (ExternalInterface.available) {
            let eventData: any = { "tag": "userload", "version_mismatch_h": 1, "vh2": serverData.version, "vh1": GLOBAL._version.Get() };
            GLOBAL.CallJS("cc.logGenericEvent", [eventData]);
        }
        GLOBAL.ErrorMessage(KEYS.Get("msg_updatedgame"), GLOBAL.ERROR_ORANGE_BOX_ONLY);
    }

    public static Digits(param1: int): void {
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc2_: string = as3.str(param1.toString());
        LOGIN._digits = [];
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            LOGIN._digits.push(Number(_loc2_.charAt(_loc3_)) | 0);
            _loc3_++;
        }
        LOGIN._sumdigit = 0;
        if (LOGIN._digits.length >= 3) {
            _loc5_ = as3.str((_loc4_ = (LOGIN._digits[LOGIN._digits.length - 1] + LOGIN._digits[LOGIN._digits.length - 2] + LOGIN._digits[LOGIN._digits.length - 3]) | 0).toString());
            LOGIN._sumdigit = Number(_loc5_.substr(_loc5_.length - 1, 1)) | 0;
        }
    }

    public static Done(): void {
        let _loc1_: int = 0;
        GLOBAL.Setup();
        if (GLOBAL._openBase && GLOBAL._openBase.url && (Boolean(GLOBAL._openBase.userid) || Boolean(GLOBAL._openBase.baseid)) && GLOBAL._openBase.userid != LOGIN._playerID) {
            BASE.yardType = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            if (!GLOBAL._openBase.userid) {
                GLOBAL._openBase.userid = 0;
            }
            if (!GLOBAL._openBase.baseid) {
                GLOBAL._openBase.baseid = 0;
            }
            GLOBAL._currentCell = null;
            GLOBAL.setMode(GLOBAL.e_BASE_MODE.HELP);
            _loc1_ = 1;
            while (_loc1_ < 5) {
                GLOBAL._resources["r" + _loc1_] = new SecNum(0);
                GLOBAL._hpResources["r" + _loc1_] = 0;
                _loc1_++;
            }
            BASE.Load(as3.str(GLOBAL._openBase.url), Number(GLOBAL._openBase.userid), Number(GLOBAL._openBase.baseid));
        } else if (LOGIN._inferno != 0 && !GLOBAL.INFERNO_ONLY) {
            MapRoomManager.instance.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
            BASE.yardType = EnumYardType.INFERNO_YARD;
            BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, "ibuild", false, EnumYardType.INFERNO_YARD);
        } else {
            BASE.yardType = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            // Comment: The Load() function gets called from this block.;
            BASE.Load();
        }
    }

    private static logFlashCapabilities(): void {
        let _loc1_: any = null;
        if (ExternalInterface.available) {
            _loc1_ = { "flash_version": Capabilities.version, "screen_resolution": Capabilities.screenResolutionX + "x" + Capabilities.screenResolutionY, "screen_dpi": Capabilities.screenDPI };
            GLOBAL.CallJS("cc.logFlashCapabilities", [_loc1_]);
        }
    }

    public static checkHash(param1: string): boolean {
        let _loc2_: any[] = param1.split(",\"h\":");
        param1 = _loc2_[0] + "}";
        let _loc3_: string = "{\"h\":" + _loc2_[1];
        let _loc4_: string = param1;
        let _loc5_: any = JSON.parse(param1);
        let _loc6_: any = JSON.parse(_loc3_);
        let _loc7_: string = null;
        if ((_loc7_ = String(md5(LOGIN.getSalt() + _loc4_ + LOGIN.getNum(_loc6_.hn | 0)))) !== _loc6_.h) {
            return false;
        }
        return true;
    }

    public static getNum(param1: int): int {
        return (param1 * (param1 % 11)) | 0;
    }

    public static getSalt(): string {
        return LOGIN.decodeSalt("84V37530976X4W7175W9Z02U3483Y6VW");
    }

    public static decodeSalt(param1: string): string {
        let _loc4_: string = null;
        let _loc2_: any = "";
        let _loc3_: int = 0;
        while (_loc3_ < param1.length) {
            _loc4_ = param1.substring(_loc3_, _loc3_ + 1);
            switch (_loc4_) {
                case "a":
                    _loc2_ += "Z";
                    break;
                case "b":
                    _loc2_ += "Y";
                    break;
                case "c":
                    _loc2_ += "X";
                    break;
                case "d":
                    _loc2_ += "W";
                    break;
                case "e":
                    _loc2_ += "V";
                    break;
                case "f":
                    _loc2_ += "U";
                    break;
                case "g":
                    _loc2_ += "T";
                    break;
                case "h":
                    _loc2_ += "S";
                    break;
                case "i":
                    _loc2_ += "R";
                    break;
                case "j":
                    _loc2_ += "Q";
                    break;
                case "k":
                    _loc2_ += "P";
                    break;
                case "l":
                    _loc2_ += "O";
                    break;
                case "m":
                    _loc2_ += "N";
                    break;
                case "n":
                    _loc2_ += "M";
                    break;
                case "o":
                    _loc2_ += "L";
                    break;
                case "p":
                    _loc2_ += "K";
                    break;
                case "q":
                    _loc2_ += "J";
                    break;
                case "r":
                    _loc2_ += "I";
                    break;
                case "s":
                    _loc2_ += "H";
                    break;
                case "t":
                    _loc2_ += "G";
                    break;
                case "u":
                    _loc2_ += "F";
                    break;
                case "v":
                    _loc2_ += "E";
                    break;
                case "w":
                    _loc2_ += "D";
                    break;
                case "x":
                    _loc2_ += "C";
                    break;
                case "y":
                    _loc2_ += "B";
                    break;
                case "z":
                    _loc2_ += "A";
                    break;
                case "A":
                    _loc2_ += "z";
                    break;
                case "B":
                    _loc2_ += "y";
                    break;
                case "C":
                    _loc2_ += "x";
                    break;
                case "D":
                    _loc2_ += "w";
                    break;
                case "E":
                    _loc2_ += "v";
                    break;
                case "F":
                    _loc2_ += "u";
                    break;
                case "G":
                    _loc2_ += "t";
                    break;
                case "H":
                    _loc2_ += "s";
                    break;
                case "I":
                    _loc2_ += "r";
                    break;
                case "J":
                    _loc2_ += "q";
                    break;
                case "K":
                    _loc2_ += "p";
                    break;
                case "L":
                    _loc2_ += "o";
                    break;
                case "M":
                    _loc2_ += "n";
                    break;
                case "N":
                    _loc2_ += "m";
                    break;
                case "O":
                    _loc2_ += "l";
                    break;
                case "P":
                    _loc2_ += "k";
                    break;
                case "Q":
                    _loc2_ += "j";
                    break;
                case "R":
                    _loc2_ += "i";
                    break;
                case "S":
                    _loc2_ += "h";
                    break;
                case "T":
                    _loc2_ += "g";
                    break;
                case "U":
                    _loc2_ += "f";
                    break;
                case "V":
                    _loc2_ += "e";
                    break;
                case "W":
                    _loc2_ += "d";
                    break;
                case "X":
                    _loc2_ += "c";
                    break;
                case "Y":
                    _loc2_ += "b";
                    break;
                case "Z":
                    _loc2_ += "a";
                    break;
                case "0":
                    _loc2_ += "9";
                    break;
                case "1":
                    _loc2_ += "8";
                    break;
                case "2":
                    _loc2_ += "7";
                    break;
                case "3":
                    _loc2_ += "6";
                    break;
                case "4":
                    _loc2_ += "5";
                    break;
                case "5":
                    _loc2_ += "4";
                    break;
                case "6":
                    _loc2_ += "3";
                    break;
                case "7":
                    _loc2_ += "2";
                    break;
                case "8":
                    _loc2_ += "1";
                    break;
                case "9":
                    _loc2_ += "0";
                    break;
            }
            _loc3_++;
        }
        return as3.str(_loc2_);
    }
}

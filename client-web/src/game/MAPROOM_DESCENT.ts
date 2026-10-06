import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent, ProgressEvent } from "flash/events";
import { BASE, DescentMapRoom, GLOBAL, HOUSING, INFERNOAPI, INFERNOPORTAL, KEYS, LOGGER, LOGIN, MAPROOM, PLEASEWAIT, POPUPS, PROCESS7, SOUNDS, TRIBES, TUTORIAL, URLLoaderApi, WMATTACK, WMBASE, com_monsters_mailbox_Message as Message, popup_truce, popup_truce_accept, popup_truce_sent } from "@game";

export class MAPROOM_DESCENT extends ASObject {
    public static _mc: DescentMapRoom;

    public static _open: boolean;

    public static _inDescent: boolean;

    public static _descentLvl: int;

    // Comment: March 2012 pre-patch 7 Descent base config
    // public static const _descentLvlMax:int = 8;
    public static _descentLvlMax: int; // const

    public static _bases: any[];

    public static _loot: any;

    public static _lastView: int;

    public static _lastSort: int;

    public static _lastSortReversed: int;

    public static _visitingFriend: boolean;

    private static loadState: int;

    private static andShow: boolean;

    private static loadThenShow: boolean;

    private static bridge_obj: any;

    public static DEBUG_UNLOCKDESCENT: boolean;

    public static _descentTribe: any;

    public static _initialized: boolean;

    public static _initing: boolean;

    static {
        as3.lazyStatics(this, { _mc: null, _open: false, _inDescent: false, _descentLvl: 0, _descentLvlMax: 0, _bases: null, _loot: null, _lastView: 0, _lastSort: 0, _lastSortReversed: 0, _visitingFriend: false, loadState: 0, andShow: false, loadThenShow: false, bridge_obj: null, DEBUG_UNLOCKDESCENT: false, _descentTribe: null, _initialized: false, _initing: false }, () => {
            MAPROOM_DESCENT._inDescent = false;
            MAPROOM_DESCENT._descentLvl = 0;
            MAPROOM_DESCENT._descentLvlMax = 14;
            MAPROOM_DESCENT._bases = [];
            MAPROOM_DESCENT._lastView = 0;
            MAPROOM_DESCENT._lastSort = 3;
            MAPROOM_DESCENT._lastSortReversed = 0;
            MAPROOM_DESCENT._visitingFriend = false;
            MAPROOM_DESCENT.andShow = true;
            MAPROOM_DESCENT.loadThenShow = false;
            MAPROOM_DESCENT.DEBUG_UNLOCKDESCENT = false;
            MAPROOM_DESCENT._descentTribe = { "id": 1, "name": KEYS.Get("ai_descenttribe_name"), "process": PROCESS7, "type": WMATTACK.TYPE_NERD, "taunt": KEYS.Get("ai_descenttribe_taunt"), "splash": "popups/portrait_moloch.png", "description": KEYS.Get("ai_descenttribe_description"), "succ": KEYS.Get("ai_descenttribe_succ"), "succ_stream": KEYS.Get("ai_descenttribe_succstream"), "fail": KEYS.Get("ai_descenttribe_fail"), "profilepic": "monsters/tribe_dreadnaut_50.v2.jpg", "streampostpic": "tribe-dreadnaut.v2.png" };
            MAPROOM_DESCENT._initialized = false;
            MAPROOM_DESCENT._initing = false;
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(param1: boolean = false): void {
        MAPROOM_DESCENT._mc = null;
        MAPROOM_DESCENT.loadState = 0;
        MAPROOM_DESCENT._open = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            MAPROOM_DESCENT._visitingFriend = false;
            MAPROOM_DESCENT._descentLvl = GLOBAL.StatGet("descentLvl");
            MAPROOM_DESCENT._inDescent = MAPROOM_DESCENT._descentLvl < MAPROOM_DESCENT._descentLvlMax ? true : false;
            MAPROOM_DESCENT._loot = {};
            MAPROOM_DESCENT.bridge_obj = { "Timestamp": GLOBAL.Timestamp, "GLOBAL": GLOBAL, "BASE": BASE, "readyFunction": MAPROOM_DESCENT.onMapRoomReady, "ErrorMessage": GLOBAL.ErrorMessage, "Log": LOGGER.Log, "URLLoaderApi": URLLoaderApi, "Hide": MAPROOM_DESCENT.Hide, "truceShareHandler": MAPROOM_DESCENT.TruceSent, "Log": LOGGER.Log, "playerBaseID": BASE._loadedBaseID, "playerBaseSeed": BASE._baseSeed, "_playerName": LOGIN._playerName, "_playerPic": LOGIN._playerPic, "LoadBase": BASE.LoadBase, "MessageUI": Message, "HOUSING": HOUSING, "RequestTruce": MAPROOM_DESCENT.RequestTruce, "TruceSent": MAPROOM_DESCENT.TruceSent, "setLastView": MAPROOM_DESCENT.setLastView, "setLastSort": MAPROOM_DESCENT.setLastSort, "setLastSortReversed": MAPROOM_DESCENT.setLastSortReversed, "setVisitingFriend": MAPROOM_DESCENT.setVisitingFriend, "SOUNDS": SOUNDS, "BaseLevel": BASE.BaseLevel, "scrollToBaseID": 0, "TUTORIAL": TUTORIAL, "WMBASE": WMBASE, "TRIBES": TRIBES, "KEYS": KEYS, "MAPROOM": MAPROOM_DESCENT };
            MAPROOM_DESCENT._initing = true;
            if (param1) {
                MAPROOM_DESCENT.loadThenShow = true;
            }
            INFERNOAPI.LoadInfernoData(GLOBAL._infBaseURL, 0, 0, "idescent");
            INFERNOAPI.addEventListener(INFERNOAPI.EVENT_DESCENTLOADED, MAPROOM_DESCENT.DescentDataLoaded, false, 0, true);
        }
    }

    private static DescentDataLoaded(param1: Event = null): void {
        INFERNOAPI.removeEventListener(INFERNOAPI.EVENT_DESCENTLOADED, MAPROOM_DESCENT.DescentDataLoaded);
        MAPROOM_DESCENT._initialized = true;
        MAPROOM_DESCENT._initing = false;
        if (MAPROOM_DESCENT.DescentLevel >= MAPROOM_DESCENT._descentLvlMax && MAPROOM_DESCENT.DescentPassed) {
            INFERNOPORTAL.ToggleYard();
            return;
        }
        if (MAPROOM_DESCENT.loadThenShow) {
            MAPROOM_DESCENT.Show();
        }
    }

    public static Show(param1: MouseEvent = null): void {
        if (!MAPROOM_DESCENT._initialized) {
            return;
        }
        MAPROOM_DESCENT.bridge_obj._lastView = MAPROOM_DESCENT._lastView;
        MAPROOM_DESCENT.bridge_obj._lastSort = MAPROOM_DESCENT._lastSort;
        MAPROOM_DESCENT.bridge_obj._lastSortReversed = MAPROOM_DESCENT._lastSortReversed;
        MAPROOM_DESCENT.andShow = true;
        GLOBAL.BlockerAdd();
        SOUNDS.Play("click1");
        MAPROOM_DESCENT._open = true;
        MAPROOM_DESCENT.EnterDescent();
        if (MAPROOM_DESCENT.loadState != 2 && MAPROOM_DESCENT.loadState != 1) {
            MAPROOM_DESCENT._mc = new DescentMapRoom();
            MAPROOM_DESCENT._mc.init(MAPROOM_DESCENT.bridge_obj);
            GLOBAL._layerTop.addChild(MAPROOM_DESCENT._mc);
        } else if (MAPROOM_DESCENT.loadState == 2) {
            MAPROOM_DESCENT.ShowB();
        }
    }

    private static ShowB(): void {
        MAPROOM_DESCENT.andShow = false;
        GLOBAL._layerWindows.addChild(MAPROOM_DESCENT._mc);
        GLOBAL.WaitHide();
    }

    public static EnterDescent(): void {
        if (!MAPROOM_DESCENT._inDescent) {
            MAPROOM_DESCENT._inDescent = true;
        }
    }

    public static ExitDescent(): void {
        if (MAPROOM_DESCENT._inDescent) {
            if (BASE.isInfernoMainYardOrOutpost) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK) {
                }
            }
        }
    }

    private static mapRoomProgress(param1: ProgressEvent): void {
        let _loc2_: int = (param1.bytesLoaded / param1.bytesTotal * 100) | 0;
        PLEASEWAIT.MessageChange(_loc2_ + "%");
    }

    private static onMapRoomReady(): void {
        MAPROOM_DESCENT.loadState = 2;
        if (MAPROOM_DESCENT.andShow) {
            MAPROOM_DESCENT.ShowB();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        try {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            if (Boolean(MAPROOM_DESCENT._mc) && Boolean(MAPROOM_DESCENT._mc.parent)) {
                MAPROOM_DESCENT._mc.parent.removeChild(MAPROOM_DESCENT._mc);
            }
            MAPROOM_DESCENT._open = false;
            MAPROOM_DESCENT.ExitDescent();
            MAPROOM_DESCENT._mc = null;
            MAPROOM_DESCENT.loadState = 0;
            if (MAPROOM_DESCENT._initialized) {
                INFERNOAPI.RevertWmBases();
                MAPROOM_DESCENT._initialized = false;
            }
        } catch (e) {
        }
    }

    public static Tick(): void {
        if (Boolean(MAPROOM_DESCENT._mc) && Boolean(MAPROOM_DESCENT._mc.parent)) {
            MAPROOM_DESCENT._mc.Tick();
        }
    }

    public static RequestTruce(param1: string, param2: int): void {
        let mc: MovieClip = null;
        let name: string = null;
        let baseid: int = 0;
        mc = null;
        let Truce: Function = null;
        name = param1;
        baseid = param2;
        Truce = (param1: MouseEvent = null): void => {
            let handleLoadSuccessful: Function = null;
            let e: MouseEvent = param1;
            handleLoadSuccessful = (param1: any): void => {
                if (param1.error == 0) {
                    if (MAPROOM_DESCENT._mc) {
                        MAPROOM_DESCENT._mc.Get();
                    }
                } else {
                    LOGGER.Log("err", "MAPROOM.RequestTruce: " + JSON.stringify(param1));
                }
            };
            new URLLoaderApi().load(GLOBAL._apiURL + "player/requesttruce", [["baseid", baseid], ["duration", 1209600], ["message", mc.bMessage.text]], handleLoadSuccessful);
            POPUPS.Next();
            MAPROOM_DESCENT.TruceSent(name, as3.str(mc.bMessage.text));
        };
        mc = new popup_truce();
        mc.tA.htmlText = "<b>" + KEYS.Get("map_trucerequest") + " " + name + ".</b>";
        mc.tB.htmlText = KEYS.Get("map_trucerequest_desc");
        mc.bSend.SetupKey("map_trucereq_btn");
        mc.bSend.addEventListener(MouseEvent.CLICK, Truce);
        mc.bMessage.htmlText = "";
        POPUPS.Push(mc);
    }

    public static TruceAccepted(param1: string, param2: string): void {
        let mc: MovieClip = null;
        let i: int = 0;
        let imgNumber: int = 0;
        let name: string = null;
        let SwitchB: Function = null;
        mc = null;
        i = 0;
        let Share: Function = null;
        imgNumber = 0;
        name = param1;
        let message: string = param2;
        Share = (param1: MouseEvent = null): void => {
            GLOBAL.CallJS("sendFeed", ["Truce", KEYS.Get("map_truceaccept_streamtitle", { "v1": name }), KEYS.Get("map_truceaccept_streambody"), "truceaccept" + imgNumber + ".png", 0]);
            POPUPS.Next();
        };
        let Switch: Function = (param1: int): Function => {
            let n: int = 0;
            n = param1;
            return (param1: MouseEvent = null): void => {
                SwitchB(n);
            };
        };
        SwitchB = (param1: int): void => {
            imgNumber = param1;
            i = 1;
            while (i < 4) {
                mc["mcIcon" + i].alpha = 0.4;
                ++i;
            }
            mc["mcIcon" + param1].alpha = 1;
        };
        mc = new popup_truce_accept();
        mc.bShare.SetupKey("btn_share");
        mc.bShare.addEventListener(MouseEvent.CLICK, Share);
        mc.bShare.Highlight = true;
        mc.tTitle.htmlText = KEYS.Get("popup_desc_truceaccept");
        i = 1;
        while (i < 4) {
            mc["mcIcon" + i].buttonMode = true;
            mc["mcIcon" + i].gotoAndStop(i + 3);
            mc["mcIcon" + i].addEventListener(MouseEvent.CLICK, Switch(i));
            i++;
        }
        POPUPS.Push(mc);
        SwitchB(1);
    }

    public static TruceSent(param1: string, param2: string): void {
        let mc: MovieClip = null;
        let i: int = 0;
        let imgNumber: int = 0;
        let name: string = null;
        let SwitchB: Function = null;
        mc = null;
        i = 0;
        let Share: Function = null;
        imgNumber = 0;
        name = param1;
        let message: string = param2;
        Share = (param1: MouseEvent = null): void => {
            GLOBAL.CallJS("sendFeed", ["Truce", KEYS.Get("map_truceproposed_streamtitle", { "v1": name }), KEYS.Get("map_truceproposed_streambody"), "truceaccept" + imgNumber + ".png", 0]);
            POPUPS.Next();
        };
        let Switch: Function = (param1: int): Function => {
            let n: int = 0;
            n = param1;
            return (param1: MouseEvent = null): void => {
                SwitchB(n);
            };
        };
        SwitchB = (param1: int): void => {
            imgNumber = param1;
            i = 1;
            while (i < 4) {
                mc["mcIcon" + i].alpha = 0.4;
                ++i;
            }
            mc["mcIcon" + param1].alpha = 1;
        };
        mc = new popup_truce_sent();
        mc.bShare.SetupKey("btn_share");
        mc.bShare.addEventListener(MouseEvent.CLICK, Share);
        mc.bShare.Highlight = true;
        mc.tTitle.htmlText = KEYS.Get("popup_desc_trucesent");
        i = 1;
        while (i < 4) {
            mc["mcIcon" + i].buttonMode = true;
            mc["mcIcon" + i].gotoAndStop(i + 3);
            mc["mcIcon" + i].addEventListener(MouseEvent.CLICK, Switch(i));
            i++;
        }
        POPUPS.Push(mc);
        SwitchB(1);
    }

    public static TruceRejected(param1: string, param2: string): void {
        let mc: MovieClip = null;
        let i: int = 0;
        let imgNumber: int = 0;
        let name: string = null;
        let SwitchB: Function = null;
        mc = null;
        i = 0;
        let Share: Function = null;
        imgNumber = 0;
        name = param1;
        let message: string = param2;
        Share = (param1: MouseEvent = null): void => {
            GLOBAL.CallJS("sendFeed", ["Truce", KEYS.Get("map_trucerejected_streamtitle", { "v1": name }), KEYS.Get("map_trucerejected_streambody"), "taunt" + imgNumber + ".png", 0]);
            POPUPS.Next();
        };
        let Switch: Function = (param1: int): Function => {
            let n: int = 0;
            n = param1;
            return (param1: MouseEvent = null): void => {
                SwitchB(n);
            };
        };
        SwitchB = (param1: int): void => {
            imgNumber = param1;
            i = 1;
            while (i < 4) {
                mc["mcIcon" + i].alpha = 0.4;
                ++i;
            }
            mc["mcIcon" + param1].alpha = 1;
        };
        mc = new popup_truce_sent();
        mc.bShare.SetupKey("btn_share");
        mc.bShare.addEventListener(MouseEvent.CLICK, Share);
        mc.bShare.Highlight = true;
        mc.tTitle.htmlText = KEYS.Get("popup_desc_trucesent");
        i = 1;
        while (i < 4) {
            mc["mcIcon" + i].buttonMode = true;
            mc["mcIcon" + i].gotoAndStop(i);
            mc["mcIcon" + i].addEventListener(MouseEvent.CLICK, Switch(i));
            i++;
        }
        POPUPS.Push(mc);
        SwitchB(1);
    }

    public static setVisitingFriend(param1: boolean): void {
        MAPROOM_DESCENT._visitingFriend = param1;
    }

    private static setLastSort(param1: int): void {
        MAPROOM_DESCENT._lastSort = param1;
        GLOBAL.StatSet("mrls", MAPROOM._lastSort);
    }

    private static setLastView(param1: int): void {
        MAPROOM_DESCENT._lastView = param1;
        GLOBAL.StatSet("mrlv", MAPROOM_DESCENT._lastView);
    }

    private static setLastSortReversed(param1: int): void {
        MAPROOM_DESCENT._lastSortReversed = param1;
        GLOBAL.StatSet("mrlsr", MAPROOM._lastSortReversed);
    }

    public static get DescentLevel(): int {
        let _loc1_: int = MAPROOM_DESCENT._descentLvl;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (Boolean(WMBASE._descentBases) && WMBASE._descentBases.length > 0) {
                _loc1_ = WMBASE.CheckDescentProgress();
                MAPROOM_DESCENT._descentLvl = _loc1_;
                GLOBAL.StatSet("descentLvl", MAPROOM_DESCENT._descentLvl);
            } else {
                _loc1_ = GLOBAL.StatGet("descentLvl");
            }
        }
        return _loc1_;
    }

    public static get InDescent(): boolean {
        let _loc1_: boolean = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            MAPROOM_DESCENT._descentLvl = GLOBAL.StatGet("descentLvl");
        }
        return MAPROOM_DESCENT._descentLvl < MAPROOM_DESCENT._descentLvlMax ? true : false;
    }

    public static get DescentPassed(): boolean {
        if (GLOBAL.INFERNO_ONLY) {
            return true;
        }
        let _loc2_: int = 0;
        let _loc1_: boolean = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && GLOBAL.StatGet("descentLvl") < 1) {
            return false;
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc2_ = GLOBAL.StatGet("descentLvl");
            MAPROOM_DESCENT._descentLvl = MAPROOM_DESCENT._descentLvl < _loc2_ ? _loc2_ : MAPROOM_DESCENT._descentLvl;
        }
        return MAPROOM_DESCENT._descentLvl >= MAPROOM_DESCENT._descentLvlMax;
    }
}

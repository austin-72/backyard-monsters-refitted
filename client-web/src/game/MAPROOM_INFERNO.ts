import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent, ProgressEvent } from "flash/events";
import { BASE, GLOBAL, HOUSING, KEYS, LOGGER, LOGIN, MAPROOM, PLEASEWAIT, POPUPS, SOUNDS, TRIBES, TUTORIAL, URLLoaderApi, WMBASE, com_monsters_mailbox_Message as Message, com_monsters_maproom_inferno_MapRoom as MapRoom, popup_truce, popup_truce_accept, popup_truce_sent } from "@game";

export class MAPROOM_INFERNO extends ASObject {
    public static _mc: MapRoom = null;

    public static _open: boolean = false;

    public static _lastView: int = 0;

    public static _lastSort: int = 3;

    public static _lastSortReversed: int = 0;

    public static _visitingFriend: boolean = false;

    private static loadState: int = 0;

    private static andShow: boolean = true;

    private static bridge_obj: any = null;

    public static _initialized: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        MAPROOM_INFERNO._mc = null;
        MAPROOM_INFERNO.loadState = 0;
        MAPROOM_INFERNO._open = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            MAPROOM_INFERNO._visitingFriend = false;
            MAPROOM_INFERNO.bridge_obj = { "Timestamp": GLOBAL.Timestamp, "GLOBAL": GLOBAL, "BASE": BASE, "readyFunction": MAPROOM_INFERNO.onMapRoomReady, "ErrorMessage": GLOBAL.ErrorMessage, "Log": LOGGER.Log, "URLLoaderApi": URLLoaderApi, "Hide": MAPROOM_INFERNO.Hide, "truceShareHandler": MAPROOM_INFERNO.TruceSent, "Log": LOGGER.Log, "playerBaseID": BASE._loadedBaseID, "playerBaseSeed": BASE._baseSeed, "_playerName": LOGIN._playerName, "_playerPic": LOGIN._playerPic, "LoadBase": BASE.LoadBase, "MessageUI": Message, "HOUSING": HOUSING, "RequestTruce": MAPROOM_INFERNO.RequestTruce, "TruceSent": MAPROOM_INFERNO.TruceSent, "setLastView": MAPROOM_INFERNO.setLastView, "setLastSort": MAPROOM_INFERNO.setLastSort, "setLastSortReversed": MAPROOM_INFERNO.setLastSortReversed, "setVisitingFriend": MAPROOM_INFERNO.setVisitingFriend, "SOUNDS": SOUNDS, "BaseLevel": BASE.BaseLevel, "scrollToBaseID": 0, "TUTORIAL": TUTORIAL, "WMBASE": WMBASE, "TRIBES": TRIBES, "KEYS": KEYS, "MAPROOM": MAPROOM_INFERNO };
            MAPROOM_INFERNO._initialized = true;
        }
    }

    public static Show(param1: MouseEvent = null): void {
        if (GLOBAL._otherStats["mrlsr"] != undefined) {
            MAPROOM_INFERNO._lastSortReversed = GLOBAL.StatGet("mrlsr");
        }
        if (GLOBAL._otherStats["mrls"] != undefined) {
            MAPROOM_INFERNO._lastSort = GLOBAL.StatGet("mrls");
        }
        if (GLOBAL._otherStats["mrlv"] != undefined) {
            MAPROOM_INFERNO._lastView = GLOBAL.StatGet("mrlv");
        }
        MAPROOM_INFERNO.bridge_obj._lastView = MAPROOM_INFERNO._lastView;
        MAPROOM_INFERNO.bridge_obj._lastSort = MAPROOM_INFERNO._lastSort;
        MAPROOM_INFERNO.bridge_obj._lastSortReversed = MAPROOM_INFERNO._lastSortReversed;
        MAPROOM_INFERNO.andShow = true;
        if (GLOBAL._flags.infernoMapBlocked == 0) {
            GLOBAL.Message(KEYS.Get("map_msg_disabled"));
            return;
        }
        if (GLOBAL._flags.maproom == 1) {
            GLOBAL.BlockerAdd();
            SOUNDS.Play("click1");
            MAPROOM_INFERNO._open = true;
            if (MAPROOM_INFERNO.loadState != 2 && MAPROOM_INFERNO.loadState != 1) {
                MAPROOM_INFERNO._mc = new MapRoom();
                MAPROOM_INFERNO._mc.init(MAPROOM_INFERNO.bridge_obj);
                GLOBAL._layerTop.addChild(MAPROOM_INFERNO._mc);
            } else if (MAPROOM_INFERNO.loadState == 2) {
                MAPROOM_INFERNO.ShowB();
            }
        } else {
            GLOBAL.Message(KEYS.Get("map_msg_disabled"));
        }
    }

    private static ShowB(): void {
        MAPROOM_INFERNO.andShow = false;
        GLOBAL._layerWindows.addChild(MAPROOM_INFERNO._mc);
        GLOBAL.WaitHide();
    }

    private static mapRoomProgress(param1: ProgressEvent): void {
        let _loc2_: int = (param1.bytesLoaded / param1.bytesTotal * 100) | 0;
        PLEASEWAIT.MessageChange(_loc2_ + "%");
    }

    private static onMapRoomReady(): void {
        MAPROOM_INFERNO.loadState = 2;
        if (MAPROOM_INFERNO.andShow) {
            MAPROOM_INFERNO.ShowB();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        try {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            GLOBAL._layerWindows.removeChild(MAPROOM_INFERNO._mc);
            MAPROOM_INFERNO._open = false;
            MAPROOM_INFERNO._mc.Hide();
            MAPROOM_INFERNO._mc = null;
            MAPROOM_INFERNO.loadState = 0;
        } catch (e) {
        }
    }

    public static Tick(): void {
        if (Boolean(MAPROOM_INFERNO._mc) && Boolean(MAPROOM_INFERNO._mc.parent)) {
            MAPROOM_INFERNO._mc.Tick();
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
                    if (MAPROOM_INFERNO._mc) {
                        MAPROOM_INFERNO._mc.Get();
                    }
                } else {
                    LOGGER.Log("err", "MAPROOM.RequestTruce: " + JSON.stringify(param1));
                }
            };
            new URLLoaderApi().load(GLOBAL._apiURL + "player/requesttruce", [["baseid", baseid], ["duration", 1209600], ["message", mc.bMessage.text]], handleLoadSuccessful);
            POPUPS.Next();
            MAPROOM_INFERNO.TruceSent(name, as3.str(mc.bMessage.text));
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
        MAPROOM_INFERNO._visitingFriend = param1;
    }

    private static setLastSort(param1: int): void {
        MAPROOM_INFERNO._lastSort = param1;
        GLOBAL.StatSet("mrls", MAPROOM._lastSort);
    }

    private static setLastView(param1: int): void {
        MAPROOM_INFERNO._lastView = param1;
        GLOBAL.StatSet("mrlv", MAPROOM_INFERNO._lastView);
    }

    private static setLastSortReversed(param1: int): void {
        MAPROOM_INFERNO._lastSortReversed = param1;
        GLOBAL.StatSet("mrlsr", MAPROOM._lastSortReversed);
    }
}

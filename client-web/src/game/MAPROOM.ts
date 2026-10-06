import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent, ProgressEvent } from "flash/events";
import { BASE, GLOBAL, HOUSING, KEYS, LOGGER, LOGIN, PLEASEWAIT, POPUPS, SOUNDS, TRIBES, TUTORIAL, URLLoaderApi, WMBASE, com_monsters_mailbox_Message as Message, com_monsters_maproom_MapRoom as MapRoom, popup_truce, popup_truce_accept, popup_truce_sent } from "@game";

export class MAPROOM extends ASObject {
    public static readonly TYPE: uint = 11;

    public static _mc: MapRoom = null;

    public static _open: boolean = false;

    public static _lastView: int = 0;

    public static _lastSort: int = 3;

    public static _lastSortReversed: int = 0;

    public static _visitingFriend: boolean = false;

    public static initMaproomSetup: boolean = false;

    private static loadState: int = 0;

    private static andShow: boolean = true;

    private static bridge_obj: any = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        MAPROOM._mc = null;
        MAPROOM.loadState = 0;
        MAPROOM._open = false;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            MAPROOM._visitingFriend = false;
            MAPROOM.bridge_obj = { "Timestamp": GLOBAL.Timestamp, "GLOBAL": GLOBAL, "BASE": BASE, "readyFunction": MAPROOM.onMapRoomReady, "ErrorMessage": GLOBAL.ErrorMessage, "Log": LOGGER.Log, "URLLoaderApi": URLLoaderApi, "Hide": MAPROOM.Hide, "truceShareHandler": MAPROOM.TruceSent, "Log": LOGGER.Log, "playerBaseID": BASE._loadedBaseID, "playerBaseSeed": BASE._baseSeed, "_playerName": LOGIN._playerName, "_playerPic": LOGIN._playerPic, "LoadBase": BASE.LoadBase, "MessageUI": Message, "HOUSING": HOUSING, "RequestTruce": MAPROOM.RequestTruce, "TruceSent": MAPROOM.TruceSent, "setLastView": MAPROOM.setLastView, "setLastSort": MAPROOM.setLastSort, "setLastSortReversed": MAPROOM.setLastSortReversed, "setVisitingFriend": MAPROOM.setVisitingFriend, "SOUNDS": SOUNDS, "BaseLevel": BASE.BaseLevel, "scrollToBaseID": 0, "TUTORIAL": TUTORIAL, "WMBASE": WMBASE, "TRIBES": TRIBES, "KEYS": KEYS, "MAPROOM": MAPROOM };
        }
    }

    public static Show(param1: MouseEvent = null): void {
        if (GLOBAL._otherStats["mrlsr"] != undefined) {
            MAPROOM._lastSortReversed = GLOBAL.StatGet("mrlsr");
        }
        if (GLOBAL._otherStats["mrls"] != undefined) {
            MAPROOM._lastSort = GLOBAL.StatGet("mrls");
        }
        if (GLOBAL._otherStats["mrlv"] != undefined) {
            MAPROOM._lastView = GLOBAL.StatGet("mrlv");
        }
        MAPROOM.bridge_obj._lastView = MAPROOM._lastView;
        MAPROOM.bridge_obj._lastSort = MAPROOM._lastSort;
        MAPROOM.bridge_obj._lastSortReversed = MAPROOM._lastSortReversed;
        MAPROOM.andShow = true;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            if (GLOBAL._flags.maproom == 1) {
                if (GLOBAL._newBuilding) {
                    GLOBAL._newBuilding.Cancel();
                }
                if (GLOBAL._bMap) {
                    if (GLOBAL._bMap._canFunction && MAPROOM.initMaproomSetup) {
                        GLOBAL.BlockerAdd();
                        SOUNDS.Play("click1");
                        MAPROOM._open = true;
                        if ([1, 2].indexOf(MAPROOM.loadState) === -1) {
                            // Loads Map Room 1
                            // This can be triggered if save.usemap on the server is not set or 0
                            MAPROOM._mc = new MapRoom();
                            MAPROOM._mc.init(MAPROOM.bridge_obj);
                            GLOBAL._layerTop.addChild(MAPROOM._mc);
                        } else if (MAPROOM.loadState == 2) {
                            MAPROOM.ShowB();
                        }
                    } else if (!GLOBAL._flags.discordOldEnough) {
                        GLOBAL.Message(KEYS.Get("newmap_discord_age"));
                    } else if (!MAPROOM.initMaproomSetup) {
                        GLOBAL.Message(KEYS.Get("newmap_init_setup"));
                    } else {
                        GLOBAL.Message(KEYS.Get("map_msg_damaged"));
                    }
                } else {
                    GLOBAL.Message(KEYS.Get("map_msg_notbuilt"));
                }
            } else {
                GLOBAL.Message(KEYS.Get("map_msg_disabled"));
            }
        }
    }

    private static ShowB(): void {
        MAPROOM.andShow = false;
        GLOBAL._layerWindows.addChild(MAPROOM._mc);
        GLOBAL.WaitHide();
    }

    private static mapRoomProgress(param1: ProgressEvent): void {
        let _loc2_: int = (param1.bytesLoaded / param1.bytesTotal * 100) | 0;
        PLEASEWAIT.MessageChange(_loc2_ + "%");
    }

    private static onMapRoomReady(): void {
        MAPROOM.loadState = 2;
        if (MAPROOM.andShow) {
            MAPROOM.ShowB();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        try {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            GLOBAL._layerWindows.removeChild(MAPROOM._mc);
            MAPROOM._open = false;
            MAPROOM._mc.Hide();
            MAPROOM._mc = null;
            MAPROOM.loadState = 0;
        } catch (e) {
        }
    }

    public static Tick(): void {
        if (Boolean(MAPROOM._mc) && Boolean(MAPROOM._mc.parent)) {
            MAPROOM._mc.Tick();
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
                    if (MAPROOM._mc) {
                        MAPROOM._mc.Get();
                    }
                } else {
                    LOGGER.Log("err", "MAPROOM.RequestTruce: " + JSON.stringify(param1));
                }
            };
            new URLLoaderApi().load(GLOBAL._apiURL + "player/requesttruce", [["baseid", baseid], ["duration", 1209600], ["message", mc.bMessage.text]], handleLoadSuccessful);
            POPUPS.Next();
            MAPROOM.TruceSent(name, as3.str(mc.bMessage.text));
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
        MAPROOM._visitingFriend = param1;
    }

    private static setLastSort(param1: int): void {
        MAPROOM._lastSort = param1;
        GLOBAL.StatSet("mrls", MAPROOM._lastSort);
    }

    private static setLastView(param1: int): void {
        MAPROOM._lastView = param1;
        GLOBAL.StatSet("mrlv", MAPROOM._lastView);
    }

    private static setLastSortReversed(param1: int): void {
        MAPROOM._lastSortReversed = param1;
        GLOBAL.StatSet("mrlsr", MAPROOM._lastSortReversed);
    }
}

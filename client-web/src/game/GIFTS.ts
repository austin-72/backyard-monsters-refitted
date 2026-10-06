import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Loader, MovieClip } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { BASE, BYMDevConfig, EnumYardType, GLOBAL, KEYS, LOGGER, MapRoomManager, POPUPS, QUESTS, TUTORIAL, popup_gift, print } from "@game";

export class GIFTS extends ASObject {
    public static _giftsAccepted: any[] = [];

    public static _sentGiftsAccepted: any[] = [];

    public static _sentInvitesAccepted: any[] = [];

    public static _mc: MovieClip = null;

    public static _maxXPReward: uint = 100000;

    public $ctor(): void {
        super.$ctor();
    }

    public static Process(param1: any): void {
        let _loc2_: any[] = null;
        let _loc3_: number = NaN;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        if (TUTORIAL._stage >= 69) {
            for (_loc2_ of as3.values(param1)) {
                if (Math.random() * 100 > 75) {
                    _loc3_ = 0.07 + Math.random() * 0.05;
                } else {
                    _loc3_ = 0.02 + Math.random() * 0.02;
                }
                _loc4_ = (1 + Math.random() * 4) | 0;
                _loc5_ = (BASE._resources["r" + _loc4_ + "max"] * _loc3_) | 0;
                GIFTS.Show(_loc4_, as3.str(_loc2_[0]), as3.str(_loc2_[1]), as3.str(_loc2_[2]), as3.str(_loc2_[3]), _loc5_);
            }
        }
    }

    public static ProcessAcceptedGifts(param1: any[]): void {
        let _loc2_: any[] = null;
        let _loc3_: number = NaN;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        print("Processing Accepted Gifts, " + param1);
        if (TUTORIAL._stage >= 69) {
            for (_loc2_ of as3.values(param1)) {
                if (Math.random() * 100 > 75) {
                    _loc3_ = 0.07 + Math.random() * 0.05;
                } else {
                    _loc3_ = 0.02 + Math.random() * 0.02;
                }
                _loc4_ = (1 + Math.random() * 4) | 0;
                _loc5_ = (BASE._resources["r" + _loc4_ + "max"] * _loc3_) | 0;
                GIFTS.ShowSentGift(_loc4_, as3.str(_loc2_[0]), as3.str(_loc2_[1]), as3.str(_loc2_[2]), as3.str(_loc2_[3]), _loc5_);
            }
        }
    }

    public static ProcessAcceptedInvites(param1: any[]): void {
        let _loc2_: any[] = null;
        let _loc3_: number = NaN;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        if (TUTORIAL._stage >= 69) {
            for (_loc2_ of as3.values(param1)) {
                if (Math.random() * 100 > 75) {
                    _loc3_ = 0.07 + Math.random() * 0.05;
                } else {
                    _loc3_ = 0.02 + Math.random() * 0.02;
                }
                _loc4_ = (1 + Math.random() * 4) | 0;
                _loc5_ = (BASE._resources["r" + _loc4_ + "max"] * _loc3_) | 0;
                GIFTS.ShowSentInvite(_loc4_, as3.str(_loc2_[0]), as3.str(_loc2_[1]), as3.str(_loc2_[2]), as3.str(_loc2_[3]), _loc5_);
            }
        }
    }

    public static Show(param1: int, param2: string, param3: string, param4: string, param5: string, param6: int): void {
        let loader: Loader = null;
        let img: string = null;
        let LoadImageError: Function = null;
        let onImageLoaded: Function = null;
        loader = null;
        let resourceID: int = param1;
        let giftID: string = param2;
        let giftFromName: string = param3;
        let giftFromID: string = param4;
        let profilePic: string = param5;
        let giftValue: int = param6;
        GIFTS._mc = new popup_gift();
        GIFTS._mc.gotoAndStop(resourceID);
        GIFTS._mc.tA.htmlText = KEYS.Get("pop_gift_title", { "v1": giftFromName });
        GIFTS._mc.tB.htmlText = "<b>" + GLOBAL.FormatNumber(giftValue) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[resourceID - 1])) + "</b>";
        GIFTS._mc.bReturn.SetupKey("pop_giftback_btn");
        GIFTS._mc.bReturn.Highlight = true;
        GIFTS._mc.bReturn.addEventListener(MouseEvent.CLICK, GIFTS.SendGift);
        GIFTS._mc.bReturn.visible = true;
        GIFTS._mc.bReturn.mouseEnabled = true;
        GIFTS._mc.bThanks.SetupKey("pop_saythanks_btn");
        GIFTS._mc.bThanks.Highlight = true;
        GIFTS._mc.bThanks.addEventListener(MouseEvent.CLICK, GIFTS.GiveThanks(resourceID, giftFromID, giftValue));
        if (profilePic) {
            try {
                LoadImageError = (param1: IOErrorEvent): void => {
                };
                onImageLoaded = (param1: Event): void => {
                    loader.width = loader.height = 50;
                };
                loader = new Loader();
                loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoaded);
                GIFTS._mc.mcPic.mcBG.addChild(loader);
                loader.load(new URLRequest(profilePic));
            } catch (e) {
            }
        }
        img = "resourcetwigs.png";
        if (!BASE.isInfernoMainYardOrOutpost) {
            if (resourceID == 2) {
                img = "resourcepebbles.png";
            }
            if (resourceID == 3) {
                img = "resourceputty.png";
            }
            if (resourceID == 4) {
                img = "resourcegoo.png";
            }
        } else {
            if (resourceID == 1) {
                img = "resource-cauldron_bones.png";
            }
            if (resourceID == 2) {
                img = "resource-cauldron_coal.png";
            }
            if (resourceID == 3) {
                img = "resource-cauldron_sulphur.png";
            }
            if (resourceID == 4) {
                img = "resource-cauldron_magma.png";
            }
        }
        POPUPS.Push(GIFTS._mc, GIFTS.Fund, [giftID, resourceID, giftValue], "", img, false, "gifts");
    }

    public static ShowSentGift(param1: int, param2: string, param3: string, param4: string, param5: string, param6: int): void {
        let loader: Loader = null;
        let img: string = null;
        let LoadImageError: Function = null;
        let onImageLoaded: Function = null;
        loader = null;
        let resourceID: int = param1;
        let giftID: string = param2;
        let giftFromName: string = param3;
        let giftFromID: string = param4;
        let profilePic: string = param5;
        let giftValue: int = param6;
        let onePctNextLevelXP: int = 0;
        let lvlInfo: any = BASE.BaseLevel();
        onePctNextLevelXP = (lvlInfo.upper * 0.01) | 0;
        onePctNextLevelXP = onePctNextLevelXP > GIFTS._maxXPReward ? GIFTS._maxXPReward | 0 : onePctNextLevelXP;
        GIFTS._mc = new popup_gift();
        GIFTS._mc.tA.htmlText = KEYS.Get("pop_sentgift_title", { "v1": giftFromName });
        GIFTS._mc.tB.htmlText = "<b>" + GLOBAL.FormatNumber(onePctNextLevelXP) + " " + KEYS.Get("#r_points#") + "</b>";
        GIFTS._mc.bReturn.SetupKey("btn_close");
        GIFTS._mc.bReturn.Highlight = true;
        GIFTS._mc.bReturn.visible = false;
        GIFTS._mc.bReturn.mouseEnabled = false;
        GIFTS._mc.bThanks.SetupKey("btn_close");
        GIFTS._mc.bThanks.Highlight = true;
        GIFTS._mc.bThanks.addEventListener(MouseEvent.CLICK, GIFTS.ClosePopup);
        if (profilePic) {
            try {
                LoadImageError = (param1: IOErrorEvent): void => {
                };
                onImageLoaded = (param1: Event): void => {
                    loader.width = loader.height = 50;
                };
                loader = new Loader();
                loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoaded);
                GIFTS._mc.mcPic.mcBG.addChild(loader);
                loader.load(new URLRequest(profilePic));
            } catch (e) {
            }
        }
        img = "fantastic.png";
        POPUPS.Push(GIFTS._mc, GIFTS.AddXP, [giftID, giftValue], "", img, false, "gifts");
    }

    public static ShowSentInvite(param1: int, param2: string, param3: string, param4: string, param5: string, param6: int): void {
        let loader: Loader = null;
        let img: string = null;
        let LoadImageError: Function = null;
        let onImageLoaded: Function = null;
        loader = null;
        let resourceID: int = param1;
        let giftID: string = param2;
        let giftFromName: string = param3;
        let giftFromID: string = param4;
        let profilePic: string = param5;
        let giftValue: int = param6;
        let onePctNextLevelXP: int = 0;
        let lvlInfo: any = BASE.BaseLevel();
        onePctNextLevelXP = (lvlInfo.upper * 0.01) | 0;
        onePctNextLevelXP = onePctNextLevelXP > GIFTS._maxXPReward ? GIFTS._maxXPReward | 0 : onePctNextLevelXP;
        GIFTS._mc = new popup_gift();
        GIFTS._mc.tA.htmlText = KEYS.Get("pop_sentinvite_title", { "v1": giftFromName });
        GIFTS._mc.tB.htmlText = "<b>" + GLOBAL.FormatNumber(onePctNextLevelXP) + " " + KEYS.Get("#r_points#") + "</b>";
        GIFTS._mc.bReturn.SetupKey("pop_sentinvite_gift");
        GIFTS._mc.bReturn.Highlight = true;
        GIFTS._mc.bReturn.addEventListener(MouseEvent.CLICK, GIFTS.SendGift);
        GIFTS._mc.bReturn.visible = true;
        GIFTS._mc.bReturn.mouseEnabled = true;
        GIFTS._mc.bThanks.SetupKey("pop_sentinvite_visit");
        GIFTS._mc.bThanks.Highlight = true;
        GIFTS._mc.bThanks.addEventListener(MouseEvent.CLICK, GIFTS.HelpFriend(giftFromID));
        if (profilePic) {
            try {
                LoadImageError = (param1: IOErrorEvent): void => {
                };
                onImageLoaded = (param1: Event): void => {
                    loader.width = loader.height = 50;
                };
                loader = new Loader();
                loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, LoadImageError, false, 0, true);
                loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageLoaded);
                GIFTS._mc.mcPic.mcBG.addChild(loader);
                loader.load(new URLRequest(profilePic));
            } catch (e) {
            }
        }
        img = "fantastic.png";
        POPUPS.Push(GIFTS._mc, GIFTS.AddXP, [giftID, giftValue], "", img, false, "gifts");
    }

    public static Fund(param1: string, param2: int, param3: int): void {
        GIFTS._giftsAccepted.push(param1);
        BASE.Fund(param2, param3);
        BASE.Save();
        LOGGER.Stat([19, param2, param3, (100 / BASE._resources["r" + param2 + "max"] * param3) | 0]);
    }

    public static AddXP(param1: string, param2: uint): void {
        GIFTS._sentGiftsAccepted.push(param1);
        ++QUESTS._global.gift_accept;
        QUESTS.Check();
        BASE.PointsAdd(param2);
        BASE.Save();
    }

    public static HelpFriend(param1: string): Function {
        let giftFromID: string = null;
        giftFromID = param1;
        return (param1: MouseEvent = null): void => {
            POPUPS.Next();
            let _loc2_: any = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER : EnumYardType.MAIN_YARD;
            BASE.LoadBase(null, Number(giftFromID) | 0, 0, "help", false, _loc2_ | 0);
        };
    }

    public static GiveThanks(param1: int, param2: string, param3: int): Function {
        let resourceID: int = 0;
        let giftFromID: string = null;
        let giftValue: int = 0;
        resourceID = param1;
        giftFromID = param2;
        giftValue = param3;
        return (param1: MouseEvent = null): void => {
            let _loc2_: any = BASE.isInfernoMainYardOrOutpost ? resourceID + 4 : resourceID;
            let _loc3_: any = "gift" + _loc2_ + ".png";
            GLOBAL.CallJS("sendFeed", ["thanks", KEYS.Get("pop_givethanks_streamtitle"), KEYS.Get("pop_givethanks_streambody", { "v1": GLOBAL.FormatNumber(giftValue), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[resourceID - 1])) }), _loc3_, giftFromID]);
            POPUPS.Next();
        };
    }

    public static SendGift(param1: MouseEvent): void {
        if (BYMDevConfig.instance.USE_CLIENT_WITH_CALLBACK) {
            GLOBAL.CallJSWithClient("cc.showFeedDialog", "callbackgift", ["gift"]);
        } else {
            GLOBAL.CallJS("cc.showFeedDialog", ["gift", "callbackgift"]);
        }
        POPUPS.Next();
    }

    public static ClosePopup(param1: MouseEvent): void {
        POPUPS.Next(param1);
    }
}

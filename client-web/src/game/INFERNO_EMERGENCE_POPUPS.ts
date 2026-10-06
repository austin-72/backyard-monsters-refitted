import { ASObject, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BUILDINGOPTIONS, GLOBAL, INFERNOPORTAL, INFERNO_EMERGENCE_ATTACKPOPUP, INFERNO_EMERGENCE_EVENT, INFERNO_PORTAL_ATTACK, ImageCache, KEYS, POPUPS, popup_infernoemerge_complete, popup_infernoemerge_dialog, popup_infernoemerge_roundover, popup_infernoemerge_upgrade } from "@game";

export class INFERNO_EMERGENCE_POPUPS extends ASObject {
    public static _warningPopup: INFERNO_EMERGENCE_ATTACKPOPUP = null;

    public static _lvl: int = 0;

    public static EVENT_DIALOGUE_START: string = "emerge_dialogue_started";

    public static EVENT_DIALOGUE_1: string = "emerge_start_1";

    public static EVENT_DIALOGUE_2: string = "emerge_start_2";

    public static EVENT_DIALOGUE_3: string = "emerge_start_3";

    public static EVENT_DIALOGUE_4: string = "emerge_start_4";

    public static EVENT_DIALOGUE_5: string = "emerge_start_5";

    public static EVENT_DIALOGUE_DEFAULT: string = "emerge_dialogue_default";

    public static INFERNO_UPGRADE_SHOWN: string = "infernoUpgradeShown";

    public $ctor(): void {
        super.$ctor();
    }

    public static ShowUpgrade(): void {
        let _loc1_: MovieClip = null;
        _loc1_ = new popup_infernoemerge_upgrade();
        _loc1_.tTitle.htmlText = KEYS.Get("emerge_upgrade_title");
        _loc1_.tBody.htmlText = KEYS.Get("emerge_upgrade_body");
        _loc1_.bAction.buttonMode = true;
        _loc1_.bAction.useHandCursor = true;
        _loc1_.bAction.mouseChildren = false;
        _loc1_.bAction.Setup(KEYS.Get("emerge_upgrade_btnaction"));
        if (GLOBAL.townHall._lvl.Get() >= INFERNO_EMERGENCE_EVENT.TOWN_HALL_LEVEL_REQUIREMENT) {
            _loc1_.bAction.visible = false;
        }
        _loc1_.bAction.addEventListener(MouseEvent.CLICK, INFERNO_EMERGENCE_POPUPS.EmergeUpgradeCB);
        POPUPS.Push(_loc1_, INFERNO_EMERGENCE_POPUPS.ShownUpgradeCB);
    }

    private static EmergeUpgradeCB(param1: MouseEvent): void {
        GLOBAL._selectedBuilding = GLOBAL.townHall;
        BUILDINGOPTIONS.Show(GLOBAL.townHall, "upgrade");
        POPUPS.Next();
    }

    public static ShowStart(): void {
        INFERNO_EMERGENCE_POPUPS.ShowDialogue(0);
    }

    public static ShownUpgradeCB(): void {
    }

    public static ShowDialogue(param1: int): MovieClip {
        let _loc2_: string = null;
        let _loc3_: Point = null;
        let _loc4_: string = null;
        let _loc5_: string = null;
        let _loc6_: string = null;
        let _loc7_: Function = null;
        INFERNO_EMERGENCE_POPUPS._lvl = param1;
        switch (param1) {
            case 0:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_intro");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 1:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt1");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 2:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt2");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 3:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt3");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 4:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt4");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 5:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt5");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
        }
        let _loc8_: MovieClip = null;
        (_loc8_ = POPUPS.DisplayDialogue(_loc4_, _loc5_, _loc6_, _loc2_, _loc3_, _loc7_)).addEventListener(Event.REMOVED_FROM_STAGE, INFERNO_EMERGENCE_POPUPS.DialogueCB, false, 0, true);
        return _loc8_;
    }

    public static DialogueCB(param1: Event): void {
        let _loc2_: string = INFERNO_EMERGENCE_POPUPS.EVENT_DIALOGUE_DEFAULT;
        param1.target.dispatchEvent(new Event(_loc2_));
        param1.target.removeEventListener(Event.REMOVED_FROM_STAGE, INFERNO_EMERGENCE_POPUPS.DialogueCB);
    }

    public static ShowRSVP(param1: int): void {
        let showRSVP: MovieClip = null;
        let isEventOver: boolean = false;
        let portrait: string = null;
        let imgOffset: Point = null;
        let title: string = null;
        let line: string = null;
        let btnLabel: string = null;
        let action: Function = null;
        let RSVPLink: Function = null;
        let lvl: int = param1;
        RSVPLink = (param1: MouseEvent): void => {
            GLOBAL.gotoURL("http://www.facebook.com/events/242085715856757/", null, true, null);
            POPUPS.Next();
        };
        INFERNO_EMERGENCE_POPUPS._lvl = lvl;
        switch (lvl) {
            case 0:
                portrait = "portrait_moloch.png";
                imgOffset = new Point(-75, 50);
                title = "";
                line = KEYS.Get("cavern_pop1");
                btnLabel = KEYS.Get("emerge_RSVP");
                action = POPUPS.Next;
                break;
            case 1:
                portrait = "portrait_moloch.png";
                imgOffset = new Point(-75, 50);
                title = "";
                line = KEYS.Get("cavern_pop1");
                btnLabel = KEYS.Get("emerge_RSVP");
                action = POPUPS.Next;
                break;
            case 2:
                portrait = "portrait_moloch.png";
                imgOffset = new Point(-75, 50);
                title = "";
                line = KEYS.Get("cavern_pop2");
                btnLabel = KEYS.Get("emerge_RSVP");
                action = POPUPS.Next;
                break;
            case 3:
                portrait = "portrait_moloch.png";
                imgOffset = new Point(-75, 50);
                title = "";
                line = KEYS.Get("cavern_pop3");
                btnLabel = KEYS.Get("emerge_RSVP");
                action = POPUPS.Next;
                break;
            case 4:
                portrait = "portrait_moloch.png";
                imgOffset = new Point(-75, 50);
                title = "";
                line = KEYS.Get("cavern_pop4");
                btnLabel = KEYS.Get("emerge_RSVP");
                action = POPUPS.Next;
                break;
            case 5:
                portrait = "portrait_moloch.png";
                imgOffset = new Point(-75, 50);
                title = "";
                line = KEYS.Get("entercavernfail_popup");
                btnLabel = KEYS.Get("emerge_RSVP");
                action = POPUPS.Next;
        }
        showRSVP = new popup_infernoemerge_dialog();
        showRSVP.tBody.htmlText = line;
        showRSVP.bAction.buttonMode = true;
        showRSVP.bAction.useHandCursor = true;
        showRSVP.bAction.mouseChildren = false;
        isEventOver = INFERNO_EMERGENCE_EVENT.isLastDay() || INFERNO_EMERGENCE_EVENT.IsPostEvent();
        if (!isEventOver) {
            showRSVP.bAction.Setup(btnLabel);
            showRSVP.bAction.addEventListener(MouseEvent.CLICK, RSVPLink);
        } else if (GLOBAL.townHall._lvl.Get() < INFERNO_EMERGENCE_EVENT.TOWN_HALL_LEVEL_REQUIREMENT) {
            showRSVP.bAction.Setup(KEYS.Get("emerge_upgrade_btnaction"));
            showRSVP.bAction.addEventListener(MouseEvent.CLICK, INFERNO_EMERGENCE_POPUPS.EmergeUpgradeCB);
        } else {
            showRSVP.bAction.visible = false;
        }
        POPUPS.Push(showRSVP, null, null, "");
    }

    public static ShowStagePassed(param1: int): void {
        let completeRound: MovieClip = null;
        completeRound = null;
        let imageCompleteRoundDialogue: Function = null;
        let EmergeBragCB: Function = null;
        let lvl: int = param1;
        imageCompleteRoundDialogue = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            _loc3_.y = -_loc3_.height + 80;
            _loc3_.x = -100;
            completeRound.mcImage.addChild(_loc3_);
        };
        EmergeBragCB = (param1: MouseEvent): void => {
            GLOBAL.CallJS("sendFeed", ["emerge-defense", KEYS.Get("ai_caverndefense_streamtitle"), KEYS.Get("ai_caverndefense_streambody"), "emergence_streampost01A.png"]);
            POPUPS.Next();
        };
        completeRound = new popup_infernoemerge_roundover();
        completeRound.tBody.htmlText = KEYS.Get("ai_caverndefense");
        completeRound.bAction.buttonMode = true;
        completeRound.bAction.useHandCursor = true;
        completeRound.bAction.mouseChildren = false;
        completeRound.bAction.Setup(KEYS.Get("btn_brag"));
        completeRound.bAction.Highlight = true;
        completeRound.bAction.addEventListener(MouseEvent.CLICK, EmergeBragCB);
        ImageCache.GetImageWithCallBack("popups/" + "portrait_moloch.png", imageCompleteRoundDialogue);
        POPUPS.Push(completeRound, null, null, "");
        INFERNO_EMERGENCE_POPUPS._lvl = lvl;
        switch (lvl) {
            case 0:
                INFERNO_EMERGENCE_POPUPS.ShowDialogue(0);
                break;
            case 1:
                INFERNO_EMERGENCE_POPUPS.ShowDialogue(1);
                break;
            case 2:
                INFERNO_EMERGENCE_POPUPS.ShowDialogue(2);
                break;
            case 3:
                INFERNO_EMERGENCE_POPUPS.ShowDialogue(3);
                break;
            case 4:
                INFERNO_EMERGENCE_POPUPS.ShowDialogue(4);
                break;
            case 5:
                INFERNO_EMERGENCE_POPUPS.ShowDialogue(5);
        }
        INFERNO_EMERGENCE_EVENT.EndRound();
        if (lvl == INFERNOPORTAL.GetMaxLevel()) {
            INFERNO_EMERGENCE_POPUPS.ShowComplete();
        }
    }

    public static ShowComplete(): void {
        let completeEmerge: MovieClip = null;
        completeEmerge = null;
        let imageCompleteEmerge: Function = null;
        imageCompleteEmerge = (param1: string, param2: BitmapData): void => {
            let _loc3_: Bitmap = new Bitmap(param2);
            completeEmerge.mcImage.addChild(_loc3_);
        };
        let portrait: string = "portrait_moloch.png";
        let imgOffset: Point = new Point(-75, 50);
        let title: string = "";
        let line: string = KEYS.Get("ai_moloch_intro");
        let btnLabel: string = "Next";
        let action: Function = POPUPS.Next;
        completeEmerge = new popup_infernoemerge_complete();
        completeEmerge.tBody.htmlText = KEYS.Get("entercavern_popup");
        if (GLOBAL.townHall._lvl.Get() >= INFERNO_EMERGENCE_EVENT.TOWN_HALL_LEVEL_REQUIREMENT) {
            completeEmerge.bAction.buttonMode = true;
            completeEmerge.bAction.useHandCursor = true;
            completeEmerge.bAction.mouseChildren = false;
            completeEmerge.bAction.Highlight = true;
            completeEmerge.bAction.Setup(BASE.isInfernoMainYardOrOutpost ? KEYS.Get(INFERNOPORTAL.EXIT_BUTTON) : KEYS.Get(INFERNOPORTAL.ENTER_BUTTON));
            completeEmerge.bAction.addEventListener(MouseEvent.CLICK, INFERNOPORTAL.EnterPortal);
        } else {
            completeEmerge.bAction.visible = false;
            completeEmerge.bAction.mouseEnabled = false;
        }
        ImageCache.GetImageWithCallBack("popups/" + "popup_emergecomplete.v2.jpg", imageCompleteEmerge);
        POPUPS.Push(completeEmerge, null, null, "");
    }

    public static ShowWarning(param1: int): void {
        let _loc2_: string = "portrait_moloch.png";
        let _loc3_: Point = new Point(-75, 50);
        let _loc4_: string = "";
        let _loc5_: string = KEYS.Get("ai_moloch_intro");
        let _loc6_: string = "Next";
        let _loc7_: Function = POPUPS.Next;
        switch (param1) {
            case 0:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_intro");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 1:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt1");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 2:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt2");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 3:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt3");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 4:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt4");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
                break;
            case 5:
                _loc2_ = "portrait_moloch.png";
                _loc3_ = new Point(-75, 50);
                _loc4_ = "";
                _loc5_ = KEYS.Get("ai_moloch_taunt5");
                _loc6_ = "Next";
                _loc7_ = POPUPS.Next;
        }
        let _loc8_: any[] = INFERNO_PORTAL_ATTACK.GetVariableCreeps();
        if (!INFERNO_EMERGENCE_POPUPS._warningPopup) {
            INFERNO_EMERGENCE_POPUPS._warningPopup = new INFERNO_EMERGENCE_ATTACKPOPUP(_loc8_);
            GLOBAL._layerWindows.addChild(INFERNO_EMERGENCE_POPUPS._warningPopup);
            BASE.Save();
        }
    }

    public static HideWarning(): void {
        if (INFERNO_EMERGENCE_POPUPS._warningPopup) {
            if (INFERNO_EMERGENCE_POPUPS._warningPopup.parent) {
                INFERNO_EMERGENCE_POPUPS._warningPopup.parent.removeChild(INFERNO_EMERGENCE_POPUPS._warningPopup);
            }
            INFERNO_EMERGENCE_POPUPS._warningPopup = null;
        }
    }

    public static DefenseBragCB(): void {
    }
}

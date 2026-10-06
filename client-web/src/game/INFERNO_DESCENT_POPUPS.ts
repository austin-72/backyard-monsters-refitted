import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextField } from "flash/text";
import { BASE, EnumYardType, GLOBAL, INFERNOPORTAL, KEYS, LOGGER, MAPROOM_DESCENT, MapRoomManager, POPUPS, WMBASE, popup_dialogue, popup_infernodescent_battle_report, popup_infernoemerge_dialog, popup_infernoentice_CLIP } from "@game";

export class INFERNO_DESCENT_POPUPS extends ASObject {
    private static readonly _MOLOCH_PORTRAIT_GLOAT: string = "portrait_muloch_gloat.png";

    private static readonly _MOLOCH_PORTRAIT_WHIMPER: string = "portrait_muloch_whimper.png";

    private static readonly _MOLOCH_PORTRAIT_NEUTRAL: string = "portrait_moloch.png";

    private static readonly _TOTAL_LOOT_LABEL: string = "descentTotalLoot";

    private static readonly _PORTRAIT_IMAGE_OFFSET: Point = new Point(-75, 50);

    private static _level: uint = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static ShowTauntDialog(param1: uint): void {
        let _loc2_: popup_dialogue = as3.as(POPUPS.DisplayDialogue("", KEYS.Get("descent_moloch_taunt" + param1), KEYS.Get("taunt_player_response" + param1), INFERNO_DESCENT_POPUPS._MOLOCH_PORTRAIT_NEUTRAL, INFERNO_DESCENT_POPUPS._PORTRAIT_IMAGE_OFFSET, POPUPS.Next), popup_dialogue);
        INFERNO_DESCENT_POPUPS.FormatTextFieldForDialog(_loc2_.tBody);
    }

    public static ShowPostAttackPopup(param1: uint, param2: boolean, param3: Vector<uint>, param4: Vector<uint>): void {
        let _loc5_: MovieClip = null;
        INFERNO_DESCENT_POPUPS._level = param1;
        let _loc6_: Vector<uint> = INFERNO_DESCENT_POPUPS.UpdateTotalLoot(param3, param4);
        if (param2) {
            _loc5_ = INFERNO_DESCENT_POPUPS.ShowWhimperDialog(param1);
            INFERNO_DESCENT_POPUPS.ShowBattleReport(param1, param3, _loc6_);
            if (param1 >= MAPROOM_DESCENT._descentLvlMax - 1) {
                INFERNO_DESCENT_POPUPS.ShowCapturePopup();
            }
            LOGGER.Stat([87, param1, "Victory"]);
        } else {
            _loc5_ = INFERNO_DESCENT_POPUPS.ShowGloatDialog(param1);
            LOGGER.Stat([87, param1, "Defeat"]);
        }
    }

    public static ShowEnticePopup(): void {
        let CloseAndEnter: Function = null;
        CloseAndEnter = (param1: MouseEvent): void => {
            POPUPS.Next();
            GLOBAL.StatSet("p_id", 1);
            INFERNOPORTAL.EnterPortal();
        };
        let entice: MovieClip = new popup_infernoentice_CLIP();
        entice.tDesc.htmlText = KEYS.Get("entercavern_direct_popup");
        entice.tButton.htmlText = KEYS.Get(INFERNOPORTAL.ENTER_BUTTON);
        entice.tButton.mouseEnabled = false;
        entice.bEnter.Setup(" ");
        entice.bEnter.addEventListener(MouseEvent.CLICK, CloseAndEnter);
        POPUPS.Push(entice);
    }

    public static ShowGloatDialog(param1: uint): MovieClip {
        return INFERNO_DESCENT_POPUPS.ShowAttackEndDialog(INFERNO_DESCENT_POPUPS._MOLOCH_PORTRAIT_GLOAT, KEYS.Get("descent_moloch_gloat" + param1), KEYS.Get("gloat_player_response" + param1));
    }

    public static ShowWhimperDialog(param1: uint): MovieClip {
        return INFERNO_DESCENT_POPUPS.ShowAttackEndDialog(INFERNO_DESCENT_POPUPS._MOLOCH_PORTRAIT_WHIMPER, KEYS.Get("descent_moloch_whimper" + param1), KEYS.Get("whimper_player_response" + param1));
    }

    public static ShowBattleReport(param1: uint, param2: Vector<uint>, param3: Vector<uint>): void {
        let _loc4_: string = KEYS.Get("descent_battlereport", { "v1": as3.vget(param2, 0), "v2": as3.vget(param2, 1), "v3": as3.vget(param2, 2), "v4": as3.vget(param2, 3) });
        let _loc5_: InfernoBattleReportPopup = new InfernoBattleReportPopup("<b>" + KEYS.Get("pop_youlooted_title") + "</b>", _loc4_, param3);
        if (INFERNO_DESCENT_POPUPS.isBragable(param1)) {
            _loc5_.bButton.SetupKey("btn_brag");
            _loc5_.bButton.Highlight = true;
            _loc5_.bButton.addEventListener(MouseEvent.CLICK, INFERNO_DESCENT_POPUPS.BragBattleReport, false, 0, true);
        } else {
            _loc5_.bButton.SetupKey("btn_close");
            _loc5_.bButton.addEventListener(MouseEvent.CLICK, INFERNO_DESCENT_POPUPS.CloseBattleReport, false, 0, true);
        }
        POPUPS.Push(_loc5_, null, null, null, "portrait_moloch.png");
    }

    private static UpdateTotalLoot(param1: Vector<uint>, param2: Vector<uint>): Vector<uint> {
        let _loc3_: Vector<uint> = new Vector<uint>(0, false, uint);
        let _loc4_: int = 0;
        while (_loc4_ < param1.length) {
            as3.vset(_loc3_, _loc4_, (as3.vget(param1, _loc4_) + as3.vget(param2, _loc4_)) >>> 0);
            _loc4_++;
        }
        return _loc3_;
    }

    private static CloseBattleReport(param1: MouseEvent): void {
        as3.cast(param1.target, MovieClip).removeEventListener(Event.REMOVED_FROM_STAGE, INFERNO_DESCENT_POPUPS.CloseBattleReport);
        POPUPS.Next();
    }

    private static isBragable(param1: uint): boolean {
        return param1 == 1 || param1 == 4 || param1 == 7;
    }

    private static BragBattleReport(param1: MouseEvent): void {
        GLOBAL.CallJS("sendFeed", ["loot", KEYS.Get("pop_cavernwin" + INFERNO_DESCENT_POPUPS._level + "_streamtitle"), KEYS.Get("pop_cavernwin" + INFERNO_DESCENT_POPUPS._level + "_streambody"), "pop_cavernwin" + INFERNO_DESCENT_POPUPS._level + ".png"]);
        POPUPS.Next();
    }

    public static ShowCapturePopup(): void {
        let _loc1_: MovieClip = new popup_infernoemerge_dialog();
        _loc1_.tBody.htmlText = "<b>" + KEYS.Get("descent_pop_victory_title") + "</b><br><br>";
        _loc1_.tBody.htmlText += KEYS.Get("descent_pop_victory_body");
        _loc1_.bAction.Setup(KEYS.Get("descent_pop_victory_button"));
        _loc1_.bAction.addEventListener(MouseEvent.CLICK, INFERNO_DESCENT_POPUPS.ClosedCapturePopup);
        POPUPS.Push(_loc1_, null, null, "");
        GLOBAL.StatSet("descentLvl", MAPROOM_DESCENT._descentLvlMax);
        MAPROOM_DESCENT._descentLvl = MAPROOM_DESCENT._descentLvlMax;
        MAPROOM_DESCENT.DescentPassed;
        WMBASE.DestroyAllDescent();
    }

    private static ClosedCapturePopup(param1: MouseEvent): void {
        MapRoomManager.instance.mapRoomVersion = MapRoomManager.MAP_ROOM_VERSION_1;
        BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, "ibuild", false, EnumYardType.INFERNO_YARD);
    }

    private static ShowAttackEndDialog(param1: string, param2: string, param3: string): MovieClip {
        let _loc4_: popup_dialogue = as3.as(POPUPS.DisplayDialogue("", param2, param3, param1, INFERNO_DESCENT_POPUPS._PORTRAIT_IMAGE_OFFSET, POPUPS.Next), popup_dialogue);
        INFERNO_DESCENT_POPUPS.FormatTextFieldForDialog(_loc4_.tBody);
        return _loc4_;
    }

    private static FormatTextFieldForDialog(param1: TextField): TextField {
        param1.htmlText = "<i>" + param1.htmlText + "</i>";
        return param1;
    }

    public static isInDescent(): boolean {
        return BASE.isInfernoMainYardOrOutpost && !MAPROOM_DESCENT.DescentPassed && GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK;
    }
}

class InfernoBattleReportPopup extends popup_infernodescent_battle_report {
    public $ctor(param1?: string, param2?: string, param3?: Vector<uint>): void {
        let _loc5_: string = null;
        let _loc6_: MovieClip = null;
        super.$ctor();
        this.tTitle.htmlText = param1;
        this.tBody.htmlText = param2;
        let _loc4_: int = 0;
        while (_loc4_ < param3.length) {
            _loc5_ = "mcResource" + (_loc4_ + 1);
            _loc6_ = as3.cast(this.getChildByName(_loc5_), MovieClip);
            switch (_loc4_) {
                case 0:
                    _loc6_.tTitle.htmlText = "<b>" + KEYS.Get("#r_bone#") + "</b>";
                    break;
                case 1:
                    _loc6_.tTitle.htmlText = "<b>" + KEYS.Get("#r_coal#") + "</b>";
                    break;
                case 2:
                    _loc6_.tTitle.htmlText = "<b>" + KEYS.Get("#r_sulfur#") + "</b>";
                    break;
                case 3:
                    _loc6_.tTitle.htmlText = "<b>" + KEYS.Get("#r_magma#") + "</b>";
                    break;
                case 4:
                    _loc6_.tTitle.htmlText = "<b>" + KEYS.Get("#r_shiny#") + "</b>";
                    break;
            }
            _loc6_.tValue.htmlText = "<b>" + (as3.vget(param3, _loc4_) | 0).toString() + "</b>";
            _loc6_.stop();
            _loc4_++;
        }
    }
}

import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { Event } from "flash/events";
import { BASE, BFOUNDATION, BUILDINGOPTIONS, BUILDINGS, GLOBAL, INFERNOPORTAL, INFERNO_EMERGENCE_POPUPS, INFERNO_PORTAL_ATTACK, InstanceManager, KEYS, MAP, MAPROOM_DESCENT, POPUPS, SOUNDS, STORE, TUTORIAL, TweenLite, UI2 } from "@game";

export class INFERNO_EMERGENCE_EVENT extends ASObject {
    private static readonly postEvent: any = as3.namespace("postEvent");

    private static readonly duringEvent: any = as3.namespace("duringEvent");

    public static readonly TOWN_HALL_LEVEL_REQUIREMENT: int = 5;

    public static isAttackActive: boolean = false;

    public static readonly _LAST_LEVEL_LABEL: string = "lastLevel";

    public static readonly EVENT_END_DATE: Date = new Date(2012, 0, 14);

    private static readonly _MINIMUM_BASE_HEALTH: number = 0.1;

    private static readonly _SHOULD_RUN_EVENT: boolean = true;

    private static readonly _ATTACK_DELAY: number = 3;

    private static readonly _FOCUS_DELAY: number = 3;

    private static readonly _SHAKE_AMOUNT: number = 100;

    private static readonly _LAST_TIME_LABEL: string = "lastTime";

    private static readonly _WARNING_KEY: string = "emerge_earthquake";

    private static _lastLevel: uint = 0;

    private static _isPostEvent: boolean = false;

    private static _currentDate: Date = null;

    private static ns: any = null;

    public static isGoingToAttack: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    private static get _intermissionDuration(): number {
        return 43200;
    }

    private static get _maxLevel(): number {
        return 5;
    }

    public static get Lvl(): number {
        return INFERNO_EMERGENCE_EVENT._lastLevel;
    }

    public static Initialize(): boolean {
        if (GLOBAL.INFERNO_ONLY) {
            return false;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return false;
        }
        INFERNO_EMERGENCE_EVENT._lastLevel = GLOBAL.StatGet(INFERNO_EMERGENCE_EVENT._LAST_LEVEL_LABEL) >>> 0;
        INFERNO_EMERGENCE_EVENT._currentDate = new Date();
        if (INFERNO_EMERGENCE_EVENT.ShouldShowPortal() && INFERNO_EMERGENCE_EVENT._maxLevel > 5 || BASE.isInfernoMainYardOrOutpost && MAPROOM_DESCENT.DescentPassed && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            INFERNOPORTAL.AddPortal(5);
            return false;
        }
        INFERNO_EMERGENCE_EVENT.ns = INFERNO_EMERGENCE_EVENT.IsPostEvent() ? INFERNO_EMERGENCE_EVENT.postEvent : INFERNO_EMERGENCE_EVENT.duringEvent;
        if (INFERNO_EMERGENCE_EVENT.ShouldShowUpgradePopup()) {
            INFERNO_EMERGENCE_EVENT.ShowUpgradePopup();
        }
        if (!INFERNO_EMERGENCE_EVENT.ShouldShowPortal()) {
            return false;
        }
        INFERNO_EMERGENCE_EVENT.SetupPortal();
        return true;
    }

    private static ShowUpgradePopup(): void {
        if (GLOBAL.StatGet(INFERNO_EMERGENCE_POPUPS.INFERNO_UPGRADE_SHOWN) == 0 && GLOBAL.townHall._lvl.Get() >= 5) {
            INFERNO_EMERGENCE_POPUPS.ShowUpgrade();
            GLOBAL.StatSet(INFERNO_EMERGENCE_POPUPS.INFERNO_UPGRADE_SHOWN, 1);
        }
    }

    private static SetupPortal(): void {
        let _loc1_: INFERNOPORTAL = INFERNOPORTAL.AddPortal(INFERNO_EMERGENCE_EVENT._lastLevel);
        if (INFERNO_EMERGENCE_EVENT._lastLevel == 0) {
            _loc1_.Hide();
            TweenLite.delayedCall(INFERNO_EMERGENCE_EVENT._FOCUS_DELAY, INFERNO_EMERGENCE_EVENT.FocusOnPortal);
            INFERNO_EMERGENCE_EVENT.isGoingToAttack = true;
        } else if (Boolean(INFERNO_EMERGENCE_EVENT.ShouldUpgradePortal(INFERNO_EMERGENCE_EVENT._lastLevel)) && INFERNO_EMERGENCE_EVENT.isBaseReadyForAttack()) {
            TweenLite.delayedCall(INFERNO_EMERGENCE_EVENT._FOCUS_DELAY, INFERNO_EMERGENCE_EVENT.FocusOnPortal);
            INFERNO_EMERGENCE_EVENT.isGoingToAttack = true;
        }
    }

    private static Save(): void {
        GLOBAL.StatSet(INFERNO_EMERGENCE_EVENT._LAST_LEVEL_LABEL, INFERNOPORTAL.building._lvl.Get() | 0, false);
        GLOBAL.StatSet(INFERNO_EMERGENCE_EVENT._LAST_TIME_LABEL, (INFERNO_EMERGENCE_EVENT._currentDate.getTime() / 1000) | 0, false);
        BASE.Save(0, false, true);
    }

    // Comment: This function name was changed from ShouldUpgradePortal, due to conflicting namespace
    public static IsBelowMaxLevel(param1: uint): boolean {
        let _loc2_: number = GLOBAL.StatGet(INFERNO_EMERGENCE_EVENT._LAST_TIME_LABEL);
        if (INFERNO_EMERGENCE_EVENT._currentDate.getTime() / 1000 - _loc2_ >= INFERNO_EMERGENCE_EVENT._intermissionDuration) {
            if (param1 < INFERNO_EMERGENCE_EVENT._maxLevel) {
                return true;
            }
        }
        return false;
    }

    public static ShouldUpgradePortal(param1: uint): boolean {
        return INFERNO_EMERGENCE_EVENT.IsBelowMaxLevel(param1);
    }

    // Comment: This function name was changed from GetUpgradeLevel, due to conflicting namespace
    public static GetLastLevelLevel(): number {
        return INFERNO_EMERGENCE_EVENT._lastLevel + 1;
    }

    public static GetUpgradeLevel(): number {
        if (INFERNO_EMERGENCE_EVENT.isLastDay()) {
            return INFERNO_EMERGENCE_EVENT._maxLevel;
        }
        return INFERNO_EMERGENCE_EVENT.GetLastLevelLevel();
    }

    public static FocusOnPortal(): void {
        if (!INFERNO_EMERGENCE_EVENT.ShouldShowPortal()) {
            return;
        }
        if (POPUPS._open || BUILDINGOPTIONS._open || BUILDINGS._open || STORE._open) {
            TweenLite.delayedCall(1, INFERNO_EMERGENCE_EVENT.FocusOnPortal);
            return;
        }
        UI2.Hide("top");
        UI2.Hide("wmbar");
        UI2.Hide("bottom");
        let _loc1_: Sprite = INFERNOPORTAL.building._mc;
        MAP.FocusTo(_loc1_.x | 0, _loc1_.y | 0, 2, 0, 0, true, INFERNO_EMERGENCE_EVENT.FocusedOnPortal);
    }

    private static FocusedOnPortal(): void {
        if (!INFERNO_EMERGENCE_EVENT.ShouldShowPortal()) {
            return;
        }
        if (INFERNO_EMERGENCE_EVENT._lastLevel == 0) {
            INFERNO_EMERGENCE_EVENT.ShowStartPopup();
        } else {
            INFERNO_EMERGENCE_EVENT.UpgradePortal();
        }
    }

    private static UpgradePortal(param1: Event = null): void {
        if (!INFERNO_EMERGENCE_EVENT.ShouldShowPortal()) {
            return;
        }
        let _loc2_: INFERNOPORTAL = INFERNOPORTAL.building;
        _loc2_.Show();
        // Comment: This was commented out as it could not find the function using namespace
        // _loc2_.SetLevel(ns::GetUpgradeLevel());
        _loc2_.SetLevel(INFERNO_EMERGENCE_EVENT.GetUpgradeLevel() >>> 0);
        INFERNO_EMERGENCE_EVENT.Save();
        if (!INFERNO_EMERGENCE_EVENT.isBaseReadyForAttack()) {
            return;
        }
        UI2.Show("warning");
        UI2._warning.Update("<font size=\"26\">" + KEYS.Get(INFERNO_EMERGENCE_EVENT._WARNING_KEY) + "</font>");
        BASE.Shake(INFERNO_EMERGENCE_EVENT._SHAKE_AMOUNT | 0);
        TweenLite.delayedCall(INFERNO_EMERGENCE_EVENT._ATTACK_DELAY, INFERNO_EMERGENCE_EVENT.ShowWarningPopup);
    }

    private static ShowStartPopup(): void {
        INFERNO_EMERGENCE_POPUPS.ShowDialogue(INFERNO_EMERGENCE_EVENT._lastLevel).addEventListener(INFERNO_EMERGENCE_POPUPS.EVENT_DIALOGUE_DEFAULT, INFERNO_EMERGENCE_EVENT.UpgradePortal, false, 0, true);
    }

    private static ShowWarningPopup(): void {
        INFERNO_EMERGENCE_EVENT.isAttackActive = true;
        INFERNO_EMERGENCE_POPUPS.ShowWarning(INFERNO_EMERGENCE_EVENT._lastLevel);
    }

    public static TriggerAttack(param1: Event): void {
        SOUNDS.PlayMusic("musicpanic");
        INFERNO_PORTAL_ATTACK.SpawnAttack();
    }

    private static isBaseReadyForAttack(): boolean {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc5_: BFOUNDATION = null;
        let _loc6_: number = NaN;
        let _loc1_: boolean = false;
        let _loc4_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc5_ of (_loc4_ ?? [])) {
            _loc2_ = (_loc2_ + _loc5_.health) | 0;
            _loc3_ = (_loc3_ + _loc5_.maxHealth) | 0;
        }
        _loc6_ = _loc2_ / _loc3_;
        return _loc2_ / _loc3_ > INFERNO_EMERGENCE_EVENT._MINIMUM_BASE_HEALTH;
    }

    public static ShouldShowPortal(): boolean {
        return Boolean(INFERNO_EMERGENCE_EVENT._SHOULD_RUN_EVENT && !GLOBAL._flags.viximo && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && GLOBAL.townHall && (INFERNO_EMERGENCE_EVENT.ns == INFERNO_EMERGENCE_EVENT.duringEvent || INFERNO_EMERGENCE_EVENT.ns == INFERNO_EMERGENCE_EVENT.postEvent && GLOBAL.townHall && GLOBAL.townHall._lvl.Get() >= INFERNO_EMERGENCE_EVENT.TOWN_HALL_LEVEL_REQUIREMENT || INFERNO_EMERGENCE_EVENT.ns == INFERNO_EMERGENCE_EVENT.postEvent && INFERNO_EMERGENCE_EVENT._lastLevel > 0) && INFERNO_EMERGENCE_EVENT._maxLevel > 0 && BASE.isMainYardOrInfernoMainYard && TUTORIAL._stage > 200);
    }

    public static ShouldRunEvent(): boolean {
        return Boolean(INFERNO_EMERGENCE_EVENT._SHOULD_RUN_EVENT && !GLOBAL._flags.viximo && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && GLOBAL.townHall && (INFERNO_EMERGENCE_EVENT.ns == INFERNO_EMERGENCE_EVENT.duringEvent || INFERNO_EMERGENCE_EVENT.ns == INFERNO_EMERGENCE_EVENT.postEvent && GLOBAL.townHall._lvl.Get() >= INFERNO_EMERGENCE_EVENT.TOWN_HALL_LEVEL_REQUIREMENT || INFERNO_EMERGENCE_EVENT.ns == INFERNO_EMERGENCE_EVENT.postEvent && INFERNO_EMERGENCE_EVENT._lastLevel > 0) && INFERNO_EMERGENCE_EVENT._maxLevel > 0 && INFERNO_EMERGENCE_EVENT._lastLevel < 5 && BASE.isMainYard && TUTORIAL._stage > 200);
    }

    public static ShouldShowUpgradePopup(): boolean {
        return INFERNO_EMERGENCE_EVENT._SHOULD_RUN_EVENT && !GLOBAL._flags.viximo && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && INFERNO_EMERGENCE_EVENT._maxLevel > 0 && BASE.isMainYardOrInfernoMainYard && TUTORIAL._stage > 200;
    }

    public static IsPostEvent(): boolean {
        return INFERNO_EMERGENCE_EVENT._currentDate.getTime() / 1000 > INFERNO_EMERGENCE_EVENT.EVENT_END_DATE.getTime() / 1000;
    }

    public static isLastDay(): boolean {
        return false;
    }

    public static EndRound(): void {
        INFERNO_EMERGENCE_EVENT.isAttackActive = false;
    }
}

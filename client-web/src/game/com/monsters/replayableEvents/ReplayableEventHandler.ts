import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Event } from "flash/events";
import { ABTest, BASE, Console, DebugMessage, FrontPageGraphic, GLOBAL, IReplayableEventUI, LOGGER, POPUPS, ReplayableEvent, ReplayableEventLibrary, ReplayableEventUI, TUTORIAL, UI2, UI_BOTTOM, URLLoaderApi, com_monsters_frontPage_messages_Message as Message } from "@game";

export class ReplayableEventHandler extends ASObject {
    public static debugDate: Date = new Date();

    public static doesDebugClear: boolean = false;

    public static activeEvent: ReplayableEvent = null;

    private static _graphic: IReplayableEventUI = null;

    public static readonly k_DURATION_STORE_IS_OPEN_AFTER_EVENT: number = 172800;

    public static readonly DURATION_UNTIL_EVENT_STARTS: number = 604800;

    private static readonly _DURATION_UNTIL_EVENT_RESET: number = Number.MAX_VALUE;

    private static readonly _DURATION_BETWEEN_EVENTS: number = 1209600;

    public static readonly DURATION_REQUIRED_TO_CONFIRM_EVENT: number = 259200;

    public static eventXP: uint = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static get currentTime(): number {
        if (Boolean(ReplayableEventHandler.debugDate) && GLOBAL._aiDesignMode) {
            return ReplayableEventHandler.debugDate.getTime() / 1000;
        }
        return GLOBAL.Timestamp();
    }

    public static initialize(param1: any = null): void {
        let _loc2_: ReplayableEvent = null;
        let _loc3_: number = NaN;
        if (GLOBAL.isAtHome() && TUTORIAL.hasFinished) {
            if (param1) {
                ReplayableEventHandler.importData(param1);
            }
            if (ReplayableEventHandler.activeEvent) {
                ReplayableEventHandler.activeEvent.initialize();
                ReplayableEventHandler.checkIfActiveEventIsFinished();
            } else if (ReplayableEventHandler.canScheduleNewEvent()) {
                _loc2_ = ReplayableEventHandler.getQualifiedEvent();
                if (_loc2_) {
                    _loc3_ = ReplayableEventHandler.getPotentialStartDateForEvent(_loc2_);
                    if (_loc3_) {
                        ReplayableEventHandler.scheduleNewEvent(_loc2_, _loc3_);
                        ReplayableEventHandler.activeEvent.initialize();
                    }
                }
            }
        }
        ReplayableEventHandler.addUI();
    }

    public static updateDebugDate(param1: number = 0): void {
        let _loc2_: Message = null;
        if (param1) {
            ReplayableEventHandler.debugDate.setTime(param1);
        }
        BASE.Save();
        UI2.DebugWarningEdit(ReplayableEventHandler.debugDate.toDateString());
        if (ReplayableEventHandler.activeEvent) {
            _loc2_ = ReplayableEventHandler.activeEvent.getCurrentMessage();
            if (_loc2_ && !_loc2_.hasBeenSeen && !(_loc2_ instanceof DebugMessage)) {
                POPUPS.Push(new FrontPageGraphic(_loc2_));
                _loc2_.viewed();
            }
            ReplayableEventHandler.checkIfActiveEventIsFinished();
        }
    }

    private static checkIfActiveEventIsFinished(): void {
        let _loc1_: Message = null;
        if (Boolean(ReplayableEventHandler.activeEvent) && (ReplayableEventHandler.activeEvent.hasEventEnded || ReplayableEventHandler.activeEvent.hasCompletedEvent)) {
            LOGGER.StatB({ "st1": "ERS", "st2": ReplayableEventHandler.activeEvent.name }, "event_end");
            _loc1_ = ReplayableEventHandler.activeEvent.getCurrentMessage();
            if (_loc1_ && !_loc1_.hasBeenSeen && !(_loc1_ instanceof DebugMessage)) {
                POPUPS.Push(new FrontPageGraphic(_loc1_));
                _loc1_.viewed();
            }
            if (ReplayableEventHandler.activeEvent.endDate - ReplayableEventHandler.currentTime >= ReplayableEventHandler.k_DURATION_STORE_IS_OPEN_AFTER_EVENT) {
                if (ReplayableEventHandler._graphic) {
                    ReplayableEventHandler.removeUI();
                }
                ReplayableEventHandler.activeEvent = null;
            }
        }
    }

    public static scheduleNewEvent(param1: ReplayableEvent, param2: number): void {
        if (param1.startDate) {
            param1.reset();
        }
        param1.setStartDate(param2);
        ReplayableEventHandler.callServerMethod("startevent", [["eventid", param1.id], ["starttime", param1.startDate], ["endtime", param1.endDate]], ReplayableEventHandler.startEventCallback);
        LOGGER.StatB({ "st1": "ERS", "st2": param1.name }, "event_start");
        ReplayableEventHandler.activeEvent = param1;
    }

    public static callServerMethod(param1: string, param2: any[], param3: Function = null): void {
        let _loc4_: URLLoaderApi = null;
        (_loc4_ = new URLLoaderApi()).load(GLOBAL._apiURL + "bm/event/" + param1, param2, param3);
    }

    protected static startEventCallback(param1: any): void {
        let _loc2_: any = param1;
    }

    private static addUI(): void {
        if (!ReplayableEventHandler.activeEvent || !ReplayableEventHandler.activeEvent.doesQualify()) {
            return;
        }
        ReplayableEventHandler._graphic = ReplayableEventHandler.activeEvent.createNewUI();
        ReplayableEventHandler._graphic.setup(ReplayableEventHandler.activeEvent);
        ReplayableEventHandler._graphic.addEventListener(Event.ENTER_FRAME, ReplayableEventHandler.update, false, 0, true);
        ReplayableEventHandler._graphic.addEventListener(ReplayableEventUI.CLICKED_ACTION, ReplayableEventHandler.pressedActionButton, false, 0, true);
        ReplayableEventHandler._graphic.addEventListener(ReplayableEventUI.CLICKED_INFO, ReplayableEventHandler.pressedInfoButton, false, 0, true);
        UI_BOTTOM.addChild(ReplayableEventHandler._graphic.eventUI);
    }

    private static removeUI(): void {
        if (!ReplayableEventHandler._graphic) {
            return;
        }
        ReplayableEventHandler._graphic.removeEventListener(Event.ENTER_FRAME, ReplayableEventHandler.update);
        ReplayableEventHandler._graphic.removeEventListener(ReplayableEventUI.CLICKED_ACTION, ReplayableEventHandler.pressedActionButton);
        ReplayableEventHandler._graphic.removeEventListener(ReplayableEventUI.CLICKED_INFO, ReplayableEventHandler.pressedInfoButton);
        UI_BOTTOM.removeChild(ReplayableEventHandler._graphic.eventUI);
    }

    private static update(param1: Event): void {
        ReplayableEventHandler._graphic.update();
        if (ReplayableEventHandler.activeEvent) {
            ReplayableEventHandler.activeEvent.update();
        }
        ReplayableEventHandler.checkIfActiveEventIsFinished();
    }

    private static pressedActionButton(param1: Event): void {
        ReplayableEventHandler.activeEvent.pressedActionButton();
    }

    private static pressedInfoButton(param1: Event): void {
        let _loc3_: FrontPageGraphic = null;
        let _loc2_: Message = ReplayableEventHandler.activeEvent.pressedHelpButton();
        if (_loc2_) {
            _loc2_.refresh();
            _loc3_ = new FrontPageGraphic(_loc2_);
            POPUPS.Push(_loc3_);
        }
    }

    public static getPotentialStartDateForEvent(param1: ReplayableEvent): number {
        let _loc5_: Date = null;
        let _loc6_: number = NaN;
        if (Boolean(param1.originalStartDate) && param1.originalStartDate - ReplayableEventHandler.currentTime <= ReplayableEventHandler.DURATION_UNTIL_EVENT_STARTS) {
            return param1.originalStartDate;
        }
        let _loc2_: uint = 86400;
        let _loc3_: number = ReplayableEventHandler.currentTime;
        let _loc4_: int = 0;
        while (_loc4_ < 7) {
            _loc3_ += _loc2_;
            if ((_loc5_ = new Date(_loc3_ * 1000)).getDay() == 4) {
                _loc3_ = _loc5_.setHours(12, 0, 0, 0) / 1000;
                _loc6_ = _loc3_ - ReplayableEventHandler.currentTime;
                if (!ReplayableEventHandler.hasQualifiedLiveEventSoonAfter(_loc3_) && _loc6_ < ReplayableEventHandler.DURATION_UNTIL_EVENT_STARTS && _loc6_ > ReplayableEventHandler.DURATION_REQUIRED_TO_CONFIRM_EVENT) {
                    return _loc3_;
                }
            }
            _loc4_++;
        }
        return 0;
    }

    private static canScheduleNewEvent(): boolean {
        if (!GLOBAL._flags["ers"]) {
            return false;
        }
        return Boolean(ReplayableEventHandler.getQualifiedLiveEvent()) || !ReplayableEventHandler.hasRecentlyParticipatedInAnEvent() && ABTest.isInTestGroup("ers", 205);
    }

    private static getQualifiedLiveEvent(): ReplayableEvent {
        let _loc2_: ReplayableEvent = null;
        let _loc1_: int = 0;
        while (_loc1_ < ReplayableEventLibrary.EVENTS.length) {
            _loc2_ = as3.vget(ReplayableEventLibrary.EVENTS, _loc1_);
            if (_loc2_.originalStartDate && ReplayableEventHandler.currentTime < _loc2_.originalStartDate && _loc2_.originalStartDate - ReplayableEventHandler.currentTime <= ReplayableEventHandler.DURATION_UNTIL_EVENT_STARTS) {
                return _loc2_;
            }
            _loc1_++;
        }
        return null;
    }

    private static hasQualifiedLiveEventSoonAfter(param1: number): boolean {
        let _loc3_: ReplayableEvent = null;
        let _loc2_: int = 0;
        while (_loc2_ < ReplayableEventLibrary.EVENTS.length) {
            _loc3_ = as3.vget(ReplayableEventLibrary.EVENTS, _loc2_);
            if (_loc3_.originalStartDate && _loc3_.originalStartDate >= param1 && _loc3_.originalStartDate - param1 <= ReplayableEventHandler._DURATION_BETWEEN_EVENTS) {
                return true;
            }
            _loc2_++;
        }
        return false;
    }

    private static hasRecentlyParticipatedInAnEvent(): boolean {
        let _loc2_: ReplayableEvent = null;
        let _loc1_: int = 0;
        while (_loc1_ < ReplayableEventLibrary.EVENTS.length) {
            _loc2_ = as3.vget(ReplayableEventLibrary.EVENTS, _loc1_);
            if (Boolean(_loc2_.endDate) && ReplayableEventHandler.currentTime - _loc2_.endDate <= ReplayableEventHandler._DURATION_BETWEEN_EVENTS) {
                return true;
            }
            _loc1_++;
        }
        return false;
    }

    public static getQualifiedEvent(): ReplayableEvent {
        let _loc3_: ReplayableEvent = null;
        let _loc4_: ReplayableEvent = null;
        let _loc1_: Vector<ReplayableEvent> = new Vector<ReplayableEvent>(0, false, ReplayableEvent);
        let _loc2_: int = 0;
        while (_loc2_ < ReplayableEventLibrary.EVENTS.length) {
            if ((_loc4_ = as3.vget(ReplayableEventLibrary.EVENTS, _loc2_)).doesQualify() && !_loc4_.startDate) {
                _loc1_.push(_loc4_);
            }
            _loc2_++;
        }
        as3.sort(_loc1_, ReplayableEventHandler.comparePriority);
        if (_loc1_.length >= 1) {
            _loc3_ = as3.vget(_loc1_, 0);
        }
        return _loc3_;
    }

    private static comparePriority(param1: ReplayableEvent, param2: ReplayableEvent): number {
        return param2.priority - param1.priority;
    }

    public static exportData(): any {
        let _loc2_: boolean = false;
        let _loc4_: ReplayableEvent = null;
        let _loc5_: any = null;
        if (ReplayableEventHandler.doesDebugClear) {
            ReplayableEventHandler.doesDebugClear = false;
            return {};
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || BASE.isInfernoMainYardOrOutpost) {
            return null;
        }
        let _loc1_: any = {};
        let _loc3_: int = 0;
        while (_loc3_ < ReplayableEventLibrary.EVENTS.length) {
            _loc4_ = as3.vget(ReplayableEventLibrary.EVENTS, _loc3_);
            _loc5_ = _loc4_.exportData();
            if (_loc5_) {
                _loc1_[_loc4_.name] = _loc5_;
                _loc2_ = true;
            }
            _loc3_++;
        }
        if (ReplayableEventHandler.debugDate) {
            _loc1_.debugDate = ReplayableEventHandler.debugDate.getTime();
            _loc2_ = true;
        }
        if (ReplayableEventHandler.activeEvent) {
            _loc1_.activeEvent = ReplayableEventHandler.activeEvent.id;
            _loc2_ = true;
        }
        return _loc2_ ? _loc1_ : null;
    }

    public static importData(param1: any): void {
        let _loc2_: string = null;
        let _loc3_: ReplayableEvent = null;
        for (_loc2_ in param1) {
            _loc3_ = ReplayableEventLibrary.getEventByName(_loc2_);
            if (_loc3_) {
                _loc3_.importData(param1[_loc2_]);
            }
        }
        if (param1.debugDate) {
            ReplayableEventHandler.debugDate = new Date(param1.debugDate);
        }
        if (param1.activeEvent) {
            ReplayableEventHandler.activeEvent = ReplayableEventLibrary.getEventByID(param1.activeEvent >>> 0);
        }
    }

    public static optInForEventEmails(): void {
        if (!ReplayableEventHandler.activeEvent) {
            Console.warning("You\'re trying to opt-in for an event that isnt currently running, something is fucked");
            return;
        }
        ReplayableEventHandler.callServerMethod("emailoptin", [["eventid", ReplayableEventHandler.activeEvent.id]]);
    }
}

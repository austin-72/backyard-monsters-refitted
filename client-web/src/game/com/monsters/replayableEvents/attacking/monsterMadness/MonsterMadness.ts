import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Event } from "flash/events";
import { BASE, Console, GLOBAL, KorathReward, MonsterMadnessInfoBar, MonsterMadnessPopup, POPUPS, Reward, RewardHandler, RewardLibrary, SecNum, TUTORIAL } from "@game";

export class MonsterMadness extends ASObject {
    public static POINTS_GOAL1: int; // const

    public static POINTS_GOAL2: int; // const

    public static POINTS_GOAL3: int; // const

    public static LAST_POPUP_INDEX: string; // const

    public static LAST_SCORE: string; // const

    public static EVENT_DATES: Vector<Date>; // const

    public static today: Date;

    public static infoBar: MonsterMadnessInfoBar;

    public static stage: uint;

    private static _points: SecNum;

    public static SAVE_ID: string; // const

    static {
        as3.lazyStatics(this, { POINTS_GOAL1: 0, POINTS_GOAL2: 0, POINTS_GOAL3: 0, LAST_POPUP_INDEX: null, LAST_SCORE: null, EVENT_DATES: null, today: null, infoBar: null, stage: 0, _points: null, SAVE_ID: null }, () => {
            MonsterMadness.POINTS_GOAL1 = 42000000;
            MonsterMadness.POINTS_GOAL2 = 94500000;
            MonsterMadness.POINTS_GOAL3 = 160125000;
            MonsterMadness.LAST_POPUP_INDEX = "lastPopupIndex";
            MonsterMadness.LAST_SCORE = "mmscore";
            MonsterMadness.EVENT_DATES = Vector.from([new Date(2012, 2, 15, 12), new Date(2012, 2, 19, 12), new Date(2012, 2, 21, 12), new Date(2012, 2, 22, 12), new Date(2012, 2, 26, 12)], Date);
            MonsterMadness.today = new Date(2012, 2, 23);
            MonsterMadness._points = new SecNum(0);
            MonsterMadness.SAVE_ID = "event_score";
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static get points(): uint {
        return MonsterMadness._points.Get() >>> 0;
    }

    public static set points(param1: uint) {
        MonsterMadness._points = new SecNum(param1);
        MonsterMadness.stage = MonsterMadness.getStage() >>> 0;
        GLOBAL.StatSet(MonsterMadness.LAST_SCORE, param1);
    }

    public static updateKorathStats(): void {
        let _loc1_: uint = 0;
        if (MonsterMadness.points >= MonsterMadness.POINTS_GOAL3) {
            _loc1_ = 3;
        } else if (MonsterMadness.points >= MonsterMadness.POINTS_GOAL2) {
            _loc1_ = 2;
        } else if (MonsterMadness.points >= MonsterMadness.POINTS_GOAL1) {
            _loc1_ = 1;
        }
        if (_loc1_ > 0) {
            MonsterMadness.setKorathPowerLevel(_loc1_);
        }
    }

    public static setKorathPowerLevel(param1: int): void {
        let _loc2_: Reward = RewardHandler.instance.getRewardByID(KorathReward.k_REWARD_ID);
        if (!_loc2_) {
            _loc2_ = RewardLibrary.getRewardByID(KorathReward.k_REWARD_ID);
            if (!_loc2_) {
                Console.warning("reward handler isnt working, you cant apply rewards here");
                return;
            }
            _loc2_.value = param1;
            RewardHandler.instance.addAndApplyReward(_loc2_);
        } else if (param1 > _loc2_.value) {
            _loc2_.value = param1;
            RewardHandler.instance.applyReward(_loc2_);
        }
    }

    public static get hasEventStarted(): boolean {
        return MonsterMadness.currentTime > MonsterMadness.activeTime;
    }

    public static get hasEventEnded(): boolean {
        return MonsterMadness.currentTime > MonsterMadness.endTime;
    }

    public static get currentTime(): number {
        return GLOBAL.Timestamp();
    }

    public static get timeUntilNextPhase(): number {
        let _loc1_: number = MonsterMadness.activeTime;
        if (MonsterMadness.currentTime > _loc1_) {
            _loc1_ = MonsterMadness.endTime;
        }
        return _loc1_ - MonsterMadness.currentTime;
    }

    public static get activeTime(): number {
        return 1332442800;
    }

    public static get endTime(): number {
        return 1332788400;
    }

    public static get activeDate(): Date {
        return as3.vget(MonsterMadness.EVENT_DATES, 3);
    }

    public static get endDate(): Date {
        return as3.vget(MonsterMadness.EVENT_DATES, MonsterMadness.EVENT_DATES.length - 1);
    }

    private static getStage(): number {
        let _loc1_: int = 0;
        if (MonsterMadness.currentTime <= MonsterMadness.endTime) {
            if (MonsterMadness.hasEventStarted) {
                if (MonsterMadness.points >= MonsterMadness.POINTS_GOAL2) {
                    _loc1_ = 4;
                } else if (MonsterMadness.points >= MonsterMadness.POINTS_GOAL1) {
                    _loc1_ = 3;
                } else {
                    _loc1_ = 2;
                }
            } else if (MonsterMadness.currentTime > as3.vget(MonsterMadness.EVENT_DATES, 0).getUTCSeconds()) {
                _loc1_ = 1;
            }
        } else if (MonsterMadness.currentTime > MonsterMadness.endTime) {
            _loc1_ = 5;
        }
        return _loc1_;
    }

    public static showPopup(param1: boolean = false): boolean {
        let _loc2_: MonsterMadnessPopup = null;
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return false;
        }
        if (MonsterMadness.hasNewPopupToShow() || param1) {
            _loc2_ = new MonsterMadnessPopup();
            POPUPS.Push(_loc2_);
            GLOBAL.StatSet(MonsterMadness.LAST_POPUP_INDEX, _loc2_.infoIndex);
        }
        return true;
    }

    public static initialize(): void {
        let _loc1_: uint = GLOBAL.StatGet(MonsterMadness.LAST_SCORE) >>> 0;
        let _loc2_: any = BASE.loadObject[MonsterMadness.SAVE_ID];
        if (_loc2_ && _loc2_ >= _loc1_ && !MonsterMadness.hasEventEnded || _loc1_ == -2126479027) {
            MonsterMadness.points = _loc2_ >>> 0;
        } else {
            MonsterMadness.points = _loc1_;
        }
        if (MonsterMadness.hasEventEnded || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || TUTORIAL._stage < 200 || GLOBAL._sessionCount < 5) {
            return;
        }
        MonsterMadness.infoBar = new MonsterMadnessInfoBar();
        MonsterMadness.addInfoBar();
        MonsterMadness.showPopup();
    }

    private static hasNewPopupToShow(): boolean {
        return MonsterMadnessPopup.getSetIndex() > GLOBAL.StatGet(MonsterMadness.LAST_POPUP_INDEX);
    }

    public static addInfoBar(): void {
        MonsterMadness.infoBar.Setup();
        MonsterMadness.infoBar.Resize();
        MonsterMadness.infoBar.addEventListener(Event.ENTER_FRAME, MonsterMadness.updateInfoBar);
    }

    private static updateInfoBar(param1: Event): void {
        MonsterMadness.infoBar.Update();
    }

    public static removeInfoBar(): void {
        if (!MonsterMadness.infoBar) {
            return;
        }
        MonsterMadness.infoBar.removeEventListener(Event.ENTER_FRAME, MonsterMadness.updateInfoBar);
    }
}

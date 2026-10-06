import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event } from "flash/events";
import { CHAMPIONCAGE, CREATURES, GLOBAL, ImageCache, KEYS, MAPROOM_DESCENT, MapRoomManager, MonsterMadness, MonsterMadnessPopupInfo, MonsterMadnessPopupInfoEventComplete, MonsterMadnessPopupInfoGoal1, MonsterMadnessPopupInfoGoal1Complete, MonsterMadnessPopupInfoGoal2, MonsterMadnessPopupInfoGoal2Complete, MonsterMadnessPopupInfoGoal3, MonsterMadnessPopupInfoGoal3Complete, MonsterMadnessPopupInfoSet1, MonsterMadnessPopupInfoSet2, MonsterMadnessPopupInfoSet3, MonsterMadnessPopupInfoSet4, MonsterMadnessPopup_CLIP, UI2 } from "@game";

export class MonsterMadnessPopup extends MonsterMadnessPopup_CLIP {
    static {
        as3.fields(this, { infoIndex: 0 });
    }

    public static MR2_AND_INFERNO: int; // const

    public static MR2: int; // const

    public static INFERNO: int; // const

    public static TOWNHALL_GREATER_THAN_5: int; // const

    public static TOWNHALL_LESS_THAN_5: int; // const

    public static _MEDIA_DIMENTIONS_X: int; // const

    public static _MEDIA_DIMENTIONS_Y: int; // const

    private static _infoSets: Vector<MonsterMadnessPopupInfo>; // const

    static {
        as3.lazyStatics(this, { MR2_AND_INFERNO: 0, MR2: 0, INFERNO: 0, TOWNHALL_GREATER_THAN_5: 0, TOWNHALL_LESS_THAN_5: 0, _MEDIA_DIMENTIONS_X: 0, _MEDIA_DIMENTIONS_Y: 0, _infoSets: null }, () => {
            MonsterMadnessPopup.MR2_AND_INFERNO = 1;
            MonsterMadnessPopup.MR2 = 2;
            MonsterMadnessPopup.INFERNO = 3;
            MonsterMadnessPopup.TOWNHALL_GREATER_THAN_5 = 4;
            MonsterMadnessPopup.TOWNHALL_LESS_THAN_5 = 5;
            MonsterMadnessPopup._MEDIA_DIMENTIONS_X = 200;
            MonsterMadnessPopup._MEDIA_DIMENTIONS_Y = 200;
            MonsterMadnessPopup._infoSets = Vector.from([new MonsterMadnessPopupInfoSet1(), new MonsterMadnessPopupInfoSet2(), new MonsterMadnessPopupInfoSet3(), new MonsterMadnessPopupInfoSet4(), new MonsterMadnessPopupInfoGoal1(), new MonsterMadnessPopupInfoGoal1Complete(), new MonsterMadnessPopupInfoGoal2(), new MonsterMadnessPopupInfoGoal2Complete(), new MonsterMadnessPopupInfoGoal3(), new MonsterMadnessPopupInfoGoal3Complete(), new MonsterMadnessPopupInfoEventComplete()], MonsterMadnessPopupInfo);
        });
    }
    public infoIndex: int;

    public $ctor(): void {
        let _loc3_: string = null;
        super.$ctor();
        let _loc1_: int = this.getUserState();
        let _loc2_: MonsterMadnessPopupInfo = as3.vget(MonsterMadnessPopup._infoSets, MonsterMadnessPopup.getSetIndex());
        this.infoIndex = MonsterMadnessPopup._infoSets.indexOf(_loc2_) | 0;
        ImageCache.GetImageWithCallBack(_loc2_.getBanner(_loc1_), as3.bind(this, this.onImageLoad), true, 4, "", [this.mcImage]);
        if (CREATURES._guardian) {
            _loc3_ = String(CHAMPIONCAGE._guardians["G" + CREATURES._guardian._type].name);
        }
        this.tCopy.htmlText = KEYS.Get(_loc2_.getCopy(_loc1_), { "v1": _loc3_, "v2": _loc3_ });
        _loc2_.addEventListener(MonsterMadnessPopupInfo.REMOVE_LOADING_CIRCLE, as3.bind(this, this.onRemoveLoadingCircle), false, 0, true);
        _loc2_.setupButton(this.bAction, _loc1_);
        _loc2_.setupButton2(this.bAction2, _loc1_);
        this.mcVideo.addChild(_loc2_.getMedia(_loc1_));
        UI2.DebugWarningEdit("MM Userstate: " + _loc1_);
    }

    public static getSetIndex(): uint {
        let _loc2_: uint = 0;
        let _loc3_: uint = 0;
        let _loc4_: int = 0;
        let _loc5_: number = NaN;
        let _loc6_: int = 0;
        let _loc1_: uint = MonsterMadness.EVENT_DATES.indexOf(MonsterMadness.activeDate) >>> 0;
        if (MonsterMadness.hasEventStarted || Boolean(MonsterMadness.points)) {
            _loc3_ = MonsterMadness.points;
            if (_loc3_ >= MonsterMadness.POINTS_GOAL3) {
                _loc2_ = 9;
            } else if (_loc3_ >= MonsterMadness.POINTS_GOAL2) {
                _loc2_ = 7;
            } else if (_loc3_ >= MonsterMadness.POINTS_GOAL1) {
                _loc2_ = 5;
            } else {
                _loc2_ = 4;
            }
            _loc4_ = GLOBAL.StatGet(MonsterMadness.LAST_POPUP_INDEX);
            if (_loc2_ <= _loc4_ && as3.vget(MonsterMadnessPopup._infoSets, _loc2_).isOnlySeenOnce) {
                _loc2_++;
            }
            return _loc2_;
        }
        _loc5_ = MonsterMadness.currentTime;
        _loc6_ = _loc1_ | 0;
        while (_loc6_ >= 0) {
            if (_loc5_ >= as3.vget(MonsterMadness.EVENT_DATES, _loc6_).getUTCSeconds()) {
                return _loc6_ >>> 0;
            }
            _loc6_--;
        }
        return 0;
    }

    protected onRemoveLoadingCircle(param1: Event): void {
        if (this.mcLoading && this.mcLoading.parent && this.mcLoading.parent == this) {
            this.removeChild(this.mcLoading);
        }
    }

    private onImageLoad(param1: string, param2: BitmapData, param3: any[] = null): void {
        as3.cast(param3[0], MovieClip).addChild(new Bitmap(param2));
    }

    private getUserState(): int {
        if (MapRoomManager.instance.isInMapRoom2 && MAPROOM_DESCENT.DescentPassed) {
            return MonsterMadnessPopup.MR2_AND_INFERNO;
        }
        if (MapRoomManager.instance.isInMapRoom2) {
            return MonsterMadnessPopup.MR2;
        }
        if (MAPROOM_DESCENT.DescentPassed) {
            return MonsterMadnessPopup.INFERNO;
        }
        if (Boolean(GLOBAL.townHall) && GLOBAL.townHall._lvl.Get() >= 5) {
            return MonsterMadnessPopup.TOWNHALL_GREATER_THAN_5;
        }
        return MonsterMadnessPopup.TOWNHALL_LESS_THAN_5;
    }
}

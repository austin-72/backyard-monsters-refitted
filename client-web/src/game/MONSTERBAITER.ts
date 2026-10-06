import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, CUSTOMATTACKS, GLOBAL, KEYS, MAP, MONSTERBAITERPOPUP, SOUNDS, UI2, WMATTACK } from "@game";

export class MONSTERBAITER extends ASObject {
    public static readonly TYPE: uint = 19;

    public static _mc: MONSTERBAITERPOPUP = null;

    public static _attacking: int = 0;

    public static _scaredAway: boolean = false;

    public static _musk: int = 0;

    public static _muskLimit: int = 300;

    public static _replenishRate: int = 0;

    public static _currentAttackers: any[] = null;

    public static _attPrep: int = 0;

    public static _attackPt: Point = null;

    public static _queue: any = {};

    public static _attackDir: int = 0;

    public static _frameNumber: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static Tick(): void {
        let _loc1_: any[] = null;
        let _loc2_: string = null;
        let _loc3_: any[] = null;
        let _loc4_: any[] = null;
        let _loc5_: any = undefined;
        if (GLOBAL._bBaiter) {
            MONSTERBAITER._musk = MONSTERBAITER._muskLimit;
            if (MONSTERBAITER._mc) {
                MONSTERBAITER._mc.Update();
            }
            if (MONSTERBAITER._attPrep > 0) {
                if (MONSTERBAITER._attPrep == 1) {
                    UI2._warning.Update("<font size=\"28\">" + KEYS.Get("msg_dontpanic") + "</font>");
                    MONSTERBAITER._attPrep = 0;
                    _loc1_ = [].concat();
                    for (_loc2_ in MONSTERBAITER._queue) {
                        if (MONSTERBAITER._queue[_loc2_] > 0) {
                            _loc4_ = [_loc2_, "bounce", MONSTERBAITER._queue[_loc2_], MONSTERBAITER._attackPt.x, MONSTERBAITER._attackPt.y, 0, 0];
                            _loc1_.push(_loc4_);
                        }
                    }
                    WMATTACK._type = WMATTACK.TYPE_DAMAGE;
                    MONSTERBAITER._currentAttackers = CUSTOMATTACKS.CustomAttack(_loc1_);
                    for (_loc3_ of as3.values(MONSTERBAITER._currentAttackers)) {
                        for (_loc5_ of as3.values(_loc3_)) {
                            _loc5_._hitLimit = int.MAX_VALUE;
                        }
                    }
                } else {
                    UI2._warning.Update("<font size=\"28\">" + ((MONSTERBAITER._attPrep - 1) | 0) + "</font>");
                    if (BASE.isInfernoMainYardOrOutpost) {
                        SOUNDS.PlayMusic("musicipanic");
                    } else {
                        SOUNDS.PlayMusic("musicpanic");
                    }
                    --MONSTERBAITER._attPrep;
                }
            }
            ++MONSTERBAITER._frameNumber;
        }
    }

    public static PrepAttack(): void {
        MONSTERBAITER._scaredAway = true;
        MONSTERBAITER._attPrep = 4;
        MONSTERBAITER._attacking = 1;
        MAP.FocusTo(GLOBAL._bBaiter.x | 0, GLOBAL._bBaiter.y | 0, 2);
        UI2.Show("warning");
        BASE.Save();
        UI2.Hide("top");
        UI2.Hide("bottom");
    }

    public static End(param1: boolean = false): void {
        let _loc2_: any[] = null;
        let _loc3_: uint = 0;
        MONSTERBAITER._scaredAway = true;
        if (!param1) {
            SOUNDS.Play("wmbhorn");
        }
        UI2.Hide("scareAway");
        UI2.Hide("warning");
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.PlayMusic("musicibuild");
        } else {
            SOUNDS.PlayMusic("musicbuild");
        }
        for (_loc2_ of as3.values(MONSTERBAITER._currentAttackers)) {
            _loc3_ = 0;
            while (_loc3_ < _loc2_.length) {
                _loc2_[_loc3_].changeModeRetreat();
                _loc3_++;
            }
        }
        MONSTERBAITER._attacking = 0;
        MONSTERBAITER._currentAttackers = [];
    }

    public static Setup(param1: any = null): void {
        if (param1) {
            if (Boolean(param1.queue) && param1.queue != undefined) {
                if (param1.queue.C100 != undefined) {
                    param1.queue.C12 = param1.queue.C100;
                    delete param1.queue.C100;
                }
                MONSTERBAITER._queue = param1.queue;
            }
            if (Boolean(param1.attackDir) && param1.attackDir != undefined) {
                MONSTERBAITER._attackDir = param1.attackDir | 0;
            }
            if (Boolean(param1.musk) && param1.musk != undefined) {
                MONSTERBAITER._musk = param1.musk | 0;
            }
        }
    }

    public static Update(): void {
        let _loc1_: any = null;
        try {
            if (GLOBAL._bBaiter != null) {
                _loc1_ = GLOBAL._buildingProps[18];
                MONSTERBAITER._muskLimit = _loc1_.capacity[GLOBAL._bBaiter._lvl.Get() - 1] | 0;
                MONSTERBAITER._replenishRate = _loc1_.produce[GLOBAL._bBaiter._lvl.Get() - 1] | 0;
            }
        } catch (e) {
        }
    }

    public static Fill(): void {
        MONSTERBAITER._musk = MONSTERBAITER._muskLimit;
    }

    public static Export(): any {
        return { "queue": MONSTERBAITER._queue, "attackDir": MONSTERBAITER._attackDir, "musk": MONSTERBAITER._musk };
    }

    public static Show(): void {
        if (!MONSTERBAITER._mc) {
            SOUNDS.Play("click1");
            GLOBAL.BlockerAdd();
            MONSTERBAITER._mc = as3.as(GLOBAL._layerWindows.addChild(new MONSTERBAITERPOPUP()), MONSTERBAITERPOPUP);
            MONSTERBAITER._mc.Setup(MONSTERBAITER._queue, MONSTERBAITER._attackDir);
            MONSTERBAITER._mc.Center();
            MONSTERBAITER._mc.ScaleUp();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        SOUNDS.Play("close");
        GLOBAL.BlockerRemove();
        if (MONSTERBAITER._mc) {
            GLOBAL._layerWindows.removeChild(MONSTERBAITER._mc);
            MONSTERBAITER._mc = null;
        }
    }
}

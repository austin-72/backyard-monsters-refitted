import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip } from "flash/display";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, GLOBAL, KEYS, MAP, QUESTS, TUTORIAL, WORKER } from "@game";

export class WORKERS extends ASObject {
    public static _workers: any[] = null;

    public static _sayings: any = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        WORKERS._workers = [];
        if (BASE.isInfernoMainYardOrOutpost) {
            WORKERS._sayings = { "assign": [KEYS.Get("ai_worker_comment1"), KEYS.Get("ai_worker_comment2"), KEYS.Get("ai_worker_comment3"), KEYS.Get("ai_worker_comment5"), KEYS.Get("ai_worker_comment6"), KEYS.Get("ai_worker_comment7")], "remove": [KEYS.Get("ai_worker_cancel1"), KEYS.Get("ai_worker_cancel2"), KEYS.Get("ai_worker_cancel3"), KEYS.Get("ai_worker_cancel4")], "doneConstruct": [KEYS.Get("ai_worker_doneconstruct1"), KEYS.Get("ai_worker_doneconstruct2"), KEYS.Get("ai_worker_doneconstruct3"), KEYS.Get("ai_worker_doneconstruct4")], "doneRepair": [KEYS.Get("ai_worker_donerepair1"), KEYS.Get("ai_worker_donerepair2"), KEYS.Get("ai_worker_donerepair3"), KEYS.Get("ai_worker_donerepair4")], "doneUpgrade": [KEYS.Get("ai_worker_doneupgrade1"), KEYS.Get("ai_worker_doneupgrade2"), KEYS.Get("ai_worker_doneupgrade3"), KEYS.Get("ai_worker_doneupgrade4")] };
        } else {
            WORKERS._sayings = { "assign": [KEYS.Get("ui_worker_assign1"), KEYS.Get("ui_worker_assign2"), KEYS.Get("ui_worker_assign3"), KEYS.Get("ui_worker_assign4"), KEYS.Get("ui_worker_assign5"), KEYS.Get("ui_worker_assign6")], "remove": [KEYS.Get("ui_worker_remove1"), KEYS.Get("ui_worker_remove2"), KEYS.Get("ui_worker_remove3"), KEYS.Get("ui_worker_remove4")], "doneConstruct": [KEYS.Get("ui_worker_doneconstruct1"), KEYS.Get("ui_worker_doneconstruct2"), KEYS.Get("ui_worker_doneconstruct3"), KEYS.Get("ui_worker_doneconstruct4"), KEYS.Get("ui_worker_doneconstruct5"), KEYS.Get("ui_worker_doneconstruct6"), KEYS.Get("ui_worker_doneconstruct7"), KEYS.Get("ui_worker_doneconstruct8")], "doneRepair": [KEYS.Get("ui_worker_donerepair1"), KEYS.Get("ui_worker_donerepair2")], "doneUpgrade": [KEYS.Get("ui_worker_doneupgrade1"), KEYS.Get("ui_worker_doneupgrade2"), KEYS.Get("ui_worker_doneupgrade3"), KEYS.Get("ui_worker_doneupgrade4"), KEYS.Get("ui_worker_doneupgrade5")] };
        }
    }

    public static Spawn(): any {
        let _loc2_: Point = null;
        if (TUTORIAL._stage < 10) {
            _loc2_ = new Point(0, 0);
        } else {
            _loc2_ = new Point(GLOBAL._mapWidth / 2 - Math.random() * GLOBAL._mapWidth, GLOBAL._mapHeight / 2 - Math.random() * GLOBAL._mapHeight);
        }
        let _loc1_: WORKER = as3.as(MAP._BUILDINGTOPS.addChild(new WORKER(MAP._BUILDINGTOPS, _loc2_, Math.random() * 360)), WORKER);
        WORKERS._workers.push({ "mc": _loc1_, "task": null });
        QUESTS._global.worder_count = WORKERS._workers.length;
        return { "mc": _loc1_ };
    }

    public static Tick(): void {
        let _loc1_: any = null;
        let _loc2_: any = null;
        if (GLOBAL._render) {
            for (_loc1_ in WORKERS._workers) {
                _loc2_ = WORKERS._workers[_loc1_];
                _loc2_.mc.Tick();
            }
        }
    }

    public static Assign(param1: BFOUNDATION): any {
        let _loc4_: any = null;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc2_: int = 3000;
        let _loc3_: any = null;
        for (_loc4_ in WORKERS._workers) {
            if (!(_loc5_ = WORKERS._workers[_loc4_]).task) {
                if ((_loc6_ = Point.distance(new Point(_loc5_.mc.x, _loc5_.mc.y), new Point(param1._mc.x, param1._mc.y)) | 0) < _loc2_) {
                    _loc2_ = _loc6_;
                    _loc3_ = _loc5_;
                }
            }
        }
        if (_loc3_) {
            _loc3_.task = param1;
            _loc3_.mc.Target(new Point(param1._mc.x, param1._mc.y + param1._mcFootprint.height / 2), param1);
            _loc3_.mc._targetTask = param1;
            _loc7_ = "";
            if (!GLOBAL._catchup) {
                _loc7_ = String(WORKERS._sayings.assign[(Math.random() * WORKERS._sayings.assign.length) | 0]);
                WORKERS.Say(_loc7_, as3.cast(_loc3_.mc, MovieClip));
            } else {
                _loc3_.mc.x = param1._mc.x;
                _loc3_.mc.y = param1._mc.y;
                _loc3_.mc._targetPosition = new Point(param1._mc.x, param1._mc.y + param1._mcFootprint.height / 2 - 5);
                _loc3_.mc._waypoints = [new Point(param1._mc.x, param1._mc.y + param1._mcFootprint.height / 2 - 5)];
                param1._hasWorker = true;
            }
            return { "mc": _loc3_.mc, "say": _loc7_ };
        }
        return null;
    }

    public static Remove(param1: BFOUNDATION, param2: boolean = true, param3: string = "Construct"): MovieClip {
        let _loc4_: any = null;
        let _loc5_: any = null;
        let _loc6_: any[] = null;
        let _loc7_: Point = null;
        for (_loc4_ in WORKERS._workers) {
            if ((_loc5_ = WORKERS._workers[_loc4_]).task == param1) {
                _loc5_.task = null;
                _loc5_.mc._targetTask = null;
                param1._hasWorker = false;
                if (GLOBAL._render) {
                    _loc5_.mc.Wander();
                    if (param2) {
                        _loc6_ = as3.cast(WORKERS._sayings["done" + param3], Array);
                        WORKERS.Say(as3.str(_loc6_[(Math.random() * _loc6_.length) | 0]), as3.cast(_loc5_.mc, MovieClip));
                    } else {
                        WORKERS.Say(as3.str(WORKERS._sayings.remove[(Math.random() * WORKERS._sayings.remove.length) | 0]), as3.cast(_loc5_.mc, MovieClip));
                    }
                } else {
                    _loc7_ = new Point(param1._mc.x + 20, param1._mc.y + 80);
                    _loc5_.mc._targetPosition = _loc7_;
                    _loc5_.mc._waypoints = [];
                    _loc5_.mc.x = _loc7_.x;
                    _loc5_.mc.y = _loc7_.y;
                }
                return as3.cast(_loc5_.mc, MovieClip);
            }
        }
        return null;
    }

    public static Say(param1: string, param2: MovieClip = null, param3: int = 2000): void {
        if (!param2) {
            param2 = as3.cast(WORKERS._workers[0].mc, MovieClip);
            param2.Target(new Point(param2.x + 20, param2.y + 150));
            param2.Move();
            param2.Update();
        }
        param2.Say(param1, param3);
    }
}

import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BFOUNDATION, GLOBAL, KEYS, LOGGER, MAP, STORE, TUTORIAL, UI_WORKERS, WORKERS } from "@game";

export class QUEUE extends ASObject {
    public static _mc: MovieClip = null;

    public static _items: any = null;

    public static _item: any = null;

    public static _stack: any[] = null;

    public static _workerCount: int = 0;

    public static _workingCount: int = 0;

    public static _placed: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        QUEUE._items = {};
        QUEUE._stack = [];
        QUEUE._workerCount = 0;
        QUEUE._workingCount = 0;
    }

    public static Spawn(param1: int = 0): void {
        let _loc3_: int = 0;
        if (!BASE.isMainYard) {
            if (QUEUE._workerCount > 0) {
                QUEUE._workerCount = WORKERS._workers.length;
                return;
            }
            // (Inferno: an outpost has 2 workers, GLOBAL.ioOutpostWorkers)
            if (param1 > GLOBAL.ioOutpostWorkers()) {
                param1 = GLOBAL.ioOutpostWorkers();
            }
        }
        if (param1 == 0) {
            param1 = BASE.isMainYard ? 1 : GLOBAL.ioOutpostWorkers();
            if (STORE._storeData.BEW) {
                if (!BASE.isMainYard) {
                    if (STORE._storeData.BEW.q > 0) {
                        LOGGER.Log("log", "QUEUE.Spawn Outpost " + BASE._loadedBaseID + "  has store data for " + STORE._storeData.BEW.q + " extra worker(s)");
                    }
                } else {
                    param1 = (param1 + STORE._storeData.BEW.q) | 0;
                }
            }
        }
        QUEUE._workerCount += param1;
        let _loc2_: any = {};
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.WMATTACK && GLOBAL.mode != GLOBAL.e_BASE_MODE.WMVIEW) {
            _loc3_ = 0;
            while (_loc3_ < param1) {
                _loc2_ = WORKERS.Spawn();
                QUEUE._stack.push({ "id": null, "workermc": _loc2_.mc, "active": false, "expanded": false, "building": null, "title": "", "message": "", "say": "" });
                _loc3_++;
            }
            UI_WORKERS.Update();
        }
    }

    public static CanDo(): any {
        let errorName: string = null;
        let stackIndex: int = 0;
        // Admin test mode (and the Designer): builds finish at once, so a worker is always free.
        if (GLOBAL.ioFreeBuild()) {
            return { "error": false, "errormessage": "" };
        }
        while (stackIndex < QUEUE._stack.length) {
            if (!QUEUE._stack[stackIndex].active) {
                return { "error": false, "errormessage": "" };
            }
            stackIndex++;
        }
        if (GLOBAL.INFERNO_ONLY && BASE.isOutpostOrInfernoOutpost) {
            // (bug report B24: an outpost has its own workers (2); no General Store to hire another)
            errorName = KEYS.Get("ui_worker_waitforfinish");
        } else if (!STORE.CheckUpgrade("BEW")) {
            if (GLOBAL._bStore) {
                errorName = KEYS.Get("ui_worker_busy");
            } else {
                errorName = KEYS.Get("ui_worker_waitforfinish");
                if (TUTORIAL._stage >= 200) {
                    errorName += " " + KEYS.Get("ui_worker_impatient");
                } else {
                    errorName += " " + KEYS.Get("ui_worker_tute");
                }
            }
        } else if (STORE.CheckUpgrade("BEW").q + 1 == 5) {
            errorName = KEYS.Get("ui_worker_5busy");
        } else {
            errorName = KEYS.Get("ui_worker_xbusy", { "v1": STORE.CheckUpgrade("BEW").q + 1, "v2": STORE.CheckUpgrade("BEW").q + 1 });
        }
        return { "error": true, "errormessage": errorName };
    }

    public static GetBuilding(): BFOUNDATION {
        let _loc1_: BFOUNDATION = null;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: BFOUNDATION = null;
        if (!BASE.isMainYard && GLOBAL.ioOutpostWorkers() == 1) {
            if (QUEUE._stack[0].active) {
                return as3.cast(QUEUE._stack[0].building, BFOUNDATION);
            }
            return null;
        }
        _loc1_ = null;
        _loc2_ = 2000000000;
        _loc3_ = 0;
        while (_loc3_ < QUEUE._stack.length) {
            // (Inferno: an outpost's worker may be idle, with no building)
            if ((_loc4_ = as3.cast(QUEUE._stack[_loc3_].building, BFOUNDATION)) != null && _loc4_._type != 7 && _loc4_._countdownUpgrade.Get() + _loc4_._countdownBuild.Get() + _loc4_._countdownFortify.Get() < _loc2_) {
                _loc1_ = _loc4_;
                _loc2_ = (_loc4_._countdownUpgrade.Get() + _loc4_._countdownBuild.Get() + _loc4_._countdownFortify.Get()) | 0;
            }
            _loc3_++;
        }
        return _loc1_;
    }

    public static GetFinishCost(): int {
        let _loc2_: int = 0;
        let _loc1_: BFOUNDATION = QUEUE.GetBuilding();
        if (_loc1_) {
            _loc2_ = (_loc1_._countdownUpgrade.Get() + _loc1_._countdownBuild.Get() + _loc1_._countdownFortify.Get()) | 0;
            return STORE.ioBuildingTimeCost(_loc2_);
        }
        return 0;
    }

    public static Add(param1: string, buildingFoundation: BFOUNDATION = null): boolean {
        let stackIndex: int = 0;
        let _loc4_: any = null;
        let worker: any = null;
        QUEUE._items[param1] = { "id": param1, "building": buildingFoundation };

        let test: any = QUEUE.CanDo();
        if (test.error) {
        }
        // test.errorMessage
        if (!test.error) {
            worker = WORKERS.Assign(buildingFoundation);
            if (worker) {
                stackIndex = 0;
                while (stackIndex < QUEUE._stack.length) {
                    if ((_loc4_ = QUEUE._stack[stackIndex]).workermc == worker.mc) {
                        QUEUE._stack[stackIndex].id = param1;
                        QUEUE._stack[stackIndex].active = true;
                        QUEUE._stack[stackIndex].building = buildingFoundation;
                        QUEUE._stack[stackIndex].say = worker.say;
                        QUEUE._stack[stackIndex].timestamp = GLOBAL.Timestamp();
                        break;
                    }
                    stackIndex++;
                }
                QUEUE._placed += 1;
            }
            QUEUE.Sort();
            QUEUE.Tick();
            return true;
        }
        return false;
    }

    public static Remove(param1: string, param2: boolean, param3: BFOUNDATION = null): MovieClip {
        let _loc4_: int = 0;
        let _loc5_: any = null;
        delete QUEUE._items[param1];
        _loc4_ = 0;
        while (_loc4_ < QUEUE._stack.length) {
            if ((_loc5_ = QUEUE._stack[_loc4_]).id == param1) {
                QUEUE._stack[_loc4_].active = false;
                QUEUE._stack[_loc4_].id = "";
                QUEUE._stack[_loc4_].message = "";
                QUEUE._stack[_loc4_].say = "";
                QUEUE._stack[_loc4_].timestamp = "";
                QUEUE.Sort();
                return WORKERS.Remove(as3.cast(_loc5_.building, BFOUNDATION), param2);
            }
            _loc4_++;
        }
        return null;
    }

    public static Tick(): void {
        let upgradingCount: int = 0;
        let i: int = 0;
        let s: any = null;
        let msg: string = null;
        let title: string = null;
        try {
            QUEUE._workingCount = 0;
            upgradingCount = 0;
            i = 0;
            while (i < QUEUE._stack.length) {
                s = QUEUE._stack[i];
                if (STORE._storeData.BST) {
                }
                if (s.active) {
                    ++QUEUE._workingCount;
                    if (Boolean(s.building) && s.building._countdownUpgrade.Get() > 0) {
                        upgradingCount++;
                    }
                    msg = "";
                    title = "";
                    if (s.building._hasWorker) {
                        if (Boolean(s.building._hasResources) || s.building._repairing > 0) {
                            title = String(s.title);
                            msg = String(s.message);
                        } else {
                            title = KEYS.Get("ui_worker_waiting");
                        }
                    } else {
                        s.title = KEYS.Get("ui_worker_walking");
                        s.message = s.say;
                        title = KEYS.Get("ui_worker_walking");
                        msg = String(s.say);
                    }
                    if (!s.expanded) {
                        s.expanded = true;
                    }
                } else if (s.expanded) {
                    s.expanded = false;
                }
                i++;
            }
        } catch (e) {
            LOGGER.Log("err", "Queue.Tick: " + e.message + " | " + e.getStackTrace());
        }
        UI_WORKERS.Update();
    }

    public static Update(param1: string, param2: string, param3: string): void {
        let _loc5_: any = null;
        let _loc4_: int = 0;
        while (_loc4_ < QUEUE._stack.length) {
            if ((_loc5_ = QUEUE._stack[_loc4_]).id == param1) {
                QUEUE._stack[_loc4_].title = param2;
                QUEUE._stack[_loc4_].message = param3;
                break;
            }
            _loc4_++;
        }
        QUEUE.Tick();
    }

    public static JumpToWorker(param1: int): void {
        let _loc2_: MovieClip = as3.cast(QUEUE._stack[param1].workermc, MovieClip);
        MAP.FocusTo(_loc2_.x | 0, _loc2_.y | 0, 0.5);
    }

    public static Move(param1: int, param2: int): void {
    }

    public static Speed(param1: MouseEvent): void {
        STORE.SpeedUp("SP4");
    }

    public static Sort(): void {
        let _loc3_: any = null;
        let _loc1_: any[] = new Array();
        let _loc2_: int = 0;
        while (_loc2_ < QUEUE._stack.length) {
            _loc3_ = { "stack": QUEUE._stack[_loc2_], "active": Number(QUEUE._stack[_loc2_].active) };
            if (_loc3_.stack.building) {
                if (_loc3_.stack.building._type == 7) {
                    _loc3_.active = 0.5;
                }
            }
            _loc1_.push(_loc3_);
            _loc2_++;
        }
        as3.sortOn(_loc1_, "active", Array.NUMERIC | Array.DESCENDING);
        _loc2_ = 0;
        while (_loc2_ < QUEUE._stack.length) {
            QUEUE._stack[_loc2_] = _loc1_[_loc2_].stack;
            _loc2_++;
        }
    }
}

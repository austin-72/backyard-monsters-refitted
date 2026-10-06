import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BUILDING13, CREATURES, GLOBAL, HATCHERYCC, HOUSING, HatcheryBase, InstanceManager, IoQuests, KEYS, POPUPS, ResourcePackages, STORE, SecNum, popup_building } from "@game";

export class BUILDING16 extends HatcheryBase {
    public $ctor(): void {
        super.$ctor();
        this._type = 16;
        this._spoutPoint = new Point(0, -5);
        this._spoutHeight = 55;
        this.SetProps();
    }

    public override PlaceB(): void {
        super.PlaceB();
    }

    public override Destroyed(param1: boolean = true): void {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc2_: Vector<SecNum> = new Vector<SecNum>(2, false, SecNum);
        let _loc3_: int = 0;
        _loc3_ = 0;
        while (_loc3_ < _loc2_.length) {
            as3.vset(_loc2_, _loc3_, new SecNum(0));
            _loc3_++;
        }
        if (this._monsterQueue.length > 0) {
            _loc5_ = this._monsterQueue.length | 0;
            _loc3_ = 0;
            while (_loc3_ < _loc5_) {
                if (BASE.isInfernoCreep(as3.str(this._monsterQueue[_loc3_][0]))) {
                    as3.vget(_loc2_, 1).Add(CREATURES.GetProperty(as3.str(this._monsterQueue[_loc3_][0]), "cResource") * this._monsterQueue[_loc3_][1]);
                } else {
                    as3.vget(_loc2_, 0).Add(CREATURES.GetProperty(as3.str(this._monsterQueue[_loc3_][0]), "cResource") * this._monsterQueue[_loc3_][1]);
                }
                _loc3_++;
            }
            this._monsterQueue = [];
        }
        let _loc4_: int = 0;
        _loc3_ = 0;
        while (_loc3_ < _loc2_.length) {
            BASE.Fund(4, Math.ceil(as3.vget(_loc2_, _loc3_).Get() * 0.75), false, this, Boolean(_loc3_));
            _loc4_ = 0;
            if (as3.vget(_loc2_, _loc3_).Get() > 20000) {
                _loc4_ = 12;
            } else if (as3.vget(_loc2_, _loc3_).Get() > 10000) {
                _loc4_ = 9;
            } else if (as3.vget(_loc2_, _loc3_).Get() > 5000) {
                _loc4_ = 7;
            } else if (as3.vget(_loc2_, _loc3_).Get() > 1000) {
                _loc4_ = 5;
            } else if (as3.vget(_loc2_, _loc3_).Get() > 400) {
                _loc4_ = 4;
            } else if (as3.vget(_loc2_, _loc3_).Get() > 200) {
                _loc4_ = 3;
            } else if (as3.vget(_loc2_, _loc3_).Get() > 100) {
                _loc4_ = 2;
            } else if (as3.vget(_loc2_, _loc3_).Get() > 0) {
                _loc4_ = 1;
            }
            _loc6_ = 0;
            while (_loc6_ < _loc4_) {
                ResourcePackages.Spawn(this, GLOBAL.townHall, BASE.isInfernoMainYardOrOutpost || Boolean(_loc3_) ? 8 : 4, _loc6_);
                _loc6_++;
            }
            _loc3_++;
        }
        super.Destroyed(param1);
    }

    public ResetProduction(): void {
        if (this._inProduction == "") {
            this._productionStage.Set(0);
        } else {
            this._productionStage.Set(3);
            this._countdownProduce.Set(0);
            this._hpCountdownProduce = 0;
        }
    }

    public override Tick(param1: int): void {
        if (GLOBAL.INFERNO_ONLY && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        let _loc4_: Vector<any> = null;
        let _loc5_: BUILDING13 = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: string = null;
        super.Tick(param1);
        let _loc2_: int = HOUSING._housingSpace.Get() | 0;
        let _loc3_: int = 0;
        this._finishQueue = {};
        this._finishAll = true;
        if (this._countdownBuild.Get() == 0 && this.health > 10) {
            this._canFunction = true;
            _loc4_ = InstanceManager.getInstancesByClass(BUILDING13);
            for (_loc5_ of (_loc4_ ?? [])) {
                if (_loc5_._canFunction) {
                    if (_loc5_._inProduction != "" && _loc2_ >= CREATURES.GetProperty(_loc5_._inProduction, "cStorage")) {
                        _loc2_ = (_loc2_ - CREATURES.GetProperty(_loc5_._inProduction, "cStorage")) | 0;
                        if (this._finishQueue[_loc5_._inProduction]) {
                            this._finishQueue[_loc5_._inProduction] = (this._finishQueue[_loc5_._inProduction] | 0) + 1;
                        } else {
                            this._finishQueue[_loc5_._inProduction] = 1;
                        }
                        _loc3_ = (_loc3_ + _loc5_._countdownProduce.Get()) | 0;
                    } else if (this._monsterQueue.length > 0) {
                        if (_loc5_._canFunction && _loc5_._inProduction == "") {
                            _loc5_._inProduction = as3.str(this._monsterQueue[0][0]);
                            --this._monsterQueue[0][1];
                            if (this._monsterQueue[0][1] <= 0) {
                                this._monsterQueue.splice(0, 1);
                            }
                            _loc5_._productionStage.Set(3);
                            _loc5_.Tick(1);
                            HATCHERYCC.Tick();
                            if (this._monsterQueue.length == 0) {
                                return;
                            }
                        }
                    }
                }
            }
            if (this._monsterQueue.length > 0 && _loc2_ >= 10) {
                _loc6_ = this._monsterQueue.length | 0;
                _loc7_ = 0;
                while (_loc7_ < _loc6_) {
                    _loc8_ = String(this._monsterQueue[_loc7_][0]);
                    if (_loc2_ >= CREATURES.GetProperty(_loc8_, "cStorage") * this._monsterQueue[_loc7_][1]) {
                        _loc3_ = (_loc3_ + CREATURES.GetProperty(_loc8_, "cTime") * this._monsterQueue[_loc7_][1]) | 0;
                        _loc2_ = (_loc2_ - CREATURES.GetProperty(_loc8_, "cStorage") * this._monsterQueue[_loc7_][1]) | 0;
                        if (this._finishQueue[_loc8_]) {
                            this._finishQueue[_loc8_] += this._monsterQueue[_loc7_][1];
                        } else {
                            this._finishQueue[_loc8_] = this._monsterQueue[_loc7_][1];
                        }
                    } else if (_loc2_ >= CREATURES.GetProperty(_loc8_, "cStorage")) {
                        _loc3_ = (_loc3_ + CREATURES.GetProperty(_loc8_, "cTime") * (_loc2_ / CREATURES.GetProperty(_loc8_, "cStorage"))) | 0;
                        if (this._finishQueue[_loc8_]) {
                            this._finishQueue[_loc8_] += _loc2_ / CREATURES.GetProperty(_loc8_, "cStorage");
                        } else {
                            this._finishQueue[_loc8_] = _loc2_ / CREATURES.GetProperty(_loc8_, "cStorage");
                        }
                        this._finishAll = false;
                        break;
                    }
                    _loc7_++;
                }
            }
        } else {
            this._canFunction = false;
        }
        if (this._canFunction && _loc3_ > 0) {
            this._finishCost.Set(STORE.GetTimeCost(_loc3_, false) * 4);
        } else {
            this._finishCost.Set(0);
        }
    }

    public FinishNow(): void {
        let _loc1_: any[] = null;
        let _loc2_: int = 0;
        let _loc3_: Point = null;
        let _loc4_: Vector<any> = null;
        let _loc5_: BUILDING13 = null;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        if (!this._canFunction) {
            GLOBAL.Message(KEYS.Get("building_hcc_cantfunction"));
            return;
        }
        if (BASE._credits.Get() >= this._finishCost.Get()) {
            if (!GLOBAL.ioConfirmShiny(this._finishCost.Get() | 0, "to finish all hatching now", as3.bind(this, this.FinishNow))) {
                return;
            }
            _loc1_ = [];
            _loc2_ = HOUSING._housingSpace.Get() | 0;
            _loc4_ = InstanceManager.getInstancesByClass(BUILDING13);
            for (_loc5_ of (_loc4_ ?? [])) {
                if (_loc5_._canFunction) {
                    _loc1_.push(_loc5_);
                    if (_loc5_._inProduction != "" && _loc2_ >= CREATURES.GetProperty(_loc5_._inProduction, "cStorage")) {
                        _loc3_ = new Point(_loc5_._mc.x - 10 + Math.random() * 20, _loc5_._mc.y - 10 + Math.random() * 20);
                        if (HOUSING.HousingStore(_loc5_._inProduction, _loc3_) && GLOBAL.INFERNO_ONLY) {
                            IoQuests.hatched(_loc5_._inProduction);
                        }
                        _loc2_ = (_loc2_ - CREATURES.GetProperty(_loc5_._inProduction, "cStorage")) | 0;
                        _loc5_._inProduction = "";
                        _loc5_._productionStage.Set(0);
                    }
                }
            }
            if (this._monsterQueue.length > 0) {
                while (this._monsterQueue.length > 0 && _loc2_ > 0) {
                    _loc7_ = String(this._monsterQueue[0][0]);
                    _loc8_ = CREATURES.GetProperty(_loc7_, "cStorage") | 0;
                    while (this._monsterQueue[0][1] > 0 && _loc2_ >= _loc8_) {
                        if (_loc2_ >= _loc8_) {
                            _loc9_ = (Math.random() * _loc1_.length) | 0;
                            _loc3_ = new Point(_loc1_[_loc9_]._mc.x - 10 + Math.random() * 20, _loc1_[_loc9_]._mc.y - 10 + Math.random() * 20);
                            --this._monsterQueue[0][1];
                            _loc2_ -= _loc8_;
                            if (HOUSING.HousingStore(_loc7_, _loc3_) && GLOBAL.INFERNO_ONLY) {
                                IoQuests.hatched(_loc7_);
                            }
                        }
                    }
                    if (this._monsterQueue[0][1] <= 0) {
                        this._monsterQueue.shift();
                    } else if (_loc2_ < _loc8_) {
                        break;
                    }
                }
            }
            BASE.Purchase("FQ", this._finishCost.Get() | 0, "BUILDING16.FinishNow");
        } else {
            POPUPS.DisplayGetShiny();
        }
    }

    public override Constructed(): void {
        let hatcheryInstances: Vector<any> = null;
        let Brag: Function = null;
        let building: BUILDING13 = null;
        let i: int = 0;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bHatcheryCC = this;
        hatcheryInstances = InstanceManager.getInstancesByClass(BUILDING13);
        for (building of (hatcheryInstances ?? [])) {
            i = 0;
            while (i < building._monsterQueue.length) {
                BASE.Fund(4, building._monsterQueue[i][1] * CREATURES.GetProperty(as3.str(building._monsterQueue[i][0]), "cResource"));
                i++;
            }
            building._monsterQueue = [];
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-hcc", KEYS.Get("pop_hccbuilt_streamtitle"), KEYS.Get("pop_hccbuilt_streambody"), "build-hatcherycontrolcenter.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_hccbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_hccbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override RecycleC(): void {
        GLOBAL._bHatcheryCC = null;
        super.RecycleC();
    }

    public override Upgraded(): void {
        super.Upgraded();
    }

    public override Setup(param1: any): void {
        this._monsterQueue = [];
        if (param1.mq) {
            this._monsterQueue = as3.cast(param1.mq, Array);
        }
        let _loc2_: int = 0;
        while (_loc2_ < this._monsterQueue.length) {
            if (this._monsterQueue[_loc2_][0] == "C100") {
                this._monsterQueue[_loc2_][0] = "C12";
            }
            _loc2_++;
        }
        super.Setup(param1);
        if (this._countdownBuild.Get() == 0) {
            GLOBAL._bHatcheryCC = this;
        }
    }

    public override Export(): any {
        let _loc1_: any = super.Export();
        if (this._monsterQueue.length > 0) {
            _loc1_.mq = this._monsterQueue;
        }
        return _loc1_;
    }
}

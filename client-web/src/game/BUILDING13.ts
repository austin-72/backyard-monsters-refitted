import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, CREATURELOCKER, CREATURES, CREEPS, GLOBAL, HATCHERY, HOUSING, HatcheryBase, IoQuests, KEYS, POPUPS, ResourcePackages, STORE, SecNum, TUTORIAL, popup_building } from "@game";

export class BUILDING13 extends HatcheryBase {
    static {
        as3.fields(this, { _frameNumber: 0, _timeStamp: 0 });
    }

    public _frameNumber: int;
    public _timeStamp: int;

    public $ctor(): void {
        super.$ctor();
        this._frameNumber = 0;
        this._type = 13;
        this._inProduction = "";
        this._productionStage.Set(0);
        this._spoutPoint = new Point(-28, -58);
        this._spoutHeight = 97;
        this._taken = new SecNum(0);
        if (BASE.isInfernoMainYardOrOutpost) {
            this._animRandomStart = false;
        }
        this.SetProps();
    }

    public override PlaceB(): void {
        super.PlaceB();
    }

    public override TickFast(param1: Event = null): void {
        if (GLOBAL._render && this._animLoaded && this._countdownBuild.Get() + this._countdownUpgrade.Get() == 0 && this._inProduction != "" && this._productionStage.Get() == 1 && this._canFunction) {
            if (GLOBAL._render && this._animLoaded && this._countdownBuild.Get() + this._countdownUpgrade.Get() == 0 && this._canFunction) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._frameNumber % 2 == 0 && CREEPS._creepCount == 0) {
                    this.AnimFrame();
                } else if (this._frameNumber % 7 == 0) {
                    this.AnimFrame();
                }
            }
        } else if (this._animTick != 0) {
            this._animTick = 0;
            super.AnimFrame(false);
        }
        ++this._frameNumber;
    }

    public override AnimFrame(param1: boolean = true): void {
        super.AnimFrame(param1);
        if (GLOBAL._hatcheryOverdrivePower.Get() == 10) {
            this._animTick += 4;
        } else if (GLOBAL._hatcheryOverdrivePower.Get() == 6) {
            this._animTick += 2;
        } else if (GLOBAL._hatcheryOverdrivePower.Get() == 4) {
            ++this._animTick;
        }
        if (this._animTick >= 30) {
            this._animTick -= 30;
        }
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
        if (this._inProduction != "") {
            if (BASE.isInfernoCreep(this._inProduction)) {
                as3.vget(_loc2_, 1).Add(CREATURES.GetProperty(this._inProduction, "cResource"));
            } else {
                as3.vget(_loc2_, 0).Add(CREATURES.GetProperty(this._inProduction, "cResource"));
            }
            this._inProduction = "";
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
            BASE.Fund(4, Math.ceil(as3.vget(_loc2_, _loc3_).Get() * 0.75), false, null, Boolean(_loc3_));
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

    public override Description(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        super.Description();
        if (GLOBAL._hatcheryOverdrive > 0) {
            this._buildingTitle += " <font color=\"#CC0000\">" + KEYS.Get("building_hatcheryoverdrive_title", { "v1": GLOBAL._hatcheryOverdrivePower.Get(), "v2": GLOBAL.ToTime(GLOBAL._hatcheryOverdrive) }) + "</font>";
        }
        if (this._inProduction == "") {
            this._specialDescription = "<font color=\"#CC0000\">" + KEYS.Get("building_hatchery_noprod", { "v1": GLOBAL._buildingProps[12].name }) + "</font>";
        } else if (this._canFunction) {
            if (CREATURES.GetProperty(this._inProduction, "cResource") < BASE._resources.r3.Get() && this._productionStage.Get() == 3) {
                this._specialDescription = "<font color=\"#CC0000\">" + KEYS.Get("building_hatchery_res", { "v1": GLOBAL._resourceNames[3] }) + "</font>";
            } else if (this._productionStage.Get() == 2 && !HOUSING.HousingStore(this._inProduction, new Point(this._mc.x, this._mc.y), true)) {
                this._specialDescription = "<font color=\"#CC0000\">" + KEYS.Get("building_hatchery_housing", { "v1": GLOBAL._buildingProps[14].name, "v2": CREATURELOCKER._creatures[this._inProduction].name }) + "</font>";
            } else if (this._productionStage.Get() == 1) {
                _loc1_ = CREATURES.GetProperty(this._inProduction, "cTime") | 0;
                _loc2_ = (100 / _loc1_ * this._countdownProduce.Get()) | 0;
                if (_loc2_ < 0) {
                    _loc2_ = 0;
                }
                if (GLOBAL._hatcheryOverdrive) {
                    _loc1_ = (_loc1_ / GLOBAL._hatcheryOverdrivePower.Get()) | 0;
                }
                this._specialDescription = "Producing a " + CREATURELOCKER._creatures[this._inProduction].name + "<br>";
                if (this._productionStage.Get() == 1) {
                    this._specialDescription += 100 - _loc2_ + "% ";
                    if (_loc2_ < 10) {
                        this._specialDescription += KEYS.Get("building_hatchery_stage7");
                    } else if (_loc2_ < 20) {
                        this._specialDescription += KEYS.Get("building_hatchery_stage6");
                    } else if (_loc2_ < 30) {
                        this._specialDescription += KEYS.Get("building_hatchery_stage5");
                    } else if (_loc2_ < 60) {
                        this._specialDescription += KEYS.Get("building_hatchery_stage4");
                    } else if (_loc2_ < 70) {
                        this._specialDescription += KEYS.Get("building_hatchery_stage3", { "v1": GLOBAL._resourceNames[3] });
                    } else if (_loc2_ < 80) {
                        this._specialDescription += KEYS.Get("building_hatchery_stage2");
                    } else {
                        this._specialDescription += KEYS.Get("building_hatchery_stage1", { "v1": GLOBAL._resourceNames[3] });
                    }
                }
            }
        } else {
            this._specialDescription = "<font color=\"#CC0000\">" + KEYS.Get("building_hatchery_damaged") + "</font>";
        }
    }

    public ResetProduction(): void {
        if (this._taken.Get() > 0) {
            BASE.Fund(4, this._taken.Get());
        }
        this._taken.Set(0);
        this._hasResources = false;
        this._countdownProduce.Set(0);
        this._hpCountdownProduce = 0;
        if (this._inProduction == "") {
            this._productionStage.Set(0);
        } else {
            this._productionStage.Set(3);
        }
    }

    public override StartProduction(): void {
        this._inProduction = "";
        this._productionStage.Set(0);
        this._taken.Set(0);
        if (this._monsterQueue.length > 0) {
            this._inProduction = as3.str(this._monsterQueue[0][0]);
            if (this._inProduction == "C100") {
                this._inProduction = "C12";
            }
            --this._monsterQueue[0][1];
            if (this._monsterQueue[0][1] <= 0) {
                this._monsterQueue.splice(0, 1);
            }
            HATCHERY.Tick();
            this._productionStage.Set(3);
            this.Tick(1);
        }
    }

    public override get tickLimit(): int {
        let _loc1_: int = super.tickLimit;
        if (this._timeStamp > GLOBAL.Timestamp()) {
            _loc1_ = Math.min(_loc1_, this._timeStamp - GLOBAL.Timestamp()) | 0;
        } else if (this._inProduction != "" && this._countdownProduce.Get() >= 0 && HOUSING.HousingStore(this._inProduction, new Point(this._mc.x, this._mc.y), true, 0)) {
            _loc1_ = Math.min(_loc1_, this._countdownProduce.Get()) | 0;
        }
        return _loc1_;
    }

    public override Tick(param1: int): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: string = null;
        if (this._inProduction == "C100") {
            this._inProduction = "C12";
        }
        super.Tick(param1);
        if (GLOBAL.INFERNO_ONLY && GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            // A yard that is being viewed or attacked does not hatch: with one-second hatching, the
            // hatcheries were refilling the Compounds mid-fight.
            return;
        }
        if (this._timeStamp > GLOBAL.Timestamp()) {
            return;
        }
        if (this._countdownBuild.Get() > 0 || this.health < this.maxHealth * 0.5) {
            this._canFunction = false;
        } else {
            this._canFunction = true;
        }
        if (this._canFunction) {
            if (!GLOBAL._bHatcheryCC) {
                _loc2_ = HOUSING._housingSpace.Get() | 0;
                this._finishQueue = {};
                this._finishAll = true;
                _loc3_ = 0;
                if (this._inProduction != "" && _loc2_ >= CREATURES.GetProperty(this._inProduction, "cStorage")) {
                    _loc2_ = (_loc2_ - CREATURES.GetProperty(this._inProduction, "cStorage")) | 0;
                    this._finishQueue[this._inProduction] = 1;
                    _loc3_ = this._countdownProduce.Get() | 0;
                    if (this._monsterQueue.length > 0) {
                        _loc4_ = this._monsterQueue.length | 0;
                        _loc5_ = 0;
                        while (_loc5_ < _loc4_) {
                            _loc6_ = String(this._monsterQueue[_loc5_][0]);
                            if (_loc2_ >= CREATURES.GetProperty(_loc6_, "cStorage") * this._monsterQueue[_loc5_][1]) {
                                _loc3_ = (_loc3_ + CREATURES.GetProperty(_loc6_, "cTime") * this._monsterQueue[_loc5_][1]) | 0;
                                _loc2_ = (_loc2_ - CREATURES.GetProperty(_loc6_, "cStorage") * this._monsterQueue[_loc5_][1]) | 0;
                                if (this._finishQueue[_loc6_]) {
                                    this._finishQueue[_loc6_] += this._monsterQueue[_loc5_][1];
                                } else {
                                    this._finishQueue[_loc6_] = this._monsterQueue[_loc5_][1];
                                }
                            } else if (_loc2_ >= CREATURES.GetProperty(_loc6_, "cStorage")) {
                                _loc3_ = (_loc3_ + CREATURES.GetProperty(_loc6_, "cTime") * (_loc2_ / CREATURES.GetProperty(_loc6_, "cStorage"))) | 0;
                                if (this._finishQueue[_loc6_]) {
                                    this._finishQueue[_loc6_] += _loc2_ / CREATURES.GetProperty(_loc6_, "cStorage");
                                } else {
                                    this._finishQueue[_loc6_] = _loc2_ / CREATURES.GetProperty(_loc6_, "cStorage");
                                }
                                this._finishAll = false;
                                break;
                            }
                            _loc5_++;
                        }
                    }
                    this._finishCost.Set(STORE.GetTimeCost(_loc3_, false) * 4);
                } else {
                    this._finishCost.Set(0);
                }
            }
            if (this._countdownBuild.Get() + this._countdownUpgrade.Get() == 0 && this.health > 10) {
                if (this._inProduction != "" && this._productionStage.Get() == 1) {
                    if (this._countdownProduce.Get() <= 0) {
                        this._productionStage.Set(2);
                        this.Tick(1);
                        return;
                    }
                    this._hasResources = true;
                    if (GLOBAL._hatcheryOverdrive) {
                        this._countdownProduce.Add(-GLOBAL._hatcheryOverdrivePower.Get() * param1);
                    } else {
                        this._countdownProduce.Add(-param1);
                    }
                }
                if (this._productionStage.Get() == 2 && Boolean(this._inProduction)) {
                    this._taken.Set(0);
                    if (HOUSING.HousingStore(this._inProduction, new Point(this._mc.x, this._mc.y), false, this._countdownProduce.Get() | 0)) {
                        if (GLOBAL.INFERNO_ONLY) {
                            IoQuests.hatched(this._inProduction);
                        }
                        this.StartProduction();
                    }
                }
                if (this._productionStage.Get() == 3) {
                    this._productionStage.Set(4);
                    this._hasResources = true;
                }
                if (this._productionStage.Get() == 4 && (this._hasResources || !GLOBAL._render)) {
                    this._hasResources = true;
                    this._countdownProduce.Set(CREATURES.GetProperty(this._inProduction, "cTime"));
                    this._productionStage.Set(1);
                    this.Tick(1);
                    return;
                }
            }
        }
    }

    public FinishNow(): void {
        let _loc1_: any[] = null;
        let _loc2_: int = 0;
        let _loc3_: Point = null;
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        if (!this._canFunction) {
            GLOBAL.Message(KEYS.Get("building_hcc_cantfunction"));
            return;
        }
        if (BASE._credits.Get() >= this._finishCost.Get()) {
            if (!GLOBAL.ioConfirmShiny(this._finishCost.Get() | 0, "to finish hatching now", as3.bind(this, this.FinishNow))) {
                return;
            }
            _loc1_ = [];
            _loc2_ = HOUSING._housingSpace.Get() | 0;
            if (this._inProduction != "" && _loc2_ >= CREATURES.GetProperty(this._inProduction, "cStorage")) {
                _loc3_ = new Point(this._mc.x - 10 + Math.random() * 20, this._mc.y - 10 + Math.random() * 20);
                if (HOUSING.HousingStore(this._inProduction, _loc3_) && GLOBAL.INFERNO_ONLY) {
                    IoQuests.hatched(this._inProduction);
                }
                _loc2_ = (_loc2_ - CREATURES.GetProperty(this._inProduction, "cStorage")) | 0;
                this._inProduction = "";
                this._productionStage.Set(0);
                if (this._monsterQueue.length > 0) {
                    while (this._monsterQueue.length > 0 && _loc2_ > 0) {
                        _loc5_ = String(this._monsterQueue[0][0]);
                        _loc6_ = CREATURES.GetProperty(_loc5_, "cStorage") | 0;
                        while (this._monsterQueue[0][1] > 0 && _loc2_ >= _loc6_) {
                            if (_loc2_ >= _loc6_) {
                                _loc7_ = (Math.random() * _loc1_.length) | 0;
                                _loc3_ = new Point(this._mc.x - 10 + Math.random() * 20, this._mc.y - 10 + Math.random() * 20);
                                --this._monsterQueue[0][1];
                                _loc2_ -= _loc6_;
                                if (HOUSING.HousingStore(_loc5_, _loc3_) && GLOBAL.INFERNO_ONLY) {
                                    IoQuests.hatched(_loc5_);
                                }
                            }
                        }
                        if (this._monsterQueue[0][1] <= 0) {
                            this._monsterQueue.shift();
                        } else if (_loc2_ < _loc6_) {
                            break;
                        }
                    }
                }
            }
            if (this._monsterQueue.length > 0) {
                this._inProduction = as3.str(this._monsterQueue[0][0]);
                if (this._inProduction == "C100") {
                    this._inProduction = "C12";
                }
                --this._monsterQueue[0][1];
                if (this._monsterQueue[0][1] <= 0) {
                    this._monsterQueue.splice(0, 1);
                }
                this._productionStage.Set(3);
            } else {
                this._productionStage.Set(0);
            }
            BASE.Purchase("FQ", this._finishCost.Get() | 0, "BUILDING13.FinishNow");
            HATCHERY.Tick();
            this.Tick(1);
        } else {
            POPUPS.DisplayGetShiny();
        }
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bHatchery = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && TUTORIAL._stage > 200 && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-ha", KEYS.Get("pop_hatbuilt_streamtitle"), KEYS.Get("pop_hatbuilt_body"), "build-hatchery.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_hatbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_hatbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Cancel(): void {
        GLOBAL._bHatchery = null;
        super.Cancel();
    }

    public override RecycleC(): void {
        GLOBAL._bHatchery = null;
        super.RecycleC();
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !BASE.isInfernoMainYardOrOutpost) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-ha-" + this._lvl.Get(), KEYS.Get("pop_hatupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_hatupgraded_body", { "v1": this._lvl.Get() }), "upgrade-hatchery.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_hatupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_hatupgraded_body", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Setup(param1: any): void {
        let _loc2_: int = 0;
        this._monsterQueue = [];
        if (param1.mq) {
            this._monsterQueue = as3.cast(param1.mq, Array);
        }
        if (param1.saved >= 0) {
            this._timeStamp = param1.saved | 0;
        } else {
            this._timeStamp = 0;
        }
        _loc2_ = (this._monsterQueue.length - 1) | 0;
        while (_loc2_ >= 0) {
            if (!this._monsterQueue[_loc2_][0]) {
                this._monsterQueue.splice(_loc2_);
            } else if (this._monsterQueue[_loc2_][0] == "C100") {
                this._monsterQueue[_loc2_][0] = "C12";
            }
            _loc2_--;
        }
        super.Setup(param1);
        if (this._countdownBuild.Get() == 0 || TUTORIAL._stage < 200) {
            GLOBAL._bHatchery = this;
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

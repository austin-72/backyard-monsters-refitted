import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { ATTACK, BASE, BFOUNDATION, CModifiableProperty, GLOBAL, ILootable, IMapRoomCell, IoQuests, KEYS, LOGGER, MapRoomManager, POPUPS, QUESTS, ResourcePackages, SecNum, TUTORIAL, mc_buildingalerticon, popup_building } from "@game";

export class BRESOURCE extends BFOUNDATION implements ILootable {
    static {
        as3.implement(this, [ILootable]);
        as3.fields(this, { productionRateProperty: null, productionCapacityProperty: null });
    }

    public static readonly RESOURCE_TWIGS: uint = 1;

    public static readonly RESOURCE_PEBBLES: uint = 2;

    public static readonly RESOURCE_PUTTY: uint = 3;

    public static readonly RESOURCE_GOO: uint = 4;

    public static readonly RESOURCE_BONE: uint = 5;

    public static readonly RESOURCE_COAL: uint = 6;

    public static readonly RESOURCE_SULFUR: uint = 7;

    public static readonly RESOURCE_MAGMA: uint = 8;

    private static readonly _RESOURCE_BONUS: number = 1.5;

    private static readonly _RESOURCE_ALLIANCE_BONUS: number = 1.15;
    public productionRateProperty: CModifiableProperty;
    public productionCapacityProperty: CModifiableProperty;

    public $ctor(): void {
        super.$ctor();
    }

    public static AdjustProduction(param1: IMapRoomCell, param2: int): int {
        if (MapRoomManager.instance.isInMapRoom2 && BASE.isOutpostMapRoom2Only && param1 && param1.cellHeight && param1.cellHeight >= 100) {
            return Math.max((param2 * GLOBAL._averageAltitude.Get() / param1.cellHeight) | 0, 1) | 0;
        }
        return param2;
    }

    public static GetResourceNameKey(param1: uint): string {
        if (param1 <= 3 && BASE.isInfernoMainYardOrOutpost) {
            param1 = (param1 + 4) >>> 0;
        }
        switch (param1) {
            case 0:
                return "#r_twigs#";
            case 1:
                return "#r_pebbles#";
            case 2:
                return "#r_putty#";
            case 3:
                return "#r_goo#";
            case 4:
                return "#r_bone#";
            case 5:
                return "#r_coal#";
            case 6:
                return "#r_sulfur#";
            case 7:
                return "#r_magma#";
            case 8:
                return "#r_shiny#";
            default:
                return null;
        }
    }

    public override SetProps(): void {
        super.SetProps();
        this._spriteAlert = new mc_buildingalerticon();
        this._spriteAlert.cacheAsBitmap = true;
        this._spriteAlert.mouseChildren = false;
        this._spriteAlert.mouseEnabled = false;
        this.productionRateProperty = new CModifiableProperty();
        this.productionCapacityProperty = new CModifiableProperty();
    }

    public override PlaceB(): void {
        super.PlaceB();
    }

    public override Click(param1: MouseEvent = null): void {
        super.Click(param1);
    }

    public override Loot(param1: int): uint {
        let _loc2_: int = 0;
        if (this._stored.Get() >= param1) {
            _loc2_ = param1;
        } else {
            _loc2_ = this._stored.Get() | 0;
        }
        if (_loc2_ > 0) {
            this._stored.Add((-_loc2_) | 0);
            ATTACK.Loot(this._type, _loc2_, this._mc.x | 0, this._mc.y | 0, 0, this);
            if (BASE.isOutpost) {
                if (_loc2_ > 0) {
                    BASE._resources["r" + this._type].Add(-_loc2_);
                    BASE._hpResources["r" + this._type] -= _loc2_;
                    if (BASE._deltaResources["r" + this._type]) {
                        BASE._deltaResources["r" + this._type].Add(-_loc2_);
                        BASE._hpDeltaResources["r" + this._type] -= _loc2_;
                    } else {
                        BASE._deltaResources["r" + this._type] = new SecNum(-_loc2_);
                        BASE._hpDeltaResources["r" + this._type] = -_loc2_;
                    }
                    BASE._deltaResources.dirty = true;
                    BASE._hpDeltaResources.dirty = true;
                }
            }
        }
        if (this._stored.Get() <= 0) {
            this._looted = true;
            this._canFunction = false;
            this._producing = 0;
        }
        return super.Loot(_loc2_);
    }

    public override Destroyed(param1: boolean = true): void {
        if (param1) {
            this.Loot(this._stored.Get() | 0);
        }
        super.Destroyed(param1);
    }

    public override Constructed(): void {
        super.Constructed();
        if (!this._producing) {
            this.StartProduction();
        }
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        if (!this._producing) {
            this.StartProduction();
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._lvl.Get() >= 3 && TUTORIAL._stage > 200 && !BASE.isInfernoMainYardOrOutpost) {
            Brag = (param1: MouseEvent): void => {
                let _loc2_: string = "upgrade-twigsnapper.png";
                let _loc3_: string = KEYS.Get("#r_twigs#");
                if (this._type == 2) {
                    _loc2_ = "upgrade-pebbleshiner.png";
                    _loc3_ = KEYS.Get("#r_pebbles#");
                }
                if (this._type == 3) {
                    _loc2_ = "upgrade-puttysquisher.png";
                    _loc3_ = KEYS.Get("#r_puttys#");
                }
                if (this._type == 4) {
                    _loc2_ = "upgrade-goofactory.png";
                    _loc3_ = KEYS.Get("#r_goos#");
                }
                GLOBAL.CallJS("sendFeed", ["build-" + String(this._buildingProps.name).toLowerCase(), KEYS.Get("pop_rupgraded_streamtitle", { "v1": this._lvl.Get(), "v2": KEYS.Get(as3.str(this._buildingProps.name)) }), KEYS.Get("pop_rupgraded_streambody"), _loc2_]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_rupgraded_title", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": this._lvl.Get() }) + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_rupgraded_body", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[this._type - 1])) });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Description(): void {
        let _loc2_: int = 0;
        let _loc3_: number = NaN;
        let _loc4_: number = NaN;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: number = NaN;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: number = NaN;
        super.Description();
        let _loc1_: int = (this._buildingProps.produce[this._lvl.Get() - 1] / this._buildingProps.cycleTime[this._lvl.Get() - 1] * 60 * 60) | 0;
        if (BASE.isOutpost) {
            _loc1_ = BRESOURCE.AdjustProduction(GLOBAL._currentCell, _loc1_);
        }
        if (this.health < this.maxHealth) {
            if (this._countdownUpgrade.Get() + this._countdownFortify.Get() <= 0) {
                _loc5_ = (this._buildingProps.cycleTime[this._lvl.Get() - 1] + Math.ceil(this._buildingProps.cycleTime[this._lvl.Get() - 1] * (4 - 4 / this.maxHealth * this.health))) | 0;
                _loc6_ = (this._buildingProps.produce[this._lvl.Get() - 1] / _loc5_ * 60 * 60) | 0;
                if (BASE.isOutpost) {
                    _loc6_ = BRESOURCE.AdjustProduction(GLOBAL._currentCell, _loc6_);
                }
                _loc7_ = 100 - Math.ceil(100 / this.maxHealth * this.health);
                _loc8_ = this._lvl.Get() == 0 ? this._buildingProps.repairTime[0] | 0 : this._buildingProps.repairTime[this._lvl.Get() - 1] | 0;
                _loc8_ = Math.min(3600, _loc8_) | 0;
                if (this.health > this.maxHealth * 0.5) {
                    this._repairDescription = "<font color=\"#FF0000\">" + KEYS.Get("bdg_resourcedamaged_reduced", { "v1": _loc7_ }) + "</font><br>";
                } else {
                    this._repairDescription = "<font color=\"#FF0000\">" + KEYS.Get("bdg_resourcedamaged_halted", { "v1": _loc7_ }) + "</font><br>";
                }
                if (this._repairing == 0) {
                    this._repairDescription += KEYS.Get("bdg_resourcedamaged_repair");
                } else {
                    _loc8_ = Math.ceil(this.maxHealth / _loc8_) | 0;
                    this._repairDescription += KEYS.Get("bdg_resourcedamaged_remaining", { "v1": GLOBAL.ToTime(((this.maxHealth - this.health) / _loc8_) | 0) });
                }
            }
        } else {
            this._specialDescription = KEYS.Get("bdg_resource_produces", { "v1": GLOBAL.FormatNumber(_loc1_), "v2": KEYS.Get(as3.str(GLOBAL._resourceNames[this._type - 1])), "v3": GLOBAL.FormatNumber(this.productionCapacity), "v4": GLOBAL._resourceNames[this._type - 1] });
            if (this._producing) {
                _loc2_ = (this.productionCapacity - this._stored.Get()) | 0;
                _loc3_ = 60 / this._buildingProps.cycleTime[this._lvl.Get() - 1] * this._buildingProps.produce[this._lvl.Get() - 1];
                if (BASE.isOutpost) {
                    _loc3_ = BRESOURCE.AdjustProduction(GLOBAL._currentCell, _loc3_ | 0);
                }
                _loc4_ = _loc2_ / _loc3_ * 60;
                this._specialDescription += " " + KEYS.Get("bdg_resource_befullin", { "v1": GLOBAL.ToTime(_loc4_ | 0) });
            } else {
                this._specialDescription += " <font color=\"#FF0000\">" + KEYS.Get("bdg_resource_full") + "</font>";
            }
        }
        if (this._lvl.Get() < this._buildingProps.costs.length) {
            _loc9_ = (this._buildingProps.produce[this._lvl.Get()] / this._buildingProps.cycleTime[this._lvl.Get()] * 60 * 60) | 0;
            if (BASE.isOutpost) {
                _loc9_ = BRESOURCE.AdjustProduction(GLOBAL._currentCell, _loc9_);
            }
            _loc10_ = _loc4_;
            _loc2_ = this._buildingProps.capacity[this._lvl.Get()] | 0;
            if (BASE.isOutpost) {
                _loc3_ = 60 / this._buildingProps.cycleTime[this._lvl.Get()] * BRESOURCE.AdjustProduction(GLOBAL._currentCell, this._buildingProps.produce[this._lvl.Get()] | 0);
            } else {
                _loc3_ = 60 / this._buildingProps.cycleTime[this._lvl.Get()] * this._buildingProps.produce[this._lvl.Get()];
            }
            _loc4_ = _loc2_ / _loc3_ * 60;
            this._upgradeDescription = "";
            this._upgradeDescription += KEYS.Get("bdg_resource_upproduction", { "v1": GLOBAL.FormatNumber(_loc1_), "v2": GLOBAL.FormatNumber(_loc9_) }) + "<br>";
            if (!BASE.isOutpost) {
                this._upgradeDescription += KEYS.Get("bdg_resource_upcapacity", { "v1": GLOBAL.FormatNumber(Number(this._buildingProps.capacity[this._lvl.Get() - 1])), "v2": GLOBAL.FormatNumber(Number(this._buildingProps.capacity[this._lvl.Get()])) });
            }
        }
    }

    public override get tickLimit(): int {
        let _loc1_: int = 0;
        if (BASE.isOutpost || !this._canFunction) {
            return super.tickLimit;
        }
        _loc1_ = (this.productionCapacity - this._stored.Get()) | 0;
        if (_loc1_ > 0) {
            if (!this._repairing) {
                return Math.min(Math.floor(this.productionCapacity / this.productionValue) * this.productionTimeout, super.tickLimit) | 0;
            }
            return Math.min(this.productionValue * this.productionTimeout, super.tickLimit) | 0;
        }
        return super.tickLimit;
    }

    public override Tick(seconds: int): void {
        let secondsRemaining: int = seconds;
        super.Tick(seconds);
        if (BASE.isOutpost) {
            this._canFunction = this.health >= 0;
            if (!GLOBAL._catchup) {
                if (this._countdownProduce.Add(-1) <= 0 && this._canFunction) {
                    if (this.health > 0) {
                        ResourcePackages.Create((BASE.isInfernoMainYardOrOutpost ? this._type + 4 : this._type) | 0, this, 1);
                    }
                    this._countdownProduce.Set(10 + Math.random() * 10);
                }
            }
        } else if (this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() == 0) {
            this._canFunction = this.health >= this.maxHealth * 0.5;
            if (this._canFunction) {
                if (this._producing) {
                    if (!this._repairing && secondsRemaining > this._countdownProduce.Get()) {
                        secondsRemaining = (secondsRemaining - this._countdownProduce.Get()) | 0;
                        this._countdownProduce.Set(0);
                        this.Produce();
                        let leftover: int = (secondsRemaining % this.productionTimeout) | 0;
                        let totalIterations: int = ((secondsRemaining - leftover) / this.productionTimeout) | 0;
                        if (totalIterations > 0) {
                            this._countdownProduce.Set(0);
                            this.Produce(totalIterations);
                        }
                        this._countdownProduce.Add(-leftover);
                    } else {
                        while (secondsRemaining > 0 && Boolean(this._producing)) {
                            if (this._countdownProduce.Get() <= secondsRemaining) {
                                secondsRemaining = (secondsRemaining - this._countdownProduce.Get()) | 0;
                                this._countdownProduce.Set(0);
                                this.Produce();
                            } else {
                                this._countdownProduce.Add(-secondsRemaining);
                                secondsRemaining = 0;
                            }
                        }
                    }
                } else if (this._stored.Get() > this.productionCapacity) {
                    LOGGER.Log("hak", "Resource gatherer storage capacity exceeded");
                    this._stored.Set(this.productionCapacity);
                } else if (this._stored.Get() < this.productionCapacity && this.health > 0) {
                    this.StartProduction();
                }
            }
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            if (this._stored.Get() < 0) {
                LOGGER.Log("hak", "Attack harvester storage < 0");
                GLOBAL.ErrorMessage();
            }
        }
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
        if (GLOBAL._render || param1) {
            if (this._producing == 0 && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._countdownBuild.Get() + this._countdownUpgrade.Get() + this._countdownFortify.Get() == 0 && this.health > this.maxHealth * 0.5) {
                if (!this._mcAlert) {
                    this._mcAlert = this._spriteAlert;
                    this._mcAlert.x = -3;
                    this._mcAlert.y = -50;
                    this.addChild(this._mcAlert);
                }
            } else {
                if (this._mcAlert) {
                    this.removeChild(this._mcAlert);
                }
                this._mcAlert = null;
            }
        }
    }

    public override StartProduction(): void {
        if (this.health > 0) {
            if (this._stored.Get() >= this.productionCapacity) {
                this._producing = 0;
            } else {
                this._producing = 1;
                this._countdownProduce.Set(this.productionTimeout);
            }
        }
    }

    public get productionTimeout(): int {
        return (this._buildingProps.cycleTime[this._lvl.Get() - 1] + Math.ceil(this._buildingProps.cycleTime[this._lvl.Get() - 1] * (4 - 4 / this.maxHealth * this.health))) | 0;
    }

    private ApplyTerrainBonus(param1: int): int {
        let _loc3_: number = NaN;
        let _loc2_: any = "r" + this._type + "bonus";
        if (BASE.isMainYardInfernoOnly && BASE._resources[_loc2_] == 1) {
            _loc3_ = BRESOURCE._RESOURCE_BONUS;
            param1 = (param1 * _loc3_) | 0;
        }
        return param1;
    }

    public Produce(totalIterations: int = 1): void {
        if (this._prefab) {
            this._producing = 0;
        }
        if (this.health <= 0) {
            this._producing = 0;
        }
        if (this._lvl.Get() <= 0) {
            this._producing = 0;
        }
        if (Math.max(this._countdownProduce.Get(), 0)) {
            LOGGER.Log("hak", "BRESOURCE.Produce hack");
            GLOBAL.ErrorMessage("BRESOURCE production hack");
            return;
        }
        if (this._producing) {
            this._stored.Set(Math.min(this._stored.Get() + (this.productionValue * totalIterations), this.productionCapacity));
            if (this._stored.Get() >= this.productionCapacity) {
                this._producing = 0;
            }
        }
        if (this._producing) {
            this.StartProduction();
        }
    }

    public get productionValue(): int {
        let _loc1_: int = this._buildingProps.produce[this._lvl.Get() - 1] | 0;
        if (BASE.isOutpost) {
            _loc1_ = BRESOURCE.AdjustProduction(GLOBAL._currentCell, _loc1_);
        }
        if (GLOBAL._harvesterOverdrive >= GLOBAL.Timestamp() && GLOBAL._harvesterOverdrivePower.Get() > 0) {
            _loc1_ = (_loc1_ * GLOBAL._harvesterOverdrivePower.Get()) | 0;
        }
        _loc1_ = this.ApplyTerrainBonus(_loc1_);
        this.productionRateProperty.value = _loc1_;
        return this.productionRateProperty.value | 0;
    }

    public get productionCapacity(): number {
        return this.productionCapacityProperty.value;
    }

    public override Bank(): void {
        let _loc3_: SecNum = null;
        let _loc1_: SecNum = new SecNum(this._stored.Get());
        let _loc2_: SecNum = new SecNum(Number(this._buildingProps.capacity[this._lvl.Get() - 1]));
        if (_loc1_.Get() > _loc2_.Get()) {
            _loc1_.Set(_loc2_.Get());
        }
        if (_loc1_.Get() > 0) {
            _loc3_ = new SecNum(BASE.Fund(this._type, _loc1_.Get(), false, this));
            if (_loc3_.Get() > 0) {
                ResourcePackages.Create((BASE.isInfernoMainYardOrOutpost ? this._type + 4 : this._type) | 0, this, _loc1_.Get() | 0);
                if (TUTORIAL._stage < 200) {
                    BASE.PointsAdd(_loc3_.Get() >>> 0);
                } else {
                    BASE.PointsAdd(Math.ceil(_loc3_.Get() * 0.5) >>> 0);
                }
            }
            BASE.CalcResources();
            if (_loc1_.Get() > QUESTS._global.singleclickbank) {
                QUESTS._global.singleclickbank = _loc1_.Get();
            }
            // Inferno-only quest book: the biggest bank in one click
            if (GLOBAL.INFERNO_ONLY && !GLOBAL._catchup) {
                IoQuests.best("bank", _loc1_.Get());
            }
            if (!GLOBAL._catchup) {
                QUESTS.Check();
            }
            LOGGER.Stat([32, this._type, _loc1_.Get()]);
        }
    }

    public override Repair(): void {
        super.Repair();
        if (!this._producing) {
            this.StartProduction();
        }
    }

    public override Repaired(): void {
        super.Repaired();
    }

    public override Export(): any {
        let _loc1_: any = null;
        if (BASE.isOutpost) {
            return super.Export();
        }
        _loc1_ = super.Export();
        _loc1_.st = this._stored.Get();
        _loc1_.pr = this._producing;
        if (this._countdownProduce.Get() > 0) {
            _loc1_.cP = this._countdownProduce.Get();
        }
        return _loc1_;
    }

    public override Setup(param1: any): void {
        let _loc2_: int = 0;
        let _loc3_: number = NaN;
        if (Boolean(param1.l) && param1.l <= int.MAX_VALUE) {
            this._lvl.Set(param1.l | 0);
        } else {
            this._lvl.Set(1);
        }
        this.productionCapacityProperty.value = Number(this._buildingProps.capacity[Math.max(0, this._lvl.Get() - 1)]);
        super.Setup(param1);
        if (BASE.isOutpost) {
            _loc3_ = this.health / this.maxHealth;
            if (_loc3_ <= 0) {
                _loc2_ = 0;
            } else if (_loc3_ <= 0.5) {
                _loc2_ = (0.25 * this.productionCapacity) | 0;
            } else {
                _loc2_ = (0.5 * this.productionCapacity) | 0;
            }
            this._producing = 1;
            this._countdownProduce.Set(Math.random() * 10);
        } else {
            _loc2_ = param1.st | 0;
            this._producing = param1.pr | 0;
            this._countdownProduce.Set(param1.cP | 0);
        }
        if (_loc2_ >= 0) {
            this._stored.Set(_loc2_);
        } else {
            this._stored.Set(0);
            LOGGER.Log("err", "Harvester storage < 0 mode: " + GLOBAL.mode);
        }
    }
}

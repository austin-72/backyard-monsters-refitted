import * as as3 from "as3";
import { int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { ACHIEVEMENTS, BASE, BSTORAGE, GLOBAL, ICoreBuilding, KEYS, LOGGER, MAP, MapRoomManager, POPUPS, UI2, WMBASE } from "@game";

export class BUILDING14 extends BSTORAGE implements ICoreBuilding {
    static {
        as3.implement(this, [ICoreBuilding]);
    }

    public static readonly k_TYPE: uint = 14;

    public static readonly UNDERHALL_LEVEL: string = "underhalLevel";

    public $ctor(): void {
        super.$ctor();
        this._type = 14;
        this._footprint = BASE.isInfernoMainYardOrOutpost ? [new Rectangle(0, 0, 160, 160)] : [new Rectangle(0, 0, 130, 130)];
        this._gridCost = BASE.isInfernoMainYardOrOutpost && !GLOBAL.INFERNO_ONLY ? [[new Rectangle(0, 0, 160, 160), 10], [new Rectangle(10, 10, 140, 140), 200]] : [[new Rectangle(0, 0, 130, 130), 10], [new Rectangle(10, 10, 110, 110), 200]];
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno-only (3 October): the Under Hall takes the overworld Town Hall's ground, 130 x 130
            // (it was 160 x 160). The server's footprint tables match (kitPreview.ts, devilify.ts).
            this._footprint = [new Rectangle(0, 0, 130, 130)];
        }
        this._spoutPoint = new Point(1, -67);
        this._spoutHeight = 135;
        this.SetProps();
    }

    public override Repair(): void {
        super.Repair();
    }

    public override Place(param1: MouseEvent = null): void {
        if (!MAP._dragged) {
            super.Place(param1);
            this._hasResources = true;
        }
    }

    public override Cancel(): void {
        GLOBAL.setTownHall(null);
        super.Cancel();
    }

    public override Recycle(): void {
        GLOBAL.Message(KEYS.Get("msg_cantrecycleth", { "v1": GLOBAL.townHall._buildingProps.name }));
    }

    public override RecycleB(param1: MouseEvent = null): void {
        GLOBAL.Message(KEYS.Get("msg_cantrecycleth", { "v1": GLOBAL.townHall._buildingProps.name }));
    }

    public override RecycleC(): void {
        GLOBAL.Message(KEYS.Get("msg_cantrecycleth", { "v1": GLOBAL.townHall._buildingProps.name }));
    }

    public override Destroyed(param1: boolean = true): void {
        super.Destroyed(param1);
        if (!MapRoomManager.instance.isInMapRoom2or3 && GLOBAL.mode == "wmattack") {
            WMBASE._destroyed = true;
        }
    }

    public override Description(): void {
        let _loc1_: any[] = null;
        let _loc2_: any[] = null;
        let _loc3_: any[] = null;
        let _loc4_: any = null;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: int = 0;
        let _loc11_: int = 0;
        let _loc12_: any = null;
        let _loc13_: any[] = null;
        super.Description();
        this._buildingDescription = KEYS.Get("th_upgradedesc");
        if (this._lvl.Get() == 1) {
            this._recycleDescription = KEYS.Get("th_recycledesc");
        }
        if (this._lvl.Get() > 0 && this._lvl.Get() < this._buildingProps.costs.length) {
            _loc1_ = [];
            _loc2_ = [];
            _loc3_ = [];
            for (_loc4_ of as3.values(GLOBAL._buildingProps)) {
                if (_loc4_.id != 14) {
                    _loc5_ = (_loc4_.quantity.length - 1) | 0;
                    _loc6_ = this._lvl.Get() | 0;
                    _loc7_ = Math.min(_loc6_, _loc5_) | 0;
                    _loc8_ = Math.min(_loc6_ + 1, _loc5_) | 0;
                    _loc9_ = _loc4_.quantity[_loc7_] | 0;
                    _loc11_ = ((_loc10_ = _loc4_.quantity[_loc8_] | 0) - _loc9_) | 0;
                    if (_loc9_ == 0 && _loc10_ > 0 && !_loc4_.block) {
                        _loc1_.push([0, KEYS.Get(as3.str(_loc4_.name))]);
                    } else if (_loc11_ > 0 && !_loc4_.block) {
                        // (Inferno-only: the plural ending is the language's; French read "Concasseur d'oss")
                        _loc2_.push([0, KEYS.Get(as3.str(_loc4_.name)) + (GLOBAL.INFERNO_ONLY ? KEYS.Get("io_plural_suffix") : "s")]);
                    }
                    _loc9_ = 0;
                    _loc10_ = 0;
                    for (_loc12_ of as3.values(_loc4_.costs)) {
                        for (_loc13_ of as3.values(_loc12_.re)) {
                            if (_loc13_[0] == 14) {
                                if (_loc13_[2] <= this._lvl.Get()) {
                                    _loc9_ = 1;
                                }
                                if (_loc13_[2] == this._lvl.Get() + 1) {
                                    _loc10_ = 1;
                                }
                            }
                        }
                    }
                    if (_loc9_ > 0 && _loc10_ > 0 && !_loc4_.block) {
                        _loc3_.push([0, KEYS.Get(as3.str(_loc4_.name))]);
                    }
                }
            }
            if (_loc1_.length > 0) {
                this._upgradeDescription += KEYS.Get("th_willunlockthe", { "v1": GLOBAL.Array2StringB(_loc1_) }) + "<br><br>";
            }
            if (_loc2_.length > 0) {
                this._upgradeDescription += "<b>" + KEYS.Get("th_willbuildmore") + "</b><br>" + GLOBAL.Array2StringB(_loc2_) + "<br><br>";
            }
            if (_loc3_.length > 0) {
                this._upgradeDescription += "<b>" + KEYS.Get("th_willupgrade") + "</b><br>" + GLOBAL.Array2StringB(_loc3_);
            }
            if (Boolean(GLOBAL._buildingProps[this._type - 1].additionalUpgradeInfo) && Boolean(GLOBAL._buildingProps[this._type - 1].additionalUpgradeInfo[this._lvl.Get() - 1])) {
                this._upgradeDescription += "<br><br><b>" + KEYS.Get(as3.str(GLOBAL._buildingProps[this._type - 1].additionalUpgradeInfo[this._lvl.Get() - 1])) + "</b>";
            }
        }
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Constructed(): void {
        GLOBAL.setTownHall(this);
        ACHIEVEMENTS.Check("thlevel", this._lvl.Get() | 0);
        ACHIEVEMENTS.Check(ACHIEVEMENTS.UNDERHALL_LEVEL, this._lvl.Get() | 0);
        super.Constructed();
    }

    public override UpgradeB(): void {
        super.UpgradeB();
        if (this._lvl.Get() >= 2 && this._countdownUpgrade.Get() > 0 && this._countdownUpgrade.Get() * (20 / 60 / 60) > BASE._credits.Get()) {
            POPUPS.DisplayPleaseBuy("TH");
        }
    }

    public override Upgraded(): void {
        LOGGER.KongStat([2, this._lvl.Get()]);
        ACHIEVEMENTS.Check("thlevel", this._lvl.Get() | 0);
        ACHIEVEMENTS.Check(ACHIEVEMENTS.UNDERHALL_LEVEL, this._lvl.Get() | 0);
        super.Upgraded();
        this.UnlockBuildings();
    }

    private UnlockBuildings(): void {
        let _loc1_: int = 0;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            _loc1_ = this._lvl.Get() | 0;
            if (BASE.isInfernoMainYardOrOutpost) {
                GLOBAL.StatSet(BUILDING14.UNDERHALL_LEVEL, _loc1_);
            } else {
                GLOBAL.attackingPlayer.townHallLevel = _loc1_;
            }
        }
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        GLOBAL.setTownHall(this);
        if (this._destroyed && Boolean(UI2._top)) {
            UI2._top.validateSiegeWeapon();
        }
        this.UnlockBuildings();
        ACHIEVEMENTS.Check("thlevel", this._lvl.Get() | 0);
        ACHIEVEMENTS.Check(ACHIEVEMENTS.UNDERHALL_LEVEL, this._lvl.Get() | 0);
    }
}

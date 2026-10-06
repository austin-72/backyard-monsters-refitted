import * as as3 from "as3";
import { int } from "as3";
import { BASE, GLOBAL, KEYS, LOGGER, QUESTS, STORE, SecNum, SiegeBuilding, SiegeWeapon, SiegeWeapons } from "@game";

export class SiegeLab extends SiegeBuilding {
    public static readonly ID: int = 134;

    public static readonly SIEGE_BUTTON: string = "btn_siegelab";

    public $ctor(): void {
        this._type = SiegeLab.ID;
        super.$ctor();
    }

    public static Show(): void {
        if (GLOBAL._bSiegeLab.health >= GLOBAL._bSiegeLab.maxHealth * 0.5) {
            SiegeBuilding.Show("lab");
        } else {
            GLOBAL.Message(KEYS.Get("msg_sworks_damaged"));
        }
    }

    public override Setup(param1: any): void {
        GLOBAL._bSiegeLab = this;
        return super.Setup(param1);
    }

    public override Constructed(): void {
        GLOBAL._bSiegeLab = this;
        return super.Constructed();
    }

    public override Upgrade(): boolean {
        if (this.upgradingWeapon) {
            if (this.upgradingWeapon.level > 0) {
                GLOBAL.Message(KEYS.Get("msg_sworks_cantupgrade2"));
            } else {
                GLOBAL.Message(KEYS.Get("msg_sworks_cantupgrade1"));
            }
            return false;
        }
        return super.Upgrade();
    }

    public override Recycle(): void {
        if (this.upgradingWeapon) {
            if (this.upgradingWeapon.level > 0) {
                GLOBAL.Message(KEYS.Get("msg_sworks_cantrecycle2"));
            } else {
                GLOBAL.Message(KEYS.Get("msg_sworks_cantrecycle1"));
            }
            return;
        }
        return super.Recycle();
    }

    public override RecycleC(): void {
        GLOBAL._bSiegeLab = null;
        super.RecycleC();
    }

    protected override UpgradeWeapon(param1: string): void {
        ++SiegeWeapons.getWeapon(param1).level;
        QUESTS.Check("siege_" + param1 + "_level", SiegeWeapons.getWeapon(param1).level);
    }

    public StartUpgradingWeapon(param1: string): void {
        let _loc2_: any = SiegeWeapons.getWeapon(param1).upgradeCosts;
        this.unlockingWeapons[param1] = new SecNum(Number(_loc2_.time));
        BASE.Charge(1, Number(_loc2_.r1), false, true);
        BASE.Charge(2, Number(_loc2_.r2), false, true);
        BASE.Charge(3, Number(_loc2_.r3), false, true);
        BASE.Charge(4, Number(_loc2_.r4), false, true);
        BASE.Save();
        let _loc3_: int = SiegeWeapons.getWeapon(param1).level;
        if (_loc3_ == 0) {
            LOGGER.Stat([90, param1, _loc3_, "start"]);
        } else {
            LOGGER.Stat([91, param1, _loc3_, "start"]);
        }
    }

    public CancelUpgradingWeapon(param1: string): void {
        this._animTick = 0;
        this.AnimFrame();
        if (!this.unlockingWeapons[param1]) {
            return;
        }
        delete this.unlockingWeapons[param1];
        let _loc2_: any = SiegeWeapons.getWeapon(param1).upgradeCosts;
        BASE.Fund(1, Number(_loc2_.r1), false, null, true);
        BASE.Fund(2, Number(_loc2_.r2), false, null, true);
        BASE.Fund(3, Number(_loc2_.r3), false, null, true);
        BASE.Fund(4, Number(_loc2_.r4), false, null, true);
        BASE.Save();
        let _loc3_: int = SiegeWeapons.getWeapon(param1).level;
        if (_loc3_ == 0) {
            LOGGER.Stat([90, param1, _loc3_, "cancel"]);
        } else {
            LOGGER.Stat([91, param1, _loc3_, "cancel"]);
        }
    }

    public FinishUpgradingWeapon(param1: string): void {
        this._animTick = 0;
        this.AnimFrame();
        if (!this.unlockingWeapons[param1]) {
            return;
        }
        delete this.unlockingWeapons[param1];
        BASE.Save();
        let _loc2_: int = SiegeWeapons.getWeapon(param1).level;
        if (_loc2_ == 0) {
            LOGGER.Stat([90, param1, _loc2_, "finish"]);
        } else {
            LOGGER.Stat([91, param1, _loc2_, "finish"]);
        }
    }

    public InstantUpgrade(param1: string): void {
        let _loc2_: number = this.getInstantUpgradeCost(param1);
        this.CompleteUpgradingWeapon(param1);
        BASE.Purchase("IBSW", _loc2_ | 0, "building");
        let _loc3_: int = SiegeWeapons.getWeapon(param1).level;
        if (_loc3_ == 0) {
            LOGGER.Stat([90, param1, _loc3_, "instant", _loc2_]);
        } else {
            LOGGER.Stat([91, param1, _loc3_, "instant", _loc2_]);
        }
    }

    public override CompleteUpgradingWeapon(param1: string, param2: boolean = true): void {
        if (param2) {
            this.ShowBragPopup(param1);
        }
        this.UpgradeWeapon(param1);
        this.FinishUpgradingWeapon(param1);
    }

    public getInstantUpgradeCost(param1: string): int {
        let _loc2_: SiegeWeapon = SiegeWeapons.getWeapon(param1);
        let _loc3_: any = _loc2_.upgradeCosts;
        if (Boolean(this.upgradingWeapon) && this.upgradingWeapon.weaponID == param1) {
            return STORE.GetTimeCost(this.UpgradeTimeLeft(_loc2_));
        }
        return _loc2_.instantUpgradeCost;
    }

    public HasEnoughShinyToUpgrade(param1: SiegeWeapon): boolean {
        return BASE._credits.Get() >= this.getInstantUpgradeCost(param1.weaponID);
    }

    public UpgradeTimeTotal(param1: SiegeWeapon): int {
        return param1.upgradeCosts.time | 0;
    }
}

import * as as3 from "as3";
import { int } from "as3";
import { MouseEvent } from "flash/events";
import { BASE, Decoy, GLOBAL, Jars, KEYS, LOGGER, POPUPS, QUESTS, STORE, SecNum, SiegeBuilding, SiegeWeapon, SiegeWeapons, Vacuum, popup_siegebrag } from "@game";

export class SiegeFactory extends SiegeBuilding {
    public static readonly ID: int = 133;

    public static readonly SIEGE_BUTTON: string = "btn_siegefactory";

    public $ctor(): void {
        this._type = SiegeFactory.ID;
        GLOBAL._bSiegeFactory = this;
        super.$ctor();
    }

    public static Show(): void {
        if (GLOBAL._bSiegeFactory.health >= GLOBAL._bSiegeFactory.maxHealth * 0.5) {
            SiegeBuilding.Show("factory");
        } else {
            GLOBAL.Message(KEYS.Get("msg_sfactory_damaged"));
        }
    }

    public override Setup(param1: any): void {
        GLOBAL._bSiegeFactory = this;
        return super.Setup(param1);
    }

    public override Constructed(): void {
        GLOBAL._bSiegeFactory = this;
        return super.Constructed();
    }

    public get hasBuiltWeapon(): boolean {
        let _loc1_: SiegeWeapon = null;
        for (_loc1_ of as3.values(SiegeWeapons.weapons)) {
            if (_loc1_.quantity > 0) {
                return true;
            }
        }
        return false;
    }

    public override Upgrade(): boolean {
        if (this.upgradingWeapon) {
            GLOBAL.Message(KEYS.Get("msg_sfactory_cantupgrade1"));
        } else {
            if (!this.hasBuiltWeapon) {
                return super.Upgrade();
            }
            GLOBAL.Message(KEYS.Get("msg_sfactory_cantupgrade2"));
        }
        return false;
    }

    public override Recycle(): void {
        if (this.upgradingWeapon) {
            GLOBAL.Message(KEYS.Get("msg_sfactory_cantrecycle1"));
        } else {
            if (!this.hasBuiltWeapon) {
                return super.Recycle();
            }
            GLOBAL.Message(KEYS.Get("msg_sfactory_cantrecycle2"));
        }
    }

    public override RecycleC(): void {
        GLOBAL._bSiegeFactory = null;
        super.RecycleC();
    }

    private ShowWarnDialog(param1: SiegeWeapon): void {
        let weapon: SiegeWeapon = null;
        let Post: Function = null;
        weapon = param1;
        Post = (param1: MouseEvent): void => {
            if (weapon.weaponID == Jars.ID) {
                GLOBAL.CallJS("sendFeed", ["siege-weapon-build", KEYS.Get("warn_jars_streamtitle"), KEYS.Get("warn_jars_streambody"), "siegebuild_" + weapon.weaponID + ".png", 0]);
            } else if (weapon.weaponID == Decoy.ID) {
                GLOBAL.CallJS("sendFeed", ["siege-weapon-build", KEYS.Get("warn_decoy_streamtitle"), KEYS.Get("warn_decoy_streambody"), "siegebuild_" + weapon.weaponID + ".png", 0]);
            } else if (weapon.weaponID == Vacuum.ID) {
                GLOBAL.CallJS("sendFeed", ["siege-weapon-build", KEYS.Get("warn_vacuum_streamtitle"), KEYS.Get("warn_vacuum_streambody"), "siegebuild_" + weapon.weaponID + ".png", 0]);
            }
            POPUPS.Next();
        };
        let popup: popup_siegebrag = new popup_siegebrag();
        popup.tText.htmlText = KEYS.Get("msg_weaponbuilt", { "v1": weapon.name, "v2": weapon.level, "v3": weapon.name });
        popup.bAction.SetupKey("btn_warnyourfriends");
        popup.bAction.addEventListener(MouseEvent.CLICK, Post);
        popup.bAction.Highlight = true;
        popup.bSpeedup.visible = false;
        POPUPS.Push(popup, null, null, null, weapon.warnPopupImage);
    }

    protected override ShowBragPopup(param1: string): void {
        this.ShowWarnDialog(SiegeWeapons.getWeapon(param1));
    }

    protected override UpgradeWeapon(param1: string): void {
        SiegeWeapons.getWeapon(param1).quantity = 1;
        QUESTS.Check("siege_" + param1 + "_built", SiegeWeapons.getWeapon(param1).quantity);
    }

    public StartUpgradingWeapon(param1: string): void {
        let _loc2_: any = SiegeWeapons.getWeapon(param1).buildCosts;
        this.unlockingWeapons[param1] = new SecNum(Number(_loc2_.time));
        BASE.Charge(1, Number(_loc2_.r1), false, true);
        BASE.Charge(2, Number(_loc2_.r2), false, true);
        BASE.Charge(3, Number(_loc2_.r3), false, true);
        BASE.Charge(4, Number(_loc2_.r4), false, true);
        BASE.Save();
        LOGGER.Stat([92, param1, SiegeWeapons.getWeapon(param1).level, "start"]);
    }

    public CancelUpgradingWeapon(param1: string): void {
        this._animTick = 0;
        this.AnimFrame();
        if (!this.unlockingWeapons[param1]) {
            return;
        }
        delete this.unlockingWeapons[param1];
        let _loc2_: any = SiegeWeapons.getWeapon(param1).buildCosts;
        BASE.Fund(1, Number(_loc2_.r1), false, null, true);
        BASE.Fund(2, Number(_loc2_.r2), false, null, true);
        BASE.Fund(3, Number(_loc2_.r3), false, null, true);
        BASE.Fund(4, Number(_loc2_.r4), false, null, true);
        BASE.Save();
        LOGGER.Stat([92, param1, SiegeWeapons.getWeapon(param1).level, "cancel"]);
    }

    public FinishUpgradingWeapon(param1: string): void {
        this._animTick = 0;
        this.AnimFrame();
        if (!this.unlockingWeapons[param1]) {
            return;
        }
        delete this.unlockingWeapons[param1];
        BASE.Save();
        LOGGER.Stat([92, param1, SiegeWeapons.getWeapon(param1).level, "finish"]);
    }

    public InstantUpgrade(param1: string): void {
        let _loc2_: number = this.getInstantUpgradeCost(param1);
        this.CompleteUpgradingWeapon(param1);
        BASE.Purchase("IBSW", _loc2_ | 0, "building");
        LOGGER.Stat([92, param1, SiegeWeapons.getWeapon(param1).level, "instant", _loc2_]);
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
        let _loc3_: any = _loc2_.buildCosts;
        if (Boolean(this.upgradingWeapon) && this.upgradingWeapon.weaponID == param1) {
            return STORE.GetTimeCost(this.UpgradeTimeLeft(_loc2_));
        }
        return _loc2_.instantBuildCost;
    }

    public HasEnoughShinyToUpgrade(param1: SiegeWeapon): boolean {
        return BASE._credits.Get() >= this.getInstantUpgradeCost(param1.weaponID);
    }

    public UpgradeTimeTotal(param1: SiegeWeapon): int {
        return param1.buildCosts.time | 0;
    }
}

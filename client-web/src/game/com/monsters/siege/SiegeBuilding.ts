import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, GLOBAL, POPUPSETTINGS, SOUNDS, SecNum, SiegeBuildingPopup, SiegeWeapon, SiegeWeapons } from "@game";

export class SiegeBuilding extends BFOUNDATION {
    static {
        as3.fields(this, { unlockingWeapons: null });
    }

    public static readonly START: string = "siegeBuildingStart";

    public static readonly STOP: string = "siegeBuildingStop";

    public static readonly INSTANT: string = "siegeBuildingInstant";

    private static _popup: SiegeBuildingPopup = null;
    public unlockingWeapons: any;

    public $ctor(): void {
        this.unlockingWeapons = {};
        super.$ctor();
        this._footprint = [new Rectangle(0, 0, 100, 100)];
        this._gridCost = [[new Rectangle(0, 0, 100, 100), 10], [new Rectangle(10, 10, 80, 80), 200]];
        this._animRandomStart = false;
        this.SetProps();
    }

    public static Show(param1: string, param2: string = null): void {
        if (!SiegeBuilding._popup) {
            SiegeBuilding._popup = new SiegeBuildingPopup(param1, param2);
            GLOBAL.BlockerAdd();
            GLOBAL._layerWindows.addChild(SiegeBuilding._popup);
            POPUPSETTINGS.AlignToCenter(SiegeBuilding._popup);
            POPUPSETTINGS.ScaleUp(SiegeBuilding._popup);
        }
    }

    public static Hide(): void {
        if (SiegeBuilding._popup) {
            GLOBAL.BlockerRemove();
            SOUNDS.Play("close");
            GLOBAL._layerWindows.removeChild(SiegeBuilding._popup);
            SiegeBuilding._popup = null;
        }
    }

    public get upgradingWeapon(): SiegeWeapon {
        let _loc1_: string = null;
        let _loc2_: int = 0;
        let _loc3_: any = this.unlockingWeapons;
        for (_loc1_ in _loc3_) {
            return SiegeWeapons.getWeapon(_loc1_);
        }
        return null;
    }

    public IsUpgrading(param1: SiegeWeapon): boolean {
        let _loc2_: string = null;
        for (_loc2_ in this.unlockingWeapons) {
            if (param1.weaponID == _loc2_) {
                return true;
            }
        }
        return false;
    }

    public UpgradeTimeLeft(param1: SiegeWeapon): int {
        let _loc2_: string = null;
        for (_loc2_ in this.unlockingWeapons) {
            if (param1.weaponID == _loc2_) {
                return this.unlockingWeapons[_loc2_].Get() | 0;
            }
        }
        return -1;
    }

    public override get tickLimit(): int {
        let _loc2_: string = null;
        let _loc1_: int = super.tickLimit;
        for (_loc2_ in this.unlockingWeapons) {
            _loc1_ = Math.min(_loc1_, Number(this.unlockingWeapons[_loc2_].Get())) | 0;
        }
        return _loc1_;
    }

    public override Tick(param1: int): void {
        let _loc2_: string = null;
        if (!this._destroyed) {
            for (_loc2_ in this.unlockingWeapons) {
                if (this.unlockingWeapons[_loc2_].Get() > 0) {
                    this.unlockingWeapons[_loc2_].Add(-param1);
                }
                if (this.unlockingWeapons[_loc2_].Get() <= 0) {
                    this.CompleteUpgradingWeapon(_loc2_);
                }
            }
        }
        super.Tick(param1);
    }

    public CompleteUpgradingWeapon(param1: string, param2: boolean = true): void {
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (this.upgradingWeapon) {
            this.AnimFrame();
        }
    }

    public override Setup(param1: any): void {
        let _loc2_: string = null;
        super.Setup(param1);
        if (Boolean(param1.unlockingWeapons) && !(as3.is(param1.unlockingWeapons, Array))) {
            this.unlockingWeapons = {};
            for (_loc2_ in param1.unlockingWeapons) {
                this.unlockingWeapons[_loc2_] = new SecNum(param1.unlockingWeapons[_loc2_] - GLOBAL.Timestamp());
            }
        } else if (param1.unlockingWeapons2) {
            this.unlockingWeapons = {};
            for (_loc2_ in param1.unlockingWeapons2) {
                this.unlockingWeapons[_loc2_] = new SecNum(Number(param1.unlockingWeapons2[_loc2_]));
            }
        }
    }

    public override Export(): any {
        let _loc2_: string = null;
        let _loc1_: any = super.Export();
        if (this.unlockingWeapons) {
            _loc1_.unlockingWeapons2 = {};
            for (_loc2_ in this.unlockingWeapons) {
                _loc1_.unlockingWeapons2[_loc2_] = this.unlockingWeapons[_loc2_].Get();
            }
        }
        return _loc1_;
    }

    protected UpgradeWeapon(param1: string): void {
    }

    protected ShowBragPopup(param1: string): void {
    }
}

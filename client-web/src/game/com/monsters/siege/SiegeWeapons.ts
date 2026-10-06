import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { ATTACK, Decoy, Jars, LOGGER, SiegeWeapon, Vacuum, md5 } from "@game";

export class SiegeWeapons extends ASObject {
    public static weapons: any;

    public static activeWeaponID: string;

    public static didActivatWeapon: boolean;

    public static activeWeaponTimer: Timer;

    private static _weaponsList: any;

    private static _poop: string;

    static {
        as3.lazyStatics(this, { weapons: null, activeWeaponID: null, didActivatWeapon: false, activeWeaponTimer: null, _weaponsList: null, _poop: null }, () => {
            SiegeWeapons.weapons = {};
            SiegeWeapons.didActivatWeapon = false;
            SiegeWeapons._weaponsList = {};

            {
                SiegeWeapons._weaponsList[Decoy.ID] = new Decoy();
                SiegeWeapons._weaponsList[Vacuum.ID] = new Vacuum();
                SiegeWeapons._weaponsList[Jars.ID] = new Jars();
            }
        });
    }

    public $ctor(): void {
        super.$ctor();
    }

    public static getTimeRemaingOnActiveWeapon(): number {
        if (!SiegeWeapons.activeWeapon) {
            return -1;
        }
        if (SiegeWeapons.activeWeaponTimer) {
            return SiegeWeapons.activeWeaponTimer.repeatCount - SiegeWeapons.activeWeaponTimer.currentCount;
        }
        return -1;
    }

    public static get activeWeapon(): SiegeWeapon {
        return SiegeWeapons.getWeapon(SiegeWeapons.activeWeaponID);
    }

    public static addCurrentWeapons(param1: Vector<SiegeWeapon>): void {
        let _loc2_: string = null;
        for (_loc2_ in SiegeWeapons._weaponsList) {
            param1.push(SiegeWeapons._weaponsList[_loc2_]);
        }
    }

    public static activateWeapon(param1: string, param2: number = 0, param3: number = 0): boolean {
        let _loc4_: SiegeWeapon = SiegeWeapons.getWeapon(param1);
        // A Catapult shot earlier in this attack may have left its numbers on this weapon
        // (ioActivate / ioDropJars); a weapon from the stockpile uses its own level's values.
        _loc4_.ioOverride = null;
        if (!_loc4_.activate(param2, param3)) {
            return false;
        }
        SiegeWeapons.activeWeaponID = param1;
        ATTACK.Log("siegeWeaponActivation", "<font color=\"#0000FF\">" + _loc4_.logMessage + "</font>");
        if (_loc4_.duration > 0) {
            SiegeWeapons.activeWeaponTimer = new Timer(1000, _loc4_.duration);
            SiegeWeapons.activeWeaponTimer.addEventListener(TimerEvent.TIMER_COMPLETE, SiegeWeapons.onDurationTimerComplete);
            SiegeWeapons.activeWeaponTimer.start();
        }
        --_loc4_.quantity;
        SiegeWeapons.didActivatWeapon = true;
        LOGGER.Stat([93, param1, _loc4_.level]);
        return true;
    }

    /**
     * Inferno-only Catapult: activate a Chaos weapon with this shot's numbers. The same as
     * activateWeapon() without the stockpile: nothing is owned, so nothing is used up.
     */
    public static ioActivate(param1: string, param2: any, param3: number, param4: number): boolean {
        let weapon: SiegeWeapon = SiegeWeapons.getWeapon(param1);
        if (!weapon || SiegeWeapons.activeWeapon) {
            return false;
        }
        weapon.ioOverride = param2;
        if (!weapon.activate(param3, param4)) {
            return false;
        }
        SiegeWeapons.activeWeaponID = param1;
        if (weapon.duration > 0) {
            SiegeWeapons.activeWeaponTimer = new Timer(1000, weapon.duration);
            SiegeWeapons.activeWeaponTimer.addEventListener(TimerEvent.TIMER_COMPLETE, SiegeWeapons.onDurationTimerComplete);
            SiegeWeapons.activeWeaponTimer.start();
        }
        SiegeWeapons.didActivatWeapon = true;
        return true;
    }

    public static ioDropJars(param1: any, param2: number, param3: number): int {
        let jars: Jars = as3.as(SiegeWeapons.getWeapon(Jars.ID), Jars);
        if (!jars) {
            return 0;
        }
        jars.ioOverride = param1;
        SiegeWeapons.didActivatWeapon = true;
        return jars.ioDrop(param2, param3);
    }

    public static ioClearOverrides(): void {
        let weapon: SiegeWeapon = null;
        for (weapon of as3.values(SiegeWeapons._weaponsList)) {
            weapon.ioOverride = null;
        }
    }

    public static onDurationTimerComplete(param1: TimerEvent): void {
        SiegeWeapons.deactivateWeapon();
    }

    public static deactivateWeapon(): void {
        if (!SiegeWeapons.activeWeapon) {
            return;
        }
        if (SiegeWeapons.activeWeaponTimer) {
            SiegeWeapons.activeWeaponTimer.removeEventListener(TimerEvent.TIMER_COMPLETE, SiegeWeapons.onDurationTimerComplete);
            SiegeWeapons.activeWeaponTimer.stop();
            SiegeWeapons.activeWeaponTimer.reset();
            SiegeWeapons.activeWeaponTimer = null;
        }
        SiegeWeapons.activeWeapon.deactivate();
        SiegeWeapons.activeWeaponID = null;
    }

    public static importWeapons(param1: any): void {
        let _loc2_: string = null;
        let _loc3_: SiegeWeapon = null;
        let _loc4_: any = null;
        for (_loc2_ in SiegeWeapons._weaponsList) {
            _loc3_ = SiegeWeapons.getWeapon(_loc2_);
            SiegeWeapons.weapons[_loc2_] = _loc3_;
            if (param1) {
                _loc4_ = param1[_loc2_];
                if (_loc4_) {
                    _loc3_.importVariables(_loc4_);
                }
            } else {
                _loc3_.level = 0;
            }
        }
    }

    public static exportWeapons(): any {
        let _loc1_: any = null;
        let _loc2_: SiegeWeapon = null;
        for (_loc2_ of as3.values(SiegeWeapons.weapons)) {
            if (_loc2_.level > 0) {
                if (!_loc1_) {
                    _loc1_ = {};
                }
                _loc1_[_loc2_.weaponID] = _loc2_.exportVariables();
            }
        }
        return _loc1_;
    }

    public static getWeapon(param1: string): SiegeWeapon {
        return as3.cast(SiegeWeapons._weaponsList[param1], SiegeWeapon);
    }

    public static get availableWeapon(): SiegeWeapon {
        let _loc1_: SiegeWeapon = null;
        for (_loc1_ of as3.values(SiegeWeapons.weapons)) {
            if (_loc1_.quantity > 0) {
                return _loc1_;
            }
        }
        return null;
    }

    public static Check(): string {
        let _loc1_: any[] = [];
        let _loc2_: int = 0;
        while (_loc2_ < 10) {
            _loc1_.push(SiegeWeapons.getWeapon(Decoy.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r1);
            _loc1_.push(SiegeWeapons.getWeapon(Decoy.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r2);
            _loc1_.push(SiegeWeapons.getWeapon(Decoy.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r3);
            _loc1_.push(SiegeWeapons.getWeapon(Decoy.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r4);
            _loc1_.push(SiegeWeapons.getWeapon(Decoy.ID).getProperty(Decoy.DAMAGE).values[_loc2_]);
            _loc1_.push(SiegeWeapons.getWeapon(Decoy.ID).getProperty(SiegeWeapon.RANGE).values[_loc2_]);
            _loc1_.push(SiegeWeapons.getWeapon(Decoy.ID).getProperty(SiegeWeapon.DURATION).values[_loc2_]);
            _loc1_.push(SiegeWeapons.getWeapon(Vacuum.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r1);
            _loc1_.push(SiegeWeapons.getWeapon(Vacuum.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r2);
            _loc1_.push(SiegeWeapons.getWeapon(Vacuum.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r3);
            _loc1_.push(SiegeWeapons.getWeapon(Vacuum.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r4);
            _loc1_.push(SiegeWeapons.getWeapon(Vacuum.ID).getProperty(SiegeWeapon.DURATION).values[_loc2_]);
            _loc1_.push(SiegeWeapons.getWeapon(Vacuum.ID).getProperty(SiegeWeapon.DURABILITY).values[_loc2_]);
            _loc1_.push(SiegeWeapons.getWeapon(Vacuum.ID).getProperty(Vacuum.LOOT_BONUS).values[_loc2_]);
            _loc1_.push(SiegeWeapons.getWeapon(Jars.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r1);
            _loc1_.push(SiegeWeapons.getWeapon(Jars.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r2);
            _loc1_.push(SiegeWeapons.getWeapon(Jars.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r3);
            _loc1_.push(SiegeWeapons.getWeapon(Jars.ID).getProperty(SiegeWeapon.UPGRADE_COSTS).values[_loc2_].r4);
            _loc1_.push(SiegeWeapons.getWeapon(Jars.ID).getProperty(SiegeWeapon.RANGE).values[_loc2_]);
            _loc1_.push(SiegeWeapons.getWeapon(Jars.ID).getProperty(SiegeWeapon.DURABILITY).values[_loc2_]);
            _loc2_++;
        }
        return md5(JSON.stringify(_loc1_));
    }
}

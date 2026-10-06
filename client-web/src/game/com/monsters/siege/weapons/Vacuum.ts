import * as as3 from "as3";
import { Vector, int } from "as3";
import { Event } from "flash/events";
import { getQualifiedClassName } from "flash/utils";
import { BFOUNDATION, BUILDING14, DROPZONE, GLOBAL, IDurable, ResourceOutpost, SiegeWeapon, SiegeWeaponProperty, SiegeWeapons, VacuumHose, print } from "@game";

export class Vacuum extends SiegeWeapon implements IDurable {
    static {
        as3.implement(this, [IDurable]);
        as3.fields(this, { hose: null });
    }

    private static k_BUILDINGS_THAT_CAN_BE_SUCKED: Vector<string>; // const

    public static ID: string; // const

    public static LOOT_BONUS: string; // const

    public static target: BFOUNDATION;

    static {
        as3.lazyStatics(this, { k_BUILDINGS_THAT_CAN_BE_SUCKED: null, ID: null, LOOT_BONUS: null, target: null }, () => {
            Vacuum.k_BUILDINGS_THAT_CAN_BE_SUCKED = Vector.from([getQualifiedClassName(BUILDING14), getQualifiedClassName(ResourceOutpost)], String);
            Vacuum.ID = "vacuum";
            Vacuum.LOOT_BONUS = "siegeWeaponLootBonus";
        });
    }
    public hose: VacuumHose;

    public $ctor(): void {
        this.weaponID = Vacuum.ID;
        this.dropTarget = DROPZONE.SIEGEWEAPON_GROUND;
        super.$ctor();
        this.addProperty(Vacuum.LOOT_BONUS, new SiegeWeaponProperty([25000, 38153, 58225, 88856, 135604, 206945, 292002, 380324, 495361, 593977], 1));
        this.addProperty(SiegeWeapon.DURABILITY, new SiegeWeaponProperty([6000, 7200, 7800, 9400, 10300, 11200, 14600, 20500, 29000, 44200], 2));
        this.addProperty(SiegeWeapon.DURATION, new SiegeWeaponProperty([30, 35, 40, 45, 50, 60, 65, 70, 80, 85], 3));
        this.addProperty(SiegeWeapon.RANGE, new SiegeWeaponProperty([]));
        this.addProperty(SiegeWeapon.UPGRADE_COSTS, new SiegeWeaponProperty([{ "r1": 36525.6742111195, "r2": 35451.3896754984, "r3": 35451.3896754984, "r4": 0, "time": 7200 }, { "r1": 72856.8101856925, "r2": 70713.9628272898, "r3": 70713.9628272898, "r4": 0, "time": 11700 }, { "r1": 145311.983388114, "r2": 141038.101523758, "r3": 141038.101523758, "r4": 0, "time": 18900 }, { "r1": 289715.138033823, "r2": 281194.10456224, "r3": 281194.10456224, "r4": 0, "time": 28800 }, { "r1": 576767.5769981, "r2": 559803.82473345, "r3": 559803.82473345, "r4": 0, "time": 49500 }, { "r1": 1141625.06806759, "r2": 1108047.86018325, "r3": 1108047.86018325, "r4": 0, "time": 86400 }, { "r1": 2211351.3581495, "r2": 2146311.61232158, "r3": 2146311.61232158, "r4": 0, "time": 259200 }, { "r1": 3995477.90599582, "r2": 3877963.84993712, "r3": 3877963.84993712, "r4": 0, "time": 388800 }, { "r1": 6194145.1020071, "r2": 6011964.36371277, "r3": 6011964.36371277, "r4": 0, "time": 475200 }, { "r1": 7981712.40588686, "r2": 7746956.15865489, "r3": 7746956.15865489, "r4": 0, "time": 475200 }]));
        this.addProperty(SiegeWeapon.BUILD_COSTS, new SiegeWeaponProperty([{ "r1": 28648, "r2": 14324, "r3": 28648, "r4": 0, "time": 14400 }, { "r1": 57143, "r2": 28571, "r3": 57143, "r4": 0, "time": 19800 }, { "r1": 113970, "r2": 56985, "r3": 113970, "r4": 0, "time": 27900 }, { "r1": 227228, "r2": 113614, "r3": 227228, "r4": 0, "time": 39600 }, { "r1": 452367, "r2": 226183, "r3": 452367, "r4": 0, "time": 54900 }, { "r1": 895392, "r2": 447696, "r3": 895392, "r4": 0, "time": 77400 }, { "r1": 1734393, "r2": 867197, "r3": 1734393, "r4": 0, "time": 86400 }, { "r1": 3133708, "r2": 1566854, "r3": 3133708, "r4": 0, "time": 129600 }, { "r1": 4858153, "r2": 2429077, "r3": 4858153, "r4": 0, "time": 172800 }, { "r1": 6260167, "r2": 3130083, "r3": 6260167, "r4": 0, "time": 259200 }]));
        this.canUseInOutposts = true;
    }

    public static getHose(): VacuumHose {
        let _loc1_: SiegeWeapon = SiegeWeapons.activeWeapon;
        if (Boolean(_loc1_) && _loc1_ instanceof Vacuum) {
            return as3.cast(_loc1_, Vacuum).hose;
        }
        return null;
    }

    public static getTarget(): BFOUNDATION {
        let _loc1_: SiegeWeapon = SiegeWeapons.activeWeapon;
        if (Boolean(_loc1_) && _loc1_ instanceof Vacuum) {
            return as3.cast(_loc1_, Vacuum).hose._target;
        }
        return null;
    }

    public override canFire(): boolean {
        return super.canFire() && this.findTarget() != null;
    }

    public get lootBonus(): int {
        return this.getProperty(Vacuum.LOOT_BONUS).getValueForLevel(this.level) | 0;
    }

    public get durability(): int {
        return this.getProperty(SiegeWeapon.DURABILITY).getValueForLevel(this.level) | 0;
    }

    public get activeDurability(): number {
        if (this.hose) {
            return this.hose.health;
        }
        return 0;
    }

    public override activate(param1: number, param2: number): boolean {
        let _loc3_: BFOUNDATION = this.findTarget();
        if (!_loc3_ || Boolean(this.hose)) {
            print("Could not start Vacuum, either no valid target or the weapon is already on");
            return false;
        }
        return super.activate(param1, param2);
    }

    public override onActivation(param1: number, param2: number): void {
        let _loc3_: BFOUNDATION = this.findTarget();
        if (!_loc3_ || Boolean(this.hose)) {
            print("Could not start Vacuum, either no valid target or the weapon is already on");
            return;
        }
        this.hose = new VacuumHose(_loc3_, this.durability >>> 0, this.lootBonus >>> 0);
        this.hose._vacuum.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
        Vacuum.target;
    }

    protected onEnterFrame(param1: Event): void {
        if (this.hose) {
            this.hose.tick();
        }
    }

    public override onDeactivation(): void {
        if (this.hose) {
            this.hose._vacuum.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
            this.hose.RemoveVacuum();
        }
        this.hose = null;
    }

    private findTarget(): BFOUNDATION {
        return Boolean(GLOBAL.townHall) && Vacuum.k_BUILDINGS_THAT_CAN_BE_SUCKED.indexOf(getQualifiedClassName(GLOBAL.townHall)) >= 0 ? GLOBAL.townHall : null;
    }
}

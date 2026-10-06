import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { BASE, GLOBAL, KEYS, STORE, SecNum, SiegeWeaponProperty } from "@game";

export class SiegeWeapon extends ASObject {
    static {
        as3.fields(this, { weaponID: null, name: null, icon: null, image: null, video: null, videopreview: null, description: null, tooltip: null, dropTarget: 0, canUseInOutposts: true, _quantity: null, _level: null, _properties: null, ioOverride: null });
    }

    public static readonly RANGE: string = "siegeWeaponRange";

    public static readonly UPGRADE_COSTS: string = "siegeWeaponUpgradeCosts";

    public static readonly BUILD_COSTS: string = "siegeWeaponBuildCosts";

    public static readonly DURATION: string = "siegeWeaponDuration";

    public static readonly DURABILITY: string = "siegeWeaponDurability";

    public static readonly MAX_LEVEL: int = 10;

    private static readonly _IMAGE_FOLDER_URL: string = "siegebuttons/";

    private static readonly _ICON_FOLDER_URL: string = "popups/";

    private static readonly _STREAMPOST_FOLDER_URL: string = "quests/";
    public weaponID: string;
    public name: string;
    public icon: string;
    public image: string;
    public video: string;
    public videopreview: string;
    public description: string;
    public tooltip: string;
    public dropTarget: int;
    public canUseInOutposts: boolean;
    protected _quantity: SecNum;
    protected _level: SecNum;
    private _properties: any;
    /**
     * Inferno-only: numbers for one Catapult shot ({damage, range, duration, durability}). While set,
     * they replace the values the weapon's level would give, so the stock weapon code runs unchanged.
     */
    public ioOverride: any;

    public $ctor(): void {
        this._quantity = new SecNum(0);
        this._level = new SecNum(0);
        super.$ctor();
        this._properties = {};
        this.image = SiegeWeapon._IMAGE_FOLDER_URL + this.weaponID + ".png";
        this.icon = SiegeWeapon._ICON_FOLDER_URL + "siege_icon_" + this.weaponID + ".png";
        this.video = "assets/videos/" + this.weaponID + "400x175.flv";
        this.videopreview = "videos/" + this.weaponID + "_preview" + ".png";
        this.name = KEYS.Get("#w_" + this.weaponID + "#");
        this.description = KEYS.Get("w_" + this.weaponID + "desc");
        this.tooltip = KEYS.Get("w_" + this.weaponID + "_tooltip");
        this.quantity = 0;
    }

    public canFire(): boolean {
        return GLOBAL.isInAttackMode;
    }

    public get buildCosts(): any {
        return this.getProperty(SiegeWeapon.BUILD_COSTS).getValueForLevel(this.level);
    }

    public get upgradeCosts(): any {
        return this.getProperty(SiegeWeapon.UPGRADE_COSTS).getValueForLevel((this.level + 1) | 0);
    }

    public get level(): int {
        return Math.min(SiegeWeapon.MAX_LEVEL, this._level.Get()) | 0;
    }

    public set level(param1: int) {
        this._level.Set(Math.min(SiegeWeapon.MAX_LEVEL, param1));
    }

    public get quantity(): int {
        return this._quantity.Get() | 0;
    }

    public set quantity(param1: int) {
        this._quantity.Set(param1);
    }

    public get instantUpgradeCost(): int {
        return STORE.GetInstantBuyCost(this.upgradeCosts);
    }

    public get instantBuildCost(): int {
        return STORE.GetInstantBuyCost(this.buildCosts);
    }

    public get logMessage(): string {
        return KEYS.Get("attack_log_siege", { "v1": this.level, "v2": this.name });
    }

    public get warnPopupImage(): string {
        return "siegebuild_" + this.weaponID + ".png";
    }

    public get streamImage(): string {
        return SiegeWeapon._STREAMPOST_FOLDER_URL + "siege_" + this.weaponID + "_stream" + ".png";
    }

    public get rewardImage(): string {
        return "siegebuttons/" + this.weaponID + "_tiny.png";
    }

    public importVariables(param1: any): void {
        this.level = param1["level"] | 0;
        this.quantity = param1["quantity"] | 0;
    }

    public exportVariables(): any {
        return { "level": Math.min(SiegeWeapon.MAX_LEVEL, this.level), "quantity": this.quantity };
    }

    public onActivation(param1: number, param2: number): void {
    }

    public onDeactivation(): void {
    }

    protected ioValue(param1: string, param2: any): any {
        return this.ioOverride && this.ioOverride.hasOwnProperty(param1) ? this.ioOverride[param1] : param2;
    }

    public get range(): int {
        return this.ioValue("range", this.getProperty(SiegeWeapon.RANGE).getValueForLevel(this.level)) | 0;
    }

    public get duration(): int {
        return this.ioValue("duration", this.getProperty(SiegeWeapon.DURATION).getValueForLevel(this.level)) | 0;
    }

    public getProperties(): Vector<SiegeWeaponProperty> {
        let _loc2_: SiegeWeaponProperty = null;
        let _loc1_: Vector<SiegeWeaponProperty> = new Vector<SiegeWeaponProperty>(0, false, SiegeWeaponProperty);
        for (_loc2_ of as3.values(this._properties)) {
            if (_loc2_.order) {
                _loc1_.push(_loc2_);
            }
        }
        return as3.sort(_loc1_, as3.bind(this, this.sortOnOrder));
    }

    private sortOnOrder(param1: SiegeWeaponProperty, param2: SiegeWeaponProperty): number {
        return param1.order - param2.order;
    }

    public addProperty(param1: string, param2: SiegeWeaponProperty): void {
        this._properties[param1] = param2;
        if (param2.order) {
            param2.label = KEYS.Get("label_" + this.weaponID + "_stat" + param2.order);
            param2.descriptionKey = this.weaponID + "_stat" + param2.order;
        }
    }

    public getProperty(param1: string): SiegeWeaponProperty {
        return as3.cast(this._properties[param1], SiegeWeaponProperty);
    }

    public activate(param1: number, param2: number): boolean {
        this.onActivation(param1, param2);
        return true;
    }

    public deactivate(): void {
        this.onDeactivation();
    }

    public get hasCapacityToUpgrade(): boolean {
        let _loc1_: int = 1;
        while (_loc1_ < 5) {
            if (BASE._iresources["r" + _loc1_ + "max"] < this.upgradeCosts["r" + _loc1_]) {
                return false;
            }
            _loc1_++;
        }
        return true;
    }

    public get hasCapacityToBuild(): boolean {
        let _loc1_: int = 1;
        while (_loc1_ < 5) {
            if (BASE._iresources["r" + _loc1_ + "max"] < this.buildCosts["r" + _loc1_]) {
                return false;
            }
            _loc1_++;
        }
        return true;
    }

    public get hasResourcesToUpgrade(): boolean {
        return this.numResourcesToUpgradeNeeded <= 0;
    }

    public get hasResourcesToBuild(): boolean {
        return this.numResourcesToBuildNeeded <= 0;
    }

    public get numResourcesToUpgradeNeeded(): int {
        let _loc1_: int = 0;
        let _loc2_: int = 1;
        while (_loc2_ < 5) {
            _loc1_ = (_loc1_ + Math.max(this.upgradeCosts["r" + _loc2_] - BASE._iresources["r" + _loc2_].Get(), 0)) | 0;
            _loc2_++;
        }
        return _loc1_;
    }

    public get numResourcesToBuildNeeded(): int {
        let _loc1_: int = 0;
        let _loc2_: int = 1;
        while (_loc2_ < 5) {
            _loc1_ = (_loc1_ + Math.max(this.buildCosts["r" + _loc2_] - BASE._iresources["r" + _loc2_].Get(), 0)) | 0;
            _loc2_++;
        }
        return _loc1_;
    }

    public get numResourcesToUpgradeTotal(): int {
        let _loc1_: int = 0;
        let _loc2_: int = 1;
        while (_loc2_ < 5) {
            if (this.upgradeCosts["r" + _loc2_] > 0) {
                _loc1_ = (_loc1_ + this.upgradeCosts["r" + _loc2_]) | 0;
            }
            _loc2_++;
        }
        return _loc1_;
    }

    public get numResourcesToBuildTotal(): int {
        let _loc1_: int = 0;
        let _loc2_: int = 1;
        while (_loc2_ < 5) {
            if (this.buildCosts["r" + _loc2_] > 0) {
                _loc1_ = (_loc1_ + this.buildCosts["r" + _loc2_]) | 0;
            }
            _loc2_++;
        }
        return _loc1_;
    }

    public get instantBuildResourceCost(): int {
        let _loc1_: any = {};
        let _loc2_: int = 1;
        while (_loc2_ < 5) {
            _loc1_["r" + _loc2_] = Math.max(this.buildCosts["r" + _loc2_] - BASE._iresources["r" + _loc2_].Get(), 0);
            _loc2_++;
        }
        return STORE.GetInstantBuyCost(_loc1_);
    }

    public get instantUpgradeResourceCost(): int {
        let _loc1_: any = {};
        let _loc2_: int = 1;
        while (_loc2_ < 5) {
            _loc1_["r" + _loc2_] = Math.max(this.upgradeCosts["r" + _loc2_] - BASE._iresources["r" + _loc2_].Get(), 0);
            _loc2_++;
        }
        return STORE.GetInstantBuyCost(_loc1_);
    }

    public buyResourcesAndUpgrade(): void {
        let _loc1_: int = this.instantUpgradeResourceCost;
        if (!GLOBAL.ioConfirmShiny(_loc1_, "to make up the missing resources and upgrade", as3.bind(this, this.buyResourcesAndUpgrade))) {
            return;
        }
        BASE.Fund(1, Math.max(this.upgradeCosts.r1 - BASE._iresources.r1, 0), false, null, true);
        BASE.Fund(2, Math.max(this.upgradeCosts.r2 - BASE._iresources.r2, 0), false, null, true);
        BASE.Fund(3, Math.max(this.upgradeCosts.r3 - BASE._iresources.r3, 0), false, null, true);
        BASE.Fund(4, Math.max(this.upgradeCosts.r4 - BASE._iresources.r4, 0), false, null, true);
        GLOBAL._bSiegeLab.StartUpgradingWeapon(this.weaponID);
        BASE.Purchase("BRAU", _loc1_, "building");
    }

    public buyResourcesAndBuild(): void {
        let _loc1_: int = this.instantBuildResourceCost;
        if (!GLOBAL.ioConfirmShiny(_loc1_, "to make up the missing resources and build", as3.bind(this, this.buyResourcesAndBuild))) {
            return;
        }
        BASE.Fund(1, Math.max(this.buildCosts.r1 - BASE._iresources.r1, 0), false, null, true);
        BASE.Fund(2, Math.max(this.buildCosts.r2 - BASE._iresources.r2, 0), false, null, true);
        BASE.Fund(3, Math.max(this.buildCosts.r3 - BASE._iresources.r3, 0), false, null, true);
        BASE.Fund(4, Math.max(this.buildCosts.r4 - BASE._iresources.r4, 0), false, null, true);
        GLOBAL._bSiegeFactory.StartUpgradingWeapon(this.weaponID);
        BASE.Purchase("BRAB", _loc1_, "building");
    }
}

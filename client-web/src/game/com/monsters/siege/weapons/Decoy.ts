import * as as3 from "as3";
import { Vector, int } from "as3";
import { Sprite } from "flash/display";
import { Event } from "flash/events";
import { Point } from "flash/geom";
import { SoundChannel } from "flash/media";
import { BASE, BFOUNDATION, BMUSHROOM, BUILDING22, CREATURES, ChampionBase, CreepBase, DROPZONE, DecoyEffect, Expo, GLOBAL, HOUSINGBUNKER, InstanceManager, MAP, SOUNDS, SPRITES, SiegeWeapon, SiegeWeaponProperty, SpriteData, SpriteSheetAnimation, Targeting, TweenLite } from "@game";

export class Decoy extends SiegeWeapon {
    static {
        as3.fields(this, { x: NaN, y: NaN, decoyGraphic: null, _attractedCreeps: null, _loopingChannel: null, _isActive: false, _container: null, _fuse: null });
    }

    public static readonly ID: string = "decoy";

    public static readonly DAMAGE: string = "siegeWeaponDamage";

    public static readonly EXPLOSION_SOUND: string = "othersounds/decoyExplosionSound.mp3";

    public static readonly LOOPING_SOUND: string = "othersounds/decoyLoopingSound.mp3";

    public static readonly DECOY_WAVE: string = "decoyWaveAnimation";

    public static readonly DECOY_FUSE: string = "decoyFuseAnimation";

    public static readonly DECOY_EXPLOSION: string = "decoyExplosionAnimation";

    public static readonly LAND_SOUND: string = "othersounds/decoyLandSound.mp3";
    public x: number;
    public y: number;
    public decoyGraphic: SpriteSheetAnimation;
    private _attractedCreeps: any[];
    private _loopingChannel: SoundChannel;
    private _isActive: boolean;
    private _container: Sprite;
    private _fuse: SpriteSheetAnimation;

    public $ctor(): void {
        this.weaponID = Decoy.ID;
        this.dropTarget = DROPZONE.SIEGEWEAPON_GROUND_SPECIAL;
        super.$ctor();
        this.addProperty(Decoy.DAMAGE, new SiegeWeaponProperty([1000, 1500, 2500, 3500, 4500, 6500, 9000, 12500, 17000, 23500], 1));
        this.addProperty(SiegeWeapon.RANGE, new SiegeWeaponProperty([250, 270, 290, 310, 320, 350, 380, 410, 440, 480], 2));
        this.addProperty(SiegeWeapon.DURATION, new SiegeWeaponProperty([10, 11, 12, 12, 14, 15, 17, 18, 19, 21], 3));
        this.addProperty(SiegeWeapon.UPGRADE_COSTS, new SiegeWeaponProperty([{ "r1": 37599.9587467407, "r2": 43866.6185378641, "r3": 43866.6185378641, "r4": 0, "time": 14400 }, { "r1": 72169.829039505, "r2": 84198.1338794225, "r3": 84198.1338794225, "r4": 0, "time": 18900 }, { "r1": 138513.14459241, "r2": 161598.668691145, "r3": 161598.668691145, "r4": 0, "time": 25200 }, { "r1": 265769.311821143, "r2": 310064.197124667, "r3": 310064.197124667, "r4": 0, "time": 36000 }, { "r1": 509415.86296686, "r2": 594318.50679467, "r3": 594318.50679467, "r4": 0, "time": 55800 }, { "r1": 972778.278801511, "r2": 1134907.9919351, "r3": 1134907.9919351, "r4": 0, "time": 86400 }, { "r1": 1833130.23035504, "r2": 2138651.93541421, "r3": 2138651.93541421, "r4": 0, "time": 216000 }, { "r1": 3309676.9374281, "r2": 3861289.76033278, "r3": 3861289.76033278, "r4": 0, "time": 302400 }, { "r1": 5369777.93088871, "r2": 6264740.91937016, "r3": 6264740.91937016, "r4": 0, "time": 345600 }, { "r1": 7386672.13671496, "r2": 8617784.15950078, "r3": 8617784.15950078, "r4": 0, "time": 388800 }]));
        this.addProperty(SiegeWeapon.BUILD_COSTS, new SiegeWeaponProperty([{ "r1": 14324, "r2": 28648, "r3": 28648, "r4": 0, "time": 3000 }, { "r1": 27493, "r2": 54987, "r3": 54987, "r4": 0, "time": 4500 }, { "r1": 52767, "r2": 105534, "r3": 105534, "r4": 0, "time": 7200 }, { "r1": 101245, "r2": 202491, "r3": 202491, "r4": 0, "time": 9900 }, { "r1": 194063, "r2": 388126, "r3": 388126, "r4": 0, "time": 15300 }, { "r1": 370582, "r2": 741164, "r3": 741164, "r4": 0, "time": 22500 }, { "r1": 698335, "r2": 1396671, "r3": 1396671, "r4": 0, "time": 34200 }, { "r1": 1260829, "r2": 2521659, "r3": 2521659, "r4": 0, "time": 51300 }, { "r1": 2045630, "r2": 4091259, "r3": 4091259, "r4": 0, "time": 76500 }, { "r1": 2813970, "r2": 5627941, "r3": 5627941, "r4": 0, "time": 86400 }]));
        this.loadAssets();
    }

    private loadAssets(): void {
        SPRITES.SetupSprite(Decoy.DECOY_EXPLOSION);
        SPRITES.SetupSprite(Decoy.DECOY_FUSE);
        SPRITES.SetupSprite(Decoy.DECOY_WAVE);
    }

    public get damage(): int {
        return Math.max(0, Math.min(23500, Number(this.ioValue("damage", this.getProperty(Decoy.DAMAGE).getValueForLevel(this.level))))) | 0;
    }

    public override onActivation(param1: number, param2: number): void {
        this.loadAssets();
        this.x = param1;
        this.y = param2;
        this._container = new Sprite();
        this._container.x = param1;
        this._container.y = param2;
        this.setDecoyGraphic(new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(Decoy.DECOY_WAVE), SpriteData), 45));
        this._fuse = new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(Decoy.DECOY_FUSE), SpriteData), 21);
        this._fuse.x = this.decoyGraphic.x + -8;
        this._fuse.y = this.decoyGraphic.y + 30;
        this._fuse.render();
        this._container.addChild(this._fuse);
        MAP._BUILDINGTOPS.addChild(this._container);
        TweenLite.from(this._container, 0.6, { "y": this._container.y - 300, "ease": Expo.easeIn, "onComplete": as3.bind(this, this.onDecoyLanding) });
        TweenLite.delayedCall(this.duration - 0.5, as3.bind(this, this.startFuseAnimation));
        this._attractedCreeps = [];
        SOUNDS.Play(Decoy.LAND_SOUND);
    }

    private startFuseAnimation(): void {
        this._fuse.play();
    }

    private onDecoyLanding(): void {
        this._isActive = true;
        this._loopingChannel = SOUNDS.Play(Decoy.LOOPING_SOUND, 0.8, 0, int.MAX_VALUE);
        this.decoyGraphic.play();
        this.decoyGraphic.doesRepeat = true;
        this._container.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
        this.ejectDefendersFromBunkers();
    }

    private ejectDefendersFromBunkers(): void {
        let _loc1_: Vector<BFOUNDATION> = new Vector<BFOUNDATION>(0, false, BFOUNDATION);
        BASE.GetBuildingOverlap(this.x, this.y, this.range, _loc1_);
        let _loc2_: int = 0;
        while (_loc2_ < _loc1_.length) {
            if (as3.vget(_loc1_, _loc2_) instanceof BUILDING22) {
                as3.cast(as3.vget(_loc1_, _loc2_), BUILDING22).EjectCreeps(new Point(this.x, this.y));
            } else if (as3.vget(_loc1_, _loc2_) instanceof HOUSINGBUNKER) {
                // The Inferno has no Monster Bunker: defenders live in the Compound.
                as3.cast(as3.vget(_loc1_, _loc2_), HOUSINGBUNKER).EjectCreeps(new Point(this.x, this.y), this.range);
            }
            _loc2_++;
        }
    }

    private updateDecoy(): void {
        let _loc2_: CreepBase = null;
        let _loc1_: any[] = this.getDefendingCreepsInRange();
        let _loc3_: int = 0;
        while (_loc3_ < _loc1_.length) {
            if (_loc1_[_loc3_] instanceof CreepBase) {
                _loc2_ = as3.cast(_loc1_[_loc3_], CreepBase);
                if (this._attractedCreeps.indexOf(_loc2_) == -1) {
                    this.attractCreep(_loc2_);
                }
            }
            _loc3_++;
        }
        _loc3_ = (this._attractedCreeps.length - 1) | 0;
        while (_loc3_ >= 0) {
            _loc2_ = as3.cast(this._attractedCreeps[_loc3_], CreepBase);
            if (_loc1_.indexOf(_loc2_) == -1) {
                this.detractCreep(_loc2_, _loc3_);
            }
            _loc3_--;
        }
        this.ejectDefendersFromBunkers();
    }

    private attractCreep(param1: CreepBase): void {
        this._attractedCreeps.push(param1);
        param1.addStatusEffect(new DecoyEffect(param1));
        param1.changeModeDecoy();
    }

    private detractCreep(param1: CreepBase, param2: int): void {
        this._attractedCreeps.splice(param2, 1);
        param1.findDefenseTargets();
        param1.removeStatusEffect(DecoyEffect);
        TweenLite.killDelayedCallsTo(as3.bind(this, this.startFuseAnimation));
    }

    public override onDeactivation(): void {
        let _loc4_: BFOUNDATION = null;
        let _loc5_: int = 0;
        let _loc6_: any = undefined;
        let _loc1_: Point = new Point(this.x, this.y);
        let _loc2_: any[] = this.getDefendingCreepsInRange();
        let _loc3_: Vector<any> = InstanceManager.getInstancesByClass(BFOUNDATION);
        for (_loc4_ of (_loc3_ ?? [])) {
            if (_loc4_ instanceof BMUSHROOM === false && GLOBAL.QuickDistance(_loc1_, new Point(_loc4_.x, _loc4_.y)) < this.range * 0.65) {
                _loc2_.push(_loc4_);
            }
        }
        Targeting.DealLinearAEDamage(_loc1_, this.range, this.damage, _loc2_);
        _loc5_ = (this._attractedCreeps.length - 1) | 0;
        while (_loc5_ >= 0) {
            _loc6_ = this._attractedCreeps[_loc5_];
            this.detractCreep(as3.cast(_loc6_, CreepBase), _loc5_);
            _loc5_--;
        }
        SOUNDS.Play(Decoy.EXPLOSION_SOUND);
        if (this._loopingChannel) {
            this._loopingChannel.stop();
        }
        this._container.removeChild(this._fuse);
        this.setDecoyGraphic(new SpriteSheetAnimation(as3.as(SPRITES.GetSpriteDescriptor(Decoy.DECOY_EXPLOSION), SpriteData), 33));
        this.decoyGraphic.play();
        this._isActive = false;
    }

    private setDecoyGraphic(param1: SpriteSheetAnimation): void {
        if (Boolean(this.decoyGraphic) && Boolean(this.decoyGraphic.parent)) {
            this.decoyGraphic.parent.removeChild(this.decoyGraphic);
        }
        this.decoyGraphic = param1;
        this.decoyGraphic.render();
        this.decoyGraphic.x = -(this.decoyGraphic.width * 0.5);
        this.decoyGraphic.y = -(this.decoyGraphic.height * 0.5);
        this._container.addChild(this.decoyGraphic);
    }

    private onEnterFrame(param1: Event): void {
        this.decoyGraphic.update();
        if (this._isActive) {
            this.updateDecoy();
            this._fuse.update();
        } else if (this.decoyGraphic.currentFrame >= this.decoyGraphic.totalFrames) {
            this._container.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
            if (this._container.parent) {
                this._container.parent.removeChild(this._container);
            }
        }
    }

    private getDefendingCreepsInRange(param1: int = 2147483647): any[] {
        let _loc5_: any = undefined;
        let _loc6_: number = NaN;
        let _loc2_: any[] = [];
        if (!this._isActive) {
            return [];
        }
        let _loc3_: Point = new Point(this.x, this.y);
        let _loc4_: any = CREATURES._creatures;
        if (CREATURES._guardian) {
            if (GLOBAL.QuickDistance(new Point(CREATURES._guardian._mc.x, CREATURES._guardian._mc.y), _loc3_) <= this.range) {
                _loc2_.push(CREATURES._guardian);
            }
        }
        for (_loc5_ of as3.values(_loc4_)) {
            if (!(_loc5_._behaviour != "defend" && _loc5_._behaviour != "bunker" && _loc5_._behaviour != "decoy" && !(_loc5_ instanceof ChampionBase))) {
                if ((_loc6_ = GLOBAL.QuickDistance(new Point(_loc5_._mc.x, _loc5_._mc.y), _loc3_)) <= this.range) {
                    _loc2_.push(_loc5_);
                    if (_loc2_.length >= param1) {
                        return _loc2_;
                    }
                }
            }
        }
        return _loc2_;
    }
}

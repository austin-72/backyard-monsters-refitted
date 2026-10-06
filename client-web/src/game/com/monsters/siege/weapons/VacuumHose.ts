import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, Sprite } from "flash/display";
import { Event } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { SoundChannel } from "flash/media";
import { getTimer } from "flash/utils";
import { ATTACK, BASE, BFOUNDATION, Expo, GLOBAL, IAttackable, ITargetable, ITickable, MAP, ResourceOutpost, SOUNDS, SPRITES, SecNum, SiegeWeapons, TweenLite, UI2, bmp_healthbarsmall, print } from "@game";

export class VacuumHose extends ASObject implements IAttackable, ITickable {
    static {
        as3.implement(this, [IAttackable, ITickable]);
        as3.fields(this, { _vacuum: null, _vacuumSound: null, _vacuumHealth: null, _vacuumMaxHealth: 0, _vacuumLootRate: null, _vacuumFrame: 0, _vacuumStartTime: 0, _vacuumCurrTime: 0, _vacuumPipeSource: null, _vacuumEndSource: null, _vacuumHealthBar: null, _vacuumLootTotals: null, _target: null, _totalPossibleLoot: 0, _amountLooted: 0 });
    }

    public static readonly MR3_MAX_LOOT_MULTIPLIER: number = 0.1;

    public static readonly END_URL: string = "siegeimages/anim1.bottom.png";

    public static readonly END_NUM_FRAMES: uint = 15;

    public static readonly END_WIDTH: uint = 52;

    public static readonly END_HEIGHT: uint = 52;

    public static readonly PIPE_URL: string = "siegeimages/anim1.top.png";

    public static readonly PIPE_NUM_FRAMES: uint = 15;

    public static readonly PIPE_WIDTH: uint = 26;

    public static readonly PIPE_HEIGHT: uint = 97;
    public _vacuum: Sprite;
    public _vacuumSound: SoundChannel;
    public _vacuumHealth: SecNum;
    public _vacuumMaxHealth: int;
    public _vacuumLootRate: SecNum;
    public _vacuumFrame: int;
    public _vacuumStartTime: int;
    public _vacuumCurrTime: int;
    public _vacuumPipeSource: BitmapData;
    public _vacuumEndSource: BitmapData;
    public _vacuumHealthBar: BitmapData;
    public _vacuumLootTotals: any[];
    public _target: BFOUNDATION;
    public _totalPossibleLoot: uint;
    public _amountLooted: uint;

    public $ctor(param1?: BFOUNDATION, param2?: uint, param3?: uint): void {
        this._vacuumHealthBar = new bmp_healthbarsmall(0, 0);
        super.$ctor();
        SPRITES.SetupSprite("vacuum_pipe");
        SPRITES.SetupSprite("vacuum_end");
        this._target = param1;
        this.ApplyVacuum(param2, param3);
    }

    public hasMaxedAmountToLoot(): boolean {
        return this._amountLooted > this._totalPossibleLoot;
    }

    public VacuumLoot(param1: int): void {
        let _loc3_: int = 0;
        let _loc4_: any[] = null;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        if (!this.hasMaxedAmountToLoot()) {
            _loc3_ = 0;
            _loc4_ = [];
            if (BASE._resources.r1.Get() > 0) {
                _loc4_.push({ "id": 1, "quantity": BASE._resources.r1.Get() });
            }
            if (BASE._resources.r2.Get() > 0) {
                _loc4_.push({ "id": 2, "quantity": BASE._resources.r2.Get() });
            }
            if (BASE._resources.r3.Get() > 0) {
                _loc4_.push({ "id": 3, "quantity": BASE._resources.r3.Get() });
            }
            if (BASE._resources.r4.Get() > 0) {
                _loc4_.push({ "id": 4, "quantity": BASE._resources.r4.Get() });
            }
            if (_loc4_.length > 0) {
                if ((_loc5_ = _loc4_[(Math.random() * _loc4_.length) | 0]).quantity >= Math.ceil(param1)) {
                    _loc3_ = Math.ceil(param1) | 0;
                } else {
                    _loc3_ = _loc5_.quantity | 0;
                }
                BASE._resources["r" + _loc5_.id].Add(-_loc3_);
                BASE._hpResources["r" + _loc5_.id] -= _loc3_;
                if (BASE._deltaResources["r" + _loc5_.id]) {
                    BASE._deltaResources["r" + _loc5_.id].Add(-_loc3_);
                    BASE._hpDeltaResources["r" + _loc5_.id] -= _loc3_;
                } else {
                    BASE._deltaResources["r" + _loc5_.id] = new SecNum(-_loc3_);
                    BASE._hpDeltaResources["r" + _loc5_.id] = -_loc3_;
                }
                BASE._deltaResources.dirty = true;
                BASE._hpDeltaResources.dirty = true;
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    _loc3_ = (_loc3_ / 5) | 0;
                }
                ATTACK.Loot(_loc5_.id | 0, _loc3_, this._target.x | 0, this._target.y | 0, 9, this._target, true);
                this._vacuumLootTotals[_loc5_.id - 1] += _loc3_;
                this._amountLooted = (this._amountLooted + _loc3_) >>> 0;
            } else {
                param1 = 0;
            }
        }
        let _loc2_: number = this._vacuumHealth.Get();
        if (_loc2_ < this._vacuumMaxHealth) {
            _loc6_ = (11 - ((11 / this._vacuumMaxHealth * _loc2_) | 0)) | 0;
            this._vacuumEndSource.copyPixels(this._vacuumHealthBar, new Rectangle(0, 5 * _loc6_, 17, 5), new Point(17, 6));
        }
    }

    public get health(): number {
        return this._vacuumHealth.Get();
    }

    public get maxHealth(): number {
        return this._vacuumMaxHealth;
    }

    public modifyHealth(param1: number, param2: ITargetable = null): number {
        this._vacuumHealth.Set(this._vacuumHealth.Get() + param1);
        return param1;
    }

    public get x(): number {
        return this._vacuum.x;
    }

    public get y(): number {
        return this._vacuum.y;
    }

    public get defenseFlags(): int {
        return 0;
    }

    public get attackFlags(): int {
        return 0;
    }

    public get attackPriorityFlags(): Vector<int> {
        return null;
    }

    public ApplyVacuum(param1: int, param2: int): void {
        let _loc6_: Bitmap = null;
        let _loc7_: uint = 0;
        if (this._target._destroyed) {
            return;
        }
        this._vacuum = new Sprite();
        this._vacuumEndSource = new BitmapData(VacuumHose.END_WIDTH, VacuumHose.END_HEIGHT, true, 0);
        this._vacuumPipeSource = new BitmapData(VacuumHose.PIPE_WIDTH, VacuumHose.PIPE_HEIGHT, true, 0);
        let _loc3_: Bitmap = new Bitmap(this._vacuumEndSource);
        this._vacuum.addChild(_loc3_);
        MAP._EFFECTSTOP.addChild(this._vacuum);
        this._vacuumSound = SOUNDS.Play("othersounds/vacuumstart.mp3");
        if (this._vacuumSound) {
            this._vacuumSound.addEventListener(Event.SOUND_COMPLETE, as3.bind(this, this.onLoopStartSoundComplete), false, 0, true);
        }
        this._vacuumLootTotals = [];
        this._vacuumLootTotals = [0, 0, 0, 0];
        let _loc4_: int = (-GLOBAL._mapHeight) | 0;
        let _loc5_: int = 0;
        _loc3_.x = -(VacuumHose.END_WIDTH / 2);
        _loc3_.y = _loc5_ -= VacuumHose.END_HEIGHT;
        while (_loc5_ > _loc4_) {
            (_loc6_ = new Bitmap(this._vacuumPipeSource)).x = -(VacuumHose.PIPE_WIDTH / 2);
            _loc6_.y = _loc5_ -= VacuumHose.PIPE_HEIGHT;
            this._vacuum.addChild(_loc6_);
        }
        this._totalPossibleLoot = uint.MAX_VALUE;
        if (this._target instanceof ResourceOutpost) {
            _loc7_ = (BASE._resources.r1.Get() + BASE._resources.r2.Get() + BASE._resources.r3.Get() + BASE._resources.r4.Get()) >>> 0;
            this._totalPossibleLoot = (_loc7_ * VacuumHose.MR3_MAX_LOOT_MULTIPLIER) >>> 0;
            print("Using the loot-o-tron on a Resource Outpost. This base has " + GLOBAL.FormatNumber(_loc7_) + " resources so you will only be able to take " + GLOBAL.FormatNumber(this._totalPossibleLoot) + ". (" + VacuumHose.MR3_MAX_LOOT_MULTIPLIER + "%)");
        }
        this._amountLooted = 0;
        this._vacuumLootRate = new SecNum(param2);
        this._vacuumMaxHealth = param1;
        this._vacuumHealth = new SecNum(param1);
        this._vacuumStartTime = this._vacuumCurrTime = getTimer();
        this._vacuum.x = this._target.x;
        this._vacuum.y = this._target.y - 400;
        this._vacuum.alpha = 0;
        TweenLite.to(this._vacuum, 2, { "y": this._target.y + this._target._spoutPoint.y - 50, "alpha": 1, "ease": Expo.easeOut });
    }

    public onLoopStartSoundComplete(param1: Event): void {
        this._vacuumSound = SOUNDS.Play("othersounds/vacuumloop.mp3", 0.8, 0, 100);
    }

    public RemoveVacuum(param1: boolean = false): void {
        let savedVacuum: Sprite = null;
        let ActuallyRemove: Function = null;
        savedVacuum = null;
        let wasDestroyed: boolean = param1;
        ActuallyRemove = (): void => {
            if (savedVacuum.parent) {
                savedVacuum.parent.removeChild(savedVacuum);
            }
            this._vacuumEndSource.dispose();
            this._vacuumPipeSource.dispose();
        };
        if (this._vacuum) {
            savedVacuum = this._vacuum;
            this._vacuum = null;
            if (this._vacuumHealth) {
                this._vacuumHealth.Set(0);
            }
            this._vacuumMaxHealth = 0;
            if (this._vacuumSound) {
                this._vacuumSound.stop();
                SOUNDS.Play(wasDestroyed ? "othersounds/vacuumbroken.mp3" : "othersounds/vacuumloopoff.mp3");
            }
            TweenLite.to(savedVacuum, 2, { "y": this._target.y - 400, "alpha": 0, "ease": Expo.easeOut, "onComplete": ActuallyRemove });
        }
    }

    public tick(param1: int = 1): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        if (this._target._destroyed) {
            this.targetDestroyed();
            return;
        }
        if (this._vacuum) {
            if (!this.hasMaxedAmountToLoot()) {
                ++this._vacuumFrame;
                SPRITES.GetFrameById(this._vacuumEndSource, "vacuum_end", (this._vacuumFrame % VacuumHose.END_NUM_FRAMES) | 0, 0);
                SPRITES.GetFrameById(this._vacuumPipeSource, "vacuum_pipe", (this._vacuumFrame % VacuumHose.PIPE_NUM_FRAMES) | 0, 0);
            }
            if (this._vacuumHealth.Get() > 0) {
                _loc2_ = ((this._vacuumCurrTime - this._vacuumStartTime) * this._vacuumLootRate.Get() / 1000) | 0;
                this._vacuumCurrTime = getTimer();
                _loc3_ = ((this._vacuumCurrTime - this._vacuumStartTime) * this._vacuumLootRate.Get() / 1000) | 0;
                this.VacuumLoot((_loc3_ - _loc2_) | 0);
            } else if (SiegeWeapons.activeWeapon) {
                SiegeWeapons.deactivateWeapon();
            }
        }
    }

    private targetDestroyed(): void {
        SiegeWeapons.deactivateWeapon();
        if (UI2._top) {
            UI2._top.validateSiegeWeapon();
        }
    }
}

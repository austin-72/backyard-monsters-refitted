import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { ATTACK, BFOUNDATION, BYMConfig, EFFECTS, GIBLETS, GLOBAL, KEYS, MonsterBase, RasterData, SOUNDS, Targeting } from "@game";

export class BTRAP extends BFOUNDATION {
    static {
        as3.fields(this, { creeps: null, maxDist: 0, minDist: 0, _hasTargets: false, _targetCreeps: null, _retarget: 0 });
    }

    private creeps: any[];
    private maxDist: int;
    private minDist: int;
    public _hasTargets: boolean;
    public _targetCreeps: any[];
    public _retarget: int;

    public $ctor(): void {
        super.$ctor();
        this._fired = false;
        this._retarget = 0;
        this._range = 20;
        this.attackFlags = Targeting.getOldStyleTargets(-1);
    }

    public override SetProps(): void {
        let _loc1_: RasterData = null;
        super.SetProps();
        this.damageProperty.value = Number(this._buildingProps.damage[0]);
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            this._mc.visible = false;
            this._mcBase.visible = false;
        }
    }

    protected override updateRasterData(): void {
        if (GLOBAL.mode !== GLOBAL.e_BASE_MODE.BUILD) {
            this._mc.visible = false;
            this._mcBase.visible = false;
        }
        super.updateRasterData();
        if (GLOBAL.INFERNO_ONLY) {
            this.ioDrawDisarmed();
        }
    }

    /**
     * Inferno-only (3 October): a trap that went off stays in the yard, disarmed (drawn faded), until it is
     * re-armed (IoTrapRearm: every disarmed trap at once, for what building them again costs). Saved as
     * "fd": 1 in its building data; an attack's save marks the traps it set off so on the server
     * (buildingDataHandler), where it used to drop them.
     */
    public get ioDisarmed(): boolean {
        return GLOBAL.INFERNO_ONLY && this._fired;
    }

    public ioDrawDisarmed(): void {
        let a: number = Number(this.ioDisarmed ? 0.4 : 1);
        if (this._mc) {
            this._mc.alpha = a;
        }
        if (this._mcBase) {
            this._mcBase.alpha = a;
        }
        if (this._rasterData) {
            for (let r of (this._rasterData ?? [])) {
                if (r) {
                    r.alpha = a;
                }
            }
        }
    }

    /** Re-armed (IoTrapRearm): ready to go off again. */
    public ioRearm(): void {
        this._fired = false;
        this._destroyed = false;
        this._hasTargets = false;
        this._retarget = 0;
        this.setHealth(this.maxHealth);
        this.ioDrawDisarmed();
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (GLOBAL.INFERNO_ONLY && param1 && (param1.fd | 0) == 1) {
            // (its health was set to 0 when it went off: it isn't broken, only spent)
            this._fired = true;
            this._destroyed = false;
            this.setHealth(this.maxHealth);
            this.ioDrawDisarmed();
        }
    }

    public override Export(): any {
        let o: any = super.Export();
        if (o && this.ioDisarmed) {
            o.fd = 1;
        }
        return o;
    }

    public override TickAttack(): void {
        if (this._countdownBuild.Get() == 0 && !this._fired) {
            if (!this._hasTargets) {
                if (this._retarget == 0) {
                    this.FindTargets();
                    this._retarget = 20;
                }
                --this._retarget;
            } else {
                this.Explode();
            }
        }
    }

    public FindTargets(): void {
        let _loc1_: any = null;
        let _loc2_: MonsterBase = null;
        let _loc3_: string = null;
        let _loc4_: number = NaN;
        let _loc5_: Point = null;
        let _loc6_: int = 0;
        this.creeps = Targeting.getCreepsInRange(this._range, this._position, this.attackFlags);
        this._hasTargets = false;
        this._targetCreeps = [];
        let _loc7_: int = 0;
        let _loc8_: any = this.creeps;
        for (_loc3_ in _loc8_) {
            _loc1_ = this.creeps[_loc3_];
            _loc2_ = as3.cast(_loc1_.creep, MonsterBase);
            if (Targeting.ioSkipsTraps(_loc2_)) {
                continue;
            }
            _loc4_ = Number(_loc1_.dist);
            _loc5_ = as3.cast(_loc1_.pos, Point);
            this._targetCreeps.push({ "creep": _loc2_, "dist": _loc4_, "position": _loc5_ });
            this._hasTargets = true;
        }
    }

    public Explode(): void {
        let _loc1_: any = null;
        let _loc2_: MonsterBase = null;
        let _loc3_: string = null;
        let _loc4_: number = NaN;
        let _loc5_: Point = null;
        let _loc6_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: int = 0;
        let _loc10_: RasterData = null;
        let _loc7_: any[] = Targeting.getCreepsInRange(this._size, new Point(this._mc.x, this._mc.y), this.attackFlags);
        for (_loc3_ in _loc7_) {
            _loc1_ = _loc7_[_loc3_];
            _loc2_ = as3.cast(_loc1_.creep, MonsterBase);
            if (_loc2_.health > 0) {
                _loc8_++;
                _loc4_ = Number(_loc1_.dist);
                _loc5_ = as3.cast(_loc1_.pos, Point);
                _loc2_.modifyHealth(-(this.damage / this._buildingProps.size * (this._buildingProps.size - _loc4_ * 0.5)));
                if (_loc2_.health <= 0) {
                    _loc9_++;
                    GIBLETS.Create(new Point(this._mc.x, this._mc.y + 3), 0.8, 75, 2);
                }
            }
        }
        if (_loc8_ > 0) {
            this._fired = true;
            if (_loc9_ == _loc8_) {
                ATTACK.Log("trap" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_trapkilled", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": _loc9_ }) + "</font>");
            } else if (_loc9_ > 0) {
                ATTACK.Log("trap" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_trapdamagedkilled", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": _loc8_, "v3": _loc9_ }) + "</font>");
            } else {
                ATTACK.Log("trap" + this._id, "<font color=\"#FF0000\">" + KEYS.Get("attack_log_trapdamaged", { "v1": KEYS.Get(as3.str(this._buildingProps.name)), "v2": _loc8_ }) + "</font>");
            }
            EFFECTS.Scorch(new Point(this._mc.x, this._mc.y + 5));
        }
        this._hasTargets = false;
        this._mc.visible = true;
        this._mcBase.visible = true;
        if (BYMConfig.instance.RENDERER_ON) {
            for (_loc10_ of (this._rasterData ?? [])) {
                if (_loc10_) {
                    _loc10_.visible = true;
                }
            }
        }
        this.setHealth(0);
        SOUNDS.Play("trap");
        if (GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && this._fired) {
            // Inferno-only: set off in your own yard (a wild monster attack), it stays, disarmed
            this.setHealth(this.maxHealth);
            this.ioDrawDisarmed();
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            this.RecycleC();
        }
    }
}

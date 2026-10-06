import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { GLOBAL, IAttackable, MonsterBase, PROJECTILES, ProjectileBase, Targeting } from "@game";

export class PROJECTILE extends ProjectileBase {
    static {
        as3.fields(this, { _target: null, _splashTargetFlags: 0, _rocket: false });
    }

    public _target: IAttackable;
    public _splashTargetFlags: int;
    public _rocket: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    public Tick(): boolean {
        ++this._frameNumber;
        if (!this._target || this._target.health <= 0) {
            PROJECTILES.Remove(this._id);
            return false;
        }
        this._targetPoint = new Point(this._target.x, this._target.y - (this._target instanceof MonsterBase && as3.cast(this._target, MonsterBase)._movement == "fly" ? as3.cast(this._target, MonsterBase)._altitude : 0));
        this._distance = Point.distance(this._targetPoint, new Point(this._tmpX, this._tmpY)) | 0;
        if (this.Move()) {
            return true;
        }
        this.Render();
        return false;
    }

    public Move(): boolean {
        let _loc1_: number = this._maxSpeed * 0.5;
        if (this._frameNumber % 5 == 0) {
            this._xd = this._targetPoint.x - this._tmpX;
            this._yd = this._targetPoint.y - this._tmpY;
            this._xChange = Math.cos(Math.atan2(this._yd, this._xd)) * _loc1_;
            this._yChange = Math.sin(Math.atan2(this._yd, this._xd)) * _loc1_;
        }
        this._tmpX += this._xChange;
        this._tmpY += this._yChange;
        this._distance = (this._distance - _loc1_) | 0;
        if (this._distance <= this._maxSpeed) {
            if (this._splash > 0) {
                this.Splash();
            } else {
                this._target.modifyHealth(-this._damage, this);
            }
            PROJECTILES.Remove(this._id);
            return true;
        }
        return false;
    }

    public Render(): void {
        if (GLOBAL._render && Boolean(this._graphic)) {
            this._graphic.x = this._tmpX | 0;
            this._graphic.y = this._tmpY | 0;
        }
    }

    public Splash(): void {
        let _loc1_: Point = new Point(this._tmpX, this._tmpY);
        let _loc2_: any[] = Targeting.getTargetsInRange(this._splash, _loc1_, this._splashTargetFlags);
        Targeting.DealLinearAEDamage(_loc1_, this._splash, this._damage, _loc2_);
        this._target.modifyHealth(0, this);
    }
}

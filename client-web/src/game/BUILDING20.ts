import * as as3 from "as3";
import { int, uint } from "as3";
import { BitmapData } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BTOWER, GLOBAL, IAttackable, PROJECTILES, SOUNDS, Targeting } from "@game";

export class BUILDING20 extends BTOWER {
    static {
        as3.fields(this, { _animBitmap: null });
    }

    public static readonly TYPE: uint = 20;
    public _animBitmap: BitmapData;

    public $ctor(): void {
        super.$ctor();
        this._frameNumber = 0;
        this._type = 20;
        this._top = -4;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this.SetProps();
        this.Props();
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        SOUNDS.Play("splash1", !this.isJard ? 0.8 : 0.4);
        let _loc2_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc3_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc3_ = 1.25;
        }
        if (this.isJard) {
            this._jarHealth.Add(-((this.damage * 6 * _loc2_ * _loc3_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * 6 * _loc2_ * _loc3_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
        } else if (this._targetVacuum) {
            PROJECTILES.Spawn(new Point(this._mc.x, this._mc.y + this._top), GLOBAL.townHall._position.add(new Point(0, -GLOBAL.townHall._mc.height)), null, this._speed, (this.damage * _loc3_ * 3 * _loc2_) | 0, false, 0);
        } else {
            PROJECTILES.Spawn(new Point(this._mc.x, this._mc.y + this._top), null, param1, this._speed, (this.damage * _loc2_ * _loc3_) | 0, false, this._splash, Targeting.getOldStyleTargets(-1));
        }
    }
}

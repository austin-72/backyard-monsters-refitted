import * as as3 from "as3";
import { int } from "as3";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BTOWER, GLOBAL, IAttackable, PROJECTILES, SOUNDS, Targeting } from "@game";

export class INFERNO_CANNON_TOWER extends BTOWER {
    public static readonly TYPE: int = 130;

    public $ctor(): void {
        super.$ctor();
        this._frameNumber = 0;
        this._type = INFERNO_CANNON_TOWER.TYPE;
        this._top = -25;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this.SetProps();
        this.Props();
    }

    public override TickAttack(): void {
        super.TickAttack();
        this.Rotate();
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animLoaded && GLOBAL._render) {
            this._animRect.x = this._animRect.width * this._animTick;
            this._animContainerBMD.copyPixels(this._animBMD, this._animRect, this._nullPoint);
        }
    }

    public override Fire(param1: IAttackable): void {
        super.Fire(param1);
        SOUNDS.Play("icannon", !this.isJard ? 0.8 : 0.4);
        let _loc2_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc3_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc3_ = 1.25;
        }
        if (this.isJard) {
            // Under a Candy Jar it shoots the glass, like every other tower (it used to fire through it).
            this._jarHealth.Add(-((this.damage * 6 * _loc2_ * _loc3_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * 6 * _loc2_ * _loc3_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
            return;
        }
        PROJECTILES.Spawn(new Point(this._mc.x, this._mc.y + this._top), null, param1, this._speed, (this.damage * _loc2_ * _loc3_) | 0, false, this._splash, Targeting.getOldStyleTargets(-1));
    }
}

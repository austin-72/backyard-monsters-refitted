import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";
import { Point, Rectangle } from "flash/geom";
import { ATTACK, BASE, BTOWER, GLOBAL, IAttackable, PROJECTILES, SOUNDS } from "@game";

export class BUILDING21 extends BTOWER {
    static {
        as3.fields(this, { _animBitmap: null });
    }

    public _animBitmap: BitmapData;

    public $ctor(): void {
        super.$ctor();
        this._frameNumber = 0;
        this._type = 21;
        this._top = BASE.isInfernoMainYardOrOutpost ? -60 : -30;
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
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.Play("isniper", !this.isJard ? 0.8 : 0.4);
        } else {
            SOUNDS.Play("snipe1", !this.isJard ? 0.8 : 0.4);
        }
        let _loc2_: number = 0.5 + 0.5 / this.maxHealth * this.health;
        let _loc3_: number = 1;
        if (Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp()) {
            _loc3_ = 1.25;
        }
        if (this.isJard) {
            this._jarHealth.Add(-((this.damage * _loc2_ * _loc3_) | 0));
            ATTACK.Damage(this._mc.x, this._mc.y + this._top, (this.damage * _loc2_ * _loc3_) | 0);
            if (this._jarHealth.Get() <= 0) {
                this.KillJar();
            }
        } else {
            PROJECTILES.Spawn(new Point(this._mc.x, this._mc.y + this._top), null, param1, this._speed, (this.damage * _loc2_ * _loc3_) | 0, false, this._splash);
        }
    }

    public override Props(): void {
        super.Props();
    }

    public override Upgraded(): void {
        super.Upgraded();
    }

    public override Constructed(): void {
        super.Constructed();
    }
}

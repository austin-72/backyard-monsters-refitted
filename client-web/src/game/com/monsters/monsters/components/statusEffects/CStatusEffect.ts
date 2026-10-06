import * as as3 from "as3";
import { int } from "as3";
import { IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BYMConfig, Component, MonsterBase, RasterData, SpriteSheetAnimation } from "@game";

export class CStatusEffect extends Component {
    static {
        as3.fields(this, { _icon: null, _rasterData: null, _rasterPt: null, _priority: 0, _dps: NaN, _target: null, _curLife: 0, _curTick: 0 });
    }

    protected static readonly _MAGIC_PADDING: int = 5;

    protected static readonly _MAX_TICKS: int = 40;
    protected _icon: SpriteSheetAnimation;
    protected _rasterData: RasterData;
    protected _rasterPt: Point;
    protected _priority: int;
    protected _dps: number;
    protected _target: MonsterBase;
    protected _curLife: int;
    protected _curTick: int;

    public $ctor(param1?: MonsterBase): void {
        super.$ctor();
        this._target = param1;
    }

    public get icon(): SpriteSheetAnimation {
        return this._icon;
    }

    protected override onRegister(): void {
        this._target.addChild(this._icon);
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterPt = new Point();
            this._rasterData = new RasterData(as3.cast(this._icon.bitmapData, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
        this._priority = -1;
        let _loc1_: int = 0;
        while (_loc1_ < this._target._components.length) {
            if (as3.vget(this._target._components, _loc1_) instanceof CStatusEffect) {
                ++this._priority;
            }
            _loc1_++;
        }
    }

    protected override onUnregister(): void {
        this._target.removeChild(this._icon);
        this.destoy();
    }

    public override tick(param1: int = 1): void {
        if (this._target.health <= 0) {
            this.owner.removeComponent(this);
            return;
        }
        this._curTick += param1;
        if (this._curTick >= CStatusEffect._MAX_TICKS) {
            this._curTick -= CStatusEffect._MAX_TICKS;
            this.updateDPS(param1);
        }
        this.updatePosition();
        if (this._icon) {
            this._icon.update();
        }
    }

    protected updatePosition(): void {
        this._icon.x = -this._icon.width / 2;
        if (this._priority % 2) {
            this._icon.x += ((this._priority / 2 + 1) | 0) * (this._icon.width + CStatusEffect._MAGIC_PADDING);
        } else {
            this._icon.x -= this._priority / 2 * (this._icon.width + CStatusEffect._MAGIC_PADDING);
        }
        this._icon.y = this._target._graphicMC.y - this._icon.height;
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterPt.x = this._target.rasterPt.x + (this._target._graphicMC.width >> 1) + this._icon.x;
            this._rasterPt.y = this._target.rasterPt.y - this._icon.height;
        }
    }

    public renew(): void {
        this._curLife = 0;
    }

    protected updateDPS(param1: int): void {
        this._target.modifyHealth(-this._dps);
    }

    public setDPS(param1: number): void {
        this._dps = param1;
    }

    public override destoy(): void {
        this._icon = null;
        if (this._rasterData) {
            this._rasterData.clear();
        }
        this._rasterData = null;
        this._rasterPt = null;
        this._target = null;
    }
}

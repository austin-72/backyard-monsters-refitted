import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { Point } from "flash/geom";
import { GIBLETS, GIBLET_CLIP, SOUNDS, Sine, TweenLite } from "@game";

export class GIBLET extends GIBLET_CLIP {
    static {
        as3.fields(this, { _frame: 0, _id: 0, _targetPoint: null, _target: null, _cleared: false, xd: NaN, yd: NaN, _targetRotation: NaN, _speed: NaN });
    }

    private _frame: int;
    private _id: int;
    private _targetPoint: Point;
    private _target: MovieClip;
    public _cleared: boolean;
    private xd: number;
    private yd: number;
    private _targetRotation: number;
    private _speed: number;

    public $ctor(): void {
        super.$ctor();
    }

    public init(param1: int, param2: Point, param3: Point, param4: number, param5: number, param6: number): void {
        this._id = param1;
        this.visible = false;
        this._cleared = false;
        this.x = param2.x;
        this.y = param2.y;
        this.scaleX = this.scaleY = param6;
        let _loc7_: number = NaN;
        if ((_loc7_ = Math.sqrt(param4 * 0.3) * 0.2) < 0.3) {
            _loc7_ = 0.3;
        }
        TweenLite.to(this, _loc7_, { "x": param3.x, "y": param3.y, "visible": true, "ease": Sine.easeInOut, "delay": param5, "onComplete": as3.bind(this, this.Arrived), "overwrite": false });
        TweenLite.to(this.mcDot, _loc7_ / 2, { "y": -(_loc7_ * 50), "ease": Sine.easeOut, "delay": param5, "overwrite": 0 });
        TweenLite.to(this.mcDot, _loc7_ / 2, { "y": 0, "ease": Sine.easeIn, "delay": _loc7_ / 2 + param5, "overwrite": 0 });
        this.cacheAsBitmap = true;
    }

    private Arrived(): void {
        if (!this._cleared) {
            SOUNDS.Play("splat5");
            GIBLETS.Remove(this._id);
        }
    }

    public Clear(): void {
        this._cleared = true;
    }
}

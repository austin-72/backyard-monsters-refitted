import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, ResourcePackage_CLIP, ResourcePackages, SOUNDS, Sine, TweenLite } from "@game";

export class ResourcePackage extends ResourcePackage_CLIP {
    static {
        as3.fields(this, { _frame: 0, _id: 0, _targetPoint: null, _target: null, xd: NaN, yd: NaN, _targetRotation: NaN, _speed: NaN });
    }

    private _frame: int;
    private _id: int;
    private _targetPoint: Point;
    private _target: BFOUNDATION;
    private xd: number;
    private yd: number;
    private _targetRotation: number;
    private _speed: number;

    public $ctor(param1?: Point, param2?: Point, param3?: int, param4?: int, param5?: int, param6: int = 0, param7: BFOUNDATION = null, param8: number = 0): void {
        let time: number = NaN;
        let Sound: Function = null;
        let sourcePoint: Point = param1;
        let targetPoint: Point = param2;
        let startHeight: int = param3;
        let endHeight: int = param4;
        let type: int = param5;
        let id: int = param6;
        let target: BFOUNDATION = param7;
        let delay: number = param8;
        super.$ctor();
        Sound = (): void => {
            if (BASE.isInfernoMainYardOrOutpost) {
                SOUNDS.Play("ibankfire");
            } else {
                SOUNDS.Play("bankfire");
            }
        };
        this._target = target;
        this.visible = false;
        this.x = sourcePoint.x;
        this.y = sourcePoint.y;
        this.mcShadow.y = startHeight;
        this.mcShadow.x = startHeight / 2;
        this._id = id;
        this.mcDot.gotoAndStop(type);
        this.mcShadow.cacheAsBitmap = true;
        this.mcDot.cacheAsBitmap = true;
        time = Point.distance(targetPoint, sourcePoint) + Math.random() * 50;
        time /= 150;
        if (time < 0.8) {
            time = 0.8;
        }
        TweenLite.to(this, time, { "x": targetPoint.x, "y": targetPoint.y, "visible": true, "ease": Sine.easeInOut, "delay": delay, "onStart": Sound, "onComplete": as3.bind(this, this.Arrived) });
        TweenLite.to(this.mcDot, time / 2, { "y": -(time * 120), "ease": Sine.easeOut, "delay": delay, "overwrite": 0 });
        TweenLite.to(this.mcDot, time / 2, { "y": 0, "ease": Sine.easeIn, "delay": time / 2 + delay, "overwrite": 0 });
        TweenLite.to(this.mcShadow, time / 2, { "x": startHeight / 2 + time * 100, "alpha": 0, "ease": Sine.easeOut, "delay": delay, "overwrite": 0 });
        TweenLite.to(this.mcShadow, time / 2, { "x": endHeight / 2, "y": endHeight, "alpha": 1, "ease": Sine.easeIn, "delay": time / 2 + delay, "overwrite": 0 });
    }

    private Arrived(): void {
        if (BASE.isInfernoMainYardOrOutpost) {
            SOUNDS.Play("ibankland");
        } else {
            SOUNDS.Play("bankland");
        }
        if (this._target) {
            this._target._hasResources = true;
        }
        ResourcePackages.Remove(this._id);
    }
}

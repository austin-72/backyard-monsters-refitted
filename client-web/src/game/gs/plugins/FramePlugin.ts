import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { TweenLite, TweenPlugin } from "@game";

export class FramePlugin extends TweenPlugin {
    static {
        as3.fields(this, { frame: 0, _target: null });
    }

    public static readonly VERSION: number = 1.01;

    public static readonly API: number = 1;
    public frame: int;
    protected _target: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.propName = "frame";
        this.overwriteProps = ["frame"];
        this.round = true;
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        if (!(param1 instanceof MovieClip) || isNaN(Number(param2))) {
            return false;
        }
        this._target = as3.as(param1, MovieClip);
        this.frame = this._target.currentFrame;
        this.addTween(this, "frame", this.frame, param2, "frame");
        return true;
    }

    public override set changeFactor(param1: number) {
        this.updateTweens(param1);
        this._target.gotoAndStop(this.frame);
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}

import * as as3 from "as3";
import { TweenLite, TweenPlugin } from "@game";

export class VisiblePlugin extends TweenPlugin {
    static {
        as3.fields(this, { _target: null, _tween: null, _visible: false });
    }

    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;
    protected _target: any;
    protected _tween: TweenLite;
    protected _visible: boolean;

    public $ctor(): void {
        super.$ctor();
        this.propName = "visible";
        this.overwriteProps = ["visible"];
        this.onComplete = as3.bind(this, this.onCompleteTween);
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        this._target = param1;
        this._tween = param3;
        this._visible = Boolean(param2);
        return true;
    }

    public onCompleteTween(): void {
        if (this._tween.vars.runBackwards != true && this._tween.ease == this._tween.vars.ease) {
            this._target.visible = this._visible;
        }
    }

    public override set changeFactor(param1: number) {
        if (this._target.visible != true) {
            this._target.visible = true;
        }
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}

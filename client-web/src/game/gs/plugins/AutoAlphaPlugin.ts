import * as as3 from "as3";
import { TweenLite, TweenPlugin } from "@game";

export class AutoAlphaPlugin extends TweenPlugin {
    static {
        as3.fields(this, { _tweenVisible: false, _visible: false, _tween: null, _target: null });
    }

    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;
    protected _tweenVisible: boolean;
    protected _visible: boolean;
    protected _tween: TweenLite;
    protected _target: any;

    public $ctor(): void {
        super.$ctor();
        this.propName = "autoAlpha";
        this.overwriteProps = ["alpha", "visible"];
        this.onComplete = as3.bind(this, this.onCompleteTween);
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        this._target = param1;
        this._tween = param3;
        this._visible = Boolean(param2 != 0);
        this._tweenVisible = true;
        this.addTween(param1, "alpha", Number(param1.alpha), param2, "alpha");
        return true;
    }

    public override killProps(param1: any): void {
        super.killProps(param1);
        this._tweenVisible = !Boolean("visible" in param1);
    }

    public onCompleteTween(): void {
        if (this._tweenVisible && this._tween.vars.runBackwards != true && this._tween.ease == this._tween.vars.ease) {
            this._target.visible = this._visible;
        }
    }

    public override set changeFactor(param1: number) {
        this.updateTweens(param1);
        if (this._target.visible != true && this._tweenVisible) {
            this._target.visible = true;
        }
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}

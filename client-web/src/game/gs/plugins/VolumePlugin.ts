import * as as3 from "as3";
import { SoundTransform } from "flash/media";
import { TweenLite, TweenPlugin } from "@game";

export class VolumePlugin extends TweenPlugin {
    static {
        as3.fields(this, { _target: null, _st: null });
    }

    public static readonly VERSION: number = 1.01;

    public static readonly API: number = 1;
    protected _target: any;
    protected _st: SoundTransform;

    public $ctor(): void {
        super.$ctor();
        this.propName = "volume";
        this.overwriteProps = ["volume"];
    }

    public override onInitTween(param1: any, param2: any, param3: TweenLite): boolean {
        if (isNaN(Number(param2)) || !param1.hasOwnProperty("soundTransform")) {
            return false;
        }
        this._target = param1;
        this._st = as3.cast(this._target.soundTransform, SoundTransform);
        this.addTween(this._st, "volume", this._st.volume, param2, "volume");
        return true;
    }

    public override set changeFactor(param1: number) {
        this.updateTweens(param1);
        this._target.soundTransform = this._st;
    }

    public override get changeFactor(): number {
        return super.changeFactor;
    }
}

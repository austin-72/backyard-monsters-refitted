import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BFOUNDATION, Bounce, GLOBAL, MAP, ResourcePackage_CLIP, SOUNDS, TweenLite } from "@game";

export class ParticleLoot extends ASObject {
    static {
        as3.fields(this, { _resourcePackage: null, _building: null });
    }

    private _resourcePackage: ResourcePackage_CLIP;
    private _building: BFOUNDATION;

    public $ctor(param1?: BFOUNDATION, param2?: int, param3?: int): void {
        super.$ctor();
        if (!GLOBAL._catchup) {
            this._building = param1;
            this._resourcePackage = new ResourcePackage_CLIP();
            MAP._RESOURCES.addChild(this._resourcePackage);
            this._resourcePackage.mcDot.gotoAndStop(param3);
            this._resourcePackage.x = param1._mc.x;
            this._resourcePackage.y = param1._mc.y;
            this.Launch();
            TweenLite.to(this._resourcePackage, 0.5, { "alpha": 0, "delay": 1.5, "overwrite": 0 });
            SOUNDS.Play("bankland");
        }
    }

    public Launch(): void {
        let _loc1_: number = NaN;
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc7_: number = NaN;
        _loc1_ = this._building._mcFootprint.width * 0.35;
        _loc2_ = this._building._mcFootprint.height * 0.35;
        _loc3_ = Math.random() * 2 - 1;
        this._resourcePackage.x += _loc3_ * _loc1_;
        let _loc4_: number = this._resourcePackage.x + _loc3_ * _loc1_;
        TweenLite.to(this._resourcePackage, 2, { "x": _loc4_, "overwrite": 0, "onComplete": as3.bind(this, this.Remove) });
        let _loc5_: number = Math.random() * 2 - 1;
        this._resourcePackage.y += _loc3_ * _loc2_;
        let _loc6_: number = NaN;
        _loc7_ = (_loc6_ = _loc3_ * -1 * _loc2_) + _loc2_ * 1.5;
        this._resourcePackage.mcShadow.y = _loc7_;
        TweenLite.to(this._resourcePackage.mcDot, 1, { "y": _loc7_, "ease": Bounce.easeOut, "overwrite": 0 });
    }

    public Remove(): void {
        try {
            MAP._RESOURCES.removeChild(this._resourcePackage);
        } catch (e) {
        }
        this._resourcePackage = null;
    }
}

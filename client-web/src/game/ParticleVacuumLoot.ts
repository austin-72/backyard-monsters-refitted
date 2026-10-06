import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BFOUNDATION, GLOBAL, MAP, ResourcePackage_CLIP, SOUNDS, Sine, TweenLite } from "@game";

export class ParticleVacuumLoot extends ASObject {
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
            this._resourcePackage.x = param1._mc.x + param1._spoutPoint.x;
            this._resourcePackage.y = param1._mc.y + param1._spoutPoint.y;
            this._resourcePackage.mcShadow.visible = false;
            this.Launch();
            TweenLite.to(this._resourcePackage, 0.5, { "alpha": 0, "delay": 1.5, "overwrite": 0 });
            SOUNDS.Play("bankland");
        }
    }

    public Launch(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc1_: number = 10;
        _loc2_ = as3.as(GLOBAL.townHall, BFOUNDATION);
        let _loc3_: number = this._resourcePackage.x;
        let _loc4_: number = this._resourcePackage.y + _loc2_._spoutPoint.y - 200;
        this._resourcePackage.x += (Math.random() * 2 - 1) * _loc1_;
        TweenLite.to(this._resourcePackage, 1, { "x": _loc3_, "y": _loc4_, "ease": Sine.easeIn, "onComplete": as3.bind(this, this.Remove) });
    }

    public Remove(): void {
        try {
            MAP._RESOURCES.removeChild(this._resourcePackage);
        } catch (e) {
        }
        this._resourcePackage = null;
    }
}

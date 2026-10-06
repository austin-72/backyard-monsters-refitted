import * as as3 from "as3";
import { int, uint } from "as3";
import { Point } from "flash/geom";
import { BRESOURCE, Cubic, GLOBAL, MAP, ParticleDamageItem_CLIP, ParticleText, TweenLite } from "@game";

export class ParticleDamageItem extends ParticleDamageItem_CLIP {
    static {
        as3.fields(this, { _mc: null });
    }

    public _mc: ParticleDamageItem;

    public $ctor(): void {
        super.$ctor();
    }

    public Init(param1: Point, param2: int, param3: uint): void {
        this._mc = as3.as(MAP._PROJECTILES.addChild(this), ParticleDamageItem);
        this.Fill(param2, param3);
        this.Move(param1);
    }

    public Fill(param1: int, param2: uint): void {
        let _loc3_: any = null;
        let _loc4_: string = null;
        let _loc5_: string = null;
        let _loc6_: string = null;
        if (param2 == ParticleText.TYPE_DAMAGE || param2 == ParticleText.TYPE_HEAL) {
            switch (param2) {
                case ParticleText.TYPE_DAMAGE:
                    _loc4_ = "FF0000";
                    _loc3_ = "<b>" + param1 + "</b>";
                    break;
                case ParticleText.TYPE_HEAL:
                    _loc4_ = "00ff00";
                    _loc3_ = "<b>+" + param1 * -1 + "</b>";
            }
        } else {
            _loc4_ = this.getLootColor(param2);
            _loc5_ = GLOBAL.mode;
            _loc6_ = "";
            _loc6_ = _loc5_ == "attack" || _loc5_ == "wmattack" ? "+" : "-";
            _loc3_ = "<b>" + _loc6_ + param1 + "</b>";
        }
        this._mc.tLootA.htmlText = "<font color=\"#" + _loc4_ + "\">" + _loc3_ + "</font>";
        this._mc.tLootB.htmlText = as3.str(_loc3_);
    }

    public getLootColor(param1: uint): string {
        switch (param1) {
            case BRESOURCE.RESOURCE_TWIGS:
                return "723228";
            case BRESOURCE.RESOURCE_PEBBLES:
                return "999999";
            case BRESOURCE.RESOURCE_PUTTY:
                return "FF00FF";
            case BRESOURCE.RESOURCE_GOO:
                return "00FF00";
            case BRESOURCE.RESOURCE_COAL:
                return "3F3B36";
            case BRESOURCE.RESOURCE_BONE:
                return "F0E6C5";
            case BRESOURCE.RESOURCE_SULFUR:
                return "EEED71";
            case BRESOURCE.RESOURCE_MAGMA:
                return "D95300";
            default:
                return "FFFF00";
        }
    }

    public Move(param1: Point): void {
        this._mc.x = param1.x;
        this._mc.y = param1.y;
        this._mc.cacheAsBitmap = true;
        TweenLite.to(this._mc, 0.5, { "y": param1.y - 25, "ease": Cubic.easeInOut, "onComplete": as3.bind(this, this.Remove) });
    }

    public Remove(): void {
        this._mc.x = this._mc.y = -10000;
        try {
            MAP._PROJECTILES.removeChild(this._mc);
        } catch (e) {
        }
        ParticleText.Remove(this);
    }
}

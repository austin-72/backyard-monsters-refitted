import * as as3 from "as3";
import { int } from "as3";
import { BlendMode, DisplayObject, IBitmapDrawable, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BYMConfig, GLOBAL, IoWarts, MAP, MUSHROOMS, RasterData, TUTORIAL, doodad_mushroom_mc, doodad_mushroom_shadow } from "@game";

export class BMUSHROOM extends BFOUNDATION {
    static {
        as3.fields(this, { _mushroom: null, _mushroomFrame: 0 });
    }

    public _mushroom: DisplayObject;
    public _mushroomFrame: int;

    public $ctor(): void {
        super.$ctor();
    }

    public override SetProps(): void {
        super.SetProps();
    }

    public override PlaceB(): void {
        let _loc1_: doodad_mushroom_mc = null;
        let _loc2_: doodad_mushroom_shadow = null;
        super.PlaceB();
        if (this.ioPlaceOwn()) {
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioPlaceWart();
            return;
        }
        _loc1_ = new doodad_mushroom_mc();
        if (!BYMConfig.instance.RENDERER_ON) {
            this._mc.addChild(_loc1_);
        } else {
            as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_TOP, as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP) || new RasterData(as3.cast(_loc1_, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_TOP), int.MAX_VALUE));
        }
        _loc1_.mc.gotoAndStop(this._mushroomFrame);
        _loc1_.mouseEnabled = false;
        _loc1_.mouseChildren = false;
        _loc2_ = new doodad_mushroom_shadow();
        if (!BYMConfig.instance.RENDERER_ON) {
            this._mcBase.addChild(_loc2_);
        } else {
            as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW, as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW) || new RasterData(as3.cast(_loc2_, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW), MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true));
        }
        _loc2_.gotoAndStop(this._mushroomFrame);
        _loc2_.mouseEnabled = false;
        _loc2_.mouseChildren = false;
        _loc2_.blendMode = BlendMode.MULTIPLY;
        this._origin = new Point(this.x, this.y);
        this.updateRasterData();
    }

    /** A kind of its own draws itself here and says so (Hell Freezes Over's ice: IoHfoIce). */
    protected ioPlaceOwn(): boolean {
        return false;
    }

    /* Inferno-only: the wart art (IoWarts) in place of the SWF's mushroom and its shadow, placed the same way. */
    private ioPlaceWart(): void {
        let wart: MovieClip = IoWarts.sprite(this._mushroomFrame);
        let shadow: MovieClip = IoWarts.shadow(this._mushroomFrame);
        wart.mouseEnabled = false;
        wart.mouseChildren = false;
        shadow.mouseEnabled = false;
        shadow.mouseChildren = false;
        shadow.blendMode = BlendMode.MULTIPLY;
        if (!BYMConfig.instance.RENDERER_ON) {
            this._mc.addChild(wart);
            this._mcBase.addChild(shadow);
        } else {
            as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_TOP, as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_TOP) || new RasterData(as3.cast(wart, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_TOP), int.MAX_VALUE));
            as3.vset(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW, as3.vget(this._rasterData, BFOUNDATION._RASTERDATA_SHADOW) || new RasterData(as3.cast(shadow, IBitmapDrawable), as3.vget(this._rasterPt, BFOUNDATION._RASTERDATA_SHADOW), MAP.DEPTH_SHADOW, BlendMode.MULTIPLY, true));
        }
        this._origin = new Point(this.x, this.y);
        this.updateRasterData();
    }

    public override Setup(param1: any): void {
        this._mushroomFrame = param1.frame | 0;
        super.Setup(param1);
        this.setHealth(this.maxHealth);
    }

    public override Export(): any {
        let _loc1_: any = super.Export();
        _loc1_.frame = this._mushroomFrame;
        return _loc1_;
    }

    public override Description(): void {
    }

    public override HasWorker(): void {
        if (this._shake > 60 && BASE._pendingPurchase.length == 0) {
            this._mc.x = this._origin.x;
            this._mc.y = this._origin.y;
            this._mcBase.x = this._origin.x;
            this._mcBase.y = this._origin.y;
            MUSHROOMS.Pick(this);
            return;
        }
        if (this._shake % 2 == 0) {
            this._mc.x = this._origin.x - 2 + Math.random() * 4;
            this._mc.y = this._origin.y - 2 + Math.random() * 4;
            this._mcBase.x = this._origin.x - 1 + Math.random() * 2;
            this._mcBase.y = this._origin.y - 1 + Math.random() * 2;
        }
        ++this._shake;
        this.updateRasterData();
    }

    public override Click(param1: MouseEvent = null): void {
        if (TUTORIAL._stage >= 200 && !this._picking) {
            super.Click(param1);
        }
    }

    public override Render(param1: string = ""): void {
        if (GLOBAL._catchup || param1 === this._renderState && this._lvl.Get() == this._renderLevel) {
            return;
        }
        this.updateRasterData();
        this._renderState = BFOUNDATION.k_STATE_DEFAULT;
        this._renderLevel = this._lvl.Get() | 0;
    }

    public SoundGood(): void {
    }

    public SoundBad(): void {
    }
}

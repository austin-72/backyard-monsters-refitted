import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BSTORAGE, GLOBAL, KEYS, POPUPS, popup_building } from "@game";

export class BUILDING6 extends BSTORAGE {
    static {
        as3.fields(this, { _field: null, _fieldBMP: null, _frameNumber: 0, _animTickTarget: 0, _animBitmap: null });
    }

    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animTickTarget: int;
    public _animBitmap: BitmapData;

    public $ctor(): void {
        super.$ctor();
        this._frameNumber = 0;
        this._type = 6;
        this._footprint = [new Rectangle(0, 0, 80, 80)];
        this._gridCost = [[new Rectangle(0, 0, 80, 80), 10], [new Rectangle(10, 10, 60, 60), 200]];
        this._spoutPoint = new Point(0, -48);
        this._spoutHeight = 82;
        this.SetProps();
    }

    public override Update(param1: boolean = false): void {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (GLOBAL._render || param1) {
            _loc4_ = 1;
            while (_loc4_ < 5) {
                _loc2_ = (_loc2_ + BASE._resources["r" + _loc4_ + "max"]) | 0;
                _loc3_ = (_loc3_ + BASE._resources["r" + _loc4_].Get()) | 0;
                _loc4_++;
            }
            this._animTickTarget = (26 / _loc2_ * _loc3_) | 0;
        }
        super.Update(param1);
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (this._animLoaded && this._countdownBuild.Get() == 0 && this._frameNumber % 3 == 0) {
            if (this._animTick != this._animTickTarget) {
                this._animTick = this._animTickTarget;
                this.AnimFrame();
            }
        }
        ++this._frameNumber;
    }

    public override AnimFrame(param1: boolean = true): void {
        if (this._animContainerBMD) {
            this._animContainerBMD.copyPixels(this._animBMD, new Rectangle(74 * this._animTick, 0, 74, 121), new Point(0, 0));
        }
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-st-" + this._lvl.Get(), KEYS.Get("pop_siloupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_siloupgraded_streambody"), "upgrade-storage.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_siloupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_siloupgraded_body", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Constructed(): void {
        super.Constructed();
    }

    public override Click(param1: MouseEvent = null): void {
        super.Click(param1);
    }

    public override Description(): void {
        super.Description();
        this._specialDescription = KEYS.Get("building_silo_upgrade_desc1", { "v1": GLOBAL.FormatNumber(Number(this._buildingProps.capacity[this._lvl.Get() - 1])) });
        this._buildingDescription = this._specialDescription;
        if (this._upgradeCosts != "") {
            this._upgradeDescription = KEYS.Get("building_silo_upgrade_desc2", { "v1": GLOBAL.FormatNumber(this._buildingProps.capacity[this._lvl.Get()] - this._buildingProps.capacity[this._lvl.Get() - 1]) });
        }
    }
}

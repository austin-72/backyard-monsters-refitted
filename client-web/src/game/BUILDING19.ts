import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, GLOBAL, KEYS, MONSTERBAITER, POPUPS, SOUNDS, SecNum, popup_building } from "@game";

export class BUILDING19 extends BFOUNDATION {
    static {
        as3.fields(this, { _animMC: null, _animFrame: 0, _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null, _blend: 0, _blending: false, _bank: null });
    }

    public _animMC: MovieClip;
    public _animFrame: int;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;
    public _blend: int;
    public _blending: boolean;
    public _bank: SecNum;

    public $ctor(): void {
        super.$ctor();
        this._type = 19;
        this._frameNumber = 0;
        this._footprint = [new Rectangle(0, 0, 80, 80)];
        this._gridCost = [[new Rectangle(0, 0, 80, 80), 50]];
        this._spoutPoint = new Point(0, 0);
        this._spoutHeight = 40;
        this.SetProps();
    }

    public override TickFast(param1: Event = null): void {
        if (!GLOBAL._catchup) {
            if (this._animTick == 0 && MONSTERBAITER._attacking == 1 && this.health > 0) {
                SOUNDS.Play("wmbstart");
                this._animTick = 1;
            }
            if (this._animTick > 0 && this._frameNumber % 2 == 0) {
                if (this._animTick > 40) {
                    if (MONSTERBAITER._attacking == 1 && this.health > 0) {
                        this._animTick = 1;
                    } else {
                        this._animTick = 0;
                    }
                }
                this.AnimFrame(false);
                if (this._animTick > 0) {
                    ++this._animTick;
                }
            }
            ++this._frameNumber;
        } else {
            this._animTick = 0;
        }
    }

    public override Description(): void {
        super.Description();
        this._upgradeDescription = KEYS.Get("building_baiter_upgrade_desc");
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bBaiter = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-wmb", KEYS.Get("pop_baiterbuilt_streamtitle"), KEYS.Get("pop_baiterbuilt_streambody"), "build-monsterbaiter.png"]);
                POPUPS.Next();
            };
            MONSTERBAITER.Update();
            MONSTERBAITER.Fill();
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_baiterbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_baiterbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let percent: int = 0;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-wmb-" + this._lvl.Get(), KEYS.Get("pop_baitupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_baitupgraded_streambody"), "upgrade-monsterbaiter.png"]);
                POPUPS.Next();
            };
            MONSTERBAITER.Update();
            percent = 60;
            if (this._lvl.Get() == 2) {
                percent = 80;
            }
            if (this._lvl.Get() == 3) {
                percent = 100;
            }
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_baitupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_baitupgraded_body", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override RecycleC(): void {
        GLOBAL._bBaiter = null;
        super.RecycleC();
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this._countdownBuild.Get() == 0) {
            GLOBAL._bBaiter = this;
        }
    }

    public override Export(): any {
        return super.Export();
    }
}

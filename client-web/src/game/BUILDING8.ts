import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, CREATURELOCKER, CREEPS, GLOBAL, KEYS, POPUPS, popup_building } from "@game";

export class BUILDING8 extends BFOUNDATION {
    static {
        as3.fields(this, { _animMC: null, _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null });
    }

    public _animMC: MovieClip;
    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;

    public $ctor(): void {
        this._frameNumber = (Math.random() * 5) | 0;
        super.$ctor();
        this._type = 8;
        this._footprint = [new Rectangle(0, 0, 100, 100)];
        this._gridCost = [[new Rectangle(0, 0, 100, 100), 10], [new Rectangle(10, 10, 80, 80), 200]];
        this.SetProps();
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (GLOBAL._render && this._countdownBuild.Get() + this._countdownUpgrade.Get() == 0 && CREATURELOCKER._unlocking != null) {
            if ((GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == "help" || GLOBAL.mode == "view") && this._frameNumber % 3 == 0 && CREEPS._creepCount == 0) {
                this.AnimFrame();
            } else if (this._frameNumber % 10 == 0) {
                this.AnimFrame();
            }
        }
        ++this._frameNumber;
    }

    public override Description(): void {
        super.Description();
        if (GLOBAL._lockerOverdrive > 0) {
            this._buildingTitle += " <font color=\"#CC0000\">" + KEYS.Get("cloc_overdrive", { "v1": GLOBAL.ToTime(GLOBAL._lockerOverdrive) }) + "</font>";
        }
        if (CREATURELOCKER._unlocking != null && Boolean(CREATURELOCKER._lockerData[CREATURELOCKER._unlocking])) {
            this._specialDescription = "Unlocking the " + CREATURELOCKER._creatures[CREATURELOCKER._unlocking].name + " " + GLOBAL.ToTime((CREATURELOCKER._lockerData[CREATURELOCKER._unlocking].e - GLOBAL.Timestamp()) | 0) + " remaining<br>";
        }
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bLocker = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-ml", KEYS.Get("pop_clocbuilt_streamtitle"), KEYS.Get("pop_clocbuilt_streambody"), "build-monsterlocker.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_clocbuilt_title") + "</b>";
            mc.tB.htmlText = " ";
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-ml-", KEYS.Get("cloc_upgrade_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("cloc_upgrade_streambody"), "upgrade-monsterlocker.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("cloc_popupgrade_ta") + "</b>";
            mc.tB.htmlText = KEYS.Get("cloc_popupgrade_tb", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Cancel(): void {
        GLOBAL._bLocker = null;
        super.Cancel();
    }

    public override Upgrade(): boolean {
        if (CREATURELOCKER._unlocking != null) {
            GLOBAL.Message(KEYS.Get("cloc_err_cantupgrade", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[CREATURELOCKER._unlocking].name)) }));
            return false;
        }
        return super.Upgrade();
    }

    public override Recycle(): void {
        if (CREATURELOCKER._unlocking != null) {
            GLOBAL.Message(KEYS.Get("cloc_err_cantrecycle", { "v1": CREATURELOCKER._creatures[CREATURELOCKER._unlocking].name }), KEYS.Get("msg_recyclebuilding_btn"), as3.bind(this, this.RecycleB));
        } else {
            super.Recycle();
        }
    }

    public override RecycleB(param1: MouseEvent = null): void {
        if (CREATURELOCKER._unlocking != null) {
            CREATURELOCKER.Cancel();
        }
        super.RecycleB(param1);
    }

    public override RecycleC(): void {
        GLOBAL._bLocker = null;
        super.RecycleC();
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this._countdownBuild.Get() == 0) {
            GLOBAL._bLocker = this;
        }
    }
}

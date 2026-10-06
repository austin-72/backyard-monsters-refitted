import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { ACADEMY, BASE, BFOUNDATION, CREATURELOCKER, CREEPS, GLOBAL, KEYS, POPUPS, popup_building } from "@game";

export class BUILDING26 extends BFOUNDATION {
    static {
        as3.fields(this, { _field: null, _fieldBMP: null, _frameNumber: 0, _animBitmap: null });
    }

    public _field: BitmapData;
    public _fieldBMP: Bitmap;
    public _frameNumber: int;
    public _animBitmap: BitmapData;

    public $ctor(): void {
        super.$ctor();
        this._type = 26;
        this._footprint = BASE.isInfernoMainYardOrOutpost ? [new Rectangle(0, 0, 80, 80)] : [new Rectangle(0, 0, 100, 100)];
        this._gridCost = [[new Rectangle(0, 0, 100, 100), 10], [new Rectangle(10, 10, 80, 80), 200]];
        this.SetProps();
    }

    public override Click(param1: MouseEvent = null): void {
        if (this._upgrading && GLOBAL.player.m_upgrades[this._upgrading] && GLOBAL.player.m_upgrades[this._upgrading].time == null) {
            this._upgrading = null;
        }
        ACADEMY._monsterID = this._upgrading;
        super.Click(param1);
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (this._upgrading && GLOBAL._render && this._countdownBuild.Get() + this._countdownUpgrade.Get() == 0) {
            if (GLOBAL._render && this._animLoaded && this._countdownBuild.Get() + this._countdownUpgrade.Get() == 0) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && (this._frameNumber % 3 == 0 || GLOBAL._lockerOverdrive > 0) && CREEPS._creepCount == 0) {
                    this.AnimFrame();
                } else if (this._frameNumber % 10 == 0 || GLOBAL._lockerOverdrive > 0 && this._frameNumber % 4 == 0) {
                    this.AnimFrame();
                }
            }
        }
        ++this._frameNumber;
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bAcademy = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (): void => {
                if (BASE.isInfernoMainYardOrOutpost) {
                    GLOBAL.CallJS("sendFeed", ["iacademy-construct", KEYS.Get("q_build_infernalacademy_streamtitle"), KEYS.Get("q_build_infernalacademy_streambody"), "build-iacademy.png"]);
                } else {
                    GLOBAL.CallJS("sendFeed", ["academy-construct", KEYS.Get("pop_acadbuilt_streamtitle"), KEYS.Get("pop_acadbuilt_streambody"), "build-academy.png"]);
                }
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_acadbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_acadbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override Description(): void {
        super.Description();
        if (this._upgrading != null && Boolean(GLOBAL.player.m_upgrades[this._upgrading].time)) {
            this._specialDescription = KEYS.Get("building_academy_training", { "v1": CREATURELOCKER._creatures[this._upgrading].name, "v2": GLOBAL.ToTime((GLOBAL.player.m_upgrades[this._upgrading].time.Get() - GLOBAL.Timestamp()) | 0) });
        }
    }

    public override Upgrade(): boolean {
        if (this._upgrading) {
            GLOBAL.Message(KEYS.Get("acad_err_cantupgrade"));
            return false;
        }
        return super.Upgrade();
    }

    public override Recycle(): void {
        if (this._upgrading) {
            GLOBAL.Message(KEYS.Get("acad_err_cantrecycle"));
        } else {
            GLOBAL._bAcademy = null;
            super.Recycle();
        }
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (param1.upg) {
            this._upgrading = as3.str(param1.upg);
        }
        if (this._upgrading == "C100") {
            this._upgrading = "C12";
        }
        if (this._countdownBuild.Get() <= 0) {
            GLOBAL._bAcademy = this;
        }
    }

    public override Export(): any {
        let _loc1_: any = super.Export();
        if (this._upgrading) {
            _loc1_.upg = this._upgrading;
        }
        return _loc1_;
    }
}

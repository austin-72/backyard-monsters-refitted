import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, GLOBAL, ImageCache, KEYS, POPUPS, popup_building } from "@game";

export class BUILDING51 extends BFOUNDATION {
    public $ctor(): void {
        super.$ctor();
        this._type = 51;
        this._footprint = [new Rectangle(0, 0, 90, 90)];
        this._gridCost = [[new Rectangle(0, 0, 90, 90), 10], [new Rectangle(10, 10, 70, 70), 200]];
        this.SetProps();
    }

    public override Tick(param1: int): void {
        if (this._countdownBuild.Get() > 0 || this.health < this.maxHealth * 0.5) {
            this._canFunction = false;
        } else {
            this._canFunction = true;
        }
        super.Tick(param1);
    }

    public Fund(): void {
    }

    public override Place(param1: MouseEvent = null): void {
        super.Place(param1);
    }

    public override Cancel(): void {
        GLOBAL._bCatapult = null;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL._playerCatapultLevel.Set(0);
        }
        super.Cancel();
    }

    public override RecycleC(): void {
        GLOBAL._bCatapult = null;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL._playerCatapultLevel.Set(0);
        }
        super.RecycleC();
    }

    public override Description(): void {
        super.Description();
        this._upgradeDescription = KEYS.Get("bdg_catapult_upgrade");
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bCatapult = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-cat", KEYS.Get("pop_catapultbuilt_streamtitle"), KEYS.Get("pop_catapultbuilt_streambody"), "build-catapult.png"]);
                POPUPS.Next();
            };
            this.LoadEffects();
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_catapultbuilt_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_catapultbuilt_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL._playerCatapultLevel.Set(this._lvl.Get());
            }
        }
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-cat-" + this._lvl.Get(), KEYS.Get("pop_catapultupgraded" + this._lvl.Get() + "_streamtitle"), KEYS.Get("pop_catapultupgraded" + this._lvl.Get() + "_streambody"), "upgrade-catapult.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_catapultupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_catapultupgraded_body", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
            GLOBAL._playerCatapultLevel.Set(this._lvl.Get());
        }
    }

    public LoadEffects(): void {
        ImageCache.GetImageWithCallBack("effects/pebble.png", null, true, 6);
        ImageCache.GetImageWithCallBack("effects/pebblehit.png", null, true, 6);
        ImageCache.GetImageWithCallBack("effects/twigs.png", null, true, 6);
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this._countdownBuild.Get() <= 0) {
            this.LoadEffects();
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL._playerCatapultLevel.Set(this._lvl.Get());
            }
            GLOBAL._bCatapult = this;
        }
    }
}

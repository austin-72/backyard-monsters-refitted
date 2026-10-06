import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, GLOBAL, KEYS, POPUPS, popup_building } from "@game";

export class BUILDING5 extends BFOUNDATION {
    public $ctor(): void {
        super.$ctor();
        this._type = 5;
        this._footprint = [new Rectangle(0, 0, 90, 90)];
        this._gridCost = [[new Rectangle(0, 0, 90, 90), 10], [new Rectangle(10, 10, 70, 70), 200]];
        this.SetProps();
    }

    public static getFlingerRange(param1: int, param2: boolean): int {
        return (param2 ? 2 + 2 * param1 : param1) | 0;
    }

    public override get tickLimit(): int {
        let _loc1_: int = super.tickLimit;
        if (this._countdownBuild.Get() > 0) {
            _loc1_ = Math.min(_loc1_, this._countdownBuild.Get()) | 0;
        }
        if (this._countdownUpgrade.Get() > 0) {
            _loc1_ = Math.max(_loc1_, this._countdownUpgrade.Get()) | 0;
        }
        return _loc1_;
    }

    public override Tick(param1: int): void {
        this._canFunction = this._countdownBuild.Get() <= 0 && this.health >= this.maxHealth * 0.5;
        super.Tick(param1);
    }

    public Fund(): void {
    }

    public override PlaceB(): void {
        GLOBAL._bFlinger = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL._playerFlingerLevel.Set(this.getEffectiveLevel());
        }
        super.PlaceB();
    }

    public override Cancel(): void {
        GLOBAL._bFlinger = null;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL._playerFlingerLevel.Set(0);
        }
        super.Cancel();
    }

    public override RecycleC(): void {
        GLOBAL._bFlinger = null;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL._playerFlingerLevel.Set(0);
        }
        super.RecycleC();
    }

    public override Description(): void {
        super.Description();
        this._upgradeDescription = KEYS.Get("building_flinger_upgrade_desc");
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Constructed(): void {
        super.Constructed();
        GLOBAL._bFlinger = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL._playerFlingerLevel.Set(this.getEffectiveLevel());
        }
    }

    public override Upgraded(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Upgraded();
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["upgrade-fl-" + this._lvl.Get(), KEYS.Get("pop_flingerupgraded_streamtitle", { "v1": this._lvl.Get() }), KEYS.Get("pop_flingerupgraded_streambody"), "upgrade-flinger.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_flingerupgraded_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_flingerupgraded_body", { "v1": this._lvl.Get() });
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
            GLOBAL._playerFlingerLevel.Set(this.getEffectiveLevel());
        }
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this._countdownBuild.Get() <= 0) {
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
                GLOBAL._playerFlingerLevel.Set(this.getEffectiveLevel());
            }
            GLOBAL._bFlinger = this;
        }
    }
}

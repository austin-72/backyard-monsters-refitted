import * as as3 from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, GLOBAL, KEYS, POPUPS, popup_building } from "@game";

export class BUILDING10 extends BFOUNDATION {
    public $ctor(): void {
        super.$ctor();
        this._type = 10;
        this._footprint = [new Rectangle(0, 0, 100, 100)];
        this._gridCost = [[new Rectangle(0, 0, 100, 100), 10], [new Rectangle(10, 10, 80, 80), 200]];
        this._spoutPoint = new Point(0, -28);
        this._spoutHeight = 80;
        this.SetProps();
    }

    private onAssetLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = null;
        if (param1 == this.imageData.shadowURL) {
            _loc3_ = as3.as(this._mcBase.addChild(new Bitmap(param2)), Bitmap);
            _loc3_.x = Number(this.imageData.shadowX);
            _loc3_.y = Number(this.imageData.shadowY);
            _loc3_.blendMode = "multiply";
        } else if (param1 == this.imageData.topURL) {
            as3.cast(this.animContainer, MovieClip).addChild(new Bitmap(param2));
        }
    }

    public override PlaceB(): void {
        super.PlaceB();
    }

    public override Description(): void {
        super.Description();
    }

    public override Constructed(): void {
        let Brag: Function = null;
        let mc: MovieClip = null;
        super.Constructed();
        GLOBAL._bYardPlanner = this;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard) {
            Brag = (param1: MouseEvent): void => {
                GLOBAL.CallJS("sendFeed", ["build-yardplanner", KEYS.Get("pop_planner_streamtitle"), KEYS.Get("pop_planner_body"), "build-yardplanner.png"]);
                POPUPS.Next();
            };
            mc = new popup_building();
            mc.tA.htmlText = "<b>" + KEYS.Get("pop_planner_title") + "</b>";
            mc.tB.htmlText = KEYS.Get("pop_planner_body");
            mc.bPost.SetupKey("btn_brag");
            mc.bPost.addEventListener(MouseEvent.CLICK, Brag);
            mc.bPost.Highlight = true;
            POPUPS.Push(mc, null, null, null, "build.v2.png");
        }
    }

    public override RecycleC(): void {
        GLOBAL._bYardPlanner = null;
        super.RecycleC();
    }

    public override Upgraded(): void {
        super.Upgraded();
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this._countdownBuild.Get() == 0) {
            GLOBAL._bYardPlanner = this;
        }
    }
}

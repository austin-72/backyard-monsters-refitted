import * as as3 from "as3";
import { int } from "as3";
import { TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { DescentBasePopup_CLIP, Elastic, KEYS, TweenLite } from "@game";

export class DescentBasePopup extends DescentBasePopup_CLIP {
    static {
        as3.fields(this, { maxDepth: 13, _t: null, currLvl: 0, depthTxt: null, depthTxt2: null, depthFlip: false });
    }

    public maxDepth: int;
    // Set this to 13, we are no longer using the ""new"" 7base
    // public var maxDepth:int = 7;
    public _t: Timer;
    public currLvl: int;
    public depthTxt: string;
    public depthTxt2: string;
    public depthFlip: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    public initWithTitleAndButtons(param1: string, param2: any[], param3: any[]): void {
    }

    public setHeightForButtons(param1: int): void {
    }

    public setDepth(param1: int): void {
        this.currLvl = param1;
        /* We have to re-arrange the order of levels so the depth bar actually does something. */
        switch (this.currLvl) {
            case 9:
            case 10:
                this.depthTxt = KEYS.Get("descent_depthBar");
                this.depthTxt2 = KEYS.Get("descent_depthBarWarn1");
                break;
            case 11:
            case 12:
                this.depthTxt = KEYS.Get("descent_depthBar");
                this.depthTxt2 = KEYS.Get("descent_depthBarWarn2");
                break;
            case 13:
                this.depthTxt = KEYS.Get("descent_depthBar");
                this.depthTxt2 = KEYS.Get("descent_depthBarWarn3");
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            default:
                this.depthTxt = KEYS.Get("descent_depthBar");
                this.depthTxt2 = "";
        }
        let _loc2_: number = 100 / this.maxDepth * param1;
        this.depthBar.mcBar.width = Math.max(_loc2_, 1);
        this.DepthCheck();
    }

    // ----------- OLD IMPLEMENTATION ----------- //
    // Comment: March 2012 pre-patch 7 Descent base co-ordinates
    // public function setDepth(param1:int) : void
    // {
    // this.currLvl = param1;
    // switch(this.currLvl)
    // {
    // case 5:
    // this.depthTxt = KEYS.Get("descent_depthBar");
    // this.depthTxt2 = KEYS.Get("descent_depthBarWarn1");
    // break;
    // case 6:
    // this.depthTxt = KEYS.Get("descent_depthBar");
    // this.depthTxt2 = KEYS.Get("descent_depthBarWarn2");
    // break;
    // case 7:
    // this.depthTxt = KEYS.Get("descent_depthBar");
    // this.depthTxt2 = KEYS.Get("descent_depthBarWarn3");
    // break;
    // case 1:
    // case 2:
    // case 3:
    // case 4:
    // default:
    // this.depthTxt = KEYS.Get("descent_depthBar");
    // this.depthTxt2 = "";
    // }
    // var _loc2_:Number = 100 / this.maxDepth * param1;
    // depthBar.mcBar.width = Math.max(_loc2_,1);
    // this.DepthCheck();
    // }
    public Show(param1: int = 0, param2: int = 0, param3: int = 0): void {
        this.setDepth(param1);
        if (param2 != 0 || param3 != 0) {
            this.x = param2;
            this.y = param3;
        }
        let _loc4_: int = this.x | 0;
        this.x -= 15;
        TweenLite.to(this, 0.6, { "x": _loc4_, "ease": Elastic.easeOut });
        this._t = new Timer(1000);
        this._t.start();
        this._t.addEventListener(TimerEvent.TIMER, as3.bind(this, this.DepthCheck));
    }

    public Hide(): void {
        this._t.stop();
        this._t.removeEventListener(TimerEvent.TIMER, as3.bind(this, this.DepthCheck));
        this._t = null;
    }

    public DepthCheck(param1: TimerEvent = null): void {
        this.depthFlip = !this.depthFlip;
        this.tDepth.htmlText = this.depthTxt;
        this.tDepth2.htmlText = this.depthTxt2;
        if (this.depthFlip) {
            this.tDepth.visible = true;
            this.tDepth2.visible = false;
            if (this.currLvl <= 8) {
                this.tDepth.visible = true;
                this.tDepth2.visible = true;
            }
        } else {
            this.tDepth.visible = false;
            this.tDepth2.visible = true;
            if (this.currLvl <= 8) {
                this.tDepth.visible = true;
                this.tDepth2.visible = true;
            }
        }
    }
}

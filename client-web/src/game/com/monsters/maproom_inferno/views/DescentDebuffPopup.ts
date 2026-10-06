import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent, TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { GLOBAL, KEYS, UI2, bubblepopupUpBuff_CLIP, descentDebuff_info_CLIP } from "@game";

export class DescentDebuffPopup extends descentDebuff_info_CLIP {
    static {
        as3.fields(this, { maxDepth: 7, _t: null, currLvl: 0, depthTxt: null, depthTxt2: null, depthFlip: false, debuffTip: null, depthDesc: null, depthDesc2: null });
    }

    public maxDepth: int;
    public _t: Timer;
    public currLvl: int;
    public depthTxt: string;
    public depthTxt2: string;
    public depthFlip: boolean;
    public debuffTip: MovieClip;
    public depthDesc: string;
    public depthDesc2: string;

    public $ctor(): void {
        super.$ctor();
    }

    public initWithTitleAndButtons(param1: string, param2: any[], param3: any[]): void {
    }

    public setHeightForButtons(param1: int): void {
    }

    public setDepth(param1: int): void {
        this.currLvl = param1;
        switch (this.currLvl) {
            case 7:
                this.depthTxt = KEYS.Get("descent_depthBar");
                this.depthTxt2 = KEYS.Get("descent_depthBarWarn1");
                this.depthDesc = KEYS.Get("inf_descent_toxicity_desc");
                this.depthDesc2 = KEYS.Get("inf_descent_toxicity_desc_low");
                break;
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 8:
            default:
                this.depthTxt = KEYS.Get("descent_depthBar");
                this.depthTxt2 = "";
                this.depthDesc = "";
                this.depthDesc2 = "";
        }
        let _loc2_: number = 100 / this.maxDepth * param1;
        this.depthBar.mcBar.width = Math.max(_loc2_, 1);
        this.DepthCheck();
    }

    public Show(param1: int = 0): void {
        this.setDepth(param1);
        this.Resize();
        this._t = new Timer(1000);
        this._t.start();
        this._t.addEventListener(TimerEvent.TIMER, as3.bind(this, this.DepthCheck));
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.DescentDebuffInfoShow));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.DescentDebuffInfoHide));
        UI2._top.addChild(this);
    }

    public Hide(): void {
        this._t.stop();
        this._t.removeEventListener(TimerEvent.TIMER, as3.bind(this, this.DepthCheck));
        this._t = null;
        if (this.debuffTip) {
            this.DescentDebuffInfoHide(null);
        }
        if (this.parent) {
            this.parent.removeChild(this);
            UI2._top._descentDebuff = null;
        }
    }

    public DescentDebuffInfoShow(param1: MouseEvent = null): void {
        this.debuffTip = new bubblepopupUpBuff_CLIP();
        this.debuffTip.x = -10;
        this.debuffTip.y = this.debuffTip.height + 5;
        this.debuffTip.mcArrow.x = this.debuffTip.width / 2 - 20;
        this.debuffTip.mcText.htmlText = KEYS.Get("inf_descent_toxicity_help");
        this.debuffTip.mcTextDuration.htmlText = "";
        this.addChild(this.debuffTip);
    }

    public DescentDebuffInfoHide(param1: MouseEvent = null): void {
        if (Boolean(this.debuffTip) && Boolean(this.debuffTip.parent)) {
            this.debuffTip.parent.removeChild(this.debuffTip);
            this.debuffTip = null;
        }
    }

    public DepthCheck(param1: TimerEvent = null): void {
        this.depthFlip = !this.depthFlip;
        this.tDepth.htmlText = this.depthTxt;
        this.tDepth2.htmlText = this.depthTxt2;
        this.tDesc.htmlText = "<b>" + this.depthDesc + "<br>" + this.depthDesc2 + "</b>";
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

    public Resize(): void {
        this.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - 160;
        let _loc1_: int = 0;
        if (UI2._top && UI2._top.mcSound && UI2._top.mcSound.visible) {
            _loc1_ = (UI2._top.mcSound.y + UI2._top.mcSound.height) | 0;
        }
        this.y = GLOBAL._SCREEN.y + _loc1_ + 20;
    }
}

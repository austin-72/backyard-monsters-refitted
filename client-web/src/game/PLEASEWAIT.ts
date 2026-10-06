import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { BASE, GLOBAL, KEYS, PLEASEWAITMC, POPUPS, POPUPSETTINGS, PROTIP_CLIP } from "@game";

export class PLEASEWAIT extends MovieClip {
    public static _mc: PLEASEWAITMC = null;

    public static _mcCount: int = 0;

    public static _mcTips: MovieClip = null;

    public static lastTipTime: number = 0;

    public static processDuration: int = 0;

    public static processThreshold: int = (60 * 60 * 12) | 0;

    public static tipsAvailable: int = 33;

    public static tipIndex: int = 0;

    public static tipDelay: int = 6;

    public static tips: any[] = [];

    public static tipsInited: boolean = false;

    public static tipsLocalKey: string = "tips_hint";

    public $ctor(): void {
        super.$ctor();
    }

    public static Show(param1: string): void {
        if (!PLEASEWAIT._mc) {
            PLEASEWAIT._mc = as3.as(GLOBAL._layerTop.addChild(new PLEASEWAITMC()), PLEASEWAITMC);
            PLEASEWAIT._mc.tMessage.htmlText = "<b>" + param1 + "</b>";
            PLEASEWAIT._mc.mcFrame.Setup(false);
            POPUPSETTINGS.AlignToCenter(PLEASEWAIT._mc);
        }
    }

    public static Update(param1: string = "Processing..."): void {
        if (PLEASEWAIT._mc) {
            PLEASEWAIT._mc.tMessage.htmlText = "<b>" + param1 + "</b>";
            PLEASEWAIT.AddTips();
        }
    }

    public static Hide(): void {
        try {
            if (PLEASEWAIT._mc) {
                GLOBAL._layerTop.removeChild(PLEASEWAIT._mc);
                PLEASEWAIT._mc.mcFrame = null;
                PLEASEWAIT._mc = null;
            }
        } catch (e) {
        }
    }

    public static MessageChange(...rest: any[]): void {
        PLEASEWAIT._mc.tMessage.text = as3.str(rest[0]);
    }

    public static AddTips(): void {
        if (GLOBAL._giveTips && KEYS._setup && PLEASEWAIT.HasTips()) {
            if (BASE._catchupTime && BASE._catchupTime >= PLEASEWAIT.processThreshold && PLEASEWAIT.lastTipTime == 0 && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && GLOBAL._whatsnewid == GLOBAL._lastWhatsNew) {
                if (GLOBAL.StatGet("tipno")) {
                    PLEASEWAIT.tipIndex = GLOBAL.StatGet("tipno");
                }
                if (PLEASEWAIT.tipIndex < PLEASEWAIT.tips.length) {
                    PLEASEWAIT.ShowTips(as3.str(PLEASEWAIT.tips[PLEASEWAIT.tipIndex]));
                }
                GLOBAL.StatSet("tipno", (PLEASEWAIT.tipIndex + 1) | 0);
            }
        }
    }

    public static HasTips(): boolean {
        let _loc2_: int = 0;
        let _loc3_: string = null;
        let _loc4_: string = null;
        let _loc1_: boolean = true;
        if (PLEASEWAIT.tipsInited) {
            return true;
        }
        PLEASEWAIT.tips = [];
        _loc2_ = 1;
        while (_loc2_ <= PLEASEWAIT.tipsAvailable) {
            _loc3_ = "" + PLEASEWAIT.tipsLocalKey + _loc2_;
            if ((_loc4_ = KEYS.Get(_loc3_)) == "") {
                _loc1_ = false;
            }
            PLEASEWAIT.tips.push(_loc4_);
            _loc2_++;
        }
        if (_loc1_) {
            PLEASEWAIT.tipsInited = true;
        }
        return _loc1_;
    }

    public static ShowTips(param1: string): void {
        GLOBAL._proTip = new PROTIP_CLIP();
        GLOBAL._proTip.tTitle.htmlText = KEYS.Get("tips_title");
        GLOBAL._proTip.tDesc.htmlText = "<b>" + param1 + "</b>";
        GLOBAL._proTip.x = 390;
        GLOBAL._proTip.y = 240;
        POPUPS.Push(GLOBAL._proTip, null, null, null, null, true, "tip");
        POPUPS.Show("tip");
        PLEASEWAIT.lastTipTime = 1;
    }

    public static HideTips(): void {
    }
}

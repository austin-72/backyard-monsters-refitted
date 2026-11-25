import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { clearTimeout, setTimeout } from "flash/utils";
import { GlowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
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

    /**
     * Inferno-only (14 October, QoL #433): while "Please wait" shows, a clear shield over the screen takes the
     * clicks. The box alone blocked nothing, so a second click on Take over, a wave start, a power-up or the Club's
     * Save sent the request again. The shield lifts by itself after 20 s, in case a box is never hidden.
     */
    private static _ioShield: Sprite = null;

    private static _ioShieldTimer: uint = 0;

    private static ioShield(on: boolean): void {
        if (PLEASEWAIT._ioShieldTimer) {
            clearTimeout(PLEASEWAIT._ioShieldTimer);
            PLEASEWAIT._ioShieldTimer = 0;
        }
        if (PLEASEWAIT._ioShield && PLEASEWAIT._ioShield.parent) {
            PLEASEWAIT._ioShield.parent.removeChild(PLEASEWAIT._ioShield);
        }
        PLEASEWAIT._ioShield = null;
        if (!on || !GLOBAL.INFERNO_ONLY || !GLOBAL._layerTop) {
            return;
        }
        let shield: Sprite = new Sprite();
        shield.name = "ioPleaseWaitShield";
        shield.graphics.beginFill(0, 0);
        shield.graphics.drawRect(-4000, -4000, 12000, 12000);
        shield.graphics.endFill();
        GLOBAL._layerTop.addChild(shield);
        PLEASEWAIT._ioShield = shield;
        PLEASEWAIT._ioShieldTimer = setTimeout((): void => {
            PLEASEWAIT.ioShield(false);
        }, 20000);
    }

    public static Show(param1: string): void {
        if (!PLEASEWAIT._mc) {
            PLEASEWAIT.ioShield(true);
            PLEASEWAIT._mc = as3.as(GLOBAL._layerTop.addChild(new PLEASEWAITMC()), PLEASEWAITMC);
            PLEASEWAIT._mc.tMessage.htmlText = "<b>" + param1 + "</b>";
            PLEASEWAIT._mc.mcFrame.Setup(false);
            POPUPSETTINGS.AlignToCenter(PLEASEWAIT._mc);
            // (Inferno-only, QoL #474: while a yard loads, a tip under the box; the stock "Pro Tip!" popups are gone)
            if (GLOBAL.INFERNO_ONLY && param1 == KEYS.Get("msg_loading")) {
                PLEASEWAIT.ioTip();
            }
        }
    }

    /** QoL #474: how many Inferno tips there are (io_tip1 ...). */
    public static readonly IO_TIPS: int = 12;

    private static _ioTipNext: int = -1;

    /** The next Inferno tip (they take turns, starting anywhere), under the loading box. */
    public static ioTip(): string {
        if (!PLEASEWAIT._mc) {
            return "";
        }
        if (PLEASEWAIT._ioTipNext < 0) {
            PLEASEWAIT._ioTipNext = (Math.random() * PLEASEWAIT.IO_TIPS) | 0;
        }
        let text: string = KEYS.Get("io_tip" + (PLEASEWAIT._ioTipNext + 1));
        PLEASEWAIT._ioTipNext = ((PLEASEWAIT._ioTipNext + 1) % PLEASEWAIT.IO_TIPS) | 0;
        if (!text || /^io_tip/.test(text)) {
            return "";
        }
        let t: TextField = new TextField();
        t.name = "ioTip";
        let f: TextFormat = new TextFormat("Verdana", 12, 0xFFE0B0, false);
        f.align = TextFormatAlign.CENTER;
        t.defaultTextFormat = f;
        t.embedFonts = true;
        t.wordWrap = true;
        t.multiline = true;
        t.selectable = false;
        t.width = 380;
        t.autoSize = TextFieldAutoSize.CENTER;
        t.htmlText = "<b>" + KEYS.Get("io_tip_head") + "</b> " + text;
        t.filters = [new GlowFilter(0, 1, 4, 4, 4, 2)];
        t.x = -190;
        t.y = PLEASEWAIT._mc.mcFrame.y + PLEASEWAIT._mc.mcFrame.height / 2 + 12;
        PLEASEWAIT._mc.addChild(t);
        return text;
    }

    public static Update(param1: string = "Processing..."): void {
        if (PLEASEWAIT._mc) {
            PLEASEWAIT._mc.tMessage.htmlText = "<b>" + param1 + "</b>";
            PLEASEWAIT.AddTips();
        }
    }

    public static Hide(): void {
        PLEASEWAIT.ioShield(false);
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
        // (Inferno-only, QoL #474: no "Pro Tip!" popups: they were the stock game's, Facebook and workers for sale)
        if (GLOBAL.INFERNO_ONLY) {
            return;
        }
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

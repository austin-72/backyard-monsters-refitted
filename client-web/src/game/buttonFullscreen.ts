import * as as3 from "as3";
import { MovieClip, StageDisplayState } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextFieldAutoSize } from "flash/text";
import { GLOBAL, KEYS, bubblepopup5 } from "@game";

export class buttonFullscreen extends MovieClip {
    static {
        as3.fields(this, { _bubble: null });
    }

    private _bubble: bubblepopup5;

    public $ctor(): void {
        super.$ctor();
        this.stop();
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Click));
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        this.buttonMode = true;
    }

    private Click(param1: MouseEvent): void {
        GLOBAL.goFullScreen();
        this.Over();
    }

    private Over(param1: MouseEvent = null): void {
        this.Out();
        this._bubble = new bubblepopup5();
        this._bubble.x = 12;
        this._bubble.y = 20;
        this._bubble.mcText.autoSize = TextFieldAutoSize.LEFT;
        this._bubble.mouseChildren = this._bubble.mouseEnabled = false;
        if (GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN || GLOBAL._ROOT.stage.displayState == StageDisplayState.FULL_SCREEN_INTERACTIVE) {
            this._bubble.mcText.htmlText = "<b>" + KEYS.Get("settings_fullscreenexit") + "</b>";
        } else {
            this._bubble.mcText.htmlText = "<b>" + KEYS.Get("settings_fullscreenenter") + "</b>";
        }
        this._bubble.mcText.x = 10 - this._bubble.mcText.width;
        this._bubble.mcBG.x = this._bubble.mcText.x - 5;
        this._bubble.mcBG.width = this._bubble.mcText.width + 10;
        this.addChild(this._bubble);
    }

    private Out(param1: MouseEvent = null): void {
        if (Boolean(this._bubble) && Boolean(this._bubble.parent)) {
            this._bubble.parent.removeChild(this._bubble);
        }
    }
}

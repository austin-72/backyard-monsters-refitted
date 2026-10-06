import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { TextFieldAutoSize } from "flash/text";
import { KEYS, bubblepopup5 } from "@game";

export class buttonSaving extends MovieClip {
    static {
        as3.fields(this, { _bubble: null });
    }

    private _bubble: bubblepopup5;

    public $ctor(): void {
        super.$ctor();
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Tick));
        this.buttonMode = true;
    }

    private Over(param1: MouseEvent): void {
        this.Out();
        this._bubble = new bubblepopup5();
        this._bubble.x = 12;
        this._bubble.y = 20;
        this._bubble.mcText.autoSize = TextFieldAutoSize.LEFT;
        this._bubble.mouseChildren = this._bubble.mouseEnabled = false;
        if (this.currentFrame == 2) {
            this._bubble.mcText.htmlText = "<b>" + KEYS.Get("settings_saving") + "</b>";
        } else {
            this._bubble.mcText.htmlText = "<b>" + KEYS.Get("settings_saved") + "</b>";
        }
        this._bubble.mcText.x = 10 - this._bubble.mcText.width;
        this._bubble.mcBG.x = this._bubble.mcText.x - 5;
        this._bubble.mcBG.width = this._bubble.mcText.width + 10;
        this.addChild(this._bubble);
    }

    private Tick(param1: Event): void {
        if (Boolean(this._bubble) && Boolean(this._bubble.parent)) {
            if (this.currentFrame == 2) {
                this._bubble.mcText.htmlText = "<b>" + KEYS.Get("settings_saving") + "</b>";
            } else {
                this._bubble.mcText.htmlText = "<b>" + KEYS.Get("settings_saved") + "</b>";
            }
        }
    }

    private Out(param1: MouseEvent = null): void {
        if (Boolean(this._bubble) && Boolean(this._bubble.parent)) {
            this._bubble.parent.removeChild(this._bubble);
        }
    }
}

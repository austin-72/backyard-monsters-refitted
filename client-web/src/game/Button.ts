import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { GLOBAL, KEYS } from "@game";

export class Button extends MovieClip {
    static {
        as3.fields(this, { _highlight: false, _enabled: true, _selected: false, _counter: 0, _txt: null, _format: null, _startY: 0, _tab: false, label: null, labelKey: null });
    }

    public _highlight: boolean;
    public _enabled: boolean;
    public _selected: boolean;
    public _counter: int;
    public _txt: TextField;
    public _format: TextFormat;
    public _startY: int;
    public _tab: boolean;
    public label: string;
    public labelKey: string;

    public $ctor(): void {
        super.$ctor();
        this._startY = this.y | 0;
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        this.mouseChildren = false;
        this.buttonMode = true;
        this._format = new TextFormat();
        this._format.font = "Verdana";
        this._format.size = 9;
        this._format.align = TextFormatAlign.CENTER;
        this._format.color = 3355443;
        this._txt = new TextField();
        this._txt.selectable = false;
        this._txt.defaultTextFormat = this._format;
        this._txt.text = "xxxx";
        this._txt.width = 64;
        this._txt.height = 20;
        this.addChild(this._txt);
        this._txt.y = (this.height / 2 - this._txt.height / 2 + 2) | 0;
        this._txt.x = 1;
        this.cacheAsBitmap = true;
    }

    public Setup(param1: string = "", param2: boolean = false, param3: int = 0, param4: int = 0): void {
        this._tab = param2;
        if (param3 > 0) {
            this.width = param3;
        }
        if (param4 > 0) {
            this.height = param4;
        }
        if (param1) {
            this._txt.htmlText = "<b><font color=\"#333333\">" + param1 + "</font></b>";
            this.label = param1;
            // Inferno-only: a label too long for the button is drawn smaller rather than cut at its edges
            GLOBAL.ioFitText(this._txt, 7, Number(this.scaleX > 0 ? this.scaleX : 1));
        }
        if (this._tab) {
            this._txt.y = 2;
        }
        this.Update();
    }

    public SetupKey(param1: string = "", param2: boolean = false, param3: int = 0, param4: int = 0): void {
        this.labelKey = param1;
        this.Setup(KEYS.Get(this.labelKey), param2, param3, param4);
    }

    public Update(): void {
        if (this._highlight) {
            this.gotoAndStop(4);
        } else if (this._enabled) {
            if (this._selected) {
                this.gotoAndStop(2);
            } else {
                this.gotoAndStop(1);
            }
        } else {
            this.gotoAndStop(3);
        }
    }

    public Over(param1: MouseEvent): void {
        if (this._highlight) {
            this.gotoAndStop(5);
        } else if (this._enabled) {
            this.gotoAndStop(2);
        }
    }

    public Out(param1: MouseEvent): void {
        if (this._highlight) {
            this.gotoAndStop(4);
        } else if (this._enabled) {
            if (this._selected) {
                this.gotoAndStop(2);
            } else {
                this.gotoAndStop(1);
            }
        }
    }

    public get Enabled(): boolean {
        return this._enabled;
    }

    public set Enabled(param1: boolean) {
        if (this._enabled != param1) {
            this._enabled = param1;
            if (param1) {
                this._txt.alpha = 1;
                this.buttonMode = true;
            } else {
                this._txt.alpha = 0.5;
                this.buttonMode = false;
            }
            this.Update();
        }
    }

    public get Highlight(): boolean {
        return this._highlight;
    }

    public set Highlight(param1: boolean) {
        if (this._highlight != param1) {
            this._highlight = param1;
            this.Update();
        }
    }

    public get Selected(): boolean {
        return this._selected;
    }

    public set Selected(param1: boolean) {
        if (this._selected != param1) {
            this._selected = param1;
            this.Update();
        }
    }

    public get Counter(): int {
        return this._counter;
    }

    public set Counter(param1: int) {
        if (this._counter != param1) {
            this._counter = param1;
            this.Update();
        }
    }
}

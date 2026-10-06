import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField } from "flash/text";

export class SmallButton extends MovieClip {
    static {
        as3.fields(this, { label_txt: null, _highlight: false });
    }

    public label_txt: TextField;
    private _highlight: boolean;

    public $ctor(): void {
        super.$ctor();
        this.stop();
        this.mouseChildren = false;
        this.buttonMode = true;
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
    }

    public set Highlight(param1: boolean) {
        this._highlight = param1;
        if (this._highlight) {
            this.gotoAndStop(3);
        } else {
            this.gotoAndStop(1);
        }
    }

    public get Highlight(): boolean {
        return this._highlight;
    }

    public Over(param1: MouseEvent): any {
        if (this._highlight) {
            this.gotoAndStop(4);
        } else {
            this.gotoAndStop(2);
        }
    }

    public Out(param1: MouseEvent): any {
        if (this._highlight) {
            this.gotoAndStop(3);
        } else {
            this.gotoAndStop(1);
        }
    }
}

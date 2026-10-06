import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";

export class buttonClose extends MovieClip {
    public $ctor(): void {
        super.$ctor();
        this.buttonMode = true;
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.Over));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.Out));
        this.gotoAndStop(1);
    }

    private Over(param1: MouseEvent): any {
        this.gotoAndStop(2);
    }

    private Out(param1: MouseEvent): any {
        this.gotoAndStop(1);
    }
}

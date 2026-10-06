import * as as3 from "as3";
import { Event } from "flash/events";
import { frame } from "@game";

export class ScalableFrame extends frame {
    public $ctor(): void {
        this.addEventListener(Event.RESIZE, as3.bind(this, this.onResize));
        super.$ctor(false);
    }

    protected onResize(param1: Event): void {
        this.resize();
    }
}

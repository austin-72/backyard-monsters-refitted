import * as as3 from "as3";
import { Elastic, TweenLite, UI2, bubblepopup4_CLIP } from "@game";

export class bubblepopup4 extends bubblepopup4_CLIP {
    public $ctor(): void {
        super.$ctor();
        this.mouseEnabled = false;
        this.mouseChildren = false;
    }

    public Wobble(): void {
        this.alpha = 1;
        TweenLite.to(this, 0.6, { "x": 125, "ease": Elastic.easeOut, "onComplete": as3.bind(this, this.Delay) });
    }

    public Delay(): void {
        TweenLite.to(this, 0.5, { "alpha": 0, "delay": 4, "onComplete": as3.bind(this, this.Remove) });
    }

    public Remove(): void {
        try {
            UI2._top.OverchargeHide();
        } catch (e) {
        }
    }
}

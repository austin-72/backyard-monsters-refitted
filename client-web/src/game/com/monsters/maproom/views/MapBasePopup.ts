import * as as3 from "as3";
import { int } from "as3";
import { Elastic, KEYS, MapBasePopup_CLIP, TweenLite } from "@game";

export class MapBasePopup extends MapBasePopup_CLIP {
    public $ctor(): void {
        super.$ctor();
    }

    public initWithTitleAndButtons(param1: string, param2: any[], param3: any[]): void {
        this.title_txt.htmlText = "<b>" + KEYS.Get("map_options") + "</b>";
    }

    public setHeightForButtons(param1: int): void {
        if (param1 == 2) {
            this.bg_mc.height = 98;
            this.bg_mc.y = 19;
        } else if (param1 == 3) {
            this.bg_mc.height = 131;
            this.bg_mc.y = 35;
        } else {
            this.bg_mc.height = 163;
            this.bg_mc.y = 51;
        }
    }

    public Show(): void {
        let _loc1_: int = this.x | 0;
        this.x -= 15;
        TweenLite.to(this, 0.6, { "x": _loc1_, "ease": Elastic.easeOut });
    }
}

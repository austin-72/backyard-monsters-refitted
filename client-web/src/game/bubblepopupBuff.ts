import * as as3 from "as3";
import { int } from "as3";
import { DropShadowFilter } from "flash/filters";
import { TextFieldAutoSize } from "flash/text";
import { Elastic, TweenLite, bubblepopupUpBuff_CLIP } from "@game";

export class bubblepopupBuff extends bubblepopupUpBuff_CLIP {
    static {
        as3.fields(this, { _dropShadow: null });
    }

    public _dropShadow: DropShadowFilter;

    public $ctor(): void {
        super.$ctor();
        this._dropShadow = new DropShadowFilter();
        this._dropShadow.distance = 1;
        this._dropShadow.angle = 45;
        this._dropShadow.color = 0;
        this._dropShadow.alpha = 1;
        this._dropShadow.blurX = 3;
        this._dropShadow.blurY = 3;
        this._dropShadow.strength = 1;
        this._dropShadow.quality = 2;
        this.filters = new Array(this._dropShadow);
        this.mcText.autoSize = TextFieldAutoSize.CENTER;
    }

    public Setup(param1: int, param2: int, param3: string = "", param4: string = "", param5: int = 0): void {
        this.mouseEnabled = false;
        this.mouseChildren = false;
        if (param3) {
            this.Update(param3, param4);
        }
    }

    public Update(param1: string, param2: string, param3: int = 1): void {
        this.mcText.htmlText = param1;
        this.mcTextDuration.htmlText = param2;
    }

    public Wobble(): void {
        this.rotation += 3;
        TweenLite.to(this, 0.6, { "rotation": this.rotation - 3, "ease": Elastic.easeOut });
    }

    public Nudge(param1: string): void {
        if (param1 == "up") {
            this.y -= 3;
            TweenLite.to(this, 0.6, { "y": this.y + 3, "ease": Elastic.easeOut });
        } else if (param1 == "left") {
            this.x += 3;
            TweenLite.to(this, 0.6, { "y": this.y - 3, "ease": Elastic.easeOut });
        } else {
            this.x -= 3;
            TweenLite.to(this, 0.6, { "y": this.x + 3, "ease": Elastic.easeOut });
        }
    }

    public Cleanup(): void {
        if (this._dropShadow) {
            this.filters = [];
            this._dropShadow = null;
        }
    }

    public Clear(): void {
    }
}

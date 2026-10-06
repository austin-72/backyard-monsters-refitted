import * as as3 from "as3";
import { int } from "as3";
import { DropShadowFilter } from "flash/filters";
import { TextFieldAutoSize } from "flash/text";
import { Elastic, TweenLite, bubblepopup3_CLIP } from "@game";

export class bubblepopup3 extends bubblepopup3_CLIP {
    static {
        as3.fields(this, { _dropShadow: null, _fixedrowcount: 0 });
    }

    private _dropShadow: DropShadowFilter;
    private _fixedrowcount: int;

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

    public Setup(param1: int, param2: int, param3: string, param4: int = 0): void {
        this._fixedrowcount = param4;
        this.mouseEnabled = false;
        this.mouseChildren = false;
        this.x = param1;
        this.y = param2;
        this.Update(param3);
    }

    public Update(param1: any): void {
        this.mcText.autoSize = TextFieldAutoSize.LEFT;
        this.mcText.htmlText = as3.str(param1);
        if (this._fixedrowcount > 0) {
            this.mcText.width = 80;
            while (this.mcText.height > 18 * this._fixedrowcount) {
                this.mcText.width += 2;
            }
            this.mcBG.width = this.mcText.width + 12;
        }
        this.mcBG.height = this.mcText.height + 10;
        this.mcBG.y = -((this.mcBG.height * 0.5) | 0);
        this.mcText.y = this.mcBG.y + 5;
    }

    public Wobble(): void {
        this.rotation += 3;
        TweenLite.to(this, 0.6, { "rotation": this.rotation - 3, "ease": Elastic.easeOut });
    }

    public Nudge(param1: string): void {
        if (param1 == "up") {
            this.y -= 3;
            TweenLite.to(this, 0.6, { "y": this.y + 3, "ease": Elastic.easeOut });
        } else {
            this.x -= 3;
            TweenLite.to(this, 0.6, { "y": this.x + 3, "ease": Elastic.easeOut });
        }
    }
}

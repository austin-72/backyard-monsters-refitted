import * as as3 from "as3";
import { int } from "as3";
import { DropShadowFilter } from "flash/filters";
import { Rectangle } from "flash/geom";
import { TextFieldAutoSize } from "flash/text";
import { Elastic, GLOBAL, TweenLite, bubblepopup_CLIP } from "@game";

export class bubblepopup extends bubblepopup_CLIP {
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

    public Setup(param1: int, param2: int, param3: string = ""): void {
        this.mouseEnabled = false;
        this.mouseChildren = false;
        this.x = param1;
        this.y = param2;
        if (param1 > 450) {
            this.mcBG.x = (0 - (this.mcBG.width - 25)) | 0;
        } else {
            this.mcBG.x = (0 - this.mcBG.width / 2) | 0;
        }
        this.mcText.x = (this.mcBG.x + 10) | 0;
        if (param3) {
            this.Update(param3);
        }
    }

    public Update(param1: string, param2: int = 1): void {
        let _loc5_: Rectangle = null;
        this.mcText.htmlText = param1;
        this.mcText.width = 20;
        while (this.mcText.height > 20 * param2) {
            this.mcText.width += 2;
        }
        this.mcBG.width = this.mcText.width + 16;
        this.mcText.y = (-14 - this.mcText.height) | 0;
        this.mcBG.height = (this.mcText.height + 10) | 0;
        this.mcBG.y = (this.mcText.y - 4) | 0;
        this.mcBG.x = -((this.mcBG.width * 0.5) | 0);
        let _loc3_: int = GLOBAL._ROOT.stage.stageWidth;
        let _loc4_: int = GLOBAL.GetGameHeight();
        _loc5_ = new Rectangle(0 - (_loc3_ - 760) / 2, 0 - (_loc4_ - 520) / 2, _loc3_, _loc4_);
        if (this.x + this.mcBG.x < _loc5_.x + 10) {
            this.mcBG.x = (_loc5_.x - this.x + 10) | 0;
        }
        if (this.x + this.mcBG.x + this.mcBG.width > _loc5_.x + _loc5_.width - 10) {
            this.mcBG.x = (_loc5_.x + _loc5_.width - this.x - 10 - this.mcBG.width) | 0;
        }
        this.mcText.x = (this.mcBG.x + 8) | 0;
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

    public Clear(): void {
    }
}

import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BitmapData, IBitmapDrawable } from "flash/display";
import { GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat } from "flash/text";

export class ImageText extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static Get(param1: string, param2: int = 13, param3: int = 0, param4: any[] = null): BitmapData {
        let _loc5_: TextFormat = null;
        (_loc5_ = new TextFormat()).font = "Groboldov";
        _loc5_.size = param2;
        _loc5_.color = 16777215;
        _loc5_.letterSpacing = param3;
        let _loc6_: TextField = null;
        (_loc6_ = new TextField()).embedFonts = true;
        _loc6_.antiAliasType = AntiAliasType.NORMAL;
        _loc6_.width = 600;
        _loc6_.defaultTextFormat = _loc5_;
        _loc6_.htmlText = param1;
        if (param4) {
            _loc6_.filters = param4;
        } else {
            _loc6_.filters = [new GlowFilter(0, 1, 2, 2, 5, 2)];
        }
        let _loc7_: BitmapData = null;
        (_loc7_ = new BitmapData(_loc6_.textWidth + 5, _loc6_.textHeight + 5, true, 0)).draw(as3.cast(_loc6_, IBitmapDrawable));
        return _loc7_;
    }
}

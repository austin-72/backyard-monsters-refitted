import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { GLOBAL, ImageCache, SpecialInfo_CLIP } from "@game";

export class SpecialRewardInfo extends SpecialInfo_CLIP {
    public $ctor(): void {
        super.$ctor();
    }

    public Setup(param1: string, param2: int, param3: string): void {
        let ImageLoaded: Function = null;
        let name: string = param1;
        let quantity: int = param2;
        let image: string = param3;
        ImageLoaded = (param1: string, param2: BitmapData): void => {
            this.mcImage.addChild(new Bitmap(param2));
            this.mcImage.width = 30;
            this.mcImage.height = 27;
        };
        if (quantity) {
            this.tName.htmlText = "<b>" + name + ": " + GLOBAL.FormatNumber(quantity) + "</b>";
        } else {
            this.tName.htmlText = "<b>" + name + "</b>";
        }
        ImageCache.GetImageWithCallBack(image, ImageLoaded);
    }
}

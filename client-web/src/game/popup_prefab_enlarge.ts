import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { GLOBAL, ImageCache, InfernoKits, POPUPSETTINGS, popup_prefab_enlarge_CLIP } from "@game";

export class popup_prefab_enlarge extends popup_prefab_enlarge_CLIP {
    public $ctor(): void {
        super.$ctor();
    }

    public Setup(param1: int): void {
        ImageCache.GetImageWithCallBack(GLOBAL.INFERNO_ONLY ? InfernoKits.largePath(param1) : "ui/prefab-large-" + (param1 + 1) + ".v5.jpg", as3.bind(this, this.ShowImage), true, 1);
    }

    public ShowImage(param1: string, param2: BitmapData): void {
        this.mcImage.addChild(new Bitmap(param2));
    }

    public Hide(param1: MouseEvent = null): void {
        GLOBAL.BlockerRemove();
        this.parent.removeChild(this);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }
}

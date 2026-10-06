import * as as3 from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Rectangle } from "flash/geom";
import { BWALL, MAP } from "@game";

export class BUILDING18 extends BWALL {
    public $ctor(): void {
        super.$ctor();
        this._type = 18;
        this._footprint = [new Rectangle(0, 0, 20, 20)];
        this._gridCost = [[new Rectangle(-10, -10, 40, 40), 20], [new Rectangle(0, 0, 20, 20), 200]];
        this._mcBase = as3.as(MAP._BUILDINGBASES.addChild(new MovieClip()), MovieClip);
        this.SetProps();
    }

    private onAssetLoaded(param1: string, param2: BitmapData): void {
        let _loc3_: Bitmap = null;
        if (param1 == this.imageData.shadowURL) {
            _loc3_ = as3.as(this._mcBase.addChild(new Bitmap(param2)), Bitmap);
            _loc3_.x = Number(this.imageData.shadowX);
            _loc3_.y = Number(this.imageData.shadowY);
            _loc3_.blendMode = "multiply";
        } else if (param1 == this.imageData.topURL) {
            as3.cast(this.topContainer, MovieClip).addChild(new Bitmap(param2));
        }
    }
}

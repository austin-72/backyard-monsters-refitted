import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class EventStoreItemSelectedPopupMC extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "EventStoreItemSelectedPopupMC" });
        as3.fields(this, { previewImageHolder: null, xpCostText: null, previewImageFrame: null, titleImageHolder: null, experienceDisplay: null, descriptionText: null, purchaseButton: null, prizeNameText: null });
    }

    public previewImageHolder: MovieClip;
    public xpCostText: TextField;
    public previewImageFrame: MovieClip;
    public titleImageHolder: MovieClip;
    public experienceDisplay: MovieClip;
    public descriptionText: TextField;
    public purchaseButton: Button_CLIP;
    public prizeNameText: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}

import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class BasePlannerTransferConfirmation_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerTransferConfirmation_CLIP" });
        as3.fields(this, { bConfirm: null, tBody: null, bCancel: null, tTitle: null, mcFrame: null });
    }

    public bConfirm: Button_CLIP;
    public tBody: TextField;
    public bCancel: Button_CLIP;
    public tTitle: TextField;
    public mcFrame: frame_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}

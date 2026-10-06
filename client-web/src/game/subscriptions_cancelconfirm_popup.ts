import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class subscriptions_cancelconfirm_popup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "subscriptions_cancelconfirm_popup" });
        as3.fields(this, { bConfirm: null, tTitle: null, tDesc: null, bCancel: null });
    }

    public bConfirm: Button_CLIP;
    public tTitle: TextField;
    public tDesc: TextField;
    public bCancel: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}

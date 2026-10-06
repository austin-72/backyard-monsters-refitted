import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class subscriptions_membership_popup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "subscriptions_membership_popup" });
        as3.fields(this, { bClose: null, tRenew: null, bCancel: null, tTitle: null, bChange: null, tDescription: null });
    }

    public bClose: Button_CLIP;
    public tRenew: TextField;
    public bCancel: Button_CLIP;
    public tTitle: TextField;
    public bChange: Button_CLIP;
    public tDescription: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}

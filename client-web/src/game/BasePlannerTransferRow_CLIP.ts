import * as as3 from "as3";
import { MovieClip, SimpleButton } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class BasePlannerTransferRow_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "BasePlannerTransferRow_CLIP" });
        as3.fields(this, { tTemplateName: null, mcBackground: null, tSlotName: null, mcLock: null, mcEdit: null, bTransfer: null });
    }

    public tTemplateName: TextField;
    public mcBackground: MovieClip;
    public tSlotName: TextField;
    public mcLock: SimpleButton;
    public mcEdit: MovieClip;
    public bTransfer: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}

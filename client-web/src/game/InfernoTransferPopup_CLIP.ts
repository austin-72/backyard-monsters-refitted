import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, InfernoTransferMonster_CLIP } from "@game";

export class InfernoTransferPopup_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "InfernoTransferPopup_CLIP" });
        as3.fields(this, { m8: null, m9: null, transfer_action_txt: null, title_txt: null, m10: null, m11: null, m12: null, m13: null, m14: null, m1: null, m15: null, m2: null, m3: null, capacity_desc_txt: null, m4: null, tStorage: null, transfer_desc_txt: null, m5: null, m6: null, m7: null, mcStorage: null, bTransfer: null });
    }

    public m8: InfernoTransferMonster_CLIP;
    public m9: InfernoTransferMonster_CLIP;
    public transfer_action_txt: TextField;
    public title_txt: TextField;
    public m10: InfernoTransferMonster_CLIP;
    public m11: InfernoTransferMonster_CLIP;
    public m12: InfernoTransferMonster_CLIP;
    public m13: InfernoTransferMonster_CLIP;
    public m14: InfernoTransferMonster_CLIP;
    public m1: InfernoTransferMonster_CLIP;
    public m15: InfernoTransferMonster_CLIP;
    public m2: InfernoTransferMonster_CLIP;
    public m3: InfernoTransferMonster_CLIP;
    public capacity_desc_txt: TextField;
    public m4: InfernoTransferMonster_CLIP;
    public tStorage: TextField;
    public transfer_desc_txt: TextField;
    public m5: InfernoTransferMonster_CLIP;
    public m6: InfernoTransferMonster_CLIP;
    public m7: InfernoTransferMonster_CLIP;
    public mcStorage: MovieClip;
    public bTransfer: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}

import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class subscriptions_promo_popup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "subscriptions_promo_popup" });
        as3.fields(this, { mcCircle3: null, mcCircle2: null, mcCircle1: null, mcCircle6: null, mcCircle5: null, mcImagePrice: null, tDescription1: null, mcCircle4: null, mcImageSlot: null, bCancel: null, tDescription2: null, mcImageBG: null, mcArrowRight: null, bJoin: null, mcArrowLeft: null });
    }

    public mcCircle3: MovieClip;
    public mcCircle2: MovieClip;
    public mcCircle1: MovieClip;
    public mcCircle6: MovieClip;
    public mcCircle5: MovieClip;
    public mcImagePrice: MovieClip;
    public tDescription1: TextField;
    public mcCircle4: MovieClip;
    public mcImageSlot: MovieClip;
    public bCancel: MovieClip;
    public tDescription2: TextField;
    public mcImageBG: MovieClip;
    public mcArrowRight: MovieClip;
    public bJoin: MovieClip;
    public mcArrowLeft: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}

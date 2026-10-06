import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { MovieClipUtils } from "@game";

export class ListView_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "com.monsters.maproom.views.ListView_CLIP" });
        as3.fields(this, { nameBtn: null, statusBtn: null, lastSeenBtn: null, mask_mc: null, winBtn: null, levelBtn: null });
    }

    public nameBtn: MovieClip;
    public statusBtn: MovieClip;
    public lastSeenBtn: MovieClip;
    public mask_mc: MovieClip;
    public winBtn: MovieClip;
    public levelBtn: MovieClip;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}

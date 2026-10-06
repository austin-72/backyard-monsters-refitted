import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, MovieClipUtils } from "@game";

export class MONSTERBUNKERPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MONSTERBUNKERPOPUP_CLIP" });
        as3.fields(this, { transferCanvasBmask: null, transferCanvasA: null, transferCanvasAmask: null, tNoMonsters: null, title_txt: null, bHousing: null, bContinue: null, tStored: null, txtGuide: null, bSpecial: null, scrollerA: null, tCost: null, transferCanvasB: null, scrollerB: null, mcStorage: null, tCapacity: null, bTransfer: null });
    }

    public transferCanvasBmask: MovieClip;
    public transferCanvasA: MovieClip;
    public transferCanvasAmask: MovieClip;
    public tNoMonsters: TextField;
    public title_txt: TextField;
    public bHousing: Button_CLIP;
    public bContinue: Button_CLIP;
    public tStored: TextField;
    public txtGuide: TextField;
    public bSpecial: Button_CLIP;
    public scrollerA: MovieClip;
    public tCost: TextField;
    public transferCanvasB: MovieClip;
    public scrollerB: MovieClip;
    public mcStorage: MovieClip;
    public tCapacity: TextField;
    public bTransfer: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}

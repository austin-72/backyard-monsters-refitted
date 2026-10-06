import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, MovieClipUtils } from "@game";

export class MonsterBunkerPopup_Persistent_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "MonsterBunkerPopup_Persistent_CLIP" });
        as3.fields(this, { mcHousing: null, transferCanvasBmask: null, transferCanvasA: null, transferCanvasAmask: null, tNoMonsters: null, tSize1: null, title_txt: null, tTransfer2: null, tSize2: null, bContinue: null, tStored: null, tTransfer1: null, txtGuide: null, tHoused: null, tHousing: null, scrollerA: null, tAvailable1: null, tAvailable2: null, transferCanvasB: null, scrollerB: null, mcStorage: null, tCapacity: null });
    }

    public mcHousing: MovieClip;
    public transferCanvasBmask: MovieClip;
    public transferCanvasA: MovieClip;
    public transferCanvasAmask: MovieClip;
    public tNoMonsters: TextField;
    public tSize1: TextField;
    public title_txt: TextField;
    public tTransfer2: TextField;
    public tSize2: TextField;
    public bContinue: Button_CLIP;
    public tStored: TextField;
    public tTransfer1: TextField;
    public txtGuide: TextField;
    public tHoused: TextField;
    public tHousing: TextField;
    public scrollerA: MovieClip;
    public tAvailable1: TextField;
    public tAvailable2: TextField;
    public transferCanvasB: MovieClip;
    public scrollerB: MovieClip;
    public mcStorage: MovieClip;
    public tCapacity: TextField;

    public $ctor(): void {
        super.$ctor();
        MovieClipUtils.stopAll(this);
    }
}

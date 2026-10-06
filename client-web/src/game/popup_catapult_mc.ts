import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { CATAPULTITEM_view } from "@game";

export class popup_catapult_mc extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "popup_catapult_mc" });
        as3.fields(this, { pb2: null, pb3: null, tTitlePebble: null, tTitleTwig: null, _bg: null, tw0: null, tw1: null, pu0: null, tw2: null, pu1: null, pu2: null, pu3: null, tTitlePutty: null, pb0: null, pb1: null });
    }

    public pb2: CATAPULTITEM_view;
    public pb3: CATAPULTITEM_view;
    public tTitlePebble: TextField;
    public tTitleTwig: TextField;
    public _bg: MovieClip;
    public tw0: CATAPULTITEM_view;
    public tw1: CATAPULTITEM_view;
    public pu0: CATAPULTITEM_view;
    public tw2: CATAPULTITEM_view;
    public pu1: CATAPULTITEM_view;
    public pu2: CATAPULTITEM_view;
    public pu3: CATAPULTITEM_view;
    public tTitlePutty: TextField;
    public pb0: CATAPULTITEM_view;
    public pb1: CATAPULTITEM_view;

    public $ctor(): void {
        super.$ctor();
    }
}

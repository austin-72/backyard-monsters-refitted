import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP, frame_CLIP } from "@game";

export class PopupInfoEnemy_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "PopupInfoEnemy_CLIP" });
        as3.fields(this, { tNameLabel: null, bTruce: null, tName: null, bView: null, bSendMessage: null, tHeight: null, bAttack: null, bAlliance: null, mcAlliancePic: null, tHeightLabel: null, tBonus: null, tLocationLabel: null, tLocation: null, mcFrame: null, mcRelations: null, tYardHasLabel: null, mcLevel: null, mcProfilePic: null, bBookmark: null });
    }

    public tNameLabel: TextField;
    public bTruce: Button_CLIP;
    public tName: TextField;
    public bView: Button_CLIP;
    public bSendMessage: Button_CLIP;
    public tHeight: TextField;
    public bAttack: Button_CLIP;
    public bAlliance: Button_CLIP;
    public mcAlliancePic: MovieClip;
    public tHeightLabel: TextField;
    public tBonus: TextField;
    public tLocationLabel: TextField;
    public tLocation: TextField;
    public mcFrame: frame_CLIP;
    public mcRelations: MovieClip;
    public tYardHasLabel: TextField;
    public mcLevel: MovieClip;
    public mcProfilePic: MovieClip;
    public bBookmark: Button_CLIP;

    public $ctor(): void {
        super.$ctor();
    }
}

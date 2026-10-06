import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { Button_CLIP } from "@game";

export class subscriptions_controlPanel_popup extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "subscriptions_controlPanel_popup" });
        as3.fields(this, { bMembership: null, bPlaceDave: null, tMembers_title: null, mcImage_terrain: null, mcDave1: null, mcDave2: null, bSave: null, mcDave3: null, mcTile1: null, tMembers_desc: null, mcTile2: null, mcTile3: null, mcTile4: null, tTerrainSelect: null, mcTitleBanner: null, mcDavesGoldToggle: null, tDavesGold_title: null });
    }

    public bMembership: Button_CLIP;
    public bPlaceDave: Button_CLIP;
    public tMembers_title: TextField;
    public mcImage_terrain: MovieClip;
    public mcDave1: MovieClip;
    public mcDave2: MovieClip;
    public bSave: Button_CLIP;
    public mcDave3: MovieClip;
    public mcTile1: MovieClip;
    public tMembers_desc: TextField;
    public mcTile2: MovieClip;
    public mcTile3: MovieClip;
    public mcTile4: MovieClip;
    public tTerrainSelect: TextField;
    public mcTitleBanner: MovieClip;
    public mcDavesGoldToggle: MovieClip;
    public tDavesGold_title: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}

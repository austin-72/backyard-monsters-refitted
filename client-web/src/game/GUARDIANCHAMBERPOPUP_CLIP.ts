import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";
import { creatureBar, frame_CLIP } from "@game";

export class GUARDIANCHAMBERPOPUP_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "GUARDIANCHAMBERPOPUP_CLIP" });
        as3.fields(this, { buff_txt: null, bSpeed: null, selectedImage: null, mcMask: null, bBuff: null, bDamage: null, health_txt: null, tTitle: null, tSpeed: null, tHealth: null, frame: null, tEvoDesc: null, tEvoStage: null, tBuff: null, mcBgCubes: null, tDamage: null, damage_txt: null, speed_txt: null, bHealth: null, mcBgBot: null });
    }

    public buff_txt: TextField;
    public bSpeed: creatureBar;
    public selectedImage: MovieClip;
    public mcMask: MovieClip;
    public bBuff: creatureBar;
    public bDamage: creatureBar;
    public health_txt: TextField;
    public tTitle: TextField;
    public tSpeed: TextField;
    public tHealth: TextField;
    public frame: frame_CLIP;
    public tEvoDesc: TextField;
    public tEvoStage: TextField;
    public tBuff: TextField;
    public mcBgCubes: MovieClip;
    public tDamage: TextField;
    public damage_txt: TextField;
    public speed_txt: TextField;
    public bHealth: creatureBar;
    public mcBgBot: MovieClip;

    public $ctor(): void {
        super.$ctor();
        this.stop();
    }
}

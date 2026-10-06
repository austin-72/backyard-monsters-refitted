import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { plannerBuildingSquare } from "@game";

export class plannerBuilding_CLIP extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "plannerBuilding_CLIP" });
        as3.fields(this, { mcLocked: null, mcSquare: null });
    }

    public mcLocked: MovieClip;
    public mcSquare: plannerBuildingSquare;

    public $ctor(): void {
        super.$ctor();
    }
}

import * as as3 from "as3";
import { MovieClip } from "flash/display";

export class BuildingAssetContainer extends MovieClip {
    public $ctor(): void {
        super.$ctor();
        this.Clear();
    }

    public Clear(): void {
        while (this.numChildren > 0) {
            this.removeChildAt(0);
        }
    }
}

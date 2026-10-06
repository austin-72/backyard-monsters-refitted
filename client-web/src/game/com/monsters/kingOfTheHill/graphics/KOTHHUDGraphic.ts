import * as as3 from "as3";
import { uint } from "as3";
import { KrallenHUD_CLIP } from "@game";

export class KOTHHUDGraphic extends KrallenHUD_CLIP {
    public $ctor(param1?: boolean, param2?: uint): void {
        super.$ctor();
        this.update(param1, param2);
        this.buttonMode = true;
    }

    public update(param1: boolean, param2: uint): void {
        this.gotoAndStop(param1 ? "active" : "inactive");
        this.mcLevel.tLevel.text = param2.toString();
        this.mcLevel.visible = Boolean(param2);
    }
}

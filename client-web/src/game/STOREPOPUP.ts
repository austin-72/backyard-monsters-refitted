import * as as3 from "as3";
import { MouseEvent } from "flash/events";
import { POPUPSETTINGS, STORE, STOREPOPUP_CLIP } from "@game";

export class STOREPOPUP extends STOREPOPUP_CLIP {
    public $ctor(): void {
        super.$ctor();
    }

    public Hide(param1: MouseEvent = null): void {
        STORE.Hide();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}

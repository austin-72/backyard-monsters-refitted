import * as as3 from "as3";
import { Event, MouseEvent } from "flash/events";
import { BasePlannerEvent, BasePlannerTransferConfirmation_CLIP, KEYS } from "@game";

export class BasePlannerTransferConfirmation extends BasePlannerTransferConfirmation_CLIP {
    public $ctor(param1: string = null): void {
        super.$ctor();
        this.tTitle.htmlText = KEYS.Get("pop_areyousure");
        this.tBody.htmlText = KEYS.Get("basePlanner_overwrite", { "v1": param1 });
        this.bCancel.SetupKey("btn_cancel");
        this.bConfirm.SetupKey("basePlanner_btnSave");
        this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedCancel), false, 0, true);
        this.bConfirm.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedConfirm), false, 0, true);
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removedFromStage));
    }

    protected removedFromStage(param1: Event): void {
        this.bCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedCancel));
        this.bConfirm.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedConfirm));
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removedFromStage));
    }

    protected clickedConfirm(param1: MouseEvent): void {
        this.dispatchEvent(new Event(BasePlannerEvent.SAVE));
    }

    protected clickedCancel(param1: MouseEvent): void {
        this.dispatchEvent(new Event(Event.CLOSE));
    }

    public Hide(): void {
        this.dispatchEvent(new Event(Event.CLOSE));
    }
}

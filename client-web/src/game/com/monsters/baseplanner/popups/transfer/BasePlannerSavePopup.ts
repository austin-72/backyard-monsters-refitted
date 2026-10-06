import * as as3 from "as3";
import { Event } from "flash/events";
import { BasePlannerEvent, BasePlannerTransferConfirmation, BasePlannerTransferEvent, BasePlannerTransferPopup, BasePlannerTransferRow, KEYS, POPUPS, POPUPSETTINGS } from "@game";

export class BasePlannerSavePopup extends BasePlannerTransferPopup {
    static {
        as3.fields(this, { _row: null, _confirmationPopup: null });
    }

    private _row: BasePlannerTransferRow;
    private _confirmationPopup: BasePlannerTransferConfirmation;

    public $ctor(): void {
        super.$ctor();
        this.tTitle.htmlText = KEYS.Get("basePlanner_savetitle");
    }

    public override get name(): string {
        return KEYS.Get("basePlanner_btnSave");
    }

    protected override clickedTransfer(param1: Event): void {
        this._row = as3.as(param1.currentTarget, BasePlannerTransferRow);
        if (this._row.template) {
            if (!this._confirmationPopup) {
                this._confirmationPopup = new BasePlannerTransferConfirmation("\'" + this._row.template.name + "\'");
                this._confirmationPopup.addEventListener(BasePlannerEvent.SAVE, as3.bind(this, this.confirmedSave));
                this._confirmationPopup.addEventListener(Event.CLOSE, as3.bind(this, this.clickedClose));
                POPUPS.Add(this._confirmationPopup);
                POPUPSETTINGS.AlignToCenter(this._confirmationPopup);
            }
        } else {
            this.confirmedSave(null);
        }
    }

    protected clickedClose(param1: Event = null): void {
        if (this._confirmationPopup) {
            this._confirmationPopup.removeEventListener(BasePlannerEvent.SAVE, as3.bind(this, this.confirmedSave));
            this._confirmationPopup.removeEventListener(Event.CLOSE, as3.bind(this, this.clickedClose));
            POPUPS.Remove(this._confirmationPopup);
            this._confirmationPopup = null;
        }
    }

    protected confirmedSave(param1: Event): void {
        this.dispatchEvent(new BasePlannerTransferEvent(BasePlannerEvent.SAVE, this._row.slot, this._row.tTemplateName.text));
        if (this._confirmationPopup) {
            this.clickedClose();
        }
    }

    public override clear(): void {
        this.clickedClose();
    }
}

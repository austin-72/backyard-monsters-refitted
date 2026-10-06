import * as as3 from "as3";
import { Event, MouseEvent } from "flash/events";
import { KEYS, SubscriptionHandler, subscriptions_cancelconfirm_popup } from "@game";

export class SubscriptionCancelPopup extends subscriptions_cancelconfirm_popup {
    public $ctor(): void {
        super.$ctor();
        this.tTitle.htmlText = KEYS.Get("dc_panel_cancel");
        this.tDesc.htmlText = KEYS.Get("dc_cancel_confirmation");
        this.bConfirm.Highlight = false;
        this.bConfirm.buttonMode = true;
        this.bConfirm.Setup(KEYS.Get("btn_cancelsub_confirm"));
        this.bConfirm.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedConfirm));
        this.bCancel.Highlight = true;
        this.bCancel.buttonMode = true;
        this.bCancel.Setup(KEYS.Get("btn_cancelsub_keepsub"));
        this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
    }

    private clickedConfirm(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(SubscriptionHandler.CANCELCONFIRM));
        this.Hide(param1);
    }

    private clickedCancel(param1: MouseEvent = null): void {
        this.Hide(param1);
    }

    public Hide(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(SubscriptionHandler.CLOSECONFIRM));
        this.bConfirm.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedConfirm));
        this.bCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        this.dispatchEvent(new Event(Event.CLOSE));
    }
}

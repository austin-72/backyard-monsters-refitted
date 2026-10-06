import * as as3 from "as3";
import { Event, MouseEvent } from "flash/events";
import { KEYS, POPUPS, POPUPSETTINGS, SubscriptionCancelPopup, SubscriptionHandler, subscriptions_membership_popup } from "@game";

export class MembershipPopup extends subscriptions_membership_popup {
    static {
        as3.fields(this, { _cancelConfirm: null });
    }

    private _cancelConfirm: SubscriptionCancelPopup;

    public $ctor(): void {
        let _loc1_: boolean = false;
        super.$ctor();
        _loc1_ = this.subscriptionActive();
        this.tTitle.htmlText = KEYS.Get("dc_panel_benefits");
        this.tDescription.htmlText = KEYS.Get("dc_benefits_desc");
        if (_loc1_) {
            this.tRenew.htmlText = KEYS.Get("dc_benefits_renew", { "v1": new Date(SubscriptionHandler.instance.renewalDate * 1000).toLocaleDateString() });
        } else {
            this.tRenew.htmlText = KEYS.Get("dc_benefits_expire", { "v1": new Date(SubscriptionHandler.instance.expirationDate * 1000).toLocaleDateString() });
        }
        if (_loc1_) {
            this.bChange.buttonMode = true;
            this.bChange.Setup(KEYS.Get("btn_changepayment"));
            this.bChange.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedChange));
        } else {
            this.bChange.Enabled = false;
            this.bChange.buttonMode = false;
            this.bChange.mouseEnabled = false;
            this.bChange.visible = false;
        }
        this.bCancel.buttonMode = true;
        if (_loc1_) {
            this.bCancel.Setup(KEYS.Get("btn_cancelsub"));
            this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedCancelConfirm));
        } else {
            this.bCancel.Setup(KEYS.Get("btn_reactivatesub"));
            this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedReactivate));
        }
        this.bClose.Highlight = true;
        this.bClose.buttonMode = true;
        this.bClose.Setup(KEYS.Get("btn_close"));
        this.bClose.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
    }

    protected clickedReactivate(param1: MouseEvent): void {
        this.dispatchEvent(new Event(SubscriptionHandler.REACTIVATE));
        this.Hide();
    }

    private subscriptionActive(): boolean {
        return Boolean(SubscriptionHandler.instance.renewalDate);
    }

    private clickedChange(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(SubscriptionHandler.CHANGE));
        this.Hide(param1);
    }

    private clickedCancel(param1: MouseEvent = null): void {
        this.dispatchEvent(new Event(SubscriptionHandler.CANCEL));
        this.Hide(param1);
    }

    private eventCancel(param1: Event = null): void {
        this.clickedCancel();
    }

    private clickedCancelConfirm(param1: MouseEvent = null): void {
        this._cancelConfirm = new SubscriptionCancelPopup();
        POPUPS.Add(this._cancelConfirm);
        this._cancelConfirm.addEventListener(SubscriptionHandler.CANCELCONFIRM, as3.bind(this, this.eventCancel));
        this._cancelConfirm.addEventListener(SubscriptionHandler.CLOSECONFIRM, as3.bind(this, this.removeConfirmationPopup));
        POPUPSETTINGS.AlignToCenter(this._cancelConfirm);
    }

    private removeConfirmationPopup(param1: Event = null): void {
        this._cancelConfirm.removeEventListener(SubscriptionHandler.CANCELCONFIRM, as3.bind(this, this.clickedCancel));
        this._cancelConfirm.removeEventListener(SubscriptionHandler.CLOSECONFIRM, as3.bind(this, this.removeConfirmationPopup));
        POPUPS.Remove(this._cancelConfirm);
    }

    public Hide(param1: MouseEvent = null): void {
        if (this._cancelConfirm) {
            this.removeConfirmationPopup();
        }
        this.bChange.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedChange));
        this.bCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedCancel));
        this.bClose.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        this.dispatchEvent(new Event(Event.CLOSE));
    }
}

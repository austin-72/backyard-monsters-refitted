import * as as3 from "as3";
import { MouseEvent } from "flash/events";
import { URLRequest, navigateToURL } from "flash/net";
import { Button, GLOBAL, KEYS, KeywordMessage, LOGIN, POPUPS, ReplayableEventHandler, ReplayableEventLibrary } from "@game";

export class BrukkargWarPromoMessage extends KeywordMessage {
    static {
        as3.fields(this, { _action: null });
    }

    private static readonly k_BRUKKARG_EVENT_PAGE_URL: string = "http://www.kixeye.com/brukkarg-war";
    private _action: Function;

    public $ctor(param1?: string): void {
        this._action = as3.bind(this, this.goToEventPage);
        super.$ctor(param1, "btn_rsvp");
    }

    public override setupButton(param1: Button): Button {
        super.setupButton(param1);
        if (ReplayableEventHandler.currentTime >= ReplayableEventLibrary.BRUKKARG_EVENT.originalStartDate) {
            param1.SetupKey("btn_keepposted");
            this._action = as3.bind(this, this.optInForEventEmails);
        }
        return param1;
    }

    protected override clickedButton(param1: MouseEvent): void {
        POPUPS.Next();
        this._action();
    }

    private goToEventPage(): void {
        navigateToURL(new URLRequest(BrukkargWarPromoMessage.k_BRUKKARG_EVENT_PAGE_URL));
    }

    private optInForEventEmails(): void {
        ReplayableEventHandler.optInForEventEmails();
        GLOBAL.Message(KEYS.Get("msg_rsvpconfirmed", { "v1": LOGIN._email }));
    }
}

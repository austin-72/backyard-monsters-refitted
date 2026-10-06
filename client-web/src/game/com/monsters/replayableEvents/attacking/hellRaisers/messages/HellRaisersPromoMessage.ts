import * as as3 from "as3";
import { URLRequest, navigateToURL } from "flash/net";
import { FrontPageGraphic, HellRaisers, KeywordMessage, MapRoomManager, Maproom3OptInPopup, POPUPS, com_monsters_frontPage_messages_Message as Message } from "@game";

export class HellRaisersPromoMessage extends Message {
    static {
        as3.fields(this, { _buttonAction: null });
    }

    private _buttonAction: Function;

    public $ctor(param1?: string): void {
        let _loc2_: any = null;
        if (MapRoomManager.instance.isInMapRoom2) {
            _loc2_ += "_upgrade";
            this._buttonCopy = "btn_joinnow";
            this._buttonAction = as3.bind(this, this.showUpgradeToMR3Popup);
        } else {
            _loc2_ = param1;
            this._buttonCopy = "btn_rsvp";
            this._buttonAction = as3.bind(this, this.RSVP);
        }
        super.$ctor(KeywordMessage.PREFIX + _loc2_ + "_title", KeywordMessage.PREFIX + _loc2_, KeywordMessage.PREFIX + param1 + ".jpg", this._buttonCopy);
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        this._buttonAction();
    }

    private showUpgradeToMR3Popup(): void {
        POPUPS.Push(new FrontPageGraphic(new Maproom3OptInPopup()));
    }

    private RSVP(): void {
        navigateToURL(new URLRequest(HellRaisers.k_eventPage));
    }
}

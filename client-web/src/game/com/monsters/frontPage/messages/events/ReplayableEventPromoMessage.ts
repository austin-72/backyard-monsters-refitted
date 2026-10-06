import * as as3 from "as3";
import { DisplayObjectContainer, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Button, GLOBAL, KEYS, KeywordMessage, LOGIN, POPUPS, ReplayableEventHandler, frontpage_stonebtn } from "@game";

export class ReplayableEventPromoMessage extends KeywordMessage {
    static {
        as3.fields(this, { _button: null });
    }

    private _button: MovieClip;

    public $ctor(param1?: string, param2: string = ""): void {
        if (!param2 && !GLOBAL._flags.kongregate && !GLOBAL._flags.viximo) {
            param2 = "btn_keepposted";
        }
        super.$ctor(param1, param2);
    }

    public override setupButton(param1: Button): Button {
        let _loc3_: number = NaN;
        let _loc4_: DisplayObjectContainer = null;
        if (!this._buttonCopy) {
            param1.visible = false;
            return param1;
        }
        let _loc2_: number = param1.x;
        _loc3_ = param1.y;
        (_loc4_ = param1.parent).removeChild(param1);
        this._button = new frontpage_stonebtn();
        this._button.x = _loc2_;
        this._button.y = _loc3_;
        this._button.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedButton));
        this._button.buttonMode = true;
        this._button.tLabel.text = this._buttonCopy;
        _loc4_.addChild(this._button);
        return null;
    }

    protected override onButtonClick(): void {
        ReplayableEventHandler.optInForEventEmails();
        this._button.enabled = false;
        this._button.visible = false;
        POPUPS.Next();
        GLOBAL.Message(KEYS.Get("msg_rsvpconfirmed", { "v1": LOGIN._email }));
    }
}

import * as as3 from "as3";
import { URLRequest, navigateToURL } from "flash/net";
import { GLOBAL, KeywordMessage, MAPROOM, MapRoomManager, com_monsters_frontPage_messages_Message as Message } from "@game";

export class KOTHPromoMessage extends Message {
    static {
        as3.fields(this, { _EVENT_PAGE_URL: "http://www.kixeye.com/hunt-for-krallen/", _action: null });
    }

    private _EVENT_PAGE_URL: string;
    protected _action: Function;

    public $ctor(param1?: string): void {
        if (MapRoomManager.instance.isInMapRoom2or3) {
            this._action = as3.bind(this, this.rsvp);
            this._buttonCopy = "btn_rsvp";
            this.body = param1;
        } else {
            this.body = param1 + "mr1";
            if (Boolean(GLOBAL._bMap) && GLOBAL.townHall._lvl.Get() >= 6) {
                this._action = as3.bind(this, this.upgradeMapRoom);
                this._buttonCopy = "btn_upgradenow";
            }
        }
        super.$ctor(KeywordMessage.PREFIX + param1 + "_title", KeywordMessage.PREFIX + this.body + "_desc", KeywordMessage.PREFIX + param1 + ".jpg", this._buttonCopy);
    }

    protected override onButtonClick(): void {
        this._action();
    }

    private rsvp(): void {
        navigateToURL(new URLRequest(this._EVENT_PAGE_URL));
    }

    protected upgradeMapRoom(): void {
        this.upgradeBuilding(MAPROOM.TYPE);
    }
}

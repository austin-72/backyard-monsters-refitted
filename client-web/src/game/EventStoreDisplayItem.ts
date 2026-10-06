import * as as3 from "as3";
import { MovieClip } from "flash/display";
import { TextField } from "flash/text";

export class EventStoreDisplayItem extends MovieClip {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "EventStoreDisplayItem" });
        as3.fields(this, { xpText: null, xpBarYellow: null, imageHolder: null, frame: null, nameText: null, xpBarBlue: null, xpBarBg: null, tickIcon: null, lockIcon: null, xpBarGreen: null });
    }

    public xpText: TextField;
    public xpBarYellow: MovieClip;
    public imageHolder: MovieClip;
    public frame: MovieClip;
    public nameText: TextField;
    public xpBarBlue: MovieClip;
    public xpBarBg: MovieClip;
    public tickIcon: MovieClip;
    public lockIcon: MovieClip;
    public xpBarGreen: MovieClip;

    public $ctor(): void {
        super.$ctor();
    }
}

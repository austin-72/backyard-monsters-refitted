import * as as3 from "as3";
import { GLOBAL, KeywordMessage, POPUPS } from "@game";

export class HellRaisersStartMessage extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("hellraisersstart", "btn_info");
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        GLOBAL.Message(">Show Event Details Page");
    }
}

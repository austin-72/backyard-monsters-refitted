import * as as3 from "as3";
import { com_monsters_frontPage_messages_Message as Message } from "@game";

export class KeywordMessage extends Message {
    static {
        as3.fields(this, { _keyword: null });
    }

    public static readonly PREFIX: string = "fp_";
    protected _keyword: string;

    public $ctor(param1?: string, param2: string = null, param3: string = null): void {
        this._keyword = param1;
        let _loc4_: string = !(!param3) ? param3 : KeywordMessage.PREFIX + param1 + ".jpg";
        super.$ctor(KeywordMessage.PREFIX + this._keyword + "_title", KeywordMessage.PREFIX + this._keyword, _loc4_, param2, this.videoURL);
        this.name = this._keyword;
    }

    public static getImageURLFromKeyword(param1: string): string {
        return Message._IMAGE_DIRECTORY + KeywordMessage.PREFIX + param1 + ".jpg";
    }
}

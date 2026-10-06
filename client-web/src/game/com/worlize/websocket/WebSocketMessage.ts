import * as as3 from "as3";
import { ASObject } from "as3";
import { ByteArray } from "flash/utils";

export class WebSocketMessage extends ASObject {
    static {
        as3.fields(this, { type: null, utf8Data: null, binaryData: null });
    }

    public static readonly TYPE_BINARY: string = "binary";
    public static readonly TYPE_UTF8: string = "utf8";
    public type: string;
    public utf8Data: string;
    public binaryData: ByteArray;

}

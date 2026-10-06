import * as as3 from "as3";
import { Event } from "flash/events";
import { ByteArray } from "flash/utils";

export class SSLEvent extends Event {
    static {
        as3.fields(this, { data: null });
    }

    public static readonly DATA: string = "data";
    public static readonly READY: string = "ready";
    public data: ByteArray;

    public $ctor(type?: string, data: any /* ByteArray */ = null): void {
        this.data = data;
        super.$ctor(type, false, false);
    }
}

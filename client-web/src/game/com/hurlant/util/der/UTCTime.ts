import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ByteArray } from "flash/utils";
import { DER, IAsn1Type } from "@game";

export class UTCTime extends ASObject implements IAsn1Type {
    static {
        as3.implement(this, [IAsn1Type]);
        as3.fields(this, { type: 0, len: 0, date: null });
    }

    protected type: uint;
    protected len: uint;
    public date: Date;

    public $ctor(type?: uint, len?: uint): void {
        super.$ctor();
        this.type = type;
        this.len = len;
    }

    public getLength(): uint {
        return this.len;
    }

    public getType(): uint {
        return this.type;
    }

    public setUTCTime(str: string): void {
        let year: uint = parseInt(str.substr(0, 2)) >>> 0;
        if (year < 50) {
            year = (year + 2000) >>> 0;
        } else {
            year = (year + 1900) >>> 0;
        }
        let month: uint = parseInt(str.substr(2, 2)) >>> 0;
        let day: uint = parseInt(str.substr(4, 2)) >>> 0;
        let hour: uint = parseInt(str.substr(6, 2)) >>> 0;
        let minute: uint = parseInt(str.substr(8, 2)) >>> 0;
        // XXX this could be off by up to a day. parse the rest. someday.
        this.date = new Date(year, month - 1, day, hour, minute);
    }

    public toString(): string {
        return DER.indent + "UTCTime[" + this.type + "][" + this.len + "][" + this.date + "]";
    }

    public toDER(): ByteArray {
        return null;
    }
}

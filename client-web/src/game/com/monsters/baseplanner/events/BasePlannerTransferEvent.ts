import * as as3 from "as3";
import { uint } from "as3";
import { Event } from "flash/events";

export class BasePlannerTransferEvent extends Event {
    static {
        as3.fields(this, { _name: null, _slot: 0 });
    }

    private _name: string;
    private _slot: uint;

    public $ctor(param1?: string, param2?: any /* uint */, param3: any /* string */ = ""): void {
        this._name = param3;
        this._slot = param2;
        super.$ctor(param1);
    }

    public get name(): string {
        return this._name;
    }

    public get slot(): uint {
        return this._slot;
    }
}

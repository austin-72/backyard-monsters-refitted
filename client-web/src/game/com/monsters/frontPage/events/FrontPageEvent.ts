import * as as3 from "as3";
import { Event } from "flash/events";
import { Category } from "@game";

export class FrontPageEvent extends Event {
    static {
        as3.fields(this, { _category: null });
    }

    public static readonly NEXT: string = "next";

    public static readonly PREVIOUS: string = "previous";

    public static readonly CHANGE_CATEGORY: string = "changeCategory";
    private _category: Category;

    public $ctor(param1?: string, param2: any /* Category */ = null, param3: boolean = false, param4: boolean = false): void {
        super.$ctor(param1, param3, param4);
        this._category = param2;
    }

    public get category(): Category {
        return this._category;
    }
}

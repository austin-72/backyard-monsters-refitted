import { Event } from "flash/events";

export class BasePlannerEvent extends Event {
    public static readonly LOAD: string = "loadTemplate";

    public static readonly SAVE: string = "saveTemplate";

    public static readonly APPLY: string = "applyTemplate";

    public static readonly CLEARALL: string = "emptyTemplate";

    public $ctor(param1?: string, param2: boolean = false, param3: boolean = false): void {
        super.$ctor(param1, param2, param3);
    }
}

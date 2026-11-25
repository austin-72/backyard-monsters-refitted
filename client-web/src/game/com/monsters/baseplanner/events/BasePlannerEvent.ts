import { Event } from "flash/events";

export class BasePlannerEvent extends Event {
    public static readonly LOAD: string = "loadTemplate";

    public static readonly SAVE: string = "saveTemplate";

    public static readonly APPLY: string = "applyTemplate";

    public static readonly CLEARALL: string = "emptyTemplate";

    /** Inferno-only (QoL #680): a slot's Rename and Delete; (QoL #694) Load's "Current yard". */
    public static readonly IO_RENAME: string = "ioRenameTemplate";

    public static readonly IO_DELETE: string = "ioDeleteTemplate";

    public static readonly IO_CURRENT: string = "ioLoadCurrentYard";

    public $ctor(param1?: string, param2: boolean = false, param3: boolean = false): void {
        super.$ctor(param1, param2, param3);
    }
}

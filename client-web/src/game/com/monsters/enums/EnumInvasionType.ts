import { ASObject } from "as3";

export class EnumInvasionType extends ASObject {
    public static readonly WMI1: string = "wmi1";

    public static readonly WMI2: string = "wmi2";

    public $ctor(): void {
        super.$ctor();
    }
}

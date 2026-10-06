import { ASObject, uint } from "as3";

export class EnumYardType extends ASObject {
    public static readonly MAIN_YARD: uint = 0;

    public static readonly OUTPOST: uint = 1;

    public static readonly INFERNO_YARD: uint = 2;

    public static readonly INFERNO_OUTPOST: uint = 3;

    public static readonly EMPTY: uint = 100;

    public static readonly PLAYER: uint = 101;

    public static readonly RESOURCE: uint = 102;

    public static readonly STRONGHOLD: uint = 103;

    public static readonly FORTIFICATION: uint = 104;

    public static readonly BORDER: uint = 127;

    public $ctor(): void {
        super.$ctor();
    }
}

import { uint } from "as3";
import { SpurtzCannon } from "@game";

export class BlackSpurtzCannon extends SpurtzCannon {
    public static readonly TYPE: uint = 137;

    public $ctor(): void {
        super.$ctor(BlackSpurtzCannon.TYPE);
    }
}

import * as as3 from "as3";
import { int } from "as3";
import { BitmapData } from "flash/display";

/** Inferno-only art built into the game (so it never depends on a file being on the server). */
export class io_invite_friends extends BitmapData {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/io_invite_friends.png" });
    }

    public $ctor(param1: int = 120, param2: int = 120): void {
        super.$ctor(param1, param2);
    }
}

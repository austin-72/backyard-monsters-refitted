import * as as3 from "as3";
import { Sound } from "flash/media";

export class sound_click1 extends Sound {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/1419_sound_click1_sound_click1.mp3" });
    }

    public $ctor(): void {
        super.$ctor();
    }
}

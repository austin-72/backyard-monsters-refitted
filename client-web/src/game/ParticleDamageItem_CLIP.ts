import * as as3 from "as3";
import { Sprite } from "flash/display";
import { TextField } from "flash/text";

export class ParticleDamageItem_CLIP extends Sprite {
    [key: string]: any;

    static {
        as3.embed(this, { source: "/_assets/assets.swf", symbol: "ParticleDamageItem_CLIP" });
        as3.fields(this, { tLootA: null, tLootB: null });
    }

    public tLootA: TextField;
    public tLootB: TextField;

    public $ctor(): void {
        super.$ctor();
    }
}

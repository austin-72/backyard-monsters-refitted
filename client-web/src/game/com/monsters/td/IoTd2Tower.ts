import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { BDECORATION, BFOUNDATION, GLOBAL, IoTd2 } from "@game";

/**
 * Inferno-only (Hellgate Defense 2, 11 October, the user's: "all the new towers in hellgate defense need full
 * animations like existing towers"): a Hellforged tower (decorations 151 to 156). Each level's picture is a strip of
 * frames ("anim", tools/trophy-art/td2towers.py), as the game's towers' are; which frame shows is IoTd2's
 * (IoTd2.frameOf): the Chillstone Obelisk, the Venom Spire and the Tithe Shrine loop; the War Drum's mallets beat,
 * faster while a wave is on; the Gargoyle Roost turns to face what it shoots, as the turrets do (32 directions);
 * the Bone Catapult turns to face its target and swings its arm when it throws (32 directions, cocked and thrown).
 */
export class IoTd2Tower extends BDECORATION {
    static {
        as3.fields(this, { _ioShown: -1 });
    }

    private _ioShown: int;

    public $ctor(param1?: any /* int */): void {
        super.$ctor(param1);
    }

    public static IsTower(type: int): boolean {
        return GLOBAL.INFERNO_ONLY && IoTd2.isCustom(type);
    }

    public override TickFast(param1: Event = null): void {
        // (BDECORATION's own advances its strip by one every other frame: here IoTd2 says which frame)
        (BFOUNDATION.prototype as any).TickFast.call(this, param1);
        if (!GLOBAL._render || !this._animBMD || !this._animContainerBMD) {
            return;
        }
        let f: int = IoTd2.frameOf(this);
        // (its strip is loaded afresh at a new level, at a random frame: so against the frame it shows)
        if (f >= 0 && (f != this._ioShown || f != this._animTick)) {
            this._ioShown = f;
            this._animTick = f;
            this.AnimFrame(false);
        }
    }
}

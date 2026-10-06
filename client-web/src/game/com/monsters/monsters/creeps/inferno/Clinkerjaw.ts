import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { BFOUNDATION, CreepBase, DeathSplit, EFFECTS, MagmaPuddle, MonsterBase, MultiplicationPropertyModifier, SPRITES } from "@game";

/**
 * Inferno-only: Clinkerjaw (IC12), furnace slag that got hungry. When it dies its crust cracks open:
 *  - `splits` Spurtz (2 at levels 1-3, 3 at levels 4-6) spill out, at the Spurtz level of whoever sent it
 *    (DeathSplit, as Slimeattikus does with its young). They are small ones: drawn at 3/4 size (the
 *    "IC1s" sprite sheet, monsters/spurtz_small.png) and moving at 3/4 of a Spurtz's speed; every other
 *    stat (health, damage, what they target) is a Spurtz's.
 *  - it leaves a pool of magma (MagmaPuddle) that gives every hurt monster on its side within short
 *    range 100 health, once each.
 */
export class Clinkerjaw extends CreepBase {
    static {
        as3.fields(this, { _puddleDropped: false });
    }

    public static readonly ID: string = "IC12";

    /** The hatchlings' size and speed, against a Spurtz's. */
    public static readonly HATCHLING_SCALE: number = 0.75;

    public static readonly HATCHLING_SKIN: string = "IC1s";
    private _puddleDropped: boolean;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this.addComponent(new DeathSplit(this, "IC1", Clinkerjaw.hatchling));
        this.addEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.dropPuddle));
        MagmaPuddle.Preload();
        SPRITES.SetupSprite(Clinkerjaw.HATCHLING_SKIN);
    }

    /** A Spurtz that hatches from it: 3/4 the size and 3/4 the speed. */
    public static hatchling(param1: MonsterBase): void {
        if (!param1) {
            return;
        }
        param1.moveSpeedProperty.addModifier(new MultiplicationPropertyModifier(Clinkerjaw.HATCHLING_SCALE));
        if (param1 instanceof CreepBase) {
            as3.cast(param1, CreepBase).ioSkin(Clinkerjaw.HATCHLING_SKIN);
        }
        param1.ioHatchling = true;
    }

    private dropPuddle(param1: any = null): void {
        this.removeEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.dropPuddle));
        if (this._puddleDropped || this._friendly && this._house) {
            return;
        }
        this._puddleDropped = true;
        MagmaPuddle.Drop(this._tmpPoint.x, this._tmpPoint.y, this._friendly);
    }

    public override deathSplat(): void {
        EFFECTS.Burn(this._tmpPoint.x | 0, this._tmpPoint.y | 0);
        EFFECTS.Scorch(new Point(this._tmpPoint.x, this._tmpPoint.y));
    }
}

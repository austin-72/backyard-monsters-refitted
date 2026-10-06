import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, BYMConfig, CREATURELOCKER, CREATURES, CreepBase, LifestealOnAttack, MonsterBase, RasterData } from "@game";

/**
 * Inferno-only: the Emberghoul (IC20; the user's FUSEBUG_EMBERGHOUL.md), a furnace-stoker ghoul that heals
 * itself with every hit it lands: 8% of the damage the hit does at level 1, up to 12% at level 6
 * (LifestealOnAttack; it was 15-20% until the balance pass of 30 September). Its sheet (monsters/emberghoul.png: 30 facings of 66 x 45, row 0 standing, 1-8 walk,
 * 9-16 attack) is wider than a creep's usual 52 x 50 canvas, so it draws on one of its own, its feet
 * (33, 38) on its spot. The attack rows play while it fights (CreepBase.ioAction).
 */
export class Emberghoul extends CreepBase {
    static {
        as3.fields(this, { m_level: 1 });
    }

    public static readonly ID: string = "IC20";

    public static readonly STEAL: any[] = [0.08, 0.09, 0.1, 0.1, 0.11, 0.12];

    public static readonly FRAME_W: int = 66;

    public static readonly FRAME_H: int = 45;

    public static readonly FEET_X: int = 33;

    public static readonly FEET_Y: int = 38;
    private m_level: int;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this.m_level = Emberghoul.levelOf(param5, this._friendly);
        this.useOwnCanvas();
        this.addComponent(new LifestealOnAttack(Number(Emberghoul.STEAL[this.m_level - 1])));
    }

    public get level(): int {
        return this.m_level;
    }

    /** The level it was made at: its health is unique to one level of the table. */
    private static levelOf(requested: int, friendly: boolean): int {
        let health: number = CREATURES.GetProperty(Emberghoul.ID, "health", requested, friendly);
        let table: any[] = CREATURELOCKER._creatures[Emberghoul.ID] ? as3.as(CREATURELOCKER._creatures[Emberghoul.ID].props.health, Array) : null;
        let index: int = table ? table.indexOf(health) : -1;
        return (index >= 0 ? index + 1 : Math.max(1, Math.min(6, requested || 1))) | 0;
    }

    private useOwnCanvas(): void {
        if (BYMConfig.instance.RENDERER_ON) {
            if (this._rasterData) {
                this._rasterData.clear();
            }
        } else if (Boolean(this._graphicMC) && Boolean(this._graphicMC.parent)) {
            this._graphicMC.parent.removeChild(this._graphicMC);
        }
        this._graphic = new BitmapData(Emberghoul.FRAME_W, Emberghoul.FRAME_H, true, 0);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = -Emberghoul.FEET_X;
        this._graphicMC.y = -Emberghoul.FEET_Y;
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
        this._lastFrame = -1;
    }
}

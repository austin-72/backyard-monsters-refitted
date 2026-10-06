import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, BYMConfig, CREATURELOCKER, CREATURES, CreepBase, MonsterBase, RasterData, SOUNDS, SPRITES, WarCry } from "@game";

/**
 * Inferno-only: Ashkarr, the Ember Herald (IC24), Moloch's warlord (the user's ASHKARR.md). A champion-class
 * monster: Strongbox page 5 with Korath and Drull, 600 housing, trained to level 6 in the Academy.
 *
 * Every 10 seconds in battle she roars (WarCry): her side's monsters within 300 move faster for 11 seconds, so
 * one that stays near her keeps it from roar to roar (x1.20 at level 1 to x1.35 at level 6; several Ashkarrs
 * never add up, the strongest boost counts), and the other side's monsters within 300 are rooted for 7
 * seconds (they still attack what they can reach).
 *
 * Drawn from her own sheet (monsters/ashkarr.png): 16 facings of 188 x 128, column = facing / 22.5 with 0
 * facing right and 90 facing the camera (as the game's rotation counts); rows 0-9 walk, 10-19 attack,
 * 20-29 the war-cry (while she roars), 30-37 idle. Her feet are at (94, 102) in a frame.
 */
export class Ashkarr extends CreepBase {
    static {
        as3.fields(this, { m_level: 1, m_ready: false, m_lastCell: -1, m_still: false, roarTicks: 0 });
    }

    public static readonly ID: string = "IC24";

    public static readonly FRAME_W: int = 188;

    public static readonly FRAME_H: int = 128;

    public static readonly FEET_X: int = 94;

    public static readonly FEET_Y: int = 102;

    /** The war-cry per level: how much faster her side moves (1-6). */
    public static readonly BOOST: any[] = [1.2, 1.22, 1.25, 1.28, 1.31, 1.35];

    public static readonly RADIUS: number = 300;

    /**
     * Game steps (80 a second): a roar every 10 seconds; the boost lasts 11 (so a monster that stays in range
     * keeps it from one roar to the next), the root 7.
     */
    public static readonly COOLDOWN_TICKS: int = 800;

    public static readonly BOOST_TICKS: int = 880;

    public static readonly ROOT_TICKS: int = 560;

    /** The roar's 10 frames, 8 steps each. */
    public static readonly ROAR_TICKS: int = 80;
    private m_level: int;
    private m_ready: boolean;
    private m_lastCell: int;
    /** Not moving (held still, e.g. rooted): she stands instead of walking on the spot. */
    private m_still: boolean;
    /** Steps of the roar left to show; 0 when she isn't roaring. */
    public roarTicks: int;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this.m_level = Ashkarr.levelOf(param5, this._friendly);
        this.useOwnGraphic();
        this.m_ready = true;
        this.addComponent(new WarCry(this, Ashkarr.RADIUS, Ashkarr.COOLDOWN_TICKS, Number(Ashkarr.BOOST[this.m_level - 1]), Ashkarr.BOOST_TICKS, Ashkarr.ROOT_TICKS));
    }

    public get level(): int {
        return this.m_level;
    }

    /** The level she was made at: her health is unique to one level of the table. */
    private static levelOf(requested: int, friendly: boolean): int {
        let health: number = CREATURES.GetProperty(Ashkarr.ID, "health", requested, friendly);
        let table: any[] = CREATURELOCKER._creatures[Ashkarr.ID] ? as3.as(CREATURELOCKER._creatures[Ashkarr.ID].props.health, Array) : null;
        let index: int = table ? table.indexOf(health) : -1;
        return (index >= 0 ? index + 1 : Math.max(1, Math.min(6, requested || 1))) | 0;
    }

    /** CreepBase made a 52 x 50 monster bitmap; her frames are 188 x 128, drawn with her feet on the spot. */
    private useOwnGraphic(): void {
        SPRITES.SetupSprite(Ashkarr.ID);
        if (BYMConfig.instance.RENDERER_ON) {
            if (this._rasterData) {
                this._rasterData.clear();
            }
        } else if (Boolean(this._graphicMC) && Boolean(this._graphicMC.parent)) {
            this._graphicMC.parent.removeChild(this._graphicMC);
        }
        this._graphic = new BitmapData(Ashkarr.FRAME_W, Ashkarr.FRAME_H, true, 0);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = -Ashkarr.FEET_X;
        this._graphicMC.y = -Ashkarr.FEET_Y;
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
    }

    /** Called by her WarCry when she roars: the war-cry rows play once through. */
    public roar(): void {
        this.roarTicks = Ashkarr.ROAR_TICKS;
        SOUNDS.Play("imonster" + ((1 + Math.random() * 4) | 0), 0.9);
    }

    /** Which animation shows now: "warcry", "attack", "idle" or "walking". */
    public get animation(): string {
        if (this.roarTicks > 0) {
            return "warcry";
        }
        if (this._attacking) {
            return "attack";
        }
        if (this._atTarget || this.m_still) {
            return "idle";
        }
        return "walking";
    }

    protected override tickState(param1: int = 1): boolean {
        if (this.roarTicks > 0) {
            this.roarTicks = Math.max(0, this.roarTicks - param1) | 0;
        }
        return super.tickState(param1);
    }

    protected override getNextSprite(): void {
        // CreepBase's constructor draws a first frame before her own canvas is made; skip that one.
        if (!this.m_ready) {
            return;
        }
        this.m_still = this.ioStandingStill();
        let column: int = (((this.m_rotation / 22.5) | 0) % 16) | 0;
        let row: int = 0;
        switch (this.animation) {
            case "warcry":
                row = (20 + Math.min(9, ((Ashkarr.ROAR_TICKS - this.roarTicks) / 8) | 0)) | 0;
                break;
            case "attack":
                row = (10 + ((this._frameNumber / 8) | 0) % 10) | 0;
                break;
            case "idle":
                row = (30 + ((this._frameNumber / 8) | 0) % 8) | 0;
                break;
            default:
                row = (((this._frameNumber / 8) | 0) % 10) | 0;
        }
        let cell: int = (row * 16 + column) | 0;
        if (cell != this.m_lastCell) {
            let sheet: any = SPRITES.GetSpriteDescriptor(Ashkarr.ID);
            if (!sheet || !sheet.image) {
                return;
            }
            this.m_lastCell = cell;
            SPRITES.GetFrameById(this._graphic, Ashkarr.ID, column, row);
        }
    }
}

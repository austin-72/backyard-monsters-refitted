import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, BYMConfig, CREATURELOCKER, CREATURES, CreepBase, IAttackable, ITargetable, IoFreezeEffect, IoIce, MonsterBase, RasterData, SOUNDS, SPRITES } from "@game";

/**
 * Hell Freezes Over: Rimegrave (IC25), the ice champion: a frost wendigo-elk with an ice-bone skull and
 * crystal antlers, sealed in the ice beside the player's yard and freed by winning the event's 13 waves. Then
 * unlocked in the Strongbox (page 5) and trained in the Academy to level 6 like Korath, Drull and Ashkarr.
 *
 * His look follows his Academy level: one sheet a level (monsters/rimegrave_1-6.png, sprites IC25_1-IC25_6),
 * 16 facings 22.5 degrees apart, row 0 standing, rows 1-8 the walk, rows 9-14 the attack. His hits carry the
 * ice powers (IoIce), attacking and defending: towers iced over, monsters frozen for a second.
 */
export class IoRimegrave extends CreepBase {
    static {
        as3.fields(this, { m_level: 1, m_ready: false, m_lastCell: -1, m_spriteID: null });
    }

    public static readonly ID: string = "IC25";

    /**
     * [frame width, frame height, feet x, feet y] for each level's sheet (the user's code_snippets; the smaller
     * sheets of 1 October, hfo_monsters_1.zip).
     */
    public static readonly SHEETS: any[] = [[86, 96, 43, 71], [102, 114, 51, 84], [118, 130, 59, 96], [134, 148, 67, 109], [148, 166, 74, 122], [164, 182, 82, 134]];
    private m_level: int;
    private m_ready: boolean;
    private m_lastCell: int;
    private m_spriteID: string;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this.m_level = IoRimegrave.levelOf(param5, this._friendly);
        this.m_spriteID = IoRimegrave.ID + "_" + this.m_level;
        this.useOwnGraphic();
        this.m_ready = true;
    }

    public get level(): int {
        return this.m_level;
    }

    /** The level he was made at: his health is unique to one level of the table. */
    private static levelOf(requested: int, friendly: boolean): int {
        let health: number = CREATURES.GetProperty(IoRimegrave.ID, "health", requested, friendly);
        let table: any[] = CREATURELOCKER._creatures[IoRimegrave.ID] ? as3.as(CREATURELOCKER._creatures[IoRimegrave.ID].props.health, Array) : null;
        let index: int = table ? table.indexOf(health) : -1;
        return (index >= 0 ? index + 1 : Math.max(1, Math.min(6, requested || 1))) | 0;
    }

    /** His reach (40-65) sets how close he gets; it isn't a shooting range: he strikes, he doesn't shoot. */
    public override get isRanged(): boolean {
        return false;
    }

    private useOwnGraphic(): void {
        let sheet: any[] = as3.cast(IoRimegrave.SHEETS[this.m_level - 1], Array);
        SPRITES.SetupSprite(this.m_spriteID);
        if (BYMConfig.instance.RENDERER_ON) {
            if (this._rasterData) {
                this._rasterData.clear();
            }
        } else if (Boolean(this._graphicMC) && Boolean(this._graphicMC.parent)) {
            this._graphicMC.parent.removeChild(this._graphicMC);
        }
        this._graphic = new BitmapData(sheet[0], sheet[1], true, 0);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = -sheet[2];
        this._graphicMC.y = -sheet[3];
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
    }

    protected override getNextSprite(): void {
        if (!this.m_ready) {
            return;
        }
        let column: int = ((((this.m_rotation < 0 ? this.m_rotation + 360 : this.m_rotation) / 22.5) | 0) % 16) | 0;
        let row: int = 0;
        let still: boolean = this.ioStandingStill();
        let frozen: boolean = this.getComponentByName(IoFreezeEffect.NAME) != null;
        if (this.health > 0 && !frozen && (this._attacking || this._atTarget)) {
            // (at his target he strikes, between blows too: no still frame while fighting)
            row = (9 + ((this._frameNumber / 8) | 0) % 6) | 0;
        } else if (this.health > 0 && !frozen && !still) {
            row = (1 + ((this._frameNumber / 8) | 0) % 8) | 0;
        }
        let cell: int = (row * 16 + column) | 0;
        if (cell != this.m_lastCell) {
            let sheet: any = SPRITES.GetSpriteDescriptor(this.m_spriteID);
            if (!sheet || !sheet.image) {
                return;
            }
            this.m_lastCell = cell;
            SPRITES.GetFrameById(this._graphic, this.m_spriteID, column, row);
        }
    }

    protected override attacked(param1: IAttackable, param2: number, param3: ITargetable = null): void {
        super.attacked(param1, param2, param3);
        // his reach: each strike is thrown as an ice orb that flies to the target, and the ice lands with it
        IoIce.attacked(this, param1, param3 != null ? param3 : IoIce.orb(this, param1));
    }

    public override deathSplat(): void {
        SOUNDS.Play("quake", 0.3);
        IoIce.burst(this._tmpPoint.x, this._tmpPoint.y, null);
    }
}

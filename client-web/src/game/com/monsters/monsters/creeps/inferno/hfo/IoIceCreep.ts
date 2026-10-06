import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable } from "flash/display";
import { Point } from "flash/geom";
import { BFOUNDATION, BYMConfig, CREATURELOCKER, CREATURES, CreepBase, DeathSplit, IAttackable, ITargetable, IoFreezeEffect, IoIce, MonsterBase, RasterData, SOUNDS, SPRITES } from "@game";

/**
 * Hell Freezes Over: the ice cretins (IC26-IC31; CREATURELOCKER ioAddHfoMonsters), the event's waves.
 *
 * Each is drawn from its own sheet (monsters/<name>.png, the user's hfo_monsters.zip): 30 facings 12 degrees
 * apart (column 0 facing right, turning clockwise, as the game's rotation counts), row 0 standing and the
 * rows after it the walk (the Sleetwing's flap). There are no separate attack or death frames: they walk on
 * the spot as they strike, like the Inferno's own. SHEETS gives each frame's size and where the feet are.
 *
 * Their hits carry the ice powers (IoIce). The Permafrost Hulk shatters into Shivlings when it falls
 * (DeathSplit, its "splits"). The Sleetwing's blow from the air is thrown as an ice orb (IoIce.orb).
 * The Shivling, Slushgut, Rimeclaw and Permafrost Hulk stand while they strike (NO_WALK_STRIKE: the user's, 4
 * October); the others step through their walk rows (they have no attack frames).
 */
export class IoIceCreep extends CreepBase {
    static {
        as3.fields(this, { m_sheet: null, m_ready: false, m_lastCell: -1 });
    }

    /** [frame width, frame height, feet x, feet y, walk rows] for each sheet. */
    public static readonly SHEETS: any = { "IC26": [32, 34, 16, 26, 2], "IC27": [60, 48, 30, 33, 4], "IC28": [60, 52, 30, 36, 4], "IC29": [60, 50, 30, 25, 8], "IC30": [56, 48, 28, 34, 4], "IC31": [84, 76, 42, 52, 4] };

    /** Monsters drawn standing, not walking on the spot, while they strike. */
    public static readonly NO_WALK_STRIKE: any = { "IC26": true, "IC27": true, "IC28": true, "IC31": true };
    protected m_sheet: any[];
    protected m_ready: boolean;
    private m_lastCell: int;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this.m_sheet = as3.cast(as3.as(IoIceCreep.SHEETS[this._creatureID], Array) || IoIceCreep.SHEETS["IC26"], Array);
        this.useOwnGraphic();
        this.m_ready = true;
        if (CREATURES.GetProperty(this._creatureID, "splits", 0, this._friendly) > 0) {
            this.addComponent(new DeathSplit(this, CREATURELOCKER.SHIVLING_ID));
        }
    }

    /** CreepBase made a 52 x 50 monster bitmap; these frames are their own size, drawn with the feet on the spot. */
    protected useOwnGraphic(): void {
        SPRITES.SetupSprite(this._creatureID);
        if (BYMConfig.instance.RENDERER_ON) {
            if (this._rasterData) {
                this._rasterData.clear();
            }
        } else if (Boolean(this._graphicMC) && Boolean(this._graphicMC.parent)) {
            this._graphicMC.parent.removeChild(this._graphicMC);
        }
        this._graphic = new BitmapData(this.m_sheet[0], this.m_sheet[1], true, 0);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = -this.m_sheet[2];
        this._graphicMC.y = -this.m_sheet[3] - (this._movement == "fly" ? this._altitude : 0);
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
    }

    protected override getNextSprite(): void {
        // CreepBase's constructor draws a first frame before this class has made its own canvas; skip that one.
        if (!this.m_ready) {
            return;
        }
        if (this._movement == "fly" || this._movement == "fly_low") {
            SPRITES.GetSprite(this._shadow, "shadow", "shadow", 0);
        }
        let walkRows: int = this.m_sheet[4] | 0;
        let column: int = ((((this.m_rotation < 0 ? this.m_rotation + 360 : this.m_rotation) / 12) | 0) % 30) | 0;
        let row: int = 0;
        if (this._movement == "fly") {
            row = (this.health > 0 ? ((this._frameNumber / 8) | 0) % walkRows + 1 : 0) | 0;
        } else if (this.health > 0 && IoIceCreep.NO_WALK_STRIKE[this._creatureID]) {
            // standing while it strikes (and when it stops or is frozen); walking only when it walks
            if (!this.ioFrozen() && !this._attacking && !this._atTarget && !this.ioStandingStill()) {
                row = (((this._frameNumber / 8) | 0) % walkRows + 1) | 0;
            }
        } else if (this.health > 0 && !this.ioFrozen() && (this.ioStandingStill() ? this._attacking || this._atTarget : true)) {
            // (at its target it keeps stepping: these sheets have no attack frames, and a still frame read as
            // a monster doing nothing; frozen by an ice hit, it is still)
            row = (((this._frameNumber / 8) | 0) % walkRows + 1) | 0;
        }
        let cell: int = (row * 30 + column) | 0;
        if (cell != this.m_lastCell) {
            let sheet: any = SPRITES.GetSpriteDescriptor(this._creatureID);
            if (!sheet || !sheet.image) {
                return;
            }
            this.m_lastCell = cell;
            SPRITES.GetFrameById(this._graphic, this._creatureID, column, row);
        }
    }

    /** Held by an ice hit (IoFreezeEffect). */
    private ioFrozen(): boolean {
        return this.getComponentByName(IoFreezeEffect.NAME) != null;
    }

    protected override tickState(param1: int = 1): boolean {
        let done: boolean = super.tickState(param1);
        // CreepBase holds a flyer at its altitude with the stock frame's feet (36 down); this frame's are elsewhere
        if (this._movement == "fly" && this.health > 0 && this._behaviour !== MonsterBase.k_sBHVR_PEN && this._graphicMC) {
            this._graphicMC.y += 36 - this.m_sheet[3];
        }
        return done;
    }

    protected override attacked(param1: IAttackable, param2: number, param3: ITargetable = null): void {
        super.attacked(param1, param2, param3);
        if (param3 == null && this._creatureID == CREATURELOCKER.SLEETWING_ID) {
            // its blow from the air, thrown as an ice orb; the ice lands with it
            IoIce.attacked(this, param1, IoIce.orb(this, param1));
            return;
        }
        IoIce.attacked(this, param1, param3);
    }

    public override deathSplat(): void {
        SOUNDS.Play("ihit" + ((1 + Math.random() * 7) | 0), 0.4);
        IoIce.burst(this._tmpPoint.x, this._tmpPoint.y - this._altitude, null);
    }
}

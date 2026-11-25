import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, GLOBAL, IoCrucible, KEYS } from "@game";

/**
 * Inferno-only (11 November): the Soul Crucible (building 172), where surplus bone, coal, sulfur or magma is poured
 * into the fire and another of the four taken back, less a fee. Its info panel opens the window (IoCrucible);
 * every pour is worked out on the server (server/src/services/crucible), this only shows it. Six levels: each
 * raises the share of the yard's storage that may be poured in a day. Main yard only (not in the outpost build
 * lists).
 *
 * Art: server/public/assets/buildings/isoulcrucible (art/soulcrucible makes it), a look for each level. One
 * animation layer (the pool, the lava ring, the flames; 30 frames), played at one frame every 3 game frames.
 */
export class SOULCRUCIBLE extends BFOUNDATION {
    static {
        as3.fields(this, { _frameNumber: 0 });
    }

    public static readonly ID: int = 172;

    /** The label of the info panel's button that opens the Crucible. */
    public static readonly OPEN_BUTTON: string = "btn_opensoulcrucible";
    private _frameNumber: int;

    public $ctor(): void {
        super.$ctor();
        this._type = SOULCRUCIBLE.ID;
        this._footprint = [new Rectangle(0, 0, 90, 90)];
        this._gridCost = [[new Rectangle(0, 0, 90, 90), 10], [new Rectangle(10, 10, 70, 70), 200]];
        this.SetProps();
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (GLOBAL._render && this._countdownBuild.Get() == 0 && this._frameNumber % 3 == 0) {
            this.AnimFrame(true);
        }
        ++this._frameNumber;
        // a resource nearly full: a line at the top offers to pour it (the player's own main yard only)
        IoCrucible.nearFull(this);
    }

    public override Description(): void {
        super.Description();
        this._buildingTitle = KEYS.Get("io_cru_name");
        this._buildingDescription = KEYS.Get("io_cru_desc");
        let level: int = this._lvl.Get() | 0;
        let share: number = IoCrucible.capShare(level);
        this._specialDescription = share > 0 ? KEYS.Get("io_cru_special", { "v1": level, "v2": Math.round(share * 100) }) : "";
    }
}

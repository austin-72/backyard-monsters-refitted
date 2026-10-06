import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, CasinoWindow, GLOBAL } from "@game";

/**
 * Inferno-only: the Brimstone Pit (building 141), Moloch's gambling den. Its info panel opens the
 * casino (com/monsters/casino/CasinoWindow); every game is played on the server (server/src/services/
 * casino), this only shows it. Main yard only (not in the outpost build lists).
 *
 * Art: server/public/assets/buildings/ibrimstonepit (art/brimstonepit makes it). Two animation layers:
 * anim (the lava trough, the door glow, the skull's eyes, 60 frames) and anim2 (the dice bouncing in
 * their bubble, 80 frames), both played at one frame every 3 game frames.
 */
export class BRIMSTONEPIT extends BFOUNDATION {
    static {
        as3.fields(this, { _frameNumber: 0 });
    }

    public static readonly ID: int = 141;

    /** The label of the info panel's button that opens the casino. */
    public static readonly OPEN_BUTTON: string = "btn_openbrimstonepit";
    private _frameNumber: int;

    public $ctor(): void {
        super.$ctor();
        this._type = BRIMSTONEPIT.ID;
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
    }

    public override Description(): void {
        super.Description();
        this._buildingTitle = "Brimstone Pit";
        this._buildingDescription = "Moloch's own gambling den. Wager Shiny against the house. The house always wins... usually.";
        this._specialDescription = "Level " + this._lvl.Get() + ": " + CasinoWindow.gamesAtLevel(this._lvl.Get() | 0);
    }
}

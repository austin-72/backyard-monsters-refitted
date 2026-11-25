import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, GLOBAL } from "@game";

/**
 * Inferno-only: the Devil's Arcade (building 142). Its info panel opens the arcade's window
 * (com/monsters/arcade/ArcadeWindow): fifteen games, alone or against other players, for the arcade's own
 * leaderboards. Main yard only (not in the outpost build lists). One level.
 *
 * Art: server/public/assets/buildings/idevilsarcade (art/devilsarcade makes it). One animation layer: the
 * marquee's bulbs chasing round the door, the screens playing, the cabinets' buttons blinking, the joystick's
 * ball glowing (48 frames, one every 3 game frames).
 */
export class DEVILSARCADE extends BFOUNDATION {
    static {
        as3.fields(this, { _frameNumber: 0 });
    }

    public static readonly ID: int = 142;

    /** The label of the info panel's button that opens the arcade. */
    public static readonly OPEN_BUTTON: string = "btn_opendevilsarcade";
    private _frameNumber: int;

    public $ctor(): void {
        super.$ctor();
        this._type = DEVILSARCADE.ID;
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
        this._buildingTitle = "Devil's Arcade";
        this._buildingDescription = "Moloch's hall of games. Fifteen cabinets, played alone or against other players, for glory on the arcade's leaderboards.";
        this._specialDescription = "Hellgate Defense, Siege, Wormzer, Fusebug Blast, Balthazar's Flight, Spurtz Smash and Magma Breakout.";
    }
}

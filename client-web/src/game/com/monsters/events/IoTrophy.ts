import { int } from "as3";
import { BDECORATION, IoTrophies } from "@game";

/**
 * Inferno-only (10 October): an event trophy in the yard (buildings 146 to 149: IoTrophies). In the player's own
 * yard it always stands at the level the server says it was won at (a totem grows as more waves are won); seen
 * in someone else's yard, at the level saved with that yard.
 */
export class IoTrophy extends BDECORATION {
    public $ctor(param1?: int): void {
        super.$ctor(param1);
        this.ioLevel();
    }

    private ioLevel(): void {
        if (!IoTrophies.own()) {
            return;
        }
        let lvl: int = IoTrophies.level(this._type);
        if (lvl > 0 && this._lvl && this._lvl.Get() != lvl) {
            this._lvl.Set(lvl);
            this._hpLvl = lvl;
        }
    }

    public override Tick(param1: int): void {
        super.Tick(param1);
        this.ioLevel();
    }

    public override Constructed(): void {
        super.Constructed();
        this.ioLevel();
    }
}

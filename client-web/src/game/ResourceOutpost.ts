import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, GLOBAL, ICoreBuilding, MapRoom3Cell } from "@game";

export class ResourceOutpost extends BFOUNDATION implements ICoreBuilding {
    static {
        as3.implement(this, [ICoreBuilding]);
    }

    public static readonly k_TYPE: int = 139;

    public $ctor(): void {
        super.$ctor();
        this._footprint = [new Rectangle(0, 0, 130, 130)];
        this._gridCost = [[new Rectangle(0, 0, 130, 130), 10], [new Rectangle(10, 10, 110, 110), 200]];
        this._type = ResourceOutpost.k_TYPE;
        this.SetProps();
    }

    public get resourcesPerSecond(): int {
        if (as3.as(GLOBAL._currentCell, MapRoom3Cell) == null || !this._buildingProps.rps || this._buildingProps.rps.length < (((as3.as(GLOBAL._currentCell, MapRoom3Cell)).baseLevel * 0.1 - 1) | 0)) {
            return 0;
        }
        return this._buildingProps.rps[((as3.as(GLOBAL._currentCell, MapRoom3Cell)).baseLevel * 0.1 - 1) | 0] | 0;
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        GLOBAL.setTownHall(this);
    }

    public override Cancel(): void {
        GLOBAL.setTownHall(null);
        super.Cancel();
    }

    public override Constructed(): void {
        super.Constructed();
        GLOBAL.setTownHall(this);
    }

    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        this.AnimFrame();
    }
}

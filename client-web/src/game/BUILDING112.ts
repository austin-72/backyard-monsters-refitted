import * as as3 from "as3";
import { int } from "as3";
import { Event, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, BSTORAGE, GLOBAL, ICoreBuilding, KEYS, MAP, MapRoomManager, WMBASE } from "@game";

export class BUILDING112 extends BSTORAGE implements ICoreBuilding {
    static {
        as3.implement(this, [ICoreBuilding]);
        as3.fields(this, { _ioFrame: 0 });
    }

    private _ioFrame: int;

    public $ctor(): void {
        super.$ctor();
        this._type = 112;
        this._footprint = [new Rectangle(0, 0, 130, 130)];
        this._gridCost = [[new Rectangle(0, 0, 130, 130), 10], [new Rectangle(10, 10, 110, 110), 200]];
        this._spoutPoint = new Point(0, -55);
        this._spoutHeight = 115;
        this.SetProps();
    }

    /** Inferno-only: the hall's fire and banner (its anim strip, 24 frames), a frame every 3 steps. */
    public override TickFast(param1: Event = null): void {
        super.TickFast(param1);
        if (GLOBAL._render && this._animLoaded && this._ioFrame % 3 == 0) {
            this.AnimFrame();
        }
        ++this._ioFrame;
    }

    public override Repair(): void {
        super.Repair();
    }

    public override Place(param1: MouseEvent = null): void {
        if (!MAP._dragged) {
            super.Place(param1);
            this._hasResources = true;
        }
    }

    public override Cancel(): void {
        GLOBAL.setTownHall(null);
        super.Cancel();
    }

    public override Recycle(): void {
        GLOBAL.Message(KEYS.Get("msg_recycleoutpost"));
    }

    public override RecycleB(param1: MouseEvent = null): void {
        GLOBAL.Message(KEYS.Get("msg_recycleoutpost"));
    }

    public override RecycleC(): void {
        GLOBAL.Message(KEYS.Get("msg_recycleoutpost"));
    }

    public override Destroyed(param1: boolean = true): void {
        super.Destroyed(param1);
        if ((!MapRoomManager.instance.isInMapRoom2or3 || BASE.usesInfernoBackend) && GLOBAL.mode == "wmattack") {
            WMBASE._destroyed = true;
        }
    }

    public override Description(): void {
        super.Description();
        this._buildingDescription = KEYS.Get("outpost_upgradedesc");
        this._recycleDescription = KEYS.Get("th_recycledesc");
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Constructed(): void {
        super.Constructed();
        GLOBAL.setTownHall(this);
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        GLOBAL.setTownHall(this);
    }
}

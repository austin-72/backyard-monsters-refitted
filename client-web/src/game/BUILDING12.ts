import * as as3 from "as3";
import { int } from "as3";
import { MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { BFOUNDATION, GLOBAL, KEYS } from "@game";

export class BUILDING12 extends BFOUNDATION {
    public $ctor(): void {
        super.$ctor();
        this._type = 12;
        this._footprint = [new Rectangle(0, 0, 70, 70)];
        this._gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
        this.SetProps();
    }

    public override Tick(param1: int): void {
        if (this._countdownBuild.Get() > 0 || this.health < this.maxHealth * 0.5) {
            this._canFunction = false;
        } else {
            this._canFunction = true;
        }
        super.Tick(param1);
    }

    public Fund(): void {
    }

    public override Place(param1: MouseEvent = null): void {
        super.Place(param1);
    }

    public override Cancel(): void {
        GLOBAL._bStore = null;
        super.Cancel();
    }

    public override RecycleC(): void {
        GLOBAL._bStore = null;
        return super.RecycleC();
    }

    public override Description(): void {
        super.Description();
        this._buildingTitle = KEYS.Get("#b_generalstore#");
        this._buildingDescription = KEYS.Get("building_generalstore_desc1");
        this._specialDescription = KEYS.Get("building_generalstore_desc2", { "v1": GLOBAL._resourceNames[4] });
    }

    public override Update(param1: boolean = false): void {
        super.Update(param1);
    }

    public override Upgraded(): void {
        super.Upgraded();
    }

    public override Constructed(): void {
        GLOBAL._bStore = this;
        super.Constructed();
    }

    public override Setup(param1: any): void {
        super.Setup(param1);
        if (this._countdownBuild.Get() <= 0) {
            GLOBAL._bStore = this;
        }
    }
}

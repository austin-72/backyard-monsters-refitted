import * as as3 from "as3";
import { Vector } from "as3";
import { Point } from "flash/geom";
import { BASE, BFOUNDATION, BlackSpurtzCannon, GLOBAL, GRID, InstanceManager, Reward, SpurtzCannon } from "@game";

export class SpurtzCannonReward3 extends Reward {
    public static readonly ID: string = "spurtzCannonReward3";

    public $ctor(): void {
        super.$ctor();
    }

    protected override onApplication(): void {
        let _loc2_: BFOUNDATION = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(SpurtzCannon);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_ instanceof BlackSpurtzCannon === false) {
                this.swapBuildings(_loc2_, BASE.addBuildingC(BlackSpurtzCannon.TYPE));
            }
        }
        GLOBAL._buildingProps[BlackSpurtzCannon.TYPE - 1].block = false;
        GLOBAL._buildingProps[BlackSpurtzCannon.TYPE - 1].quantity = [2];
        GLOBAL._buildingProps[SpurtzCannon.TYPE - 1].block = true;
    }

    public override removed(): void {
        GLOBAL._buildingProps[BlackSpurtzCannon.TYPE - 1].block = true;
    }

    public override reset(): void {
        if (this.canBeApplied()) {
            this.removed();
        }
    }

    private swapBuildings(param1: BFOUNDATION, param2: BFOUNDATION): void {
        let _loc3_: Point = GRID.FromISO(param1.x, param1.y);
        let _loc4_: any = { "X": _loc3_.x, "Y": _loc3_.y, "t": param2._type, "id": param1._id, "l": param1._lvl.Get() };
        param1.RecycleC();
        param2.Setup(_loc4_);
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }
}

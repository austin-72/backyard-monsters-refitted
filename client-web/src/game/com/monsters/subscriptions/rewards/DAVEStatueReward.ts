import * as as3 from "as3";
import { Vector, int } from "as3";
import { BFOUNDATION, BUILDINGBUTTON, GLOBAL, InstanceManager, InventoryManager, Reward } from "@game";

export class DAVEStatueReward extends Reward {
    public static readonly ID: string = "daveStatue";

    public static readonly DAVE_STATUE_TYPE_ID: int = 135;

    private static readonly DAVE_STATUE_BUILDING_PROPS_INDEX: int = (DAVEStatueReward.DAVE_STATUE_TYPE_ID - 1) | 0;

    public $ctor(): void {
        super.$ctor();
    }

    public static unlockTeaserInformation(param1: Function): void {
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].block = false;
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].locked = true;
        BUILDINGBUTTON.setOnClickedWhenLockedCallback(DAVEStatueReward.DAVE_STATUE_TYPE_ID, param1);
    }

    public static doesStatueRewardExistsInInventory(): boolean {
        return InventoryManager.buildingStorageCount(DAVEStatueReward.DAVE_STATUE_TYPE_ID) > 0;
    }

    public static findStatueRewardInWorld(): BFOUNDATION {
        let _loc2_: BFOUNDATION = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].cls);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_._type == DAVEStatueReward.DAVE_STATUE_TYPE_ID) {
                return _loc2_;
            }
        }
        return null;
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }

    protected override onApplication(): void {
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].block = true;
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].locked = false;
        let _loc1_: boolean = DAVEStatueReward.doesStatueRewardExistsInInventory();
        let _loc2_: any = DAVEStatueReward.findStatueRewardInWorld() != null;
        if (!_loc1_ && !_loc2_) {
            InventoryManager.buildingStorageAdd(DAVEStatueReward.DAVE_STATUE_TYPE_ID, 1);
        }
    }

    public override removed(): void {
        let _loc2_: BFOUNDATION = null;
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].block = false;
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].locked = true;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].cls);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (_loc2_._type == DAVEStatueReward.DAVE_STATUE_TYPE_ID) {
                _loc2_.RecycleC();
            }
        }
        InventoryManager.buildingStorageRemove(DAVEStatueReward.DAVE_STATUE_TYPE_ID);
    }

    public override reset(): void {
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].block = false;
        GLOBAL._buildingProps[DAVEStatueReward.DAVE_STATUE_BUILDING_PROPS_INDEX].locked = true;
    }
}

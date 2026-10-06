import * as as3 from "as3";
import { Vector, int } from "as3";
import { ACADEMY, BUILDING26, CREATURELOCKER, GLOBAL, InstanceManager, KEYS, KeywordMessage, POPUPS, com_monsters_frontPage_messages_Message as Message } from "@game";

export class Underused02Academy extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("idleacademy", "btn_open");
        this.imageURL = Message._IMAGE_DIRECTORY + KeywordMessage.PREFIX + "academy.jpg";
    }

    public override get areRequirementsMet(): boolean {
        return Boolean(GLOBAL._bAcademy && this.hasIdleAcademy() && GLOBAL.townHall._lvl.Get() >= 3 && GLOBAL.Timestamp() - GLOBAL.StatGet("CM5") > 60 * 60 * 24 * 5 && Boolean(this.hasUpgradableMonster()));
    }

    protected override onView(): void {
        GLOBAL.StatSet("CM5", GLOBAL.Timestamp());
    }

    protected override onButtonClick(): void {
        ACADEMY.Show(GLOBAL._bAcademy);
        POPUPS.Next();
    }

    private hasUpgradableMonster(): string {
        let _loc4_: string = null;
        let _loc5_: any = null;
        let _loc6_: int = 0;
        let _loc1_: any = CREATURELOCKER.GetAppropriateCreatures();
        let _loc2_: int = GLOBAL._bAcademy._lvl.Get() | 0;
        let _loc3_: any = _loc2_ >= GLOBAL._buildingProps[ACADEMY.ID - 1].costs.length;
        for (_loc4_ in _loc1_) {
            _loc5_ = GLOBAL.player.m_upgrades[_loc4_];
            if (!_loc5_) {
                return null;
            }
            if ((_loc6_ = _loc5_.level | 0) < _loc2_ || _loc6_ == _loc2_ && !_loc3_ && _loc2_ >= _loc1_[_loc4_].page && !GLOBAL.player.m_upgrades[_loc4_].time) {
                return KEYS.Get(as3.str(_loc1_[_loc4_].name));
            }
        }
        return null;
    }

    private hasIdleAcademy(): boolean {
        let _loc2_: BUILDING26 = null;
        let _loc1_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING26);
        for (_loc2_ of (_loc1_ ?? [])) {
            if (!_loc2_._upgrading) {
                return true;
            }
        }
        return false;
    }
}

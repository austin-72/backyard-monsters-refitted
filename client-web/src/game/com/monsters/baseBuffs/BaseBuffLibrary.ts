import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { AllianceArmamentBuff, AllianceConquestBuff, AllianceDeclareWarBuff, AutoBankBaseBuff, BaseBuff, BuildingDefenseBuff, Console, MonsterAttackDamageBuff, MonsterDamageBuff, MonsterDefenseDamageBuff, ResourceCapacityBaseBuff, TowerDamageBuff } from "@game";

export class BaseBuffLibrary extends ASObject {
    public static readonly k_ATTACKING: string = "attacking";

    public static readonly k_DEFENDING: string = "defending";

    private static m_buffTypes: any = {};

    public $ctor(): void {
        super.$ctor();
    }

    public static initialize(): void {
        BaseBuffLibrary.addBaseBuff(TowerDamageBuff.ID, new BuffData(TowerDamageBuff));
        BaseBuffLibrary.addBaseBuff(BuildingDefenseBuff.ID, new BuffData(BuildingDefenseBuff));
        BaseBuffLibrary.addBaseBuff(MonsterDamageBuff.ID, new BuffData(MonsterAttackDamageBuff, BaseBuffLibrary.k_ATTACKING), new BuffData(MonsterDefenseDamageBuff, BaseBuffLibrary.k_DEFENDING));
        BaseBuffLibrary.addBaseBuff(AllianceArmamentBuff.ID, new BuffData(AllianceArmamentBuff));
        BaseBuffLibrary.addBaseBuff(AllianceConquestBuff.ID, new BuffData(AllianceConquestBuff));
        BaseBuffLibrary.addBaseBuff(ResourceCapacityBaseBuff.ID, new BuffData(ResourceCapacityBaseBuff));
        BaseBuffLibrary.addBaseBuff(AutoBankBaseBuff.ID, new BuffData(AutoBankBaseBuff));
        BaseBuffLibrary.addBaseBuff(AllianceDeclareWarBuff.ID, new BuffData(AllianceDeclareWarBuff));
    }

    private static addBaseBuff(param1: uint, ...rest: any[]): void {
        let _loc4_: BuffData = null;
        if (BaseBuffLibrary.m_buffTypes[param1]) {
            Console.print("You tried to add the BaseBuff(" + param1 + ") that already exists");
            return;
        }
        let _loc3_: int = 0;
        while (_loc3_ < rest.length) {
            _loc4_ = as3.cast(rest[_loc3_], BuffData);
            rest[_loc4_.state] = _loc4_;
            _loc3_++;
        }
        BaseBuffLibrary.m_buffTypes[param1] = rest;
    }

    public static getBuffByID(param1: uint, param2: string = ""): BaseBuff {
        let _loc4_: BuffData = null;
        let _loc5_: BaseBuff = null;
        if (!param2) {
            param2 = BaseBuffLibrary.k_DEFENDING;
        }
        let _loc3_: any[] = as3.cast(BaseBuffLibrary.m_buffTypes[param1], Array);
        if (_loc3_) {
            _loc4_ = as3.cast(_loc3_[param2], BuffData);
            if (_loc4_) {
                (_loc5_ = as3.as(new _loc4_.type(), BaseBuff)).id = param1;
                return _loc5_;
            }
        }
        Console.print("There is no BassBuff in the BaseBuffLibrary with an id of " + param1 + " for the state " + param2);
        return null;
    }
}

class BuffData extends ASObject {
    static {
        as3.fields(this, { type: null, state: null });
    }

    public type: any;
    public state: string;

    public $ctor(param1?: any, param2: string = ""): void {
        super.$ctor();
        this.type = param1;
        if (!param2) {
            param2 = BaseBuffLibrary.k_DEFENDING;
        }
        this.state = param2;
    }
}

import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { CreepType, SingletonLock } from "@game";

export class CreepTypeManager extends ASObject {
    static {
        as3.fields(this, { m_CreepTypes: null });
    }

    private static s_Instance: CreepTypeManager = null;
    private m_CreepTypes: Vector<CreepType>;

    public $ctor(param1?: SingletonLock): void {
        this.m_CreepTypes = new Vector<CreepType>(0, false, CreepType);
        super.$ctor();
    }

    public static get instance(): CreepTypeManager {
        return CreepTypeManager.s_Instance = CreepTypeManager.s_Instance || new CreepTypeManager(new SingletonLock());
    }

    public RegisterCreepType(param1: CreepType): void {
        if (this.m_CreepTypes.indexOf(param1) == -1) {
            this.m_CreepTypes.push(param1);
        }
    }

    public DeregisterCreepType(param1: CreepType): void {
        let _loc2_: int = this.m_CreepTypes.indexOf(param1) | 0;
        if (_loc2_ != -1) {
            this.m_CreepTypes.splice(_loc2_, 1);
        }
    }

    public AddExposedCreepTypes(param1: any): void {
        let _loc4_: CreepType = null;
        let _loc2_: uint = this.m_CreepTypes.length >>> 0;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            _loc4_ = as3.vget(this.m_CreepTypes, _loc3_);
            if (param1[_loc4_.id] != null) {
                _loc4_.dependent = as3.str(param1[_loc4_.id].dependent);
                _loc4_.type = as3.str(param1[_loc4_.id].type);
                _loc4_.movement = as3.str(param1[_loc4_.id].movement);
                _loc4_.pathing = as3.str(param1[_loc4_.id].pathing);
                _loc4_.blocked = Boolean(param1[_loc4_.id].blocked);
                _loc4_.classType = param1[_loc4_.id].classType;
            }
            param1[_loc4_.id] = _loc4_;
            _loc3_++;
        }
    }
}

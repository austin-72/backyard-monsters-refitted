import * as as3 from "as3";
import { Event } from "flash/events";
import { BFOUNDATION, ITargetable } from "@game";

export class ProjectileEvent extends Event {
    static {
        as3.fields(this, { m_targetCreep: null, m_targetBuilding: null });
    }

    public static readonly k_hit: string = "projectileHit";
    public m_targetCreep: ITargetable;
    public m_targetBuilding: BFOUNDATION;

    public $ctor(param1?: string, param2?: any /* ITargetable */, param3: any /* BFOUNDATION */ = null): void {
        super.$ctor(param1);
        this.m_targetCreep = param2;
        this.m_targetBuilding = param3;
    }
}

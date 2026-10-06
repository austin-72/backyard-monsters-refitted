import * as as3 from "as3";
import { Event } from "flash/events";
import { MonsterBase } from "@game";

export class CreepEvent extends Event {
    static {
        as3.fields(this, { m_Creep: null });
    }

    public static readonly ATTACKING_MONSTER_SPAWNED: string = "attackingCreepSpawned";

    public static readonly DEFENDING_CREEP_SPAWNED: string = "defendingCreepSpawned";
    private m_Creep: MonsterBase;

    public $ctor(param1?: string, param2?: any /* MonsterBase */): void {
        super.$ctor(param1);
        this.m_Creep = param2;
    }

    public get creep(): MonsterBase {
        return this.m_Creep;
    }
}

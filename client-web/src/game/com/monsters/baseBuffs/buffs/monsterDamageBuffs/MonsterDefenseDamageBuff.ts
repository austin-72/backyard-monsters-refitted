import { CreepEvent, MonsterDamageBuff } from "@game";

export class MonsterDefenseDamageBuff extends MonsterDamageBuff {
    public $ctor(): void {
        super.$ctor(CreepEvent.DEFENDING_CREEP_SPAWNED);
    }
}

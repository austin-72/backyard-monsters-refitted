import { CreepEvent, MonsterDamageBuff } from "@game";

export class MonsterAttackDamageBuff extends MonsterDamageBuff {
    public $ctor(): void {
        super.$ctor(CreepEvent.ATTACKING_MONSTER_SPAWNED);
    }
}

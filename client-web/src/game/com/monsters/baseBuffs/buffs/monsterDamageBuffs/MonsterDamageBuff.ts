import * as as3 from "as3";
import { uint } from "as3";
import { BaseBuff, CreepEvent, GLOBAL, MultiplicationPropertyModifier } from "@game";

export class MonsterDamageBuff extends BaseBuff {
    static {
        as3.fields(this, { m_eventType: null });
    }

    public static readonly ID: uint = 5;
    private m_eventType: string;

    public $ctor(param1?: string): void {
        this.m_eventType = param1;
        super.$ctor("Monster Damage", "bufficons/monsterdamagebuff.png");
    }

    public override get description(): string {
        return "";
    }

    public override apply(): void {
        GLOBAL.eventDispatcher.addEventListener(this.m_eventType, as3.bind(this, this.spawnedDefendingCreep));
    }

    protected spawnedDefendingCreep(param1: CreepEvent): void {
        param1.creep.damageProperty.addModifier(new MonsterDamageMultiplier(this.getValue() * 0.01 + 1));
    }

    public override clear(): void {
        GLOBAL.eventDispatcher.removeEventListener(this.m_eventType, as3.bind(this, this.spawnedDefendingCreep));
    }
}

class MonsterDamageMultiplier extends MultiplicationPropertyModifier {
    public $ctor(param1?: number): void {
        super.$ctor(param1);
    }
}

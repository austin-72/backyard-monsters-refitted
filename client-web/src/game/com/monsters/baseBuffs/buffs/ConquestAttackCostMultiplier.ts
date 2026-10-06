import { AllianceConquestBuff, MultiplicationPropertyModifier } from "@game";

export class ConquestAttackCostMultiplier extends MultiplicationPropertyModifier {
    public $ctor(): void {
        super.$ctor(AllianceConquestBuff.k_AttackCostMultiplier);
    }
}

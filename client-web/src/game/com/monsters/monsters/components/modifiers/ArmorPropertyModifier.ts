import * as as3 from "as3";
import { Console, MultiplicationPropertyModifier } from "@game";

export class ArmorPropertyModifier extends MultiplicationPropertyModifier {
    public $ctor(param1?: number): void {
        if (param1 > 1 || param1 <= 0) {
            Console.warning("you are trying to add an armor multiplier of an invalid value (" + param1 + ")");
            param1 = 1;
        }
        super.$ctor(param1);
    }

    // The old implementation multiplied armor values, which makes combined armor worse than either buff alone.
    // The new formula compounds damage reductions, which is correct multiplicative stacking.
    public override modify(param1: number): number {
        // Original:
        // if(!param1) return multiple;
        // return super.modify(param1);
        // New:
        return 1 - (1 - param1) * (1 - this.multiple);
    }
}

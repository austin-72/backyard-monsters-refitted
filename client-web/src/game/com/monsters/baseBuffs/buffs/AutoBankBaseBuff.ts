import { uint } from "as3";
import { BaseBuff } from "@game";

export class AutoBankBaseBuff extends BaseBuff {
    public static readonly ID: uint = 2;

    public static readonly k_NAME: string = "AutoBank";

    public $ctor(): void {
        super.$ctor(AutoBankBaseBuff.k_NAME, "bufficons/resourcebuff.png");
    }

    public override get description(): string {
        return "";
    }

    public get value(): number {
        return this.getValue();
    }
}

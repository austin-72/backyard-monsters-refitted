import * as as3 from "as3";
import { uint } from "as3";
import { CREATURES, ChampionBase, Console, GLOBAL, Krallen, Reward } from "@game";

export class KrallenBuffReward extends Reward {
    static {
        as3.fields(this, { _MAX_BUFF_LEVEL: 5 });
    }

    public static readonly ID: string = "krallenBuffReward";
    private _MAX_BUFF_LEVEL: uint;

    public $ctor(): void {
        super.$ctor();
    }

    public override set value(param1: number) {
        param1 = Math.min(param1, this._MAX_BUFF_LEVEL);
        super.value = param1;
    }

    protected override onApplication(): void {
        this.updateChampionBuff(this._value >>> 0);
    }

    public override removed(): void {
        this.updateChampionBuff(0);
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }

    private updateChampionBuff(param1: uint): void {
        let _loc2_: ChampionBase = CREATURES.getGuardian(Krallen.TYPE);
        if (_loc2_) {
            _loc2_.levelSet(param1);
            _loc2_.export();
        } else {
            Console.warning("You are trying to setup the Krallen buff but you dont own a Krallen");
        }
    }

    public override get value(): any {
        return super.value;
    }
}

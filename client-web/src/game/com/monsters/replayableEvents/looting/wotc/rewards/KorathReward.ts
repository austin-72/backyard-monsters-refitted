import * as as3 from "as3";
import { BASE, CHAMPIONCAGE, CREATURES, ChampionBase, GLOBAL, Reward, SecNum, print } from "@game";

export class KorathReward extends Reward {
    public static readonly k_REWARD_ID: string = "KorathReward";

    private static readonly k_KORATH_TYPE: string = "G4";

    public $ctor(): void {
        super.$ctor();
    }

    public override set value(param1: number) {
        if (param1 < this._value) {
            print("You are trying to lower your Korath powerlevel reward, you\'re not supposed to do that");
            return;
        }
        super.value = param1;
    }

    protected override onApplication(): void {
        CHAMPIONCAGE._guardians[KorathReward.k_KORATH_TYPE].props.powerLevel = this._value;
        let _loc1_: ChampionBase = CREATURES.getGuardian(4);
        if (_loc1_) {
            _loc1_._powerLevel.Set(this._value);
        }
        let _loc2_: any = CHAMPIONCAGE.GetGuardianData(4);
        if (_loc2_) {
            _loc2_.pl = new SecNum(this._value);
        }
    }

    public override removed(): void {
        CHAMPIONCAGE._guardians[KorathReward.k_KORATH_TYPE].props.powerLevel = 0;
        let _loc1_: CHAMPIONCAGE = GLOBAL._bCage;
        if (Boolean(_loc1_) && Boolean(CHAMPIONCAGE.GetGuardianData(4))) {
            _loc1_.RemoveGuardian(4);
        }
        let _loc2_: any = CHAMPIONCAGE.GetGuardianData(4);
        if (_loc2_) {
            _loc2_.pl = new SecNum(0);
        }
    }

    public override reset(): void {
    }

    public override canBeApplied(): boolean {
        return !(GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || BASE.isInfernoMainYardOrOutpost);
    }

    public override importData(param1: any): void {
        super.importData(param1);
    }

    public override exportData(): any {
        if (this._value == 0) {
            print("you\'re trying to save a blank korath reward, why?");
        }
        return super.exportData();
    }

    public override get value(): any {
        return super.value;
    }
}

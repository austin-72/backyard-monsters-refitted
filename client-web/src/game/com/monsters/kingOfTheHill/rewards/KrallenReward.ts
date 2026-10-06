import * as as3 from "as3";
import { uint } from "as3";
import { CHAMPIONCAGE, CREATURES, ChampionBase, Console, GLOBAL, Krallen, Reward, SecNum } from "@game";

export class KrallenReward extends Reward {
    public static readonly ID: string = "krallenReward";

    public $ctor(): void {
        super.$ctor();
    }

    protected override onApplication(): void {
        this.updateKrallenStatus(this._value >>> 0);
    }

    public override removed(): void {
        let _loc1_: CHAMPIONCAGE = GLOBAL._bCage;
        if (Boolean(CHAMPIONCAGE.GetGuardianData(Krallen.TYPE)) && Boolean(_loc1_)) {
            _loc1_.RemoveGuardian(Krallen.TYPE);
        }
    }

    public override reset(): void {
    }

    public override canBeApplied(): boolean {
        return GLOBAL.isAtHome();
    }

    private updateKrallenStatus(param1: uint): void {
        let _loc3_: CHAMPIONCAGE = null;
        let _loc2_: ChampionBase = CREATURES.getGuardian(Krallen.TYPE);
        param1 = Math.min(param1, Krallen.MAX_POWERLEVEL) >>> 0;
        if (_loc2_) {
            _loc2_._powerLevel = new SecNum(param1);
        } else {
            _loc3_ = GLOBAL._bCage;
            if (_loc3_) {
                _loc3_.SpawnGuardian(1, 0, 0, Krallen.TYPE, CHAMPIONCAGE.GetGuardianProperty("G" + Krallen.TYPE, 1, "health") | 0, "", 0, param1);
            } else {
                Console.warning("tried to create krallen but you dont have a champion cage");
            }
        }
    }
}

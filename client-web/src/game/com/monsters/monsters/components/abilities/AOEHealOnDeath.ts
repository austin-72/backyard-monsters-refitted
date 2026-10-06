import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject, MovieClip } from "flash/display";
import { AOEDamageOnDeath, FIREBALL_CLIP, IAttackable, MAP, Targeting } from "@game";

export class AOEHealOnDeath extends AOEDamageOnDeath {
    static {
        as3.fields(this, { m_healAmount: NaN });
    }

    protected m_healAmount: number;

    public $ctor(radiusOuter: uint = 200, healAmount: any /* number */ = 100, maxTargets: uint = 4294967295): void {
        super.$ctor(radiusOuter, Targeting.k_TARGETS_ALL, maxTargets);
        this.m_healAmount = healAmount;
    }

    protected override dealAOEDamage(param1: number, initialTarget: IAttackable = null): void {
        let radius1: number = NaN;
        let radius2: number = NaN;
        let fireballMc: MovieClip = null;
        let rand: number = NaN;
        let _loc7_: number = NaN;
        let rand2: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;

        // below code references an unknown property m_radius. Assuming it should be m_radiusOuter, but the fireballMc code is broken and does not influence the fireballMc in any way, so it is left as is.
        // radius1 = m_radius;
        // radius2 = m_radius;
        super.dealAOEDamage(this.m_healAmount, initialTarget);
        let i: int = 0;
        while (i < 10) {
            fireballMc = new FIREBALL_CLIP();
            MAP._FIREBALLS.addChild(fireballMc);
            fireballMc.gotoAndStop(2);
            fireballMc.x = this.owner._mc.x;
            fireballMc.y = this.owner._mc.y;

            // Below code is broken and does not influence the fireballMc.
            // rand = Math.random() * 2 - 1;
            // _loc7_ = fireballMc.x + rand * radius1;
            // rand2 = Math.random() * 2 - 1;
            // _loc9_ = rand * -1 * radius2;
            // _loc10_ = _loc9_ + radius2 * 1.5;
            i++;
        }
    }

    private removeFireball(param1: DisplayObject): void {
        MAP._FIREBALLS.removeChild(param1);
    }
}

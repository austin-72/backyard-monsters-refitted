import * as as3 from "as3";
import { Vector, int } from "as3";
import { CREEPS, ChampionBase, Component, GLOBAL, ITickable, LootingMultiplier, MonsterBase, SecNum } from "@game";

export class ProximityLootBuff extends Component implements ITickable {
    static {
        as3.implement(this, [ITickable]);
        as3.fields(this, { _radiusSqrd: null, _championOwner: null, m_buddiesInRange: null });
    }

    protected _radiusSqrd: SecNum;
    protected _championOwner: ChampionBase;
    private m_buddiesInRange: Vector<MonsterBase>;

    public $ctor(): void {
        this.m_buddiesInRange = new Vector<MonsterBase>(0, false, MonsterBase);
        super.$ctor();
    }

    public override register(param1: MonsterBase, param2: string = null): void {
        super.register(param1, param2);
        this._championOwner = as3.as(param1, ChampionBase);
        this._radiusSqrd = new SecNum(this._championOwner._buffRadius * this._championOwner._buffRadius);
    }

    public override unregister(): void {
        this.removeBuffFromCreepsNoLongerInRange();
        this._championOwner = null;
        super.onUnregister();
    }

    public override tick(param1: int = 1): void {
        let _loc4_: any = null;
        let _loc5_: MonsterBase = null;
        let _loc6_: ChampionBase = null;
        let _loc7_: LootingMultiplier = null;
        let _loc8_: any = false;
        let _loc2_: any = CREEPS._creeps;
        let _loc3_: Function = GLOBAL.QuickDistanceSquared;
        if (this.owner._behaviour !== MonsterBase.k_sBHVR_ATTACK && this.owner._behaviour !== MonsterBase.k_sBHVR_BOUNCE) {
            return;
        }
        if (this.owner._frameNumber % 50 == 0) {
            for (_loc4_ of as3.values(_loc2_)) {
                _loc5_ = as3.as(_loc4_, MonsterBase);
                if (!(_loc4_ === this.owner || !_loc5_)) {
                    _loc7_ = as3.as(_loc5_.getComponentByType(LootingMultiplier), LootingMultiplier);
                    _loc8_ = _loc3_(this._championOwner._tmpPoint, _loc5_._tmpPoint) < this._radiusSqrd.Get();
                    if (_loc8_ && !_loc7_) {
                        _loc5_.addComponent(new LootingMultiplier(1 + this._championOwner._buff));
                        this.m_buddiesInRange.push(_loc5_);
                    }
                }
            }
            this.removeBuffFromCreepsNoLongerInRange();
        }
    }

    private removeBuffFromCreepsNoLongerInRange(): void {
        let _loc4_: MonsterBase = null;
        let _loc5_: LootingMultiplier = null;
        let _loc6_: any = false;
        let _loc1_: Function = GLOBAL.QuickDistanceSquared;
        let _loc2_: int = (this.m_buddiesInRange.length - 1) | 0;
        let _loc3_: int = _loc2_;
        while (_loc3_ >= 0) {
            _loc5_ = as3.as((_loc4_ = as3.vget(this.m_buddiesInRange, _loc3_)).getComponentByType(LootingMultiplier), LootingMultiplier);
            _loc6_ = _loc1_(this._championOwner._tmpPoint, _loc4_._tmpPoint) < this._radiusSqrd.Get();
            if (!_loc6_ && Boolean(_loc5_)) {
                _loc4_.removeComponent(_loc5_);
                this.m_buddiesInRange.splice(_loc3_, 1);
            }
            _loc3_--;
        }
    }
}

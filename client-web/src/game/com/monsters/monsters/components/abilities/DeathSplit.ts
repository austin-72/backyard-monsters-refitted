import * as as3 from "as3";
import { int } from "as3";
import { Event } from "flash/events";
import { Point } from "flash/geom";
import { CREATURES, CREEPS, Component, CreepBase, MAP, MonsterBase } from "@game";

export class DeathSplit extends Component {
    static {
        as3.fields(this, { _target: null, _splitType: null, _onSpawn: null });
    }

    private _target: MonsterBase;
    private _splitType: string;
    /** Inferno-only: called with each monster that hatches (Clinkerjaw makes its Spurtz smaller and slower). */
    private _onSpawn: Function;

    public $ctor(param1?: MonsterBase, param2?: string, param3: Function = null): void {
        super.$ctor();
        this._target = param1;
        this._target.addEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.split));
        this._splitType = param2;
        this._onSpawn = param3;
    }

    protected split(param1: Event = null): void {
        let _loc5_: string = null;
        let _loc6_: MonsterBase = null;
        this._target.removeEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.split));

        if (this._target._friendly && this._target._house) {
            return;
        }

        let _loc2_: int = CREATURES.GetProperty(this._target._creatureID, "splits", 0, this._target._friendly) | 0;
        let _loc3_: Point = new Point(this._target._mc.x + Math.random() * 120 - 60, this._target._mc.y + Math.random() * 120 - 60);
        let _loc4_: int = 0;
        while (_loc4_ < _loc2_) {
            _loc5_ = "bounce";
            if (this._target._behaviour == MonsterBase.k_sBHVR_DEFEND) {
                _loc5_ = "defend";
            }
            if (this._target._friendly) {
                (_loc6_ = CREATURES.Spawn(this._splitType, MAP._BUILDINGTOPS, _loc5_, _loc3_, Math.random() * 360)).isDisposable = true;
            } else {
                _loc6_ = CREEPS.Spawn(this._splitType, MAP._BUILDINGTOPS, _loc5_, _loc3_, Math.random() * 360, 1, false, true);
            }
            _loc3_ = new Point(this._target._mc.x + Math.random() * 120 - 60, this._target._mc.y + Math.random() * 120 - 60);
            if (this._target._behaviour == MonsterBase.k_sBHVR_DEFEND) {
                (as3.as(_loc6_, CreepBase)).changeModeDefend();
            }
            if (this._onSpawn != null && _loc6_) {
                this._onSpawn(_loc6_);
            }
            _loc4_++;
        }
    }
}

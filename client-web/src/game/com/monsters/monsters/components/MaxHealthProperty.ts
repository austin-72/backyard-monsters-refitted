import * as as3 from "as3";
import { CModifiableProperty, GameObject } from "@game";

export class MaxHealthProperty extends CModifiableProperty {
    static {
        as3.fields(this, { m_healthProperty: null, m_lastKnownValue: NaN });
    }

    private m_healthProperty: GameObject;
    private m_lastKnownValue: number;

    // Comment: Rewritten function - floating-point numbers are not compile-time constants.
    public $ctor(param1?: any /* GameObject */, param2: number = Number.MAX_VALUE, param3: number = Number.NEGATIVE_INFINITY): void {
        super.$ctor(param2, param3, 0);
        this.m_healthProperty = param1;
    }

    public store(): void {
        this.m_lastKnownValue = this.value;
    }

    public updateHealth(): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc1_: number = this.value;
        if (this.m_lastKnownValue != _loc1_) {
            _loc2_ = this.m_healthProperty.health / this.m_lastKnownValue;
            _loc3_ = _loc2_ * _loc1_;
            if (_loc2_) {
                this.m_healthProperty.setHealth(_loc3_);
            }
        }
    }
}

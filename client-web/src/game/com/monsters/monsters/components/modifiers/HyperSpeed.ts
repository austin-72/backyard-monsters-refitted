import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { DivisionModifier, IPropertyModifier, MultiplicationPropertyModifier } from "@game";

export class HyperSpeed extends ASObject {
    public static k_color: uint; // const

    public static k_value: number; // const

    public static k_attackSpeedModifier: IPropertyModifier; // const

    public static k_moveSpeedModifier: IPropertyModifier; // const

    static {
        as3.lazyStatics(this, { k_color: 0, k_value: NaN, k_attackSpeedModifier: null, k_moveSpeedModifier: null }, () => {
            HyperSpeed.k_color = 16711680;
            HyperSpeed.k_value = 1.5;
            HyperSpeed.k_attackSpeedModifier = new DivisionModifier(HyperSpeed.k_value);
            HyperSpeed.k_moveSpeedModifier = new MultiplicationPropertyModifier(HyperSpeed.k_value);
        });
    }

    public $ctor(): void {
        super.$ctor();
    }
}

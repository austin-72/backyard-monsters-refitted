import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { ArmorPropertyModifier, IPropertyModifier } from "@game";

export class BeastMode extends ASObject {
    public static k_color: uint; // const

    public static k_value: number; // const

    public static k_armorModifier: IPropertyModifier; // const

    static {
        as3.lazyStatics(this, { k_color: 0, k_value: NaN, k_armorModifier: null }, () => {
            BeastMode.k_color = 255;
            BeastMode.k_value = 0.3;
            BeastMode.k_armorModifier = new ArmorPropertyModifier(BeastMode.k_value);
        });
    }

    public $ctor(): void {
        super.$ctor();
    }
}

import * as as3 from "as3";
import { ASObject, uint } from "as3";
import { IPropertyModifier, MultiplicationPropertyModifier } from "@game";

export class MonsterDust extends ASObject {
    public static k_titleKey: string; // const

    public static k_descriptionKey: string; // const

    public static k_storeKey: string; // const

    public static k_color: uint; // const

    public static k_value: number; // const

    public static k_damageModifier: IPropertyModifier; // const

    static {
        as3.lazyStatics(this, { k_titleKey: null, k_descriptionKey: null, k_storeKey: null, k_color: 0, k_value: NaN, k_damageModifier: null }, () => {
            MonsterDust.k_titleKey = "str_code_mod_title";
            MonsterDust.k_descriptionKey = "str_code_mod_body";
            MonsterDust.k_storeKey = "MOD";
            MonsterDust.k_color = 13421568;
            MonsterDust.k_value = 1.25;
            MonsterDust.k_damageModifier = new MultiplicationPropertyModifier(MonsterDust.k_value);
        });
    }

    public $ctor(): void {
        super.$ctor();
    }
}

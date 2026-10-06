import * as as3 from "as3";
import { int } from "as3";

export interface IDurable {
    readonly durability: int;

    readonly activeDurability: number;
}
export const IDurable = as3.iface("com.monsters.siege.weapons::IDurable", []);

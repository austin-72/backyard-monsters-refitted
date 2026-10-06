import * as as3 from "as3";
import { int, uint } from "as3";

export interface ILootable {
    Loot(param1: int): uint;
}
export const ILootable = as3.iface("com.monsters.interfaces::ILootable", []);

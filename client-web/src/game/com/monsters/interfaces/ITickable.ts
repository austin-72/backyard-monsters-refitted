import * as as3 from "as3";
import { int } from "as3";

export interface ITickable {
    tick(param1?: int): void;
}
export const ITickable = as3.iface("com.monsters.interfaces::ITickable", []);

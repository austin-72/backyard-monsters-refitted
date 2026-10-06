import * as as3 from "as3";
import { int } from "as3";

export interface ITargetable {
    readonly x: number;

    readonly y: number;

    readonly defenseFlags: int;
}
export const ITargetable = as3.iface("com.monsters.interfaces::ITargetable", []);

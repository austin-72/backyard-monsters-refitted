import * as as3 from "as3";
import { Vector, int } from "as3";
import { ITargetable } from "@game";

export interface IAttackable extends ITargetable {
    modifyHealth(param1: number, param2?: ITargetable): number;

    readonly maxHealth: number;

    readonly health: number;

    readonly attackFlags: int;

    readonly attackPriorityFlags: Vector<int>;
}
export const IAttackable = as3.iface("com.monsters.interfaces::IAttackable", [ITargetable]);

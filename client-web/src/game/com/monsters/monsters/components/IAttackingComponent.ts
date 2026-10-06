import * as as3 from "as3";
import { IAttackable, ITargetable } from "@game";

export interface IAttackingComponent {
    onAttack(param1: IAttackable, param2: number, param3?: ITargetable): number;
}
export const IAttackingComponent = as3.iface("com.monsters.monsters.components::IAttackingComponent", []);

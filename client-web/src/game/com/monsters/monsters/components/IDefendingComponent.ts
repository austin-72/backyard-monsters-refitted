import * as as3 from "as3";
import { IAttackable, ITargetable } from "@game";

export interface IDefendingComponent {
    onDefend(param1: IAttackable, param2: number, param3?: ITargetable): number;
}
export const IDefendingComponent = as3.iface("com.monsters.monsters.components::IDefendingComponent", []);

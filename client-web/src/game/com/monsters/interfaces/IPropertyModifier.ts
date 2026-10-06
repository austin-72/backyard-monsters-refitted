import * as as3 from "as3";

export interface IPropertyModifier {
    modify(param1: number): number;
}
export const IPropertyModifier = as3.iface("com.monsters.interfaces::IPropertyModifier", []);

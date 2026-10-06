import * as as3 from "as3";
import { IExportable } from "@game";

export interface IHandler extends IExportable {
    initialize(param1?: any): void;

    readonly name: string;
}
export const IHandler = as3.iface("com.monsters.interfaces::IHandler", [IExportable]);

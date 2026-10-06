import * as as3 from "as3";

export interface IExportable {
    importData(param1: any): void;

    exportData(): any;
}
export const IExportable = as3.iface("com.monsters.interfaces::IExportable", []);

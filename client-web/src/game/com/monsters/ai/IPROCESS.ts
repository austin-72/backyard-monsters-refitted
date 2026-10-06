import * as as3 from "as3";
import { int } from "as3";
import { BFOUNDATION, Solution } from "@game";

export interface IPROCESS {
    Trigger(param1?: number): void;

    Process(param1: Solution, param2: Function): void;

    onProcess(param1: any[], param2?: BFOUNDATION, param3?: int, param4?: boolean, param5?: BFOUNDATION): void;

    beginProcessB(): void;

    ProcessB(param1: Solution): void;

    ProcessC(param1: Solution): void;
}
export const IPROCESS = as3.iface("com.monsters.ai::IPROCESS", []);

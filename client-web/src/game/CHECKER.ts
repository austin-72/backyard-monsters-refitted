import { ASObject, int } from "as3";
import { BFOUNDATION } from "@game";

export class CHECKER extends ASObject {
    private static displayed: boolean = false;

    private static checkedAllYards: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    public static Check(): void {
        let _loc4_: string = null;
        let _loc5_: BFOUNDATION = null;
        let _loc6_: number = NaN;
        let _loc7_: int = 0;
        let _loc8_: int = 0;
        let _loc9_: string = null;
        let _loc10_: int = 0;
    }
}

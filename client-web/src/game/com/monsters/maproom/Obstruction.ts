import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Rectangle } from "flash/geom";

export class Obstruction extends ASObject {
    public static Obstructions: any[] = new Array();

    public static Reserved: any[] = new Array(new Rectangle(196, 771, 209, 184), new Rectangle(605, 478, 186, 174), new Rectangle(917, 1137, 191, 162), new Rectangle(1238, 1084, 198, 174));

    public $ctor(): void {
        super.$ctor();
    }

    public static Clear(): void {
        Obstruction.Obstructions = [];
    }

    public static pointIsBlocked(param1: int, param2: int): boolean {
        let _loc3_: any = undefined;
        for (_loc3_ of as3.values(Obstruction.Obstructions)) {
            if (param1 > _loc3_.x && param1 < _loc3_.x + _loc3_.width && param2 > _loc3_.y && param2 < _loc3_.y + _loc3_.height) {
                return true;
            }
        }
        return false;
    }

    public static Register(param1: any, param2: boolean = false): void {
        Obstruction.Obstructions.push(param1);
        if (param2) {
            Obstruction.Reserved.push(param1);
        }
    }
}

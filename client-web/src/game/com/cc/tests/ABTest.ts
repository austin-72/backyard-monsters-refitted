import * as as3 from "as3";
import { ASObject, int } from "as3";
import { LOGIN, md5 } from "@game";

export class ABTest extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static isInTestGroup(param1: string, param2: int): boolean {
        return ABTest.lastTwoDigits(ABTest.UserMD5(param1)) < param2;
    }

    public static lastDigit(param1: string): int {
        let _loc2_: string = param1.substr(-1, 1);
        return parseInt("0x" + _loc2_) | 0;
    }

    public static lastTwoDigits(param1: string): int {
        let _loc2_: string = param1.substr(-2, 2);
        return parseInt("0x" + _loc2_) | 0;
    }

    public static UserMD5(param1: string = "", param2: int = 0): string {
        let _loc3_: string = null;
        if (param2 != 0) {
            _loc3_ = as3.str(param2.toString());
        } else {
            _loc3_ = as3.str(LOGIN._playerID.toString());
        }
        _loc3_ = param1 + _loc3_;
        return md5(_loc3_);
    }
}

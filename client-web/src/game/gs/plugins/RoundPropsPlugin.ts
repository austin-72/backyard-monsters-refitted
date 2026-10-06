import * as as3 from "as3";
import { TweenPlugin } from "@game";

export class RoundPropsPlugin extends TweenPlugin {
    public static readonly VERSION: number = 1;

    public static readonly API: number = 1;

    public $ctor(): void {
        super.$ctor();
        this.propName = "roundProps";
        this.overwriteProps = [];
        this.round = true;
    }

    public add(param1: any, param2: string, param3: number, param4: number): void {
        this.addTween(param1, param2, param3, param3 + param4, param2);
        this.overwriteProps[this.overwriteProps.length] = param2;
    }
}

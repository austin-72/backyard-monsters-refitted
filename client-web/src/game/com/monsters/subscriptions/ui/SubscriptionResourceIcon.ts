import * as as3 from "as3";
import { daveClubBar } from "@game";

export class SubscriptionResourceIcon extends daveClubBar {
    public $ctor(param1?: boolean): void {
        super.$ctor();
        this.update(param1);
        this.buttonMode = true;
        this.mouseChildren = false;
    }

    public update(param1: boolean): void {
        if (param1) {
            this.gotoAndStop("on");
        } else {
            this.gotoAndStop("off");
        }
    }
}

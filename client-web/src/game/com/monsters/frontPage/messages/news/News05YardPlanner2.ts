import * as as3 from "as3";
import { MouseEvent } from "flash/events";
import { Button, GLOBAL, KeywordMessage, PLANNER, POPUPS } from "@game";

export class News05YardPlanner2 extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("yp2");
    }

    public override setupButton(param1: Button): Button {
        param1.Highlight = true;
        if (GLOBAL._bYardPlanner) {
            param1.SetupKey("btn_open");
            param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.openYardPlanner), false, 0, true);
        } else {
            param1.SetupKey("btn_buildnow");
            param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.buildYardPlanner), false, 0, true);
        }
        return param1;
    }

    protected buildYardPlanner(param1: MouseEvent): void {
        this.buyBuilding(PLANNER.TYPE);
    }

    protected openYardPlanner(param1: MouseEvent): void {
        POPUPS.Next();
        PLANNER.Show();
    }

    public override get areRequirementsMet(): boolean {
        if (GLOBAL._flags.yp_version == 2) {
            return true;
        }
        return false;
    }
}

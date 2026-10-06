import * as as3 from "as3";
import { BUILDINGOPTIONS, GLOBAL, KeywordMessage, POPUPS } from "@game";

export class News06TownHallLevel10 extends KeywordMessage {
    public $ctor(): void {
        super.$ctor("townhall10", "btn_upgradenow");
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        BUILDINGOPTIONS.Show(GLOBAL.townHall, "upgrade");
    }

    public override get areRequirementsMet(): boolean {
        return GLOBAL.townHall._lvl.Get() == 9;
    }
}

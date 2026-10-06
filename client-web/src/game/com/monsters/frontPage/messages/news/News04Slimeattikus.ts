import * as as3 from "as3";
import { BASE, CREATURELOCKER, KeywordMessage, POPUPS, ReplayableEventLibrary } from "@game";

export class News04Slimeattikus extends KeywordMessage {
    public $ctor(): void {
        let _loc1_: string = "";
        if (!CREATURELOCKER._lockerData["C17"]) {
            _loc1_ = "btn_unlocknow";
        }
        super.$ctor("3_18_0", _loc1_);
    }

    public override get areRequirementsMet(): boolean {
        return ReplayableEventLibrary.MONSTER_BLITZKRIEG.doesAutomaticalyGetReward() && Boolean(BASE.loadObject["events"]);
    }

    protected override onButtonClick(): void {
        CREATURELOCKER._popupCreatureID = "C17";
        CREATURELOCKER.Show();
        CREATURELOCKER._mc.ShowB("C17");
        POPUPS.Next();
    }
}

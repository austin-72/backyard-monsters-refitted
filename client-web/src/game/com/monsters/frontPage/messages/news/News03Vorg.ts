import * as as3 from "as3";
import { BASE, CREATURELOCKER, KeywordMessage, POPUPS, ReplayableEventLibrary } from "@game";

export class News03Vorg extends KeywordMessage {
    public $ctor(): void {
        let _loc1_: string = "";
        if (!CREATURELOCKER._lockerData["C16"]) {
            _loc1_ = "btn_unlocknow";
        }
        super.$ctor("3_17_0", _loc1_);
    }

    public override get areRequirementsMet(): boolean {
        return ReplayableEventLibrary.BATTLE_TOADS.doesAutomaticalyGetReward() && Boolean(BASE.loadObject["events"]);
    }

    protected override onButtonClick(): void {
        CREATURELOCKER._popupCreatureID = "C16";
        CREATURELOCKER.Show();
        CREATURELOCKER._mc.ShowB("C16");
        POPUPS.Next();
    }
}

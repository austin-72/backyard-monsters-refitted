import * as as3 from "as3";
import { BUILDING14, GLOBAL, INFERNO_MAGMA_TOWER, KeywordMessage, com_monsters_frontPage_messages_Message as Message } from "@game";

export class News01MagmaTower extends KeywordMessage {
    public $ctor(): void {
        let _loc1_: string = "";
        if (GLOBAL.StatGet(BUILDING14.UNDERHALL_LEVEL) >= 1) {
            _loc1_ = "btn_buildnow";
        }
        super.$ctor("3_14_0", _loc1_);
        this.imageURL = Message._IMAGE_DIRECTORY + KeywordMessage.PREFIX + "magmaabove.jpg";
    }

    public override get areRequirementsMet(): boolean {
        return !GLOBAL._flags.viximo && !GLOBAL._flags.kongregate;
    }

    protected override onButtonClick(): void {
        this.buyBuilding(INFERNO_MAGMA_TOWER.ID);
    }
}

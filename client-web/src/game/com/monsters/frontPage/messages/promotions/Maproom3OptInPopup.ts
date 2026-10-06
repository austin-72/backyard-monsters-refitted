import * as as3 from "as3";
import { int, uint } from "as3";
import { KeywordMessage, MapRoom3ConfirmMigrationPopup, MapRoomManager, POPUPS } from "@game";

export class Maproom3OptInPopup extends KeywordMessage {
    private static readonly NAME: string = "nwm";

    private static readonly TIME_UNTIL_RESET: uint = 432000;

    private static readonly k_POPUP_IMAGES: any[] = ["fp_world_map_popup1.jpg", "fp_world_map_popup2.jpg", "fp_world_map_popup3.jpg"];

    public $ctor(): void {
        let _loc1_: int = Math.floor(Math.random() * Maproom3OptInPopup.k_POPUP_IMAGES.length) | 0;
        super.$ctor(Maproom3OptInPopup.NAME, "btn_joinnow", as3.str(Maproom3OptInPopup.k_POPUP_IMAGES[_loc1_]));
    }

    public override setup(param1: any): void {
        super.setup(param1);
        this.markAsUnseenIfOlderThan(Maproom3OptInPopup.TIME_UNTIL_RESET);
    }

    public override get areRequirementsMet(): boolean {
        return !this.hasBeenSeen && !MapRoomManager.instance.isInMapRoom3;
    }

    protected override onButtonClick(): void {
        POPUPS.Next();
        MapRoom3ConfirmMigrationPopup.instance.Show();
    }
}

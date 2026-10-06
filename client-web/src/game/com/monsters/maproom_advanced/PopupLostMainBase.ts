import * as as3 from "as3";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { GLOBAL, KEYS, LOGGER, MapRoomManager, MapRoomPopup_LostMainBase_CLIP, PLEASEWAIT, POPUPS, URLLoaderApi, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class PopupLostMainBase extends MapRoomPopup_LostMainBase_CLIP {
    public $ctor(): void {
        super.$ctor();
    }

    public Setup(): void {
        this.tTitle.htmlText = KEYS.Get("empiredestroyed_title");
        this.bYes.SetupKey("empiredestroyed_btnflee");
        this.bYes.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Relocate));
        this.bYes.buttonMode = true;
        this.bNo.SetupKey("empiredestroyed_btnstay");
        this.bNo.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        if (GLOBAL._mapOutpost.length > 0) {
            if (GLOBAL._mapOutpost.length > 1) {
                this.tDesc.htmlText = "<b>" + KEYS.Get("empiredestroyed3", { "v1": GLOBAL._mapOutpost.length }) + "</b>";
            } else {
                this.tDesc.htmlText = "<b>" + KEYS.Get("empiredestroyed2") + "</b>";
            }
            this.tWarning.htmlText = "<b>" + KEYS.Get("msg_moveyard_warn2") + "</b>";
        } else {
            this.tDesc.htmlText = "<b>" + KEYS.Get("empiredestroyed1") + "</b>";
            this.tWarning.visible = false;
        }
    }

    public Relocate(param1: MouseEvent = null): void {
        let RelocateSuccess: Function = null;
        let RelocateFail: Function = null;
        let e: MouseEvent = param1;
        RelocateSuccess = (param1: any): void => {
            PLEASEWAIT.Hide();
            if (param1.error == 0) {
                if (param1.cantMoveTill) {
                    GLOBAL.Message(KEYS.Get("movebase_warning", { "v1": GLOBAL.ToTime((param1.cantMoveTill - param1.currenttime) | 0) }));
                    this.Hide();
                } else {
                    GLOBAL._mapOutpost = [];
                    MapRoom.ClearCells();
                    if (param1.coords && param1.coords.length == 2 && param1.coords[0] > -1 && param1.coords[1] > -1) {
                        GLOBAL._mapHome = new Point(param1.coords[0], param1.coords[1]);
                        MapRoomManager.instance.BookmarksClear();
                        MapRoom._Setup(GLOBAL._mapHome);
                        MapRoom.empireDestroyed = true;
                        MapRoomManager.instance.ShowDelayed(true);
                    }
                }
            } else {
                GLOBAL.ErrorMessage(as3.str(param1.error));
                LOGGER.Log("err", "PopupLostMainBase.Relocate non-zero error " + param1.error);
            }
        };
        RelocateFail = (param1: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            GLOBAL.ErrorMessage("PopupLostMainBase.Relocate 2");
            LOGGER.Log("err", "PopupLostMainBase.Relocate HTTP");
        };
        let relocateVars: any[] = [["type", "random"], ["baseid", 0], ["shiny", 0]];
        POPUPS.Next();
        PLEASEWAIT.Show(KEYS.Get("wait_relocating"));
        new URLLoaderApi().load(GLOBAL._baseURL + "migrate", relocateVars, RelocateSuccess, RelocateFail);
    }

    public Hide(param1: MouseEvent = null): void {
        POPUPS.Next();
    }
}

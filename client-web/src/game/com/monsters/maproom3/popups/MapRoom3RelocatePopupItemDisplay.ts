import * as as3 from "as3";
import { int } from "as3";
import { Loader } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { KEYS, MapRoom3FriendData, MapRoom3RelocateMainYardPopupFriendItemDisplay, MapRoom3RelocatePopup } from "@game";

export class MapRoom3RelocatePopupItemDisplay extends MapRoom3RelocateMainYardPopupFriendItemDisplay {
    static {
        as3.fields(this, { m_FriendToDisplay: null, m_ProfilePicture: null });
    }

    private static readonly PORTRAIT_WIDTH: int = 50;

    private static readonly PORTRAIT_HEIGHT: int = 50;
    private m_FriendToDisplay: MapRoom3FriendData;
    private m_ProfilePicture: Loader;

    public $ctor(param1?: MapRoom3FriendData): void {
        super.$ctor();
        this.m_FriendToDisplay = param1;
        this.m_ProfilePicture = new Loader();
        this.m_ProfilePicture.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.OnProfilePictureIOErrorEvent), false, 0, true);
        this.m_ProfilePicture.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.OnProfilePictureLoaded), false, 0, true);
        this.m_ProfilePicture.load(new URLRequest("http://graph.facebook.com/" + this.m_FriendToDisplay.facebookId + "/picture"));
        this.imageHolder.addChild(this.m_ProfilePicture);
        this.levelIcon.lv_txt.htmlText = "<b>" + this.m_FriendToDisplay.level + "</b>";
        this.nameText.htmlText = "<b>" + param1.name + "</b>";
        this.nameText.mouseEnabled = false;
        let _loc2_: string = param1.isInPlayersWorld ? KEYS.Get("mr3_relocate_main_yard_same") : KEYS.Get("mr3_relocate_main_yard_world", { "v1": param1.world });
        this.worldText.htmlText = "<b>" + _loc2_ + "</b>";
        this.worldText.mouseEnabled = false;
        this.coordinatesText.htmlText = "(" + param1.baseX.toString() + "," + param1.baseY.toString() + ")";
        this.coordinatesText.mouseEnabled = false;
        if (!param1.isInPlayersWorld) {
            this.worldText.y = this.nameText.y;
            this.coordinatesText.visible = false;
        }
        this.relocateButton.SetupKey("btn_moveHere");
        this.relocateButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnRelocateButtonClicked), false, 0, true);
        this.relocateButton.buttonMode = true;
    }

    private OnProfilePictureIOErrorEvent(param1: IOErrorEvent): void {
    }

    private OnProfilePictureLoaded(param1: Event): void {
        this.m_ProfilePicture.width = MapRoom3RelocatePopupItemDisplay.PORTRAIT_WIDTH;
        this.m_ProfilePicture.height = MapRoom3RelocatePopupItemDisplay.PORTRAIT_HEIGHT;
    }

    public Clear(): void {
        this.relocateButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnRelocateButtonClicked));
        this.m_ProfilePicture.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.OnProfilePictureIOErrorEvent));
        this.m_ProfilePicture.contentLoaderInfo.removeEventListener(Event.COMPLETE, as3.bind(this, this.OnProfilePictureLoaded));
        this.imageHolder.removeChild(this.m_ProfilePicture);
        this.m_FriendToDisplay = null;
    }

    private OnRelocateButtonClicked(param1: MouseEvent): void {
        if (this.m_FriendToDisplay != null) {
            MapRoom3RelocatePopup.instance.Relocate(this.m_FriendToDisplay.userId);
        }
    }
}

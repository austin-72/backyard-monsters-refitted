import * as as3 from "as3";
import { MouseEvent } from "flash/events";
import { GLOBAL, KEYS, MapRoomManager, POPUPS, SOUNDS, SingletonLock, popup_new_map_confirm } from "@game";

export class MapRoom3ConfirmMigrationPopup extends popup_new_map_confirm {
    static {
        as3.fields(this, { m_IsShowing: false });
    }

    private static s_Instance: MapRoom3ConfirmMigrationPopup = null;
    private m_IsShowing: boolean;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
    }

    public static get instance(): MapRoom3ConfirmMigrationPopup {
        return MapRoom3ConfirmMigrationPopup.s_Instance = MapRoom3ConfirmMigrationPopup.s_Instance || new MapRoom3ConfirmMigrationPopup(new SingletonLock());
    }

    public Show(param1: boolean = false): void {
        if (this.m_IsShowing == true || GLOBAL.INFERNO_ONLY) {
            return;
        }
        this.tfTitle.htmlText = KEYS.Get("nwm_confirm_title");
        this.tfBody.htmlText = KEYS.Get("nwm_confirm");
        this.btnJuice.SetupKey("btn_joinnow");
        this.btnJuice.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnConfirmButtonClicked), false, 0, true);
        this.btnJuice.Highlight = true;
        this.btnCancel.SetupKey("btn_cancel");
        this.btnCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnCancelButtonClicked), false, 0, true);
        if (param1) {
            this.tfBody.htmlText = KEYS.Get("nwm_confirm_force");
            this.btnJuice.SetupKey("btn_ok");
            this.btnJuice.x = 0;
            this.btnCancel.visible = false;
            this.mcFrame.Setup(false);
        }
        POPUPS.Push(this);
        this.m_IsShowing = true;
    }

    public Hide(): void {
        this.btnJuice.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnConfirmButtonClicked));
        this.btnCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnCancelButtonClicked));
        SOUNDS.Play("close");
        POPUPS.Next();
        this.m_IsShowing = false;
    }

    public Resize(): void {
        this.x = GLOBAL._SCREENCENTER.x;
        this.y = GLOBAL._SCREENCENTER.y;
    }

    private OnConfirmButtonClicked(param1: MouseEvent): void {
        this.Hide();
        MapRoomManager.instance.UpgradeToMapRoom3();
    }

    private OnCancelButtonClicked(param1: MouseEvent): void {
        this.Hide();
    }
}

import * as as3 from "as3";
import { Event, MouseEvent } from "flash/events";
import { BASE, KEYS, MapRoomManager, POPUPS, SingletonLock, popup_attackend_CLIP } from "@game";

export class MapRoom3AttackFinishedPopup extends popup_attackend_CLIP {
    private static s_Instance: MapRoom3AttackFinishedPopup = null;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
    }

    public static get instance(): MapRoom3AttackFinishedPopup {
        return MapRoom3AttackFinishedPopup.s_Instance = MapRoom3AttackFinishedPopup.s_Instance || new MapRoom3AttackFinishedPopup(new SingletonLock());
    }

    public Show(param1: boolean): void {
        if (param1) {
            this.tTitle.htmlText = KEYS.Get("newmap_destroyed");
            this.tMessage.htmlText = BASE.isOutpost ? KEYS.Get("newmap_des_pl1") : KEYS.Get("newmap_des_wm2");
        } else {
            this.tTitle.htmlText = KEYS.Get("popup_attackended_title");
            this.tMessage.htmlText = BASE.isOutpost ? KEYS.Get("mr3_popup_attackended_failedOutpost") : KEYS.Get("mr3_popup_attackended_failedWMYard");
        }
        this.tProcessing.htmlText = KEYS.Get("please_wait");
        this.mcFrame.Setup(false);
        this.bAction.Setup(KEYS.Get("btn_openmap"));
        this.bAction.Enabled = false;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.OnEnterFrame));
        POPUPS.Push(this);
    }

    public Hide(): void {
        POPUPS.Next();
    }

    private OnEnterFrame(param1: Event): void {
        if (BASE._saveCounterA != BASE._saveCounterB) {
            return;
        }
        this.bAction.Enabled = true;
        this.tProcessing.htmlText = "";
        this.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnActionButtonClicked));
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.OnEnterFrame));
    }

    private OnActionButtonClicked(param1: MouseEvent): void {
        MapRoomManager.instance.SetupAndShow();
        POPUPS.Next();
    }
}

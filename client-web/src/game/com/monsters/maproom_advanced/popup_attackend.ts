import * as as3 from "as3";
import { int } from "as3";
import { Event, MouseEvent } from "flash/events";
import { BASE, EnumYardType, GLOBAL, IoGauntlet, KEYS, MAPROOM_DESCENT, MapRoomCell, MapRoomManager, POPUPS, com_monsters_maproom_advanced_MapRoom as MapRoom, popup_attackend_CLIP } from "@game";

export class popup_attackend extends popup_attackend_CLIP {
    [key: string]: any;

    static {
        as3.fields(this, { _success: false });
    }

    private _success: boolean;

    public $ctor(param1?: boolean): void {
        super.$ctor();
        this._success = param1;
        if (this._success) {
            this.tTitle.htmlText = KEYS.Get("newmap_destroyed");
            if (MapRoomManager.instance.isInMapRoom2) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    this.tMessage.htmlText = KEYS.Get("newmap_des_wm2");
                } else {
                    this.tMessage.htmlText = KEYS.Get("newmap_des_pl1");
                }
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                if (BASE.isInfernoMainYardOrOutpost) {
                    if (MAPROOM_DESCENT.InDescent) {
                        this.tMessage.htmlText = KEYS.Get("descent_newmap_des_wm2");
                    } else {
                        this.tMessage.htmlText = KEYS.Get("inf_newmap_des_wm2");
                    }
                } else {
                    this.tMessage.htmlText = KEYS.Get("newmap_des_wm2");
                }
            } else {
                this.tMessage.htmlText = KEYS.Get("newmap_des_pl2");
            }
        } else {
            this.tTitle.htmlText = KEYS.Get("popup_attackended_title");
            if (MapRoomManager.instance.isInMapRoom2) {
                if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                    this.tMessage.htmlText = KEYS.Get("popup_attackended_failedWMYard");
                } else if (BASE.isOutpost) {
                    this.tMessage.htmlText = KEYS.Get("popup_attackended_failedOutpost");
                } else {
                    this.tMessage.htmlText = "";
                }
                // Inferno-only (bug report B6): what it takes, said, as the Under Hall falling is not enough
                if (GLOBAL.INFERNO_ONLY && (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || BASE.isOutpost)) {
                    this.tMessage.htmlText = KEYS.Get("io_attackend_needed", { "v1": BASE._percentDamaged });
                    GLOBAL.ioFitHeight(this.tMessage);
                }
            } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                if (BASE.isInfernoMainYardOrOutpost) {
                    if (MAPROOM_DESCENT.InDescent) {
                        this.tMessage.htmlText = KEYS.Get("descent_popup_attackended_failedWMTH");
                    } else {
                        this.tMessage.htmlText = KEYS.Get("inf_popup_attackended_failedWMTH");
                    }
                } else {
                    this.tMessage.htmlText = KEYS.Get("popup_attackended_failedWMTH");
                }
            } else {
                this.tMessage.htmlText = "";
            }
        }
        // Inferno-only Moloch's Gauntlet: its own words, and home (not the map) afterwards.
        if (IoGauntlet.inAttack()) {
            this.tTitle.htmlText = IoGauntlet.endTitle(this._success);
            this.tMessage.htmlText = IoGauntlet.endMessage(this._success);
        }
        this.tProcessing.htmlText = KEYS.Get("please_wait");
        this.bAction.Enabled = false;
        if (IoGauntlet.inAttack()) {
            this.bAction.Setup(KEYS.Get("btn_returnhome"));
        } else if (!MapRoomManager.instance.isInMapRoom2 || BASE.usesInfernoBackend) {
            this.bAction.Setup(KEYS.Get("btn_returnhome"));
        } else {
            this.bAction.Setup(KEYS.Get("btn_openmap"));
        }
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Tick));
    }

    private Tick(param1: Event): void {
        if (BASE._saveCounterA == BASE._saveCounterB) {
            this.bAction.Enabled = true;
            this.tProcessing.htmlText = "";
            this.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.End));
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Tick));
        }
    }

    private End(param1: MouseEvent): void {
        if (IoGauntlet.inAttack()) {
            IoGauntlet.ReturnHome();
            POPUPS.Next();
            return;
        }
        if (MapRoomManager.instance.isInMapRoom2) {
            MapRoom.showEnemyWait = true;
            if (this._success && Boolean(GLOBAL._currentCell)) {
                (as3.as(GLOBAL._currentCell, MapRoomCell)).destroyed = 1;
            }
            MapRoomManager.instance.Show();
        } else if (GLOBAL._loadmode == GLOBAL.mode) {
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        } else if (MAPROOM_DESCENT._inDescent) {
            MAPROOM_DESCENT.ExitDescent();
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        } else {
            BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, "ibuild", false, EnumYardType.INFERNO_YARD);
        }
        POPUPS.Next();
    }
}

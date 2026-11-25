import * as as3 from "as3";
import { int } from "as3";
import { DisplayObject, Shape } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { IoDesigner, BASE, Button_CLIP, SOUNDS, EnumYardType, GLOBAL, IoGauntlet, IoSiege, KEYS, MAPROOM_DESCENT, MapRoomCell, MapRoomManager, POPUPS, com_monsters_maproom_advanced_MapRoom as MapRoom, popup_attackend_CLIP } from "@game";

export class popup_attackend extends popup_attackend_CLIP {
    [key: string]: any;

    static {
        as3.fields(this, { _success: false, _ioAct: "", _ioExtra: null });
    }

    private _success: boolean;

    /** Inferno-only (QoL #86): what the main button does ("takeover", "again", "map"), with Map / Home beside it */
    private _ioAct: string;

    private _ioExtra: Button_CLIP[];

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
        // Inferno-only Siege (the Devil's Arcade): how much was wrecked, and how fast; home, then the arcade
        if (IoSiege.inAttack()) {
            this.tTitle.htmlText = IoSiege.endTitle(this._success);
            this.tMessage.htmlText = IoSiege.endMessage(this._success);
        }
        this.tProcessing.htmlText = KEYS.Get("please_wait");
        // (Inferno-only, 23 October: over the button row, so it isn't what a click on a button's label hits)
        if (GLOBAL.INFERNO_ONLY) {
            this.tProcessing.mouseEnabled = false;
        }
        this.bAction.Enabled = false;
        if (IoGauntlet.inAttack() || IoSiege.inAttack()) {
            this.bAction.Setup(KEYS.Get("btn_returnhome"));
        } else if (!MapRoomManager.instance.isInMapRoom2 || BASE.usesInfernoBackend) {
            this.bAction.Setup(KEYS.Get("btn_returnhome"));
        } else {
            this.bAction.Setup(KEYS.Get("btn_openmap"));
        }
        // Inferno-only (QoL #416): the Designer's "Try it": back to the draft afterwards
        if (IoDesigner.ioTryingIt()) {
            this.bAction.Setup(IoDesigner.ioTryItButton());
        }
        this.ioNextSteps();
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.Tick));
    }

    /**
     * Inferno-only (QoL #86): the next steps on the result, after a map attack: Take over now (a won tribe yard or
     * outpost), Attack again (lost), or Back to the map; and Home beside it. (The button used to say "Return Home"
     * and open the map.) Not in the Gauntlet, a Siege or a practice attack.
     */
    private ioNextSteps(): void {
        if (!GLOBAL.INFERNO_ONLY || !MapRoomManager.instance.isInMapRoom2 || IoGauntlet.inAttack() || IoSiege.inAttack() || GLOBAL.ioTestMode() || !GLOBAL._currentCell) {
            return;
        }
        let cell: any = GLOBAL._currentCell;
        if (this._success && (cell._base | 0) != 2) {
            this._ioAct = "takeover";
        } else if (this._success) {
            this._ioAct = "map";
        } else {
            this._ioAct = "again";
        }
        let y0: number = this.bAction.y;
        // (centred in the frame: the one button sat right of the middle)
        let mid: number = this.mcFrame ? this.mcFrame.x + this.mcFrame.width / 2 : this.bAction.x + this.bAction.width / 2;
        this.bAction.Setup(KEYS.Get(this._ioAct == "takeover" ? "io_end_takeover" : (this._ioAct == "again" ? "io_end_again" : "io_end_map")), false, 110, 0);
        this.bAction.name = "ioEndMain";
        let labels: string[] = this._ioAct == "map" ? ["io_end_home"] : ["io_end_map", "io_end_home"];
        this._ioExtra = [];
        for (let k of labels) {
            let b: Button_CLIP = new Button_CLIP();
            b.Setup(KEYS.Get(k), false, k == "io_end_home" ? 66 : 100, 0);
            b.name = k == "io_end_home" ? "ioEndHome" : "ioEndMap";
            b.y = y0;
            b.Enabled = false;
            this.addChild(b);
            this._ioExtra.push(b);
        }
        // in a row
        let row: any[] = [this.bAction].concat(this._ioExtra);
        let total: number = 0;
        for (let b of row) {
            total += b.width;
        }
        total += 8 * (row.length - 1);
        let x: number = mid - total / 2;
        for (let b of row) {
            b.x = x;
            x += b.width + 8;
        }
        this.ioFitRow(row, total, mid);
    }

    /**
     * Inferno-only (23 October, the user's: "the popup has buttons under it, fit them in the box"): the row under the
     * message's white box, and the frame made wide and tall enough to hold it (frame.ioResize). "Please wait" no
     * longer takes the clicks meant for the first button under it (the user's: "the take over / attack again button
     * can't be clicked on the text").
     */
    private ioFitRow(row: any[], total: number, mid: number): void {
        this.tProcessing.mouseEnabled = false;
        let fr: any = this.mcFrame;
        if (!fr || !fr.ioResize) {
            return;
        }
        // (the white box the title and message are on: the shape under the title)
        let box: Rectangle = null;
        for (let i: int = 0; i < this.numChildren; i++) {
            let c: DisplayObject = this.getChildAt(i);
            if (c instanceof Shape) {
                let r: Rectangle = c.getBounds(this);
                if (r.contains(this.tTitle.x + 4, this.tTitle.y + 4) && (!box || r.width * r.height < box.width * box.height)) {
                    box = r;
                }
            }
        }
        let top: number = box ? box.bottom + 10 : this.bAction.y;
        for (let b of row) {
            b.y = Math.round(top);
        }
        // (please wait over the row, as before)
        this.tProcessing.y = Math.round(top + 6);
        let w: number = Math.max(fr.width, total + 56);
        let h: number = top + 30 + 26 - fr.y;
        fr.ioResize(w, h, Math.round(mid - w / 2), fr.y);
    }

    private ioStep(what: string): void {
        SOUNDS.Play("click1");
        if (what == "home") {
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
            POPUPS.Next();
            return;
        }
        // (23 October: only a map cell has it; anything else (a Map Room 3 cell) is left as it is, where it threw)
        let wonCell: MapRoomCell = as3.as(GLOBAL._currentCell, MapRoomCell);
        if (this._success && wonCell) {
            wonCell.destroyed = 1;
        }
        MapRoom.showEnemyWait = true;
        // (the yard's window, then its Take over or Attack, with that window's own checks)
        MapRoom.ioActWait = what == "main" && this._ioAct != "map" ? this._ioAct : "";
        MapRoomManager.instance.Show();
        POPUPS.Next();
    }

    private Tick(param1: Event): void {
        if (BASE._saveCounterA == BASE._saveCounterB) {
            this.bAction.Enabled = true;
            this.tProcessing.htmlText = "";
            if (this._ioAct) {
                this.bAction.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => this.ioStep("main"));
                for (let b of this._ioExtra) {
                    b.Enabled = true;
                    b.addEventListener(MouseEvent.CLICK, b.name == "ioEndHome" ? (e: MouseEvent): void => this.ioStep("home") : (e: MouseEvent): void => this.ioStep("map"));
                }
            } else {
                this.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.End));
            }
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.Tick));
        }
    }

    private End(param1: MouseEvent): void {
        // Inferno-only (QoL #416): the Designer's "Try it": back to the draft, not the map
        if (IoDesigner.ioTryingIt()) {
            IoDesigner.ioTryItBack();
            POPUPS.Next();
            return;
        }
        if (IoGauntlet.inAttack()) {
            IoGauntlet.ReturnHome();
            POPUPS.Next();
            return;
        }
        if (IoSiege.inAttack()) {
            IoSiege.ReturnHome();
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

import * as as3 from "as3";
import { Vector, int } from "as3";
import { DisplayObject, MovieClip, Shape } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { ATTACK, BASE, BFOUNDATION, BUILDING11, BUILDINGS, EnumYardType, GLOBAL, InstanceManager, IoSiege, KEYS, LOGIN, MAP, MAPROOM_DESCENT, MapRoom3Cell, MapRoomCell, MapRoomManager, Maproom3AttackCostPopup, POPUPS, IoMapUi, IoVisitUi, Button_CLIP, ResourceBar1, ResourceBar2, ResourceBar3, ResourceBar4, UI2, UI_TOP, UI_VISITOR_CLIP, button_buildings, com_monsters_maproom_advanced_MapRoom as MapRoom, IoGauntlet } from "@game";

export class UI_VISITOR extends UI_VISITOR_CLIP {
    static {
        as3.fields(this, { m_resourceBar1: null, m_resourceBar2: null, m_resourceBar3: null, m_resourceBar4: null, m_oldScreen: null, attackCostPopup: null, m_ioBat2Tipped: null, m_ioGlass: null, m_ioFaces: null, m_ioLook: null, m_ioShown: null });
    }

    public static _helpButtons: MovieClip = null;

    private static s_mc: MovieClip = null;
    protected m_resourceBar1: ResourceBar1;
    protected m_resourceBar2: ResourceBar2;
    protected m_resourceBar3: ResourceBar3;
    protected m_resourceBar4: ResourceBar4;
    protected m_oldScreen: Rectangle;
    private attackCostPopup: Maproom3AttackCostPopup;
    /** Inferno-only (QoL #65, #83): the top bar whose resource counters got their tips. */
    private m_ioBat2Tipped: any;
    /** Inferno-only (16 October): the bar's own dark glass, drawn in place of its white box (ioDress). */
    private m_ioGlass: Shape;
    /** ...its buttons' faces: [the game's button, its face (IoMapUi.button)]. */
    private m_ioFaces: any[];
    /** ...what the bar was last laid out for (the width, the buttons shown and their labels), to lay it out again only on a change. */
    private m_ioLook: string;
    /** ...the game's buttons it shows (bReturn, bAttack, the Home one), as they were when it was made. */
    private m_ioShown: any[];

    public $ctor(): void {
        super.$ctor();
        UI_VISITOR.s_mc = this.mc;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            this.mc.mcBG.width = 100;
            this.mc.bReturn.SetupKey("btn_endattack");
            this.mc.bAttack.visible = false;
        } else if (MapRoomManager.instance.isInMapRoom2or3 && GLOBAL._currentCell && !BASE.usesInfernoBackend) {
            this.mc.bReturn.SetupKey("btn_openmap");
            if ((GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP || MapRoomManager.instance.isInMapRoom3) && !MapRoomManager.instance.viewOnly && GLOBAL._currentCell && (MapRoomManager.instance.flingerInRange || GLOBAL.ioTestMode())) {
                if (GLOBAL._currentCell.isDestroyed && GLOBAL._currentCell.baseType != 2) {
                    this.mc.bAttack.SetupKey("newmap_take_btn");
                } else {
                    this.mc.bAttack.SetupKey("map_attack_btn");
                }
                this.mc.bAttack.visible = true;
                if (MapRoomManager.instance.isInMapRoom3) {
                    this.mc.bAttack.addEventListener(MouseEvent.CLICK, as3.bind(this, this.AttackMR3));
                } else {
                    this.mc.bAttack.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Attack));
                }
                if ((GLOBAL._currentCell.isLocked || this.isLevelLimited || !ATTACK.hasCreaturesToAttackWith) && !GLOBAL.ioTestMode()) {
                    this.mc.bAttack.Enabled = false;
                } else {
                    this.mc.bAttack.Enabled = true;
                }
            } else {
                this.mc.bAttack.visible = false;
                if (GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP || MapRoomManager.instance.isInMapRoom3) {
                    this.mc.mcBG.width = 100;
                }
            }
        } else {
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP || MapRoomManager.instance.isInMapRoom3) {
                this.mc.mcBG.width = 100;
            }
            this.mc.bReturn.SetupKey("btn_returnhome");
            this.mc.bAttack.visible = false;
        }
        if (MapRoomManager.instance.isInMapRoom3 && this.mc.bAttack.visible && Boolean(this.mc.bAttack.Enabled)) {
        }
        this.mc.bReturn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.ReturnCB));
        this.mc.gotoAndStop(1);
        // Inferno-only (QoL #666): Home beside Open Map when looking at a yard (it took Open Map, then Home: two loads)
        if (GLOBAL.INFERNO_ONLY && this.mc.bReturn.labelKey == "btn_openmap" && GLOBAL.mode != GLOBAL.e_BASE_MODE.HELP) {
            this.ioHomeButton();
        }
        this.Update();
    }

    /**
     * Inferno-only (16 October, the user's: "things placed awkwardly ... could better fit within existing elements"):
     * the bar (Return Home, End Attack, Open Map, Attack, Home) was small grey buttons in a white box, apart from
     * the dark card over it when looking at a player's yard (IoVisitUi). Its buttons are now in the card's own row
     * while the card shows (ioActions; the bar hidden), and without a card (an attack, a tribe's yard) the bar is the
     * card's dark glass with the card's buttons, wide enough for a proper End Attack or Return Home. The game's own
     * buttons stay where they were, hidden, and
     * keep their part: a face's click is theirs, and a face follows their label, Enabled and Highlight (gold).
     * Not for helping a friend build (its building buttons are laid out in the bar).
     */
    private ioDress(): void {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP || !this.mc || !this.mc.mcBG) {
            return;
        }
        let shown: any[] = this.ioShown();
        // (16 October, the user's: "the end attack or return home in the same bar as the others": while the card
        // shows (a player's yard), its buttons are in the card's row (IoVisitUi, ioActions) and the bar is hidden)
        let inCard: boolean = IoVisitUi.hasCard;
        if (this.mc.visible == inCard) {
            this.mc.visible = !inCard;
        }
        if (inCard) {
            return;
        }
        const PAD: int = 8;
        const GAP: int = 6;
        const H: int = 32;
        let alone: int = GLOBAL.isInAttackMode ? 160 : 150;
        let width: int = Math.max(alone, PAD * 2 + shown.length * 96 + GAP * (shown.length - 1));
        let look: string = width + "|" + shown.map((b: any): string => b.name + ":" + b.label + ":" + b._enabled + ":" + b._highlight).join(",");
        if (look == this.m_ioLook) {
            return;
        }
        this.m_ioLook = look;
        let bgH: int = this.mc.mcBG.height | 0;
        this.mc.mcBG.width = width;
        this.mc.mcBG.alpha = 0;
        if (!this.m_ioGlass) {
            this.m_ioGlass = new Shape();
            this.m_ioGlass.name = "ioVisitorGlass";
            this.mc.addChildAt(this.m_ioGlass, 0);
        }
        this.m_ioGlass.graphics.clear();
        IoMapUi.glass(this.m_ioGlass.graphics, width, bgH, 9);
        // the faces: the Open Map / Return Home / End Attack one widest, then Attack, then Home
        let weights: any[] = shown.map((b: any): number => (b == this.mc.bReturn ? 1.4 : 1));
        let total: number = 0;
        for (let w of weights) {
            total += Number(w);
        }
        let room: number = width - PAD * 2 - GAP * (shown.length - 1);
        let x: number = PAD;
        let y: int = Math.round((bgH - H) / 2) | 0;
        for (let f of this.m_ioFaces || []) {
            if (f[1].parent) {
                f[1].parent.removeChild(f[1]);
            }
        }
        this.m_ioFaces = [];
        for (let i: int = 0; i < shown.length; i++) {
            let b: any = shown[i];
            let w: int = i == shown.length - 1 ? (width - PAD - Math.round(x)) | 0 : Math.floor(room * Number(weights[i]) / total) | 0;
            let gold: boolean = Boolean(b._highlight) || b == this.mc.bAttack;
            let face: any = IoMapUi.button(String(b.label || ""), w, H, (e: MouseEvent): void => {
                b.dispatchEvent(new MouseEvent(MouseEvent.CLICK, true, false));
            }, gold ? "gold" : "grey", 12);
            face.name = "ioVisitorFace_" + b.name;
            face.x = Math.round(x);
            face.y = y;
            face.setEnabled(b._enabled !== false);
            GLOBAL.ioFitText(face.getChildAt(face.numChildren - 1), 8);
            this.mc.addChild(face);
            this.m_ioFaces.push([b, face]);
            // (the game's button where its face is, out of sight)
            b.visible = false;
            b.x = face.x;
            b.y = y;
            x += w + GAP;
        }
    }


    /** The game's buttons the bar has (bReturn, bAttack, the Home one): settled when it is made, the ones showing. */
    private ioShown(): any[] {
        if (!this.m_ioShown) {
            this.m_ioShown = [this.mc.bReturn, this.mc.bAttack, this.mc.getChildByName("ioVisitorHome")].filter((b: any): boolean => b != null && b.visible);
        }
        return this.m_ioShown;
    }

    /**
     * Inferno-only (16 October): the bar's buttons for the card's row (IoVisitUi): [label, name, click, style,
     * enabled, weight]; a click is the game's button's. None when helping a friend build (the bar is its own there).
     */
    public ioActions(): any[] {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP || !this.mc) {
            return [];
        }
        return this.ioShown().map((b: any): any[] => [String(b.label || ""), "ioVisitAct_" + b.name, (e: MouseEvent): void => {
            b.dispatchEvent(new MouseEvent(MouseEvent.CLICK, true, false));
        }, b == this.mc.bAttack || Boolean(b._highlight) ? "gold" : "grey", b._enabled !== false, b == this.mc.bReturn ? 1.3 : 1]);
    }

    private ioHomeButton(): void {
        let home: Button_CLIP = new Button_CLIP();
        home.Setup(KEYS.Get("io_end_home"), false, 64, this.mc.bReturn.height | 0);
        home.name = "ioVisitorHome";
        let right: number = this.mc.mcBG.x + this.mc.mcBG.width;
        home.x = right;
        home.y = this.mc.bReturn.y;
        this.mc.addChild(home);
        this.mc.mcBG.width += home.width + 6;
        home.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            if (GLOBAL._newBuilding) {
                GLOBAL._newBuilding.Cancel();
            }
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        });
    }

    public static get mc(): MovieClip {
        return UI_VISITOR.s_mc;
    }

    public static Focus(param1: BFOUNDATION): Function {
        let building: BFOUNDATION = null;
        building = param1;
        return (param1: MouseEvent = null): void => {
            MAP.FocusTo(building._mc.x | 0, building._mc.y | 0, 0.6);
            BASE.BuildingSelect(building, true);
        };
    }

    public get isLevelLimited(): boolean {
        return BASE.loadObject["canattack"] == false;
    }

    public Taunt(param1: MouseEvent = null): void {
        BUILDINGS.Show();
    }

    public Gift(param1: MouseEvent = null): void {
        BUILDINGS.Show();
    }

    public ReturnCB(param1: MouseEvent): void {
        let _loc2_: int = 0;
        if (GLOBAL._newBuilding) {
            GLOBAL._newBuilding.Cancel();
        }
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            // (Inferno-only, QoL #84: asked first while monsters and time are left; in the Gauntlet a slip cost a try)
            let left: int = GLOBAL.INFERNO_ONLY && !ATTACK._sentOver ? ATTACK.ioMonstersLeft() : 0;
            if (left > 0 && ATTACK._countdown > 5) {
                let text: string = KEYS.Get("io_end_attack_ask", { "v1": left, "v2": GLOBAL.ioDuration(ATTACK._countdown) });
                if (IoGauntlet.inAttack()) {
                    text += "<br><br>" + KEYS.Get("io_end_attack_gauntlet");
                }
                GLOBAL.Message(text, KEYS.Get("btn_endattack"), (): void => {
                    if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
                        ATTACK.End();
                    }
                }, null, KEYS.Get("io_end_attack_keep"), null);
                return;
            }
            ATTACK.End();
        } else if (MapRoomManager.instance.isInMapRoom2or3 && GLOBAL._currentCell && GLOBAL._loadmode == GLOBAL.mode) {
            if (GLOBAL.INFERNO_ONLY) {
                MapRoomManager.instance.ioSetupAndShowYard();
            } else {
                MapRoomManager.instance.SetupAndShow();
            }
        } else if (BASE.usesInfernoBackend) {
            _loc2_ = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            if (MAPROOM_DESCENT.InDescent) {
                BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, _loc2_);
            } else {
                BASE.LoadBase(GLOBAL._infBaseURL, 0, 0, GLOBAL.e_BASE_MODE.IBUILD, false, EnumYardType.INFERNO_YARD);
            }
        } else {
            _loc2_ = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
            BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, _loc2_);
        }
    }

    public AttackMR3(param1: MouseEvent): void {
        let _loc2_: MapRoom3Cell = as3.as(GLOBAL._currentCell, MapRoom3Cell);
        if (!_loc2_) {
            return;
        }
        if (!ATTACK.hasCreaturesToAttackWith) {
            GLOBAL.Message(KEYS.Get("msg_nocreaturesattack"));
            return;
        }
        if (_loc2_.isLocked) {
            GLOBAL.Message(KEYS.Get("mr3_base_locked_cannot_attack"));
            return;
        }
        if (this.isLevelLimited) {
            GLOBAL.Message(KEYS.Get("map_msg_leveltoolow"));
            return;
        }
        if (_loc2_.hasTruce) {
            GLOBAL.Message(KEYS.Get("newmap_truce"));
            return;
        }
        if (_loc2_.hasDamageProtection) {
            GLOBAL.Message(KEYS.Get("newmap_dp"));
            return;
        }
        if (_loc2_.isInAttackRange) {
            this.loadAttack();
        } else {
            if (!this.attackCostPopup) {
                this.attackCostPopup = new Maproom3AttackCostPopup(_loc2_);
                this.attackCostPopup.addEventListener(Maproom3AttackCostPopup.k_LOAD_ATTACK, as3.bind(this, this.clickedLoadAttack));
            }
            POPUPS.Push(this.attackCostPopup.graphic);
        }
    }

    protected clickedLoadAttack(param1: Event): void {
        this.attackCostPopup.removeEventListener(Maproom3AttackCostPopup.k_LOAD_ATTACK, as3.bind(this, this.clickedLoadAttack));
        POPUPS.Next();
        this.loadAttack(this.attackCostPopup.addtionalLoadParameters);
        this.attackCostPopup = null;
    }

    private loadAttack(param1: any = null): void {
        let _loc2_: MapRoom3Cell = null;
        _loc2_ = as3.as(GLOBAL._currentCell, MapRoom3Cell);
        let _loc3_: int = MapRoomManager.instance.CalculateCellId(_loc2_.cellX, _loc2_.cellY);
        BASE.LoadBase(null, 0, _loc2_.baseID, !_loc2_.userID ? GLOBAL.e_BASE_MODE.WMATTACK : GLOBAL.e_BASE_MODE.ATTACK, false, _loc2_.cellType, _loc3_, !(!param1) ? ["attackcost", JSON.stringify(param1)] : null);
    }

    public Attack(param1: MouseEvent): void {
        let _loc2_: MapRoomCell = as3.as(GLOBAL._currentCell, MapRoomCell);
        // Admin test mode: a practice attack on any yard.
        if (_loc2_ && GLOBAL.ioTestMode()) {
            MapRoom.showAttackWait = true;
            MapRoomManager.instance.Show();
            return;
        }
        if (_loc2_) {
        }
        if (Boolean(_loc2_) && _loc2_.isLocked) {
            if (_loc2_.online) {
                GLOBAL.Message(KEYS.Get("msg_cantattackoccupied"));
            } else {
                GLOBAL.Message(KEYS.Get("msg_cantattackbeingattacked"));
            }
        } else if (_loc2_) {
            if (_loc2_.isDestroyed) {
                MapRoom.showEnemyWait = true;
                MapRoomManager.instance.Show();
            } else if (!_loc2_.isProtected && !(_loc2_.truce && _loc2_.truce > GLOBAL.Timestamp())) {
                MapRoom.showAttackWait = true;
                MapRoomManager.instance.Show();
            } else if (_loc2_.isProtected) {
                GLOBAL.Message(KEYS.Get("newmap_dp"));
            } else if (Boolean(_loc2_.truce) && _loc2_.truce > GLOBAL.Timestamp()) {
                GLOBAL.Message(KEYS.Get("newmap_truce"));
            }
        }
    }

    public Update(): void {
        let _loc1_: int = 0;
        let _loc2_: Vector<any> = null;
        let _loc3_: BFOUNDATION = null;
        let _loc4_: boolean = false;
        let _loc5_: int = 0;
        let _loc6_: MovieClip = null;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK) {
            if (ATTACK._countdown < 0) {
                this.mc.bReturn.Highlight = true;
            }
        } else if (GLOBAL.mode == GLOBAL.e_BASE_MODE.HELP) {
            if (Boolean(UI_VISITOR._helpButtons) && this.mc.contains(UI_VISITOR._helpButtons)) {
                this.mc.removeChild(UI_VISITOR._helpButtons);
            }
            UI_VISITOR._helpButtons = as3.as(this.mc.addChild(new MovieClip()), MovieClip);
            UI_VISITOR._helpButtons.x = MapRoomManager.instance.isInMapRoom3 ? 310 : 210;
            UI_VISITOR._helpButtons.y = 5;
            _loc1_ = 0;
            _loc2_ = InstanceManager.getInstancesByClass(BFOUNDATION);
            for (_loc3_ of (_loc2_ ?? [])) {
                if (_loc3_._countdownBuild.Get() + _loc3_._countdownUpgrade.Get() + _loc3_._countdownFortify.Get() > 0) {
                    _loc4_ = false;
                    for (const $value of as3.values(_loc3_._helpList)) {
                        _loc5_ = $value | 0;
                        if (_loc5_ == LOGIN._playerID) {
                            _loc4_ = true;
                            break;
                        }
                    }
                    this.mc.gotoAndStop(2);
                    if (MapRoomManager.instance.isInMapRoom3) {
                        this.mc.getChildAt(2).x = 200;
                    }
                    (_loc6_ = new button_buildings()).gotoAndStop(_loc3_._type);
                    _loc6_.x = _loc1_ * 45;
                    if (!_loc4_) {
                        _loc6_.buttonMode = true;
                        _loc6_.addEventListener(MouseEvent.CLICK, UI_VISITOR.Focus(_loc3_));
                        _loc6_.mcTick.visible = false;
                    }
                    UI_VISITOR._helpButtons.addChild(_loc6_);
                    _loc1_++;
                }
            }
            if (_loc1_ > 0) {
                this.mc.mcBG.width = (MapRoomManager.instance.isInMapRoom3 ? 320 : 220) + _loc1_ * 45;
            } else {
                this.mc.mcBG.width = MapRoomManager.instance.isInMapRoom3 ? 210 : 100;
                this.mc.gotoAndStop(1);
            }
        }
        // (Inferno-only, QoL #65 and #83: the top bar's resource counters, after the top bar drew its own: UI2.Update)
        if (GLOBAL.INFERNO_ONLY) {
            this.ioBat2Counters();
            this.ioDress();
        }
        this.Resize();
    }

    /** Inferno-only: looking at a yard (QoL #65) or attacking one (QoL #83), not a replay, a Siege or Hellgate. */
    private static ioBat2Mode(): string {
        let m: string = GLOBAL.mode;
        let modes: any = GLOBAL.e_BASE_MODE;
        if (MapRoomManager.instance.isInMapRoom3 || GLOBAL.ioTdMode() || IoSiege.inAttack() || (BASE.loadObject && BASE.loadObject.io_replay_view)) {
            return "";
        }
        if (m == modes.ATTACK || m == modes.IATTACK || m == modes.WMATTACK || m == modes.IWMATTACK) {
            return "attack";
        }
        if (m == modes.VIEW || m == modes.IVIEW || m == modes.WMVIEW || m == modes.IWMVIEW) {
            return "view";
        }
        return "";
    }

    /**
     * Inferno-only: the top bar's four resource counters. Scouting (QoL #65): about what the yard would give up if
     * every storage and harvester fell (they showed 0); attacking (QoL #83): what was taken / what is still to take.
     * By the loot code's rules: ATTACK.ioLootEstimate. The scouted numbers are kept for the map's enemy popup.
     */
    private ioBat2Counters(): void {
        let what: string = UI_VISITOR.ioBat2Mode();
        let top: UI_TOP = UI2._top;
        if (!what || !top || !top.mc) {
            return;
        }
        let est: any[] = ATTACK.ioLootEstimate();
        if (!est) {
            return;
        }
        if (what == "view") {
            ATTACK.ioNoteScouted(est);
        }
        for (let r: int = 1; r < 5; r++) {
            let c: any = top.mc["mcR" + r];
            if (!c || !c.tR) {
                continue;
            }
            if (what == "attack") {
                let taken: number = ATTACK._loot && ATTACK._loot["r" + r] ? Number(ATTACK._loot["r" + r].Get()) : 0;
                c.tR.htmlText = "<b>" + GLOBAL.ioShort(taken) + "<font color=\"#D8CCB0\"> / " + GLOBAL.ioShort(Number(est[r - 1])) + "</font></b>";
            } else {
                c.tR.htmlText = "<b>~" + GLOBAL.ioShort(Number(est[r - 1])) + "</b>";
            }
            GLOBAL.ioFitText(c.tR, 8);
            if (c.mcBar) {
                c.mcBar.visible = false;
            }
        }
        if (this.m_ioBat2Tipped != top) {
            this.m_ioBat2Tipped = top;
            UI_VISITOR.ioBat2Tips(top);
        }
    }

    /** The counters' tips: the numbers in full, and what they are. */
    private static ioBat2Tips(top: UI_TOP): void {
        for (let r: int = 1; r < 5; r++) {
            let c: any = top.mc["mcR" + r];
            let hit: any = c ? (c.mcHit ? c.mcHit : c) : null;
            if (!hit) {
                continue;
            }
            let res: int = r;
            hit.addEventListener(MouseEvent.MOUSE_OVER, (e: MouseEvent): void => {
                let what: string = UI_VISITOR.ioBat2Mode();
                let est: any[] = what ? ATTACK.ioLootEstimate() : null;
                if (!est || UI2._top != top) {
                    return;
                }
                let html: string = "<b>" + KEYS.Get(as3.str(GLOBAL._resourceNames[res - 1])) + "</b>";
                if (what == "attack") {
                    let taken: number = ATTACK._loot && ATTACK._loot["r" + res] ? Number(ATTACK._loot["r" + res].Get()) : 0;
                    html += "<br>" + KEYS.Get("io_bat2_tip_taken", { "v1": GLOBAL.FormatNumber(taken) }) + "<br>" + KEYS.Get("io_bat2_tip_left", { "v1": GLOBAL.FormatNumber(Number(est[res - 1])) });
                } else {
                    html += "<br>" + KEYS.Get("io_bat2_tip_view", { "v1": GLOBAL.FormatNumber(Number(est[res - 1])) });
                }
                UI_TOP.ioTip(hit, html, "below");
            });
            hit.addEventListener(MouseEvent.MOUSE_OUT, (e: MouseEvent): void => {
                if (UI_VISITOR.ioBat2Mode()) {
                    UI_TOP.ioTipHide();
                }
            });
        }
    }

    public Resize(): void {
        if (!this.m_oldScreen || !GLOBAL._SCREEN.equals(this.m_oldScreen)) {
            GLOBAL.RefreshScreen();
            this.m_oldScreen = GLOBAL._SCREEN.clone();
        }
        this.mc.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - this.mc.mcBG.width - 10;
        if (GLOBAL._flags.viximo) {
            this.mc.y = GLOBAL._SCREEN.y + GLOBAL._SCREEN.height - (this.mc.height + 10);
        } else {
            this.mc.y = GLOBAL._SCREENHUD.y - (this.mc.mcBG.height + 10);
        }
        let _loc1_: int = 4;
        while (_loc1_ > 0) {
            if (this["m_resourceBar" + _loc1_]) {
                this["m_resourceBar" + _loc1_].x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - 10 - this["m_resourceBar" + _loc1_].width * 0.5;
                this["m_resourceBar" + _loc1_].y = GLOBAL._SCREEN.y + _loc1_ * 40;
            }
            _loc1_--;
        }
    }

    public checkMapRoomHealth(): void {
        let _loc1_: BUILDING11 = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BUILDING11);
        if (_loc2_.length === 0) {
            return;
        }
        _loc1_ = as3.as(as3.vget(_loc2_, 0), BUILDING11);
        if (_loc1_.health < _loc1_.maxHealth / 2) {
            this.mc.bReturn.SetupKey("btn_returnhome");
        }
    }
}

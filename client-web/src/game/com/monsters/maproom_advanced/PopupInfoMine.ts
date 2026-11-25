import * as as3 from "as3";
import { Vector, int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField } from "flash/text";
import { ALLIANCES, BASE, CellData, Contact, Elastic, EnumYardType, GLOBAL, IoMapUi, IoOutpostsPopup, IoRelocate, KEYS, LOGGER, LOGIN, MapRoomCell, MapRoomManager, POWERUPS, PopupInfoMine_CLIP, PopupInfoMonster, SOUNDS, ScrollSet, TRIBES, TweenLite, URLLoaderApi, com_monsters_mailbox_Message as Message, com_monsters_maproom_advanced_MapRoom as MapRoom, frame } from "@game";

export class PopupInfoMine extends PopupInfoMine_CLIP {
    static {
        as3.fields(this, { _cell: null, _mcMonsters: null, _message: null, _hasMonsters: false, _bookmarked: false, _scroller: null, _ioRow: null, _ioRowFor: null });
    }

    private _cell: MapRoomCell;
    private _mcMonsters: MovieClip;
    private _message: Message;
    private _hasMonsters: boolean;
    private _bookmarked: boolean;
    private _scroller: ScrollSet;
    /** Inferno-only (QoL #328): this outpost's line of the Outposts list (worldmapv2/myoutposts), and whose it is. */
    private _ioRow: any;
    private _ioRowFor: string;

    public $ctor(): void {
        super.$ctor();
        this.x = 760 / 2 + 75;
        this.y = 520 / 2;
        this.mMonsters.mask = this.mMonstersMask;
        this._scroller = new ScrollSet();
        this._scroller.isHiddenWhileUnnecessary = true;
        this._scroller.AutoHideEnabled = false;
        this._scroller.width = this.scroll.width;
        this._scroller.x = this.scroll.x;
        this._scroller.y = this.scroll.y;
        this.addChild(this._scroller);
        this._scroller.Init(this.mMonsters, this.mMonstersMask, 0, this.scroll.y, this.scroll.height);
        this.bOpen.SetupKey("btn_open");
        this.bOpen.Highlight = true;
        this.bOpen.addEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("open");
        });
        this.bOpen.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.Open();
        });
        this.bMonsters.SetupKey("newmap_tr_from");
        this.bMonsters.addEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("monsters");
        });
        this.bMonsters.addEventListener(MouseEvent.CLICK, as3.bind(this, this.StartTransferM));
        this.bRelocate.SetupKey("btn_movemainyardhere");
        this.bRelocate.addEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("relocateme");
        });
        this.bRelocate.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            // (Inferno-only, QoL #479: in your main yard's popup the button is Relocate, the map room building's
            // flow: it asks first, with what it costs)
            if (GLOBAL.INFERNO_ONLY && this._cell && this._cell._base == 2) {
                this.Hide();
                IoRelocate.Ask();
                return;
            }
            // (Inferno-only, QoL #344: greyed, it says why instead)
            if (GLOBAL.INFERNO_ONLY && this.ioMoveBlocked()) {
                GLOBAL.Message(this.ioMoveBlocked());
                return;
            }
            MapRoom._mc.ShowRelocateMePopup(this._cell);
        });
        this.bInviteMigrate.addEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("invitemigrate");
        });
        this.bInviteMigrate.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowInviteMigrate();
        });
        this.bBookmark.SetupKey("newmap_bookmark_btn");
        this.bBookmark.addEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("bookmark");
        });
        this.bBookmark.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            if (!this._bookmarked) {
                MapRoom._mc.ShowBookmarkAddPopup(this._cell);
            } else {
                GLOBAL.Message(KEYS.Get("newmap_bm_done"));
            }
        });
        (as3.as(this.mcFrame, frame)).Setup();
    }

    private StartTransferM(param1: MouseEvent): void {
        if (this.bMonsters.Enabled && !MapRoom._monsterTransferInProgress && !MapRoom._resourceTransferInProgress && GLOBAL._mapOutpost.length > 0 && this._hasMonsters) {
            MapRoom._mc.ShowMonstersA(this._cell);
        }
    }

    public Hide(param1: MouseEvent = null): void {
        MapRoom._mc.HideInfoMine();
    }

    public Setup(param1: MapRoomCell): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: any = null;
        let _loc6_: any = null;
        let _loc7_: int = 0;
        this._cell = param1;
        this.tLabel1.htmlText = "<b>" + KEYS.Get("popup_label_name") + "</b>";
        this.tLabel2.htmlText = "<b>" + KEYS.Get("popup_label_thisyardhas") + "</b>";
        this.tLabel3.htmlText = "<b>" + KEYS.Get("popup_label_locationheight") + "</b>";
        this.tLabel4.htmlText = "<b>" + KEYS.Get("popup_label_monstershoused") + "</b>";
        let _loc2_: number = 0;
        if (POWERUPS.CheckPowers(POWERUPS.ALLIANCE_DECLAREWAR, "NORMAL")) {
            _loc2_ = POWERUPS.Apply(POWERUPS.ALLIANCE_DECLAREWAR, [0]);
        }
        GLOBAL._attackerCellsInRange = MapRoom._mc.GetCellsInRange(this._cell.X, this._cell.Y, (10 + _loc2_) | 0);
        if (this._cell._base == 3) {
            this.tName.htmlText = KEYS.Get("map_outpostowner", { "v1": this._cell._name });
        } else {
            this.tName.htmlText = KEYS.Get("map_yardowner", { "v1": this._cell._name });
        }
        this.tLocation.htmlText = IoMapUi.location(param1.X, param1.Y);
        // Inferno-only (bug report B16): kept clear of the Bookmark button beside it
        if (GLOBAL.INFERNO_ONLY && this.bBookmark && this.bBookmark.visible && Math.abs(this.bBookmark.y - this.tLocation.y) < this.tLocation.height + 6 && this.bBookmark.x > this.tLocation.x && this.tLocation.x + this.tLocation.width > this.bBookmark.x - 4) {
            this.tLocation.width = Math.max(40, this.bBookmark.x - 4 - this.tLocation.x);
            GLOBAL.ioFitText(this.tLocation);
        }
        this.tHeight.htmlText = this._cell._height - 100 + "m";
        if (this._cell._base == 2) {
            _loc3_ = 0;
        } else {
            _loc3_ = (this._cell._height * 100 / GLOBAL._averageAltitude.Get() - 100) | 0;
        }
        if (this._cell._base == 2) {
            _loc4_ = 0;
        } else {
            _loc4_ = (100 * GLOBAL._averageAltitude.Get() / this._cell._height - 100) | 0;
        }
        if (_loc3_ >= 0) {
            _loc5_ = "<font color=\"#003300\">+" + KEYS.Get("newmap_h1", { "v1": _loc3_ }) + "</font>";
        } else {
            _loc5_ = "<font color=\"#330000\">- " + KEYS.Get("newmap_h1", { "v1": Math.abs(_loc3_) }) + "</font>";
        }
        if (_loc4_ >= 0) {
            _loc6_ = "<font color=\"#003300\">+" + KEYS.Get("newmap_h2", { "v1": _loc4_ }) + "</font>";
        } else {
            _loc6_ = "<font color=\"#330000\">- " + KEYS.Get("newmap_h2", { "v1": Math.abs(_loc4_) }) + "</font>";
        }
        this.tBonus.htmlText = _loc5_ + "<br>" + _loc6_;
        if (GLOBAL._mapOutpost.length > 0) {
            this.bMonsters.Enabled = true;
        } else {
            this.bMonsters.Enabled = false;
        }
        this.ButtonInfo("open");
        this.bBookmark.Enabled = true;
        if (MapRoom._bookmarks) {
            _loc7_ = 0;
            while (_loc7_ < MapRoom._bookmarks.length) {
                if (MapRoom._bookmarks[_loc7_].location.x == this._cell.X && MapRoom._bookmarks[_loc7_].location.y == this._cell.Y) {
                    this._bookmarked = true;
                    break;
                }
                _loc7_++;
            }
            if (this._bookmarked) {
                this.bBookmark.Enabled = false;
            } else {
                this.bBookmark.Enabled = true;
            }
        }
        if (this._cell._base == 3 && !this._cell._ioUnder) {
            this.bRelocate.visible = true;
            this.bInviteMigrate.visible = true;
        } else {
            this.bRelocate.visible = false;
            this.bInviteMigrate.visible = false;
        }
        if (this._cell._invitePendingID == 0) {
            this.bInviteMigrate.SetupKey("btn_invitetomove");
        } else {
            this.bInviteMigrate.SetupKey("btn_revokeinvitation");
        }
        if (GLOBAL.INFERNO_ONLY) {
            this.ioSetupMove();
            this.ioAskRow();
        }
        this.Update();
    }

    /**
     * Inferno-only: the button where "Move main yard here" is.
     *  - (QoL #479) In your main yard's popup: Relocate (IoRelocate, as on the Map Room building), its info line
     *    saying what it costs and how many outposts would be lost.
     *  - (QoL #344) On an outpost: greyed while the main yard can't move there (the Depths of Hell; moved in the last
     *    24 hours), its info line and a click saying why and when it frees up. It used to be hidden in the Depths
     *    and refused only after the click otherwise.
     */
    private ioSetupMove(): void {
        if (this._cell._base == 2) {
            this.bRelocate.SetupKey("io_btn_relocate");
            this.bRelocate.visible = true;
            this.bRelocate.Enabled = true;
            return;
        }
        this.bRelocate.SetupKey("btn_movemainyardhere");
        if (this._cell._base == 3) {
            this.bRelocate.visible = true;
            this.bRelocate.Enabled = !this.ioMoveBlocked();
        }
    }

    /** (QoL #344) Why the main yard can't be moved onto this outpost now ("" when it can). */
    private ioMoveBlocked(): string {
        if (!this._cell || this._cell._base != 3) {
            return "";
        }
        if (this._cell._ioUnder) {
            return KEYS.Get("io_map2_move_depths");
        }
        let left: number = MapRoom.ioMoveFreeAt - GLOBAL.Timestamp();
        if (left > 0) {
            return KEYS.Get("io_map2_move_wait", { "v1": GLOBAL.ioDuration(left) });
        }
        return "";
    }

    /** (QoL #479) What relocating costs: the resources there are now, and the outposts that go back to the wild. */
    private ioRelocateInfo(): string {
        let count: int = GLOBAL._mapOutpost ? GLOBAL._mapOutpost.length | 0 : 0;
        let parts: any[] = [];
        for (let r: int = 1; r <= 4; r++) {
            let have: number = GLOBAL._resources && GLOBAL._resources["r" + r] ? Number(GLOBAL._resources["r" + r].Get()) : 0;
            parts.push(IoOutpostsPopup.short(have) + " " + KEYS.Get(String(GLOBAL._resourceNames[r - 1])).toLowerCase());
        }
        let lost: string = count == 0 ? KEYS.Get("io_map2_relocate_lost0") : (count == 1 ? KEYS.Get("io_map2_relocate_lost1") : KEYS.Get("io_map2_relocate_lostn", { "v1": count }));
        return KEYS.Get("io_map2_relocate_info", { "v1": parts.join(", "), "v2": lost });
    }

    /** (QoL #328) Asks for this outpost's line of the Outposts list (kept a minute), then shows it. */
    private ioAskRow(): void {
        let id: string = null;
        if (!this.ioShowsFacts()) {
            return;
        }
        id = String(this._cell._baseID);
        if (this._ioRowFor != id) {
            this._ioRow = null;
            this._ioRowFor = id;
        }
        IoOutpostsPopup.ioFetch((list: any[]): void => {
            if (this._ioRowFor != id || !this._cell || String(this._cell._baseID) != id) {
                return;
            }
            this._ioRow = { "missing": 1 };
            for (let o of as3.values(list || [])) {
                if (String(o.baseid) == id) {
                    this._ioRow = o;
                    break;
                }
            }
            if (this.parent) {
                this.Update();
            }
        });
    }

    /** (QoL #328) The facts are shown for your own outposts. */
    private ioShowsFacts(): boolean {
        return GLOBAL.INFERNO_ONLY && Boolean(this._cell) && this._cell._base == 3 && Boolean(this._cell._mine);
    }

    /**
     * Inferno-only (QoL #328): your outpost's facts at the top of the monsters box: what it makes per hour,
     * housed / room, idle workers, protection left, its towers, and Open + Kits (opens it with the kit window).
     * From the map's cell (workers, protection, damage) and the Outposts list's line (the rest). Returns its height.
     */
    private ioFacts(holder: MovieClip): int {
        let w: int = 255;
        let box: Sprite = new Sprite();
        let row: any = this._ioRow;
        let ready: boolean = row != null && !row.missing;
        let now: number = GLOBAL.Timestamp();
        let lines: any[] = [];
        let wait: string = row == null ? KEYS.Get("io_map2_op_loading") : "-";
        box.name = "ioOpFacts";
        let title: TextField = IoMapUi.label(KEYS.Get("io_map2_op_title"), 9, IoMapUi.MUTED, true, (w - 90) | 0);
        title.y = 1;
        box.addChild(title);
        let kits: MovieClip = IoMapUi.button(KEYS.Get("io_map2_open_kits"), 86, 18, (e: MouseEvent): void => {
            this.ioOpenKits();
        }, "gold", 9);
        kits.name = "ioOpOpenKits";
        kits.x = w - 88;
        kits.y = -2;
        box.addChild(kits);
        // per hour
        let made: string = wait;
        if (ready && row.production) {
            let parts: any[] = [];
            for (let r: int = 0; r < 4; r++) {
                parts.push(IoOutpostsPopup.short(Number(row.production[r])) + " " + KEYS.Get(String(GLOBAL._resourceNames[r])).toLowerCase());
            }
            made = parts.join(" · ");
            // (QoL #322: worked out by the server from its harvesters: it adds nothing until the outpost is opened)
            if (row.estimated) {
                made = "~" + made + " " + KEYS.Get("io_op3_prod_estimated");
            }
        } else if (ready) {
            made = KEYS.Get("io_map2_op_prod_unknown");
        }
        // (QoL #326: the name the player gave it, first)
        let name: string = IoOutpostsPopup.ioNameOf(String(this._cell._baseID));
        if (name) {
            lines.push(KEYS.Get("io_op2_op_name", { "v1": "<b>" + IoMapUi.escape(name) + "</b>" }));
        }
        lines.push(KEYS.Get("io_map2_op_prod", { "v1": made }));
        // housed / room
        let housed: string = wait;
        if (ready) {
            let room: int = IoOutpostsPopup.roomOf(row);
            housed = room > 0 ? IoOutpostsPopup.short(IoOutpostsPopup.usedOf(row)) + " / " + IoOutpostsPopup.short(room) : KEYS.Get("io_map2_op_no_compound");
        }
        lines.push(KEYS.Get("io_map2_op_housed", { "v1": housed }));
        lines.push(KEYS.Get("io_map2_op_idle", { "v1": this._cell.ioIdleWorkers(), "v2": GLOBAL.ioOutpostWorkers() }));
        lines.push(this._cell._ioProtUntil > now ? KEYS.Get("io_cell_protected", { "v1": GLOBAL.ioDuration(this._cell._ioProtUntil - now) }) : KEYS.Get("io_map2_op_unprotected"));
        // towers
        let towers: string = wait;
        if (ready && row.defences) {
            towers = (row.defences[0] | 0) > 0 ? IoOutpostsPopup.towersText(row, true) : "<font color=\"#B71C1C\">" + KEYS.Get("io_map2_op_towers_none") + "</font>";
        }
        lines.push(KEYS.Get("io_map2_op_towers", { "v1": towers }));
        if ((this._cell._damage | 0) > 0) {
            lines.push("<font color=\"#B71C1C\">" + KEYS.Get("newmap_inf_damaged", { "v1": this._cell._damage | 0 }) + "</font>");
        }
        let text: TextField = IoMapUi.label("", 10, IoMapUi.INK, false, w);
        text.multiline = true;
        text.wordWrap = true;
        text.htmlText = lines.join("<br>");
        text.height = text.textHeight + 6;
        text.y = 18;
        box.addChild(text);
        let h: int = (text.y + text.height + 2) | 0;
        // the monsters under it
        let under: TextField = IoMapUi.label(KEYS.Get("io_map2_op_monsters"), 9, IoMapUi.MUTED, true, (w - 76) | 0);
        under.y = h;
        box.addChild(under);
        // (QoL #343: Abandon, on the monsters' line at the right: it asks first)
        let abandon: MovieClip = IoMapUi.button(KEYS.Get("io_op2_abandon_btn"), 72, 16, (e: MouseEvent): void => {
            this.ioAbandon();
        }, "grey", 9);
        abandon.name = "ioOp2Abandon";
        abandon.x = w - 74;
        abandon.y = h - 1;
        box.addChild(abandon);
        h = (h + 18) | 0;
        box.graphics.lineStyle(1, IoMapUi.RULE, 1);
        box.graphics.moveTo(0, h - 3);
        box.graphics.lineTo(w, h - 3);
        holder.addChild(box);
        return h;
    }

    /** (QoL #343) Abandon this outpost (IoOutpostsPopup asks, then lets it go and reloads the game). */
    private ioAbandon(): void {
        let row: any = this._ioRow && !this._ioRow.missing ? this._ioRow : null;
        let outpost: any = { "baseid": this._cell._baseID, "x": this._cell.X, "y": this._cell.Y, "monsters": row ? row.monsters | 0 : 0 };
        this.Hide();
        IoOutpostsPopup.ioAbandonAsk(outpost);
    }

    /** (QoL #328) Open + Kits: the outpost opens, then its kit window (IoOutpostsPopup.ioKitsOnArrival). */
    private ioOpenKits(): void {
        if (this._cell._locked && this._cell._locked != LOGIN._playerID) {
            GLOBAL.Message(KEYS.Get("newmap_attacked"));
            return;
        }
        IoOutpostsPopup.ioKitsOnArrival(this._cell._baseID);
        this.Open();
    }

    public Cleanup(): void {
        this.bOpen.removeEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("open");
        });
        this.bOpen.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.Open();
        });
        this.bMonsters.removeEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("monsters");
        });
        this.bMonsters.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.StartTransferM));
        this.bRelocate.removeEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("relocateme");
        });
        this.bRelocate.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            MapRoom._mc.ShowRelocateMePopup(this._cell);
        });
        this.bInviteMigrate.removeEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("invitemigrate");
        });
        this.bInviteMigrate.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            this.ShowInviteMigrate();
        });
        this.bBookmark.removeEventListener(MouseEvent.MOUSE_OVER, (param1: MouseEvent): void => {
            this.ButtonInfo("bookmark");
        });
        this.bBookmark.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            if (!this._bookmarked) {
                MapRoom._mc.ShowBookmarkAddPopup(this._cell);
            } else {
                GLOBAL.Message(KEYS.Get("newmap_bm_done"));
            }
        });
        if (this.mcFrame) {
            this.mcFrame.Clear();
            this.mcFrame = null;
        }
    }

    private Open(): void {
        let _loc1_: int = 0;
        if (!this._cell._locked || this._cell._locked == LOGIN._playerID) {
            GLOBAL._currentCell = this._cell;
            MapRoom._mc.HideInfoMine();
            MapRoomManager.instance.Hide();
            MapRoom.ClearCells();
            GLOBAL._attackerCellsInRange = new Vector<CellData>(0, true, CellData);
            _loc1_ = this._cell._base == 3 ? EnumYardType.OUTPOST | 0 : EnumYardType.MAIN_YARD | 0;
            BASE.LoadBase(null, 0, this._cell._baseID, GLOBAL.e_BASE_MODE.BUILD, false, _loc1_);
        } else {
            GLOBAL.Message(KEYS.Get("newmap_attacked"));
        }
    }

    public PendingInvite(): void {
        this._cell._invitePendingID = 1;
        this._cell.mc.mcPlayer.mcInvite.visible = true;
        this._cell._updated = false;
        MapRoom.GetCell(this._cell.X, this._cell.Y, true);
    }

    private RevokeInvitation(): void {
        let body: string = null;
        let subject: string = null;
        let vars: any[] = null;
        let r: URLLoaderApi = null;
        let onMigrateRevokeSuccess: Function = null;
        let onFail: Function = null;
        onMigrateRevokeSuccess = (param1: any): void => {
            this.Hide();
            if (param1.error != 0) {
                GLOBAL.Message(KEYS.Get("msg_err_revoke") + param1.error);
                return;
            }
            this._cell._invitePendingID = 0;
            this._cell.mc.mcPlayer.mcInvite.visible = false;
            this._cell._updated = false;
            if (MapRoom._open) {
                MapRoom.GetCell(this._cell.X, this._cell.Y, true);
            }
            GLOBAL.Message(KEYS.Get("msg_revoke_success"));
        };
        onFail = (param1: Error): void => {
            this.Hide();
            GLOBAL.Message(KEYS.Get("msg_err_revoke") + param1.message);
            LOGGER.Log("err", "PopupInfoMine.RevokeInvitation HTTP ", Boolean(param1.message));
        };
        if (!this._cell._updated) {
            return;
        }
        SOUNDS.Play("click1");
        body = KEYS.Get("invite_revoke");
        subject = KEYS.Get("invite_subject");
        vars = [["threadid", this._cell._invitePendingID], ["targetid", LOGIN._playerID], ["targetbaseid", 0], ["type", "migraterevoke"], ["subject", subject], ["message", body]];
        r = new URLLoaderApi();
        r.load(GLOBAL._apiURL + "player/sendmessage", vars, onMigrateRevokeSuccess, onFail);
    }

    private ButtonInfo(param1: string): void {
        if (param1 == "open") {
            this.txtButtonInfo.htmlText = KEYS.Get("newmap_inf_open");
            this.mcArrow.x = this.bOpen.x + this.bOpen.width / 2 - 5;
        } else if (param1 == "monsters") {
            this.txtButtonInfo.htmlText = KEYS.Get("newmap_inf_tr");
            this.mcArrow.x = this.bMonsters.x + this.bMonsters.width / 2 - 5;
        } else if (param1 == "bookmark") {
            this.txtButtonInfo.htmlText = KEYS.Get("newmap_bookmark");
            this.mcArrow.x = this.bBookmark.x + this.bBookmark.width / 2 - 5;
        } else if (param1 == "relocateme") {
            this.txtButtonInfo.htmlText = KEYS.Get("newmap_relocate_exp");
            // (Inferno-only, QoL #479: Relocate's cost; QoL #344: why it is greyed and until when)
            if (GLOBAL.INFERNO_ONLY && this._cell && this._cell._base == 2) {
                this.txtButtonInfo.htmlText = this.ioRelocateInfo();
            } else if (GLOBAL.INFERNO_ONLY && this.ioMoveBlocked()) {
                this.txtButtonInfo.htmlText = "<b>" + KEYS.Get("io_map2_move_greyed") + "</b> <font color=\"#B71C1C\">" + this.ioMoveBlocked() + "</font>";
            }
            this.mcArrow.x = this.bRelocate.x + this.bRelocate.width / 2 - 5;
        } else if (param1 == "invitemigrate") {
            if (this._cell._invitePendingID) {
                this.txtButtonInfo.htmlText = KEYS.Get("newmap_revokepending");
            } else {
                this.txtButtonInfo.htmlText = KEYS.Get("newmap_invite_exp");
            }
            this.mcArrow.x = this.bInviteMigrate.x + this.bInviteMigrate.width / 2 - 5;
        }
        TweenLite.to(this.mcArrow, 0.6, { "x": this.mcArrow.x + 5, "ease": Elastic.easeOut });
    }

    private ShowInviteMigrate(): void {
        if (this._cell._base < 2) {
            GLOBAL.Message(KEYS.Get("newmap_wmtruce", { "v1": TRIBES.DisplayName(this._cell._name) }));
            return;
        }
        if (!this._cell._updated) {
            return;
        }
        if (this._cell._invitePendingID) {
            this.RevokeInvitation();
            return;
        }
        if (GLOBAL.INFERNO_ONLY && !ALLIANCES._myAlliance) {
            // Invites go to alliance members only (server: services/maproom/v2/relocateInvites.ts).
            GLOBAL.Message(KEYS.Get("io_t3m_pa_need_alliance"));
            return;
        }
        if (Boolean(this._message) && Boolean(this._message.parent)) {
            this._message.parent.removeChild(this._message);
            this._message = null;
        }
        let _loc1_: Contact = new Contact(String(this._cell._userID), { "first_name": this._cell._name, "last_name": "", "pic_square": this._cell._pic_square });
        this._message = new Message("map2friends");
        this._message.requestType = "migraterequest";
        this._message.subject_txt.htmlText = KEYS.Get("invite_subject");
        this._message.body_txt.htmlText = KEYS.Get("invite_body");
        this._message.x = 0;
        this._message.y = -450;
        this._message.baseID = this._cell._baseID;
        GLOBAL.BlockerAdd(as3.as(this.parent, MovieClip));
        MapRoom._mc.addChild(this._message);
        this.bInviteMigrate.Enabled = false;
    }

    public Update(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: string = null;
        let _loc4_: PopupInfoMonster = null;
        if (this._cell._updated) {
            this.bInviteMigrate.Enabled = true;
        } else {
            this.bInviteMigrate.Enabled = false;
        }
        if (Boolean(this._mcMonsters) && Boolean(this._mcMonsters.parent)) {
            this._mcMonsters.parent.removeChild(this._mcMonsters);
            this._mcMonsters = null;
        }
        this._hasMonsters = false;
        // (Inferno-only, QoL #328: your outpost's facts first, the monsters under them)
        let ioTop: int = 0;
        if (this._cell._monsters || this.ioShowsFacts()) {
            this._mcMonsters = new MovieClip();
            this._mcMonsters.x = 5;
            this._mcMonsters.y = 5;
            if (this.ioShowsFacts()) {
                ioTop = this.ioFacts(this._mcMonsters);
            }
            _loc1_ = 0;
            _loc2_ = 0;
            for (_loc3_ in this._cell._monsters) {
                if (this._cell._monsters[_loc3_].Get() > 0) {
                    (_loc4_ = new PopupInfoMonster()).Setup((_loc1_ * 130) | 0, (ioTop + _loc2_ * 35) | 0, _loc3_, this._cell._monsters[_loc3_].Get() | 0);
                    _loc1_ += 1;
                    this._mcMonsters.addChild(_loc4_);
                    if (_loc1_ == 2) {
                        _loc1_ = 0;
                        _loc2_ += 1;
                    }
                    this._hasMonsters = true;
                }
            }
            this.mMonsters.addChild(this._mcMonsters);
        }
        if (this._hasMonsters && GLOBAL._mapOutpost.length > 0) {
            this.bMonsters.Enabled = true;
        } else {
            this.bMonsters.Enabled = false;
        }
        if (this._scroller) {
            this._scroller.Update();
        }
    }
}

import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObject, Loader, MovieClip } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { URLRequest } from "flash/net";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceTabBase, BASE, Button_CLIP, EnumYardType, GLOBAL, ImageCache, KEYS, LOGIN, MapRoomManager, MemberActionPopup, SOUNDS, ScrollSetV } from "@game";

export class MembersTab extends AllianceTabBase {
    static {
        as3.fields(this, { _activePopup: null, _members: null });
    }

    private static PAD: int; // const

    private static TITLE_SIZE: int; // const
    private static TITLE_H: int; // const
    private static TITLE_Y: int; // const
    private static TITLE_GAP: int; // const

    private static TABLE_Y: int; // const
    private static TABLE_X: int; // const
    private static SCROLLBAR_W: int; // const
    private static TABLE_W: int; // const
    private static HEADER_H: int; // const
    private static ROW_H: int; // const

    private static VIEW_H: int; // const

    // Column proportions from the original members table (alliance.v343.css),
    // scaled to TABLE_W.
    private static C_LVL_X: int; // const
    private static C_LVL_W: int; // const
    private static C_NAME_X: int; // const
    private static C_NAME_W: int; // const
    private static C_STATUS_X: int; // const
    private static C_STATUS_W: int; // const
    private static C_EP_X: int; // const
    private static C_EP_W: int; // const
    private static C_ATK_X: int; // const
    private static C_ATK_W: int; // const
    private static C_ACT_X: int; // const
    private static C_ACT_W: int; // const

    // Original member pic is 25×25
    private static AVATAR_SIZE: int; // const
    private static AVATAR_PLACEHOLDER: string; // const

    // Original actions button is 97×25
    private static ACT_BTN_W: int; // const

    private static POP_RIGHT_X: int; // const
    private static POP_X: int; // const

    static {
        as3.lazyStatics(this, { PAD: 0, TITLE_SIZE: 0, TITLE_H: 0, TITLE_Y: 0, TITLE_GAP: 0, TABLE_Y: 0, TABLE_X: 0, SCROLLBAR_W: 0, TABLE_W: 0, HEADER_H: 0, ROW_H: 0, VIEW_H: 0, C_LVL_X: 0, C_LVL_W: 0, C_NAME_X: 0, C_NAME_W: 0, C_STATUS_X: 0, C_STATUS_W: 0, C_EP_X: 0, C_EP_W: 0, C_ATK_X: 0, C_ATK_W: 0, C_ACT_X: 0, C_ACT_W: 0, AVATAR_SIZE: 0, AVATAR_PLACEHOLDER: null, ACT_BTN_W: 0, POP_RIGHT_X: 0, POP_X: 0 }, () => {
            MembersTab.PAD = 10;
            MembersTab.TITLE_SIZE = 24;
            MembersTab.TITLE_H = 32;
            MembersTab.TITLE_Y = 20;
            MembersTab.TITLE_GAP = 12;
            MembersTab.TABLE_Y = (MembersTab.TITLE_Y + MembersTab.TITLE_H + MembersTab.TITLE_GAP) | 0;
            MembersTab.TABLE_X = MembersTab.PAD;
            MembersTab.SCROLLBAR_W = 16;
            MembersTab.TABLE_W = 772;
            MembersTab.HEADER_H = 24;
            MembersTab.ROW_H = 36;
            MembersTab.VIEW_H = 378;
            MembersTab.C_LVL_X = 0;
            MembersTab.C_LVL_W = 59;
            MembersTab.C_NAME_X = 59;
            MembersTab.C_NAME_W = 201;
            MembersTab.C_STATUS_X = 260;
            MembersTab.C_STATUS_W = 79;
            MembersTab.C_EP_X = 339;
            MembersTab.C_EP_W = 131;
            MembersTab.C_ATK_X = 470;
            MembersTab.C_ATK_W = 171;
            MembersTab.C_ACT_X = 641;
            MembersTab.C_ACT_W = 131;
            MembersTab.AVATAR_SIZE = 25;
            MembersTab.AVATAR_PLACEHOLDER = GLOBAL.cdnUrl + "assets/bym-refitted-assets/placeholder.jpg";
            MembersTab.ACT_BTN_W = 97;
            MembersTab.POP_RIGHT_X = (MembersTab.TABLE_X + MembersTab.C_ACT_X + MembersTab.C_ACT_W) | 0;
            MembersTab.POP_X = (MembersTab.POP_RIGHT_X - MemberActionPopup.POPUP_W) | 0;
        });
    }
    private _activePopup: MemberActionPopup;
    protected _members: any[];

    public $ctor(): void {
        super.$ctor();
    }

    public override build(): void {
        if (this._members == null) {
            this._members = [];
            this._load();
        }
        this._buildTitle();
        this._buildTable();
    }

    private _buildTitle(): void {
        let tTitle: TextField = as3.as(this.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = this.CONTENT_W - MembersTab.PAD * 2;
        tTitle.height = MembersTab.TITLE_H;
        let titleFmt: TextFormat = new TextFormat("Groboldov", MembersTab.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.LEFT;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = KEYS.Get(this._titleKey);
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = MembersTab.PAD;
        tTitle.y = MembersTab.TITLE_Y;
    }

    /**
     * Localisation key for the tab's heading. Subclasses override to retitle
     * the same table layout.
     * @returns {String} KEYS key for the title text.
     */
    protected get _titleKey(): string {
        return "alliance_members_title";
    }

    /**
     * Background colour for a data row. The current player's own row is
     * highlighted yellow; every other row uses the beige alternating bands
     * shared with Browse Alliances.
     * @param {Object} rowData - The row's data object (self flag honoured)
     * @param {int} index - Zero-based row index
     * @returns {uint} Fill colour for the row
     */
    protected _rowColor(rowData: any, index: int): uint {
        if (rowData.self == true) {
            return AllianceConstants.ROW_ME;
        }
        return (index % 2 == 0) ? AllianceConstants.ROW_ALT0 : AllianceConstants.ROW_ALT1;
    }

    /**
     * Draws the roster from the store. Fetched on demand rather than warmed with
     * the window, since only this tab reads it.
     *
     * A warm store answers before load() returns, while build() is still partway
     * through drawing. Re-rendering from under it would leave a second table
     * stacked on the first, so an immediate answer only fills _members and lets
     * the build already in progress draw it.
     */
    protected _load(): void {
        let answeredDuringBuild: boolean = false;
        answeredDuringBuild = true;

        ALLIANCES.LoadMembers((members: any[]): void => {
            this._members = (members != null) ? this._mapRows(members) : [];

            if (!answeredDuringBuild) {
                this._rerender();
            }
        });

        answeredDuringBuild = false;
    }

    /**
     * Maps server roster rows onto the shape the table renderer expects.
     *
     * The player's own row is marked so it draws highlighted and without an
     * Actions button - there is nothing they can do to themselves.
     *
     * @param {Array} members - Raw server roster rows.
     * @returns {Array} Rows for _buildTable.
     */
    protected _mapRows(members: any[]): any[] {
        let rows: any[] = [];

        for (let member of as3.values(members)) {
            let status: any = (member.status != null) ? member.status : {};

            rows.push({ user_id: member.user_id | 0, base_id: member.base_id, level: member.level | 0, name: String(member.display_name), pic_square: member.pic_square, ep: GLOBAL.INFERNO_ONLY ? GLOBAL.FormatNumber(Number(member.points)) : String(member.points), attacker: String(member.last_attacker), online: status.online == true, is_leader: member.is_leader == true, self: (member.user_id | 0) == LOGIN._playerID });
        }

        return rows;
    }

    private _buildTable(): void {
        let data: any[] = this._members;
        const totalH: int = (MembersTab.HEADER_H + data.length * MembersTab.ROW_H) | 0;

        let viewport: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        viewport.x = MembersTab.TABLE_X;
        viewport.y = MembersTab.TABLE_Y;

        let tableMC: MovieClip = as3.as(viewport.addChild(new MovieClip()), MovieClip);

        tableMC.graphics.beginFill(AllianceConstants.HEADER_BG);
        tableMC.graphics.drawRect(0, 0, MembersTab.TABLE_W, MembersTab.HEADER_H);
        tableMC.graphics.endFill();

        let fi: int = 0;
        while (fi < data.length) {
            tableMC.graphics.beginFill(this._rowColor(data[fi], fi));
            tableMC.graphics.drawRect(0, MembersTab.HEADER_H + fi * MembersTab.ROW_H, MembersTab.TABLE_W, MembersTab.ROW_H);
            tableMC.graphics.endFill();
            fi++;
        }

        tableMC.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        let vLineXs: any[] = [MembersTab.C_NAME_X, MembersTab.C_STATUS_X, MembersTab.C_EP_X, MembersTab.C_ATK_X, MembersTab.C_ACT_X];
        let vli: int = 0;
        while (vli < vLineXs.length) {
            tableMC.graphics.moveTo(vLineXs[vli] | 0, 0);
            tableMC.graphics.lineTo(vLineXs[vli] | 0, totalH);
            vli++;
        }
        tableMC.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
        tableMC.graphics.drawRect(0, 0, MembersTab.TABLE_W, totalH);

        this._addLabel(tableMC, KEYS.Get("alliance_col_level"), MembersTab.C_LVL_X, 0, MembersTab.C_LVL_W, MembersTab.HEADER_H, true, TextFormatAlign.CENTER);
        this._addLabel(tableMC, KEYS.Get("alliance_col_name"), (MembersTab.C_NAME_X + 6) | 0, 0, (MembersTab.C_NAME_W - 6) | 0, MembersTab.HEADER_H, true, TextFormatAlign.LEFT);
        this._addLabel(tableMC, KEYS.Get("alliance_col_status"), MembersTab.C_STATUS_X, 0, MembersTab.C_STATUS_W, MembersTab.HEADER_H, true, TextFormatAlign.CENTER);
        this._addLabel(tableMC, KEYS.Get(GLOBAL.INFERNO_ONLY ? "io_alliance_col_ev" : "alliance_col_ep"), MembersTab.C_EP_X, 0, MembersTab.C_EP_W, MembersTab.HEADER_H, true, TextFormatAlign.CENTER);
        this._addLabel(tableMC, KEYS.Get("alliance_col_attacker"), (MembersTab.C_ATK_X + 8) | 0, 0, (MembersTab.C_ATK_W - 8) | 0, MembersTab.HEADER_H, true, TextFormatAlign.LEFT);
        this._addLabel(tableMC, KEYS.Get("alliance_col_actions"), MembersTab.C_ACT_X, 0, MembersTab.C_ACT_W, MembersTab.HEADER_H, true, TextFormatAlign.CENTER);

        let ri: int = 0;
        while (ri < data.length) {
            let rowData: any = data[ri];
            let rowBaseY: int = (MembersTab.HEADER_H + ri * MembersTab.ROW_H) | 0;

            this._addLabel(tableMC, String(rowData.level), MembersTab.C_LVL_X, rowBaseY, MembersTab.C_LVL_W, MembersTab.ROW_H, false, TextFormatAlign.CENTER);

            this._drawAvatar(tableMC, as3.str(rowData.pic_square), (MembersTab.C_NAME_X + 6) | 0, (rowBaseY + (((MembersTab.ROW_H - MembersTab.AVATAR_SIZE) / 2) | 0)) | 0);

            const nameX: int = (MembersTab.C_NAME_X + 6 + MembersTab.AVATAR_SIZE + 8) | 0;
            this._addLabel(tableMC, String(rowData.name), nameX, rowBaseY, (MembersTab.C_NAME_X + MembersTab.C_NAME_W - nameX - 6) | 0, MembersTab.ROW_H, false, TextFormatAlign.LEFT);

            this._drawStatusIcon(tableMC, (MembersTab.C_STATUS_X + ((MembersTab.C_STATUS_W / 2) | 0)) | 0, (rowBaseY + ((MembersTab.ROW_H / 2) | 0)) | 0, rowData.online == true);

            this._addLabel(tableMC, String(rowData.ep), MembersTab.C_EP_X, rowBaseY, MembersTab.C_EP_W, MembersTab.ROW_H, false, TextFormatAlign.CENTER);
            this._addLabel(tableMC, String(rowData.attacker), (MembersTab.C_ATK_X + 8) | 0, rowBaseY, (MembersTab.C_ATK_W - 8) | 0, MembersTab.ROW_H, false, TextFormatAlign.LEFT);

            if (rowData.self != true) {
                let actBtn: Button_CLIP = as3.as(tableMC.addChild(new Button_CLIP()), Button_CLIP);
                actBtn.Setup(KEYS.Get("alliance_col_actions"), false, MembersTab.ACT_BTN_W, (MembersTab.ROW_H - 6) | 0);
                actBtn._txt.htmlText = "<b><font color=\"#000000\">" + KEYS.Get("alliance_col_actions") + "</font></b>";
                actBtn.x = MembersTab.C_ACT_X + (((MembersTab.C_ACT_W - MembersTab.ACT_BTN_W) / 2) | 0);
                actBtn.y = rowBaseY + 3;
                actBtn.addEventListener(MouseEvent.CLICK, this._makeActionsHandler(rowData));
            }

            ri++;
        }

        let gridOverlay: MovieClip = as3.as(tableMC.addChild(new MovieClip()), MovieClip);
        gridOverlay.mouseEnabled = false;
        gridOverlay.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        let hli: int = 0;
        while (hli < data.length) {
            let hlineY: int = (MembersTab.HEADER_H + hli * MembersTab.ROW_H) | 0;
            gridOverlay.graphics.moveTo(0, hlineY);
            gridOverlay.graphics.lineTo(MembersTab.TABLE_W, hlineY);
            hli++;
        }

        let maskMC: MovieClip = as3.as(viewport.addChild(new MovieClip()), MovieClip);
        maskMC.graphics.beginFill(16711680, 1);
        maskMC.graphics.drawRect(0, 0, MembersTab.TABLE_W, MembersTab.VIEW_H);
        maskMC.graphics.endFill();
        tableMC.mask = maskMC;

        // ScrollSetV hides itself while the content fits, so a short roster keeps
        // the gutter empty rather than showing a full-length thumb.
        let scrollbar: ScrollSetV = as3.as(viewport.addChild(new ScrollSetV(tableMC, maskMC, true)), ScrollSetV);
        scrollbar.x = MembersTab.TABLE_W + 2;
        scrollbar.y = 0;
    }

    /**
     * Ordered list of actions for a row's popup, rendered top-to-bottom. Each
     * entry is { labelKey:String, handler:Function }.
     *
     * Kick and Promote are the leader's alone, as in the original, which served
     * an ordinary member the visit-only popup and the leader a taller one - so a
     * member sees a single-button popup rather than actions they cannot take.
     *
     * @param {Object} rowData - The row the actions apply to
     * @returns {Array} Action descriptors for MemberActionPopup
     */
    protected _actionsFor(rowData: any): any[] {
        let actions: any[] = [{ labelKey: "alliance_btn_visit", handler: as3.bind(this, this._onVisitBase) }];

        if (!ALLIANCES._isLeader) {
            return actions;
        }

        actions.push({ labelKey: "alliance_btn_kick", handler: as3.bind(this, this._onKick) });
        actions.push({ labelKey: "alliance_btn_promote", handler: as3.bind(this, this._onPromote) });

        return actions;
    }

    /**
     * Builds a click handler for a row's Actions button.
     *
     * The popup is anchored to where the button actually is when clicked rather
     * than to the row's offset in the table, since the table scrolls underneath a
     * mask and the two stop agreeing as soon as it does.
     *
     * @param {Object} rowData - The row this button belongs to
     * @returns {Function} MouseEvent handler
     */
    protected _makeActionsHandler(rowData: any): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");

            let button: DisplayObject = as3.as(e.currentTarget, DisplayObject);
            let anchor: Point = this.globalToLocal(button.localToGlobal(new Point(0, 0)));

            let popupH: int = MemberActionPopup.heightFor(this._actionsFor(rowData).length);
            const popY: int = (Math.min(anchor.y | 0, this.CONTENT_H - popupH) + 12) | 0;

            this._showActionsPopup(rowData, (MembersTab.POP_X - 30) | 0, popY);
        };
    }

    private _showActionsPopup(rowData: any, popX: int, popY: int): void {
        this._dismissActivePopup();
        this._activePopup = new MemberActionPopup(rowData, as3.bind(this, this._dismissActivePopup), this._actionsFor(rowData));
        this._activePopup.x = popX;
        this._activePopup.y = popY;
        this.addChild(this._activePopup);
        this.stage.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageMouseDown));
    }

    private _dismissActivePopup(): void {
        if (this._activePopup == null) {
            return;
        }
        if (this._activePopup.parent) {
            this._activePopup.parent.removeChild(this._activePopup);
        }
        this._activePopup = null;
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageMouseDown));
        }
    }

    private _onStageMouseDown(e: MouseEvent): void {
        if (this._activePopup == null) {
            return;
        }
        let target: DisplayObject = as3.as(e.target, DisplayObject);
        while (target != null) {
            if (target == this._activePopup) {
                return;
            }
            target = as3.as(target.parent, DisplayObject);
        }
        this._dismissActivePopup();
    }

    /**
     * Opens the selected member's base, closing the alliance window the same way
     * the Browse tab's Visit Leader does.
     *
     * @param {Object} rowData - The row that was acted on
     */
    protected _onVisitBase(rowData: any): void {
        let baseId: number = Number(rowData.base_id);

        if (!(baseId > 0)) {
            return;
        }
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            return;
        }
        if (BASE.usesInfernoBackend) {
            return;
        }

        this._dismissActivePopup();
        ALLIANCEWINDOW.Hide();

        GLOBAL._currentCell = null;

        let yardType: int = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;

        BASE.LoadBase(null, 0, baseId, GLOBAL.e_BASE_MODE.VIEW, true, yardType);
    }

    /**
     * Kicks the selected member from the alliance, behind the confirmation the
     * original showed before removing anyone.
     *
     * @param {Object} rowData - The row that was acted on
     */
    protected _onKick(rowData: any): void {
        GLOBAL.Message(KEYS.Get("alliance_kick_confirm", { "name": String(rowData.name) }), KEYS.Get("alliance_btn_kick_user"), as3.bind(this, this._confirmKick), [rowData]);
    }

    /**
     * Promotes the selected member to leader. The confirmation spells out that the
     * player gives up leadership, as the original's did - there is no way back
     * without the new leader promoting them again.
     *
     * @param {Object} rowData - The row that was acted on
     */
    protected _onPromote(rowData: any): void {
        GLOBAL.Message(KEYS.Get("alliance_promote_confirm", { "name": String(rowData.name) }), KEYS.Get("alliance_btn_promote_user"), as3.bind(this, this._confirmPromote), [rowData]);
    }

    /**
     * The alliance name is read up front because the success message names it,
     * and the store drops its My Alliance payload the moment the kick lands.
     *
     * @param {Object} rowData - The row that was acted on
     */
    protected _confirmKick(rowData: any): void {
        let allianceName: string = null;
        allianceName = ALLIANCES.AllianceName();

        ALLIANCES.KickMember(rowData.user_id | 0, (response: any): void => {
            this._onMemberActionDone(response, "alliance_kick_response", String(rowData.name), allianceName);
        });
    }

    /**
     * @param {Object} rowData - The row that was acted on
     */
    protected _confirmPromote(rowData: any): void {
        let allianceName: string = null;
        allianceName = ALLIANCES.AllianceName();

        ALLIANCES.PromoteMember(rowData.user_id | 0, (response: any): void => {
            this._onMemberActionDone(response, "alliance_promote_response", String(rowData.name), allianceName);
        });
    }

    /**
     * Reports the outcome of a kick or promote and refreshes the roster. Both drop
     * the members cache on success, so _load refetches and redraws from its own
     * callback; a promotion also clears _isLeader, which is what removes the
     * leader-only actions from the rows on the way back through.
     *
     * My Alliance is re-read alongside it because the roster just changed size and
     * the Members tab label carries that count. Rebuilding the strip also drops
     * Suggested after a promotion, since it is leader only.
     *
     * @param {Object} response - The server response, or null on a transport error
     * @param {String} messageKey - Locale key for the success message
     * @param {String} name - The member the action was taken against
     * @param {String} allianceName - The alliance name, captured before the mutation
     */
    protected _onMemberActionDone(response: any, messageKey: string, name: string, allianceName: string): void {
        if (response == null) {
            GLOBAL.Message(KEYS.Get("alliance_err_generic"));
            return;
        }

        if (response.error) {
            GLOBAL.Message(String(response.error));
            return;
        }

        GLOBAL.Message(KEYS.Get(messageKey, { "name": name, "alliance": allianceName }));

        this._load();
        ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
    }

    /**
     * Clears and rebuilds the tab's contents.
     */
    protected _rerender(): void {
        this._dismissActivePopup();

        while (this.numChildren > 0) {
            this.removeChildAt(0);
        }
        this.build();
    }

    /**
     * Loads a member's profile picture, as the original row template did with
     * <img src="<%= pic_square %>" width="25" height="25">. Squashed to a square
     * the same way rather than letterboxed, so avatars line up down the column.
     *
     * pic_square is an external URL rather than a bundled asset, so it goes
     * through a Loader like the map room popup does instead of ImageCache. A
     * player without a picture, or one whose picture fails to load, simply has
     * no avatar - the name column starts at a fixed x either way.
     *
     * @param {MovieClip} parent - Container to draw into
     * @param {String} url - The member's pic_square URL, possibly empty
     * @param {int} x - Left edge of the avatar
     * @param {int} y - Top edge of the avatar
     */
    private _drawAvatar(parent: MovieClip, url: string, x: int, y: int): void {
        let avatar: Loader = null;
        let onLoad: Function = null;
        let onError: Function = null;
        if (url == null || url == "") {
            return;
        }

        avatar = new Loader();
        onLoad = null;
        onError = null;

        onLoad = (e: Event): void => {
            avatar.contentLoaderInfo.removeEventListener(Event.COMPLETE, onLoad);
            avatar.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, onError);
            avatar.width = avatar.height = MembersTab.AVATAR_SIZE;
            avatar.x = x;
            avatar.y = y;
            avatar.mouseEnabled = false;
            avatar.mouseChildren = false;
            parent.addChild(avatar);
        };

        onError = (e: IOErrorEvent): void => {
            avatar.contentLoaderInfo.removeEventListener(Event.COMPLETE, onLoad);
            avatar.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, onError);

            // The placeholder is the last resort, so a missing one stops here
            // rather than asking for itself forever.
            if (url != MembersTab.AVATAR_PLACEHOLDER) {
                this._drawAvatar(parent, MembersTab.AVATAR_PLACEHOLDER, x, y);
            }
        };

        avatar.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoad);
        avatar.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onError, false, 0, true);
        avatar.load(new URLRequest(url));
    }

    /**
     * Loads the online/offline status icon centred at (cx, cy) from the
     * existing alliance assets (online_1.png / offline_1.png) via ImageCache,
     * displayed at native size. Matches the original members table, which used
     * these same images for the Status column.
     *
     * TODO: the original appended a second icon when status.damage_protection was
     * set. The server already returns that flag, but damage_protection_1.png is not
     * among the alliance assets in the repo, so the icon cannot be drawn until the
     * art is recovered.
     *
     * @param {MovieClip} parent - Container to draw into
     * @param {int} cx - Centre x
     * @param {int} cy - Centre y
     * @param {Boolean} online - Whether the member is online
     */
    private _drawStatusIcon(parent: MovieClip, cx: int, cy: int, online: boolean): void {
        let container: MovieClip = as3.as(parent.addChild(new MovieClip()), MovieClip);
        container.mouseEnabled = false;
        container.x = cx;
        container.y = cy;

        let key: string = online ? "alliances/online_1.png" : "alliances/offline_1.png";
        ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[]): void => {
            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            bmp.x = -((bmd.width / 2) | 0);
            bmp.y = -((bmd.height / 2) | 0);
            (as3.as(args[0], MovieClip)).addChild(bmp);
        }, true, 4, "", [container]);
    }
}

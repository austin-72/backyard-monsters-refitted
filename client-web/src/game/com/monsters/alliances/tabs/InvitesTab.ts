import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextFormatAlign } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceTabBase, BASE, Button_CLIP, EnumYardType, GLOBAL, ImageCache, InviteDialogPopup, KEYS, MapRoomManager, PLEASEWAIT, SOUNDS, ScrollSetV } from "@game";

/**
 * Invites tab — the player's alliance inbox, in both directions.
 * Mirrors the original canvas.htm "tabs-messages" layout: a Check All / Delete
 * control bar above a checkbox / From / Subject / Date table.
 *
 * One list carries invites and join requests alike. A pending row is addressed
 * to whoever has to answer it, so a leader sees incoming requests here while an
 * ordinary player sees incoming invites; once answered the same row returns to
 * whoever opened it as an "accepted"/"declined" notice.
 */
export class InvitesTab extends AllianceTabBase {
    static {
        as3.fields(this, { _invites: null });
    }

    private static readonly PAD: int = 10;
    private static readonly BTN_H: int = 36;
    private static readonly CTRL_Y: int = 20;
    private static readonly BTN_CHECK_W: int = 150;
    private static readonly BTN_DELETE_W: int = 140;
    private static readonly BTN_GAP: int = 8;

    private static readonly TABLE_Y: int = (InvitesTab.CTRL_Y + InvitesTab.BTN_H + 11) | 0;
    private static readonly HEADER_H: int = 22;
    private static readonly ROW_H: int = 36;
    private static readonly TABLE_X: int = InvitesTab.PAD;
    private static readonly SCROLLBAR_W: int = 16;
    private static readonly TABLE_W: int = 772;

    private static readonly VIEW_H: int = 375;

    // Column proportions from the original messages table (alliance.v343.css),
    // scaled to TABLE_W.
    private static readonly C_CHK_X: int = 0;
    private static readonly C_CHK_W: int = 44;
    private static readonly C_FROM_X: int = 44;
    private static readonly C_FROM_W: int = 213;
    private static readonly C_SUBJ_X: int = 257;
    private static readonly C_SUBJ_W: int = 390;
    private static readonly C_DATE_X: int = 647;
    private static readonly C_DATE_W: int = 125;

    // Original invite pic is 24×24
    private static readonly FLAG_SIZE: int = 24;
    private static readonly CHK_SIZE: int = 16;
    private _invites: any[];

    public $ctor(): void {
        super.$ctor();
    }

    public override build(): void {
        if (this._invites == null) {
            this._invites = [];
            this._load();
        }
        this._buildControls();
        this._buildTable();
    }

    /**
     * Draws the inbox from the store, which the alliance window warms on open.
     * Rows arrive in server shape and are mapped onto what the table renderer
     * expects, the subject line being derived from the row's type and status
     * exactly as the original composed it.
     *
     * That warm store answers before load() returns, while build() is still
     * partway through drawing. Re-rendering from under it would leave a second
     * table stacked on the first, so an immediate answer only fills _invites and
     * lets the build already in progress draw it.
     */
    private _load(): void {
        let answeredDuringBuild: boolean = false;
        answeredDuringBuild = true;

        ALLIANCES.LoadMessages((messages: any[]): void => {
            this._invites = (messages != null) ? this._mapRows(messages) : [];

            if (!answeredDuringBuild) {
                this._rerender();
            }
        });

        answeredDuringBuild = false;
    }

    /**
     * Re-reads both stores after a mutation, redrawing the list and the tab strip
     * so the Invites and Members labels follow the change.
     *
     * Answering a request moves the roster as well as the inbox, and the store
     * layer drops both caches rather than refreshing them - so My Alliance has to
     * be re-read here too, or the Members label would redraw against a cleared
     * cache and read 0/0.
     */
    private _refresh(): void {
        ALLIANCES.LoadMessages((messages: any[]): void => {
            this._invites = (messages != null) ? this._mapRows(messages) : [];
            this._rerender();
            ALLIANCEWINDOW.RefreshTabLabels();
        });

        ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
    }

    /**
     * Maps server rows onto the shape the table renderer expects.
     *
     * The From column names the other party, which flips with the row: a pending
     * invite is from the alliance, a pending request is from the player who sent
     * it, and once resolved each returns to its originator showing the other side.
     * Each row keeps its own `checked` flag so selection survives a re-render.
     *
     * @param {Array} messages - Raw server message rows.
     * @returns {Array} Rows for _buildTable.
     */
    private _mapRows(messages: any[]): any[] {
        let out: any[] = [];
        let i: int = 0;
        while (i < messages.length) {
            let item: any = messages[i];
            let isInvite: boolean = String(item.type) == AllianceConstants.INVITE_TYPE_INVITE;
            let isPending: boolean = String(item.status) == AllianceConstants.INVITE_PENDING;
            let fromAlliance: boolean = isPending ? isInvite : !isInvite;

            out.push({ invite_id: item.invite_id | 0, type: String(item.type), status: String(item.status), alliance_name: String(item.alliance_name), alliance_image: item.alliance_image | 0, leader_name: String(item.leader_name), user_id: item.user_id | 0, user_name: String(item.user_name), base_id: Number(item.base_id), from: fromAlliance ? String(item.alliance_name) : String(item.user_name), shield: fromAlliance ? item.alliance_image | 0 : 0, subject: this._subjectFor(item, isInvite, isPending), date: String(item.update_at_formatted), checked: false });
            i++;
        }
        return out;
    }

    /**
     * Composes a row's subject the way the original did - one line per type and
     * status pairing, naming whichever side the reader is not.
     *
     * @param {Object} item - The raw server row.
     * @param {Boolean} isInvite - Whether the alliance opened the exchange.
     * @param {Boolean} isPending - Whether it is still unanswered.
     * @returns {String} The subject line.
     */
    private _subjectFor(item: any, isInvite: boolean, isPending: boolean): string {
        if (isPending) {
            return isInvite ? KEYS.Get("alliance_msg_subject_invite", { "v1": String(item.invited_by_name), "v2": String(item.alliance_name) }) : KEYS.Get("alliance_msg_subject_request", { "v1": String(item.user_name), "v2": String(item.alliance_name) });
        }

        let accepted: boolean = String(item.status) == AllianceConstants.INVITE_ACCEPTED;

        if (isInvite) {
            return KEYS.Get(accepted ? "alliance_msg_subject_invite_accepted" : "alliance_msg_subject_invite_declined");
        }
        return KEYS.Get(accepted ? "alliance_msg_subject_accepted" : "alliance_msg_subject_declined");
    }

    private _buildControls(): void {
        let btnCheckAll: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        btnCheckAll.Setup(KEYS.Get("alliance_btn_check_all"), false, InvitesTab.BTN_CHECK_W, InvitesTab.BTN_H);
        btnCheckAll.x = InvitesTab.PAD;
        btnCheckAll.y = InvitesTab.CTRL_Y;
        btnCheckAll.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onCheckAll));

        let btnDelete: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        btnDelete.Setup(KEYS.Get("alliance_btn_delete"), false, InvitesTab.BTN_DELETE_W, InvitesTab.BTN_H);
        btnDelete.x = InvitesTab.PAD + InvitesTab.BTN_CHECK_W + InvitesTab.BTN_GAP;
        btnDelete.y = InvitesTab.CTRL_Y;
        btnDelete.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onDelete));
    }

    private _buildTable(): void {
        const totalH: int = (InvitesTab.HEADER_H + this._invites.length * InvitesTab.ROW_H) | 0;

        let viewport: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        viewport.x = InvitesTab.TABLE_X;
        viewport.y = InvitesTab.TABLE_Y;

        let tableMC: MovieClip = as3.as(viewport.addChild(new MovieClip()), MovieClip);

        tableMC.graphics.beginFill(AllianceConstants.HEADER_BG);
        tableMC.graphics.drawRect(0, 0, InvitesTab.TABLE_W, InvitesTab.HEADER_H);
        tableMC.graphics.endFill();

        let fi: int = 0;
        while (fi < this._invites.length) {
            tableMC.graphics.beginFill((fi % 2 == 0) ? AllianceConstants.ROW_ALT0 : AllianceConstants.ROW_ALT1);
            tableMC.graphics.drawRect(0, InvitesTab.HEADER_H + fi * InvitesTab.ROW_H, InvitesTab.TABLE_W, InvitesTab.ROW_H);
            tableMC.graphics.endFill();
            fi++;
        }

        tableMC.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        let vLineXs: any[] = [InvitesTab.C_FROM_X, InvitesTab.C_SUBJ_X, InvitesTab.C_DATE_X];
        let vli: int = 0;
        while (vli < vLineXs.length) {
            tableMC.graphics.moveTo(vLineXs[vli] | 0, 0);
            tableMC.graphics.lineTo(vLineXs[vli] | 0, totalH);
            vli++;
        }
        tableMC.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
        tableMC.graphics.drawRect(0, 0, InvitesTab.TABLE_W, totalH);

        this._addLabel(tableMC, KEYS.Get("alliance_col_from"), (InvitesTab.C_FROM_X + 6) | 0, 0, (InvitesTab.C_FROM_W - 6) | 0, InvitesTab.HEADER_H, true, TextFormatAlign.LEFT);
        this._addLabel(tableMC, KEYS.Get("alliance_col_subject"), (InvitesTab.C_SUBJ_X + 6) | 0, 0, (InvitesTab.C_SUBJ_W - 6) | 0, InvitesTab.HEADER_H, true, TextFormatAlign.LEFT);
        this._addLabel(tableMC, KEYS.Get("alliance_col_date"), InvitesTab.C_DATE_X, 0, InvitesTab.C_DATE_W, InvitesTab.HEADER_H, true, TextFormatAlign.CENTER);

        let ri: int = 0;
        while (ri < this._invites.length) {
            let rowData: any = this._invites[ri];
            let rowBaseY: int = (InvitesTab.HEADER_H + ri * InvitesTab.ROW_H) | 0;

            // Hit-area over the From/Subject/Date cells (not the checkbox); added
            // before the flag/labels so they stay on top and it still catches clicks.
            let hit: MovieClip = as3.as(tableMC.addChild(new MovieClip()), MovieClip);
            hit.graphics.beginFill(0, 0);
            hit.graphics.drawRect(0, 0, InvitesTab.TABLE_W - InvitesTab.C_FROM_X, InvitesTab.ROW_H);
            hit.graphics.endFill();
            hit.x = InvitesTab.C_FROM_X;
            hit.y = rowBaseY;
            hit.buttonMode = true;
            hit.mouseChildren = false;
            hit.addEventListener(MouseEvent.CLICK, this._makeOpenHandler(rowData));

            let chk: MovieClip = this._makeCheckbox(rowData);
            chk.x = InvitesTab.C_CHK_X + (((InvitesTab.C_CHK_W - InvitesTab.CHK_SIZE) / 2) | 0);
            chk.y = rowBaseY + (((InvitesTab.ROW_H - InvitesTab.CHK_SIZE) / 2) | 0);
            tableMC.addChild(chk);

            // The original drew a bare 24x24 picture here, so nothing backs the
            // shield. Rows whose other party is a player carry no shield and leave
            // the slot empty rather than shifting, keeping the column aligned.
            let flag: MovieClip = as3.as(tableMC.addChild(new MovieClip()), MovieClip);
            flag.mouseEnabled = false;
            flag.x = InvitesTab.C_FROM_X + 6;
            flag.y = rowBaseY + (((InvitesTab.ROW_H - InvitesTab.FLAG_SIZE) / 2) | 0);
            this._loadShield(flag, rowData.shield | 0);

            const fromX: int = (InvitesTab.C_FROM_X + 6 + InvitesTab.FLAG_SIZE + 6) | 0;
            this._addLabel(tableMC, String(rowData.from), fromX, rowBaseY, (InvitesTab.C_FROM_X + InvitesTab.C_FROM_W - fromX - 6) | 0, InvitesTab.ROW_H, false, TextFormatAlign.LEFT);
            this._addLabel(tableMC, String(rowData.subject), (InvitesTab.C_SUBJ_X + 6) | 0, rowBaseY, (InvitesTab.C_SUBJ_W - 12) | 0, InvitesTab.ROW_H, false, TextFormatAlign.LEFT);
            this._addLabel(tableMC, String(rowData.date), InvitesTab.C_DATE_X, rowBaseY, InvitesTab.C_DATE_W, InvitesTab.ROW_H, false, TextFormatAlign.CENTER);

            ri++;
        }

        let gridOverlay: MovieClip = as3.as(tableMC.addChild(new MovieClip()), MovieClip);
        gridOverlay.mouseEnabled = false;
        gridOverlay.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        let hli: int = 0;
        while (hli < this._invites.length) {
            let hlineY: int = ((hli == 0) ? InvitesTab.HEADER_H : InvitesTab.HEADER_H + hli * InvitesTab.ROW_H) | 0;
            gridOverlay.graphics.moveTo(0, hlineY);
            gridOverlay.graphics.lineTo(InvitesTab.TABLE_W, hlineY);
            hli++;
        }

        let maskMC: MovieClip = as3.as(viewport.addChild(new MovieClip()), MovieClip);
        maskMC.graphics.beginFill(16711680, 1);
        maskMC.graphics.drawRect(0, 0, InvitesTab.TABLE_W, InvitesTab.VIEW_H);
        maskMC.graphics.endFill();
        tableMC.mask = maskMC;

        let scrollbar: ScrollSetV = as3.as(viewport.addChild(new ScrollSetV(tableMC, maskMC, true)), ScrollSetV);
        scrollbar.x = InvitesTab.TABLE_W + 2;
        scrollbar.y = 0;
    }

    /**
     * Draws the alliance shield over a row's From swatch. Rows whose other party
     * is a player carry no shield id, leaving the plain swatch the original used
     * for an avatar. IDs 1-20 use the _large asset, 21+ _medium.
     *
     * @param {MovieClip} container - The From swatch.
     * @param {int} id - Shield id 1-41, or 0 for none.
     */
    private _loadShield(container: MovieClip, id: int): void {
        if (id <= 0) {
            return;
        }

        let suffix: string = id <= 20 ? "_large" : "_medium";

        ImageCache.GetImageWithCallBack("alliances/" + id + suffix + ".png", (k: string, bmd: BitmapData, args: any[]): void => {
            let mc: MovieClip = as3.as(args[0], MovieClip);
            if (bmd.width <= 0 || bmd.height <= 0) {
                return;
            }

            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            let scale: number = Math.min(InvitesTab.FLAG_SIZE / bmd.width, InvitesTab.FLAG_SIZE / bmd.height);
            bmp.scaleX = bmp.scaleY = scale;
            bmp.x = ((InvitesTab.FLAG_SIZE - bmd.width * scale) / 2) | 0;
            bmp.y = ((InvitesTab.FLAG_SIZE - bmd.height * scale) / 2) | 0;
            mc.addChild(bmp);
        }, true, 4, "", [container]);
    }

    /**
     * Builds an interactive checkbox bound to a row's `checked` flag. Clicking
     * toggles the flag and redraws the box (ticked / empty).
     * @param {Object} rowData - The invite row this checkbox controls
     * @returns {MovieClip} The checkbox clip
     */
    private _makeCheckbox(rowData: any): MovieClip {
        let mc: MovieClip = null;
        mc = new MovieClip();
        mc.buttonMode = true;
        mc.mouseChildren = false;
        this._drawCheckbox(mc, rowData.checked == true);
        mc.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            rowData.checked = !(rowData.checked == true);
            this._drawCheckbox(mc, rowData.checked == true);
        });
        return mc;
    }

    /**
     * Draws (or redraws) a checkbox: a white square with a grey border, plus a
     * green tick when checked.
     * @param {MovieClip} mc - Checkbox clip to draw into
     * @param {Boolean} checked - Whether to draw the tick
     */
    private _drawCheckbox(mc: MovieClip, checked: boolean): void {
        mc.graphics.clear();
        mc.graphics.lineStyle(1, 8947848, 1);
        mc.graphics.beginFill(16777215, 1);
        mc.graphics.drawRect(0, 0, InvitesTab.CHK_SIZE, InvitesTab.CHK_SIZE);
        mc.graphics.endFill();
        if (checked) {
            mc.graphics.lineStyle(2, 3118848, 1);
            mc.graphics.moveTo(3, 8);
            mc.graphics.lineTo(6, 12);
            mc.graphics.lineTo(13, 3);
        }
    }

    private _onCheckAll(e: MouseEvent): void {
        SOUNDS.Play("click1");
        let allChecked: boolean = this._invites.length > 0;
        for (let row of as3.values(this._invites)) {
            if (row.checked != true) {
                allChecked = false;
                break;
            }
        }
        for (let r of as3.values(this._invites)) {
            r.checked = !allChecked;
        }
        this._rerender();
    }

    private _onDelete(e: MouseEvent): void {
        SOUNDS.Play("click1");

        let ids: any[] = [];
        for (let row of as3.values(this._invites)) {
            if (row.checked == true) {
                ids.push(row.invite_id | 0);
            }
        }

        if (ids.length == 0) {
            return;
        }

        PLEASEWAIT.Show(KEYS.Get("msg_loading"));

        // Sent comma-separated, as the original posted the checked boxes.
        ALLIANCES.DeleteMessages(ids.join(","), (response: any): void => {
            PLEASEWAIT.Hide();

            if (response == null || response.error) {
                GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
                return;
            }

            this._refresh();
        });
    }

    /**
     * Builds a click handler that opens the invite dialog for a row.
     * @param {Object} rowData - The invite the dialog should describe
     * @returns {Function} MouseEvent handler
     */
    private _makeOpenHandler(rowData: any): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            new InviteDialogPopup().Show(rowData, (): void => {
                this._acceptInvite(rowData);
            }, (): void => {
                this._declineInvite(rowData);
            }, (): void => {
                this._visitBase(rowData);
            });
        };
    }

    /**
     * Scouts the base of the player asking to join, so a leader can judge the
     * request before answering it. Leaves the request pending and closes the
     * alliance window the same way the Browse tab's Visit Leader does.
     *
     * @param {Object} rowData - The request being scouted
     */
    private _visitBase(rowData: any): void {
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

        ALLIANCEWINDOW.Hide();

        GLOBAL._currentCell = null;

        let yardType: int = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;

        BASE.LoadBase(null, 0, baseId, GLOBAL.e_BASE_MODE.VIEW, true, yardType);
    }

    /**
     * Accepts a pending row: joining the alliance that invited the player, or
     * admitting the player who asked to join.
     * @param {Object} rowData - The row being accepted
     */
    private _acceptInvite(rowData: any): void {
        this._answer(rowData, AllianceConstants.INVITE_ACCEPTED);
    }

    /**
     * Declines a pending row.
     * @param {Object} rowData - The row being declined
     */
    private _declineInvite(rowData: any): void {
        this._answer(rowData, AllianceConstants.INVITE_DECLINED);
    }

    /**
     * Answers a pending row and reloads the inbox. The row is not dropped
     * locally - the server keeps it and hands it back to whoever opened it as an
     * outcome notice, so a refetch is what shows the correct list to both sides.
     *
     * @param {Object} rowData - The row being answered
     * @param {String} status - INVITE_ACCEPTED or INVITE_DECLINED
     */
    private _answer(rowData: any, status: string): void {
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));

        ALLIANCES.ChangeInviteStatus(rowData.invite_id | 0, status, (response: any): void => {
            PLEASEWAIT.Hide();

            if (response == null || response.error) {
                GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
                return;
            }

            this._refresh();
        });
    }

    /**
     * Clears and rebuilds the tab's contents (used after a selection change).
     */
    private _rerender(): void {
        while (this.numChildren > 0) {
            this.removeChildAt(0);
        }
        this.build();
    }
}

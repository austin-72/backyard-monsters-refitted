import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Matrix } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceMessagePopup, BASE, EnumYardType, GLOBAL, ImageCache, IoAllianceMembersPopup, KEYS, MapRoomManager, PLEASEWAIT, SOUNDS } from "@game";

export class BrowseActionPopup extends MovieClip {
    static {
        as3.fields(this, { _rowData: null, _dismiss: null, _onChanged: null, _leaderBaseId: NaN });
    }

    public static POPUP_W: int; // const
    private static BTN_W: int; // const
    private static BTN_H: int; // const
    private static BTN_FONT_SIZE: int; // const
    private static PAD: int; // const
    private static BTN_GAP: int; // const
    private static ICON_ROW_GAP: int; // const
    private static ICON_W: int; // const
    private static ICON_H: int; // const
    private static ICON_GAP: int; // const
    private static ICON_INSET: int; // const
    private static RELATION_COLORS: any[]; // const
    private static RELATION_VALUES: any[]; // const
    private static RELATION_KEYS: any[]; // const

    // Inferno-only: a third button, Members.
    private static POPUP_H_MEMBER: int; // const
    private static POPUP_H_LEADER: int; // const

    static {
        as3.lazyStatics(this, { POPUP_W: 0, BTN_W: 0, BTN_H: 0, BTN_FONT_SIZE: 0, PAD: 0, BTN_GAP: 0, ICON_ROW_GAP: 0, ICON_W: 0, ICON_H: 0, ICON_GAP: 0, ICON_INSET: 0, RELATION_COLORS: null, RELATION_VALUES: null, RELATION_KEYS: null, POPUP_H_MEMBER: 0, POPUP_H_LEADER: 0 }, () => {
            BrowseActionPopup.POPUP_W = 150;
            BrowseActionPopup.BTN_W = 134;
            BrowseActionPopup.BTN_H = 32;
            BrowseActionPopup.BTN_FONT_SIZE = 12;
            BrowseActionPopup.PAD = 8;
            BrowseActionPopup.BTN_GAP = 6;
            BrowseActionPopup.ICON_ROW_GAP = 8;
            BrowseActionPopup.ICON_W = 37;
            BrowseActionPopup.ICON_H = 35;
            BrowseActionPopup.ICON_GAP = 8;
            BrowseActionPopup.ICON_INSET = 3;
            BrowseActionPopup.RELATION_COLORS = [AllianceConstants.REL_HOSTILE, AllianceConstants.REL_NEUTRAL, AllianceConstants.REL_FRIENDLY];
            BrowseActionPopup.RELATION_VALUES = [-1, 0, 1];
            BrowseActionPopup.RELATION_KEYS = ["alliance_relation_foe", "alliance_relation_neutral", "alliance_relation_ally"];
            BrowseActionPopup.POPUP_H_MEMBER = (BrowseActionPopup.PAD + BrowseActionPopup.BTN_H + BrowseActionPopup.BTN_GAP + BrowseActionPopup.BTN_H + BrowseActionPopup.BTN_GAP + BrowseActionPopup.BTN_H + BrowseActionPopup.PAD) | 0;
            BrowseActionPopup.POPUP_H_LEADER = (BrowseActionPopup.POPUP_H_MEMBER + BrowseActionPopup.ICON_ROW_GAP + BrowseActionPopup.ICON_H) | 0;
        });
    }
    private _rowData: any;
    private _dismiss: Function;
    private _onChanged: Function;
    private _leaderBaseId: number;

    /**
     * @param {Object} rowData - Alliance row data for this popup's row
     * @param {Function} dismiss - Callback supplied by BrowseTab to clean up popup state
     * @param {Function} onChanged - Called after a relationship change lands, so the row's swatch repaints
     */
    public $ctor(rowData?: any, dismiss?: Function, onChanged: Function = null): void {
        super.$ctor();
        this._rowData = rowData;
        this._dismiss = dismiss;
        this._onChanged = onChanged;
        this._leaderBaseId = Number((this._rowData != null) ? Number(this._rowData.leader_baseid) : 0);
        this._build();
    }

    /**
     * The popup's height for the viewer, so BrowseTab can place it before one
     * exists. A member's popup is the two buttons alone and is shorter by the
     * swatch row.
     *
     * @returns {int} Height in pixels.
     */
    public static PopupHeight(): int {
        return ALLIANCES._isLeader ? BrowseActionPopup.POPUP_H_LEADER : BrowseActionPopup.POPUP_H_MEMBER;
    }

    private _build(): void {
        let bg: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        bg.mouseEnabled = false;
        bg.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        bg.graphics.beginFill(AllianceConstants.ACTION_BG, 1);
        bg.graphics.drawRoundRect(0, 0, BrowseActionPopup.POPUP_W, BrowseActionPopup.PopupHeight(), 3, 3);
        bg.graphics.endFill();

        const btnX: int = ((BrowseActionPopup.POPUP_W - BrowseActionPopup.BTN_W) / 2) | 0;

        let visitBtn: MovieClip = this._makeBtn(KEYS.Get("alliance_btn_visit_leader"));
        visitBtn.x = btnX;
        visitBtn.y = BrowseActionPopup.PAD;
        visitBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onVisitLeader));

        let joinBtn: MovieClip = this._makeBtn(KEYS.Get("alliance_btn_request_join"));
        joinBtn.x = btnX;
        joinBtn.y = BrowseActionPopup.PAD + BrowseActionPopup.BTN_H + BrowseActionPopup.BTN_GAP;
        joinBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onRequestJoin));

        let membersBtn: MovieClip = this._makeBtn("Members");
        membersBtn.x = btnX;
        membersBtn.y = BrowseActionPopup.PAD + (BrowseActionPopup.BTN_H + BrowseActionPopup.BTN_GAP) * 2;
        membersBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onMembers));

        if (!ALLIANCES._isLeader) {
            return;
        }

        const iconsY: int = (BrowseActionPopup.PAD + (BrowseActionPopup.BTN_H + BrowseActionPopup.BTN_GAP) * 2 + BrowseActionPopup.BTN_H + BrowseActionPopup.ICON_ROW_GAP) | 0;
        const startX: int = BrowseActionPopup.PAD;
        const shieldId: int = (this._rowData != null) ? this._rowData.image | 0 : 0;

        let ci: int = 0;
        while (ci < BrowseActionPopup.RELATION_COLORS.length) {
            let box: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
            box.buttonMode = true;
            box.mouseChildren = false;
            box.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
            box.graphics.beginFill(BrowseActionPopup.RELATION_COLORS[ci] >>> 0, 1);
            box.graphics.drawRect(0, 0, BrowseActionPopup.ICON_W, BrowseActionPopup.ICON_H);
            box.graphics.endFill();
            box.x = startX + ci * (BrowseActionPopup.ICON_W + BrowseActionPopup.ICON_GAP);
            box.y = iconsY;
            box.addEventListener(MouseEvent.CLICK, this._makeRelationHandler(ci));
            this._loadShield(box, shieldId, BrowseActionPopup.ICON_INSET);
            ci++;
        }
    }

    /**
     * Loads the alliance's shield into a relation-coloured swatch, inset so the
     * fill reads as a coloured border around it - the same treatment the Browse
     * table gives the name column. IDs 1-20 use the _large asset, 21+ _medium.
     *
     * @param {MovieClip} container - The relation-tinted swatch.
     * @param {int} id - Shield id 1-41.
     * @param {int} inset - Padding between the swatch edge and the shield.
     */
    private _loadShield(container: MovieClip, id: int, inset: int): void {
        if (id <= 0) {
            return;
        }

        let suffix: string = id <= 20 ? "_large" : "_medium";
        let key: string = "alliances/" + id + suffix + ".png";

        ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[]): void => {
            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            let mc: MovieClip = as3.as(args[0], MovieClip);
            let ins: int = args[1] | 0;
            let bw: int = args[2] | 0;
            let bh: int = args[3] | 0;
            if (bmd.width > 0 && bmd.height > 0) {
                let scale: number = Math.min(bw / bmd.width, bh / bmd.height);
                bmp.scaleX = bmp.scaleY = scale;
                bmp.x = ins + (((bw - bmd.width * scale) / 2) | 0);
                bmp.y = ins + (((bh - bmd.height * scale) / 2) | 0);
            }
            mc.addChild(bmp);
        }, true, 4, "", [container, inset, BrowseActionPopup.ICON_W - inset * 2, BrowseActionPopup.ICON_H - inset * 2]);
    }

    private _makeBtn(label: string): MovieClip {
        let mc: MovieClip = null;
        mc = as3.as(this.addChild(new MovieClip()), MovieClip);
        mc.buttonMode = true;
        mc.mouseChildren = false;

        this._drawBtnBg(mc, false);

        let tf: TextField = as3.as(mc.addChild(new TextField()), TextField);
        tf.selectable = false;
        tf.mouseEnabled = false;
        tf.width = BrowseActionPopup.BTN_W;
        tf.height = 18;
        tf.x = 0;
        tf.y = ((BrowseActionPopup.BTN_H - 16) / 2) | 0;
        let fmt: TextFormat = new TextFormat("Verdana", BrowseActionPopup.BTN_FONT_SIZE, 0x333333, true);
        fmt.align = TextFormatAlign.CENTER;
        tf.defaultTextFormat = fmt;
        tf.text = label;

        mc.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            this._drawBtnBg(mc, true);
        });
        mc.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            this._drawBtnBg(mc, false);
        });

        return mc;
    }

    private _drawBtnBg(mc: MovieClip, hover: boolean): void {
        mc.graphics.clear();
        mc.graphics.lineStyle(1, 8947848, 1);
        if (hover) {
            mc.graphics.beginFill(16119285, 1);
        } else {
            let mtx: Matrix = new Matrix();
            mtx.createGradientBox(BrowseActionPopup.BTN_W, BrowseActionPopup.BTN_H, Math.PI / 2, 0, 0);
            mc.graphics.beginGradientFill(GradientType.LINEAR, [0xF4F5F2, 0xD9D9D9], [1, 1], [0, 255], mtx);
        }
        mc.graphics.drawRoundRect(0, 0, BrowseActionPopup.BTN_W, BrowseActionPopup.BTN_H, 6, 6);
        mc.graphics.endFill();
    }

    /**
     * Flags this row's alliance, then confirms.
     *
     * The confirmation is only shown once the server has taken the change, the
     * same way Request to Join works - a leader who is refused, or who is no
     * longer a leader, gets the server's own wording instead of a dialog
     * claiming something happened.
     *
     * @param {int} idx - Which swatch was clicked: 0 Foe, 1 Neutral, 2 Ally.
     * @returns {Function} The click handler for that swatch.
     */
    private _makeRelationHandler(idx: int): Function {
        return (e: MouseEvent): void => {
            let stance: int = 0;
            let rowData: any = null;
            let onChanged: Function = null;
            let body: string = null;
            SOUNDS.Play("click1");

            let allianceId: int = (this._rowData != null) ? this._rowData.alliance_id | 0 : 0;

            if (allianceId <= 0) {
                return;
            }

            let name: string = (this._rowData && this._rowData.name) ? String(this._rowData.name) : "";
            stance = BrowseActionPopup.RELATION_VALUES[idx] | 0;
            rowData = this._rowData;
            onChanged = this._onChanged;
            body = KEYS.Get(String(BrowseActionPopup.RELATION_KEYS[idx]), { "v1": name });

            // Already flagged this way, so there is nothing to send. The dialog
            // still shows - clicking Foe on a foe should read as confirmation,
            // not as a dead button - but the server is spared a write and the
            // feed a shout that announces nothing.
            if ((this._rowData.relationship | 0) == stance) {
                this._dismiss();
                new AllianceMessagePopup().Show(KEYS.Get("alliance_relation_title"), body);
                return;
            }

            this._dismiss();
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));

            ALLIANCES.ChangeRelationship(allianceId, stance, (response: any): void => {
                PLEASEWAIT.Hide();

                if (response == null || response.error) {
                    GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
                    return;
                }

                if (rowData != null) {
                    rowData.relationship = stance;
                }

                new AllianceMessagePopup().Show(KEYS.Get("alliance_relation_title"), body);

                if (onChanged != null) {
                    onChanged();
                }
            });
        };
    }

    /** Inferno-only: lists this alliance's members (IoAllianceMembersPopup). */
    private _onMembers(e: MouseEvent): void {
        let allianceName: string = null;
        SOUNDS.Play("click1");
        let allianceId: int = (this._rowData != null) ? this._rowData.alliance_id | 0 : 0;
        allianceName = (this._rowData != null) ? String(this._rowData.name) : "";
        if (allianceId <= 0) {
            return;
        }
        this._dismiss();
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        ALLIANCES.LoadAllianceMembers(allianceId, (response: any): void => {
            PLEASEWAIT.Hide();
            if (response == null || response.error) {
                GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
                return;
            }
            new IoAllianceMembersPopup().Show(allianceName, as3.as(response.members, Array) || []);
        });
    }

    private _onVisitLeader(e: MouseEvent): void {
        SOUNDS.Play("click1");

        if (!(this._leaderBaseId > 0)) {
            return;
        }
        if (BASE._saving || BASE._loading || BASE._saveCounterA != BASE._saveCounterB) {
            return;
        }
        if (BASE.usesInfernoBackend) {
            return;
        }

        this._dismiss();
        ALLIANCEWINDOW.Hide();

        GLOBAL._currentCell = null;

        let yardType: int = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;

        BASE.LoadBase(null, 0, this._leaderBaseId, GLOBAL.e_BASE_MODE.VIEW, true, yardType);
    }

    /**
     * Asks the alliance to take the player in. The confirmation is only shown
     * once the server has the request, so "REQUEST SENT!" means it was: a player
     * already in an alliance, or one who has asked this alliance before, gets the
     * server's own wording instead.
     */
    private _onRequestJoin(e: MouseEvent): void {
        SOUNDS.Play("click1");

        let allianceId: int = (this._rowData != null) ? this._rowData.alliance_id | 0 : 0;

        if (allianceId <= 0) {
            return;
        }

        this._dismiss();
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));

        ALLIANCES.RequestJoin(allianceId, (response: any): void => {
            PLEASEWAIT.Hide();

            if (response == null || response.error) {
                GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
                return;
            }

            new AllianceMessagePopup().Show(KEYS.Get("alliance_join_request_title"), KEYS.Get("alliance_join_request_body"));
        });
    }
}

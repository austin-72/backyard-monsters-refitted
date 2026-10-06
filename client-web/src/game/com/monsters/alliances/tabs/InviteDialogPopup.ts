import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { AllianceConstants, Button_CLIP, GLOBAL, KEYS, POPUPSETTINGS, SOUNDS, frame_CLIP } from "@game";

/**
 * Modal shown when a player opens a pending alliance invite from the Invites
 * tab. Mirrors the original canvas.htm message dialog (function `Ga`, the
 * type=="invite"/status=="pending" branch) and its #message-dialog CSS:
 *
 *   [ header ]
 *   From: {inviter} - {alliance}                       {date}
 *   Subject: Invitation to Join {alliance}
 *   {body text}
 *                                          [ Decline ] [ Join ]
 *
 * The body is left-aligned; From and Date share a row (From left, Date right);
 * the buttons sit bottom-right. The original rendered an `alliance_invitation.png`
 * header image; that asset isn't in the repo, so — consistent with the other
 * alliance popups — the header is drawn as Groboldov title text instead. The
 * original dialog has no alliance icon (the shield only appears in the table
 * row), so none is drawn here.
 */
export class InviteDialogPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _onJoin: null, _onDecline: null, _onVisitBase: null });
    }

    private static readonly BG_W: int = 460;
    private static readonly PAD_H: int = 28;
    private static readonly PAD_TOP: int = 29;
    private static readonly PAD_BTN: int = 71;
    private static readonly TITLE_SIZE: int = 22;
    private static readonly BODY_SIZE: int = 14;
    private static readonly TITLE_GAP: int = 12;
    private static readonly LINE_H: int = 22;
    // Matches the original #date field width (alliance.v343.css) — sized for
    // the "MM/DD" string, which is all the dialog shows (year dropped)
    private static readonly DATE_W: int = 60;
    private static readonly CONTENT_W: int = (InviteDialogPopup.BG_W - InviteDialogPopup.PAD_H * 2) | 0;
    private _mc: MovieClip;
    private _onJoin: Function;
    private _onDecline: Function;
    private _onVisitBase: Function;


    /**
     * Opens the dialog for one inbox row.
     *
     * Six presentations share this one modal, as in the original: a pending
     * invite the player may join or decline, a pending request the leader may
     * accept, decline or scout first, and the four resolved notices, which are
     * read-only because the exchange is already over.
     *
     * @param {Object} rowData - The inbox row being opened
     * @param {Function} onAccept - Called when the player accepts (pending only)
     * @param {Function} onDecline - Called when the player declines (pending only)
     * @param {Function} onVisitBase - Called to scout a requesting player's base
     */
    public Show(rowData: any, onAccept: Function, onDecline: Function, onVisitBase: Function = null): void {
        this._onJoin = onAccept;
        this._onDecline = onDecline;
        this._onVisitBase = onVisitBase;
        this._mc = new MovieClip();

        const isInvite: boolean = String(rowData.type) == AllianceConstants.INVITE_TYPE_INVITE;
        const isPending: boolean = String(rowData.status) == AllianceConstants.INVITE_PENDING;
        const isAccepted: boolean = String(rowData.status) == AllianceConstants.INVITE_ACCEPTED;

        const allianceName: string = String(rowData.alliance_name);
        const userName: string = String(rowData.user_name);
        const leaderName: string = String(rowData.leader_name);
        const dateStr: string = String(rowData.date);

        let header: string = null;
        let fromName: string = null;
        let subject: string = null;
        let body: string = null;

        if (isPending && isInvite) {
            header = KEYS.Get("alliance_invite_header");
            fromName = leaderName + " - " + allianceName;
            subject = KEYS.Get("alliance_invite_subject");
            body = KEYS.Get("alliance_invite_body", { "v1": leaderName, "v2": allianceName });
        } else if (isPending) {
            header = KEYS.Get("alliance_request_header");
            fromName = userName;
            subject = KEYS.Get("alliance_request_subject");
            body = KEYS.Get("alliance_request_body", { "v1": userName });
        } else if (isInvite) {
            header = KEYS.Get(isAccepted ? "alliance_invite_accepted_header" : "alliance_invite_declined_header");
            fromName = userName;
            subject = KEYS.Get(isAccepted ? "alliance_invite_accepted_subject" : "alliance_invite_declined_subject");
            body = KEYS.Get(isAccepted ? "alliance_invite_accepted_body" : "alliance_invite_declined_body");
        } else {
            header = KEYS.Get(isAccepted ? "alliance_request_accepted_header" : "alliance_request_declined_header");
            fromName = allianceName;
            subject = KEYS.Get(isAccepted ? "alliance_request_accepted_subject" : "alliance_request_declined_subject");
            body = isAccepted ? KEYS.Get("alliance_request_accepted_body", { "v1": leaderName, "v2": allianceName }) : KEYS.Get("alliance_request_declined_body", { "v1": allianceName });
        }

        let tBody: TextField = new TextField();
        tBody.wordWrap = true;
        tBody.multiline = true;
        tBody.width = InviteDialogPopup.CONTENT_W;
        let bodyFmt: TextFormat = new TextFormat("Verdana", InviteDialogPopup.BODY_SIZE, 0x000000);
        bodyFmt.align = TextFormatAlign.LEFT;
        tBody.defaultTextFormat = bodyFmt;
        tBody.htmlText = body;

        // A resolved row is a notice with nothing to answer, so it keeps no room
        // for the button strip.
        const bottomPad: int = isPending ? InviteDialogPopup.PAD_BTN : 28;

        const titleH: int = (InviteDialogPopup.TITLE_SIZE + 8) | 0;
        const bodyH: int = ((tBody.textHeight | 0) + 6) | 0;
        const totalH: int = (InviteDialogPopup.PAD_TOP + titleH + InviteDialogPopup.TITLE_GAP + InviteDialogPopup.LINE_H + InviteDialogPopup.LINE_H + 4 + bodyH + bottomPad + 16) | 0;
        const frameX: int = (-((InviteDialogPopup.BG_W * 0.5) | 0)) | 0;
        const frameY: int = (-((totalH * 0.5) | 0)) | 0;
        const contentX: int = (frameX + InviteDialogPopup.PAD_H) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = InviteDialogPopup.BG_W;
        frame.height = totalH;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this._onClose));

        let tTitle: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = InviteDialogPopup.CONTENT_W;
        tTitle.height = titleH;
        let titleFmt: TextFormat = new TextFormat("Groboldov", InviteDialogPopup.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.CENTER;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = header;
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = contentX;
        tTitle.y = frameY + InviteDialogPopup.PAD_TOP;

        const bodyTop: int = (tTitle.y + titleH + InviteDialogPopup.TITLE_GAP) | 0;

        // The original drops the year, rendering only the first two "/"-split
        // parts (MM/DD) in bold (alliances.min.v343.js: d.date = b[0] + "/" + b[1]).
        let dateParts: any[] = dateStr.split("/");
        let shortDate: string = (dateParts.length >= 2) ? (dateParts[0] + "/" + dateParts[1]) : dateStr;
        this._addLine("<b>" + KEYS.Get("alliance_dialog_from") + "</b> " + fromName, contentX, bodyTop, (InviteDialogPopup.CONTENT_W - InviteDialogPopup.DATE_W) | 0, InviteDialogPopup.LINE_H, 13, 0, TextFormatAlign.LEFT);
        this._addLine("<b>" + shortDate + "</b>", (contentX + InviteDialogPopup.CONTENT_W - InviteDialogPopup.DATE_W) | 0, bodyTop, InviteDialogPopup.DATE_W, InviteDialogPopup.LINE_H, 13, 0, TextFormatAlign.RIGHT);

        this._addLine("<b>" + KEYS.Get("alliance_dialog_subject") + "</b> " + subject, contentX, (bodyTop + InviteDialogPopup.LINE_H) | 0, InviteDialogPopup.CONTENT_W, InviteDialogPopup.LINE_H, 13, 0, TextFormatAlign.LEFT);

        tBody.selectable = false;
        tBody.mouseEnabled = false;
        this._mc.addChild(tBody);
        tBody.x = contentX;
        tBody.y = bodyTop + InviteDialogPopup.LINE_H + InviteDialogPopup.LINE_H + 4;

        if (isPending) {
            const btnW: int = 120;
            const btnGap: int = 10;
            const btnY: int = (frameY + totalH - InviteDialogPopup.PAD_BTN) | 0;

            let btnAccept: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);

            btnAccept.Setup(KEYS.Get(isInvite ? "alliance_btn_join" : "alliance_btn_accept"), false, btnW, 36);
            btnAccept.x = contentX + InviteDialogPopup.CONTENT_W - btnW;
            btnAccept.y = btnY;
            btnAccept.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onJoinClick));

            let nextX: int = btnAccept.x | 0;

            if (!isInvite && this._onVisitBase != null) {
                let btnVisit: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
                btnVisit.Setup(KEYS.Get("alliance_btn_visit"), false, btnW, 36);
                btnVisit.x = nextX - btnGap - btnW;
                btnVisit.y = btnY;
                btnVisit.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onVisitBaseClick));
                nextX = btnVisit.x | 0;
            }

            let btnDecline: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
            btnDecline.Setup(KEYS.Get("alliance_btn_decline"), false, btnW, 36);
            btnDecline.x = nextX - btnGap - btnW;
            btnDecline.y = btnY;
            btnDecline.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onDeclineClick));
        }

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    /**
     * Adds a non-interactive single-line label (htmlText, so bold field labels
     * render).
     */
    private _addLine(html: string, x: int, y: int, w: int, h: int, size: int, color: uint, align: string): void {
        let tf: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        tf.selectable = false;
        tf.mouseEnabled = false;
        tf.width = w;
        tf.height = h;
        tf.x = x;
        tf.y = y;
        let fmt: TextFormat = new TextFormat("Verdana", size, color, false);
        fmt.align = align;
        tf.defaultTextFormat = fmt;
        tf.htmlText = html;
    }

    private _onJoinClick(e: MouseEvent = null): void {
        SOUNDS.Play("click1");
        let cb: Function = this._onJoin;
        this._close();
        if (cb != null) {
            cb();
        }
    }

    private _onDeclineClick(e: MouseEvent = null): void {
        SOUNDS.Play("click1");
        let cb: Function = this._onDecline;
        this._close();
        if (cb != null) {
            cb();
        }
    }

    private _onVisitBaseClick(e: MouseEvent = null): void {
        SOUNDS.Play("click1");

        let visitBase: Function = this._onVisitBase;
        this._close();

        if (visitBase != null) {
            visitBase();
        }
    }

    /** Frame [X] button — dismisses without accepting or declining. */
    private _onClose(): void {
        SOUNDS.Play("close");
        this._close();
    }

    private _close(): void {
        GLOBAL.BlockerRemove();
        if (this._mc && this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        this._onJoin = null;
        this._onDecline = null;
        this._onVisitBase = null;
    }
}

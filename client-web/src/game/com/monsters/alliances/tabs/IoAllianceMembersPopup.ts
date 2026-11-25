import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObject, DisplayObjectContainer, MovieClip, Sprite, Stage } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, Button_CLIP, Chat, GLOBAL, IoAllianceUi, IoChatMenu, KEYS, POPUPSETTINGS, SOUNDS, ScrollSetV, frame_CLIP } from "@game";

/**
 * Inferno-only: the members of an alliance (Browse -> Actions -> Members). Same frame and title as
 * AllianceMessagePopup, with a scrolling list: name, level, and whether they lead it or are online.
 * Data: ALLIANCES.LoadAllianceMembers (server: /alliance/alliancemembers).
 *
 * (QoL #164) Also, in the same frame, the player's own alliance's invites still waiting on an answer, each with
 * Cancel (ShowInvites; the Recruit tab's Sent invites; server: /alliance/sentinvites).
 */
export class IoAllianceMembersPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _invTop: 0, _invX: 0, _invHeader: null, _invDays: 14 });
    }

    private static readonly BG_W: int = 460;
    private static readonly PAD_H: int = 28;
    private static readonly PAD_TOP: int = 29;
    private static readonly TITLE_SIZE: int = 22;
    private static readonly LIST_H: int = 300;
    private static readonly ROW_H: int = 26;
    private static readonly CONTENT_W: int = (IoAllianceMembersPopup.BG_W - IoAllianceMembersPopup.PAD_H * 2) | 0;
    private _mc: MovieClip;
    private _invTop: int;
    private _invX: int;
    private _invHeader: TextField;
    private _invDays: int;


    /**
     * `allianceId`, `tag` (Inferno-only, QoL #171): the alliance the members are in, for the name menu each name
     * opens (as a name in chat does).
     */
    public Show(allianceName: string, members: any[], allianceId: int = 0, tag: string = null): void {
        this._mc = new MovieClip();
        const titleH: int = (IoAllianceMembersPopup.TITLE_SIZE + 8) | 0;
        const listH: int = Math.min(IoAllianceMembersPopup.LIST_H, Math.max(1, members.length) * IoAllianceMembersPopup.ROW_H + 4) | 0;
        const totalH: int = (IoAllianceMembersPopup.PAD_TOP + titleH + 10 + 20 + listH + 76) | 0;
        const frameX: int = (-((IoAllianceMembersPopup.BG_W * 0.5) | 0)) | 0;
        const frameY: int = (-((totalH * 0.5) | 0)) | 0;
        const contentX: int = (frameX + IoAllianceMembersPopup.PAD_H) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoAllianceMembersPopup.BG_W;
        frame.height = totalH;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this._onClose));

        let tTitle: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = IoAllianceMembersPopup.CONTENT_W;
        tTitle.height = titleH;
        let titleFmt: TextFormat = new TextFormat("Groboldov", IoAllianceMembersPopup.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.CENTER;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = allianceName;
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = contentX;
        tTitle.y = frameY + IoAllianceMembersPopup.PAD_TOP;

        let header: TextField = as3.as(this._mc.addChild(IoAllianceMembersPopup._label(members.length + (members.length == 1 ? " member" : " members"), 12, 3355443, true, IoAllianceMembersPopup.CONTENT_W, TextFormatAlign.CENTER)), TextField);
        header.x = contentX;
        header.y = tTitle.y + titleH + 4;

        let listTop: int = (header.y + 24) | 0;
        let box: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
        box.graphics.lineStyle(1, 9071173, 1);
        box.graphics.beginFill(16777215, 0.85);
        box.graphics.drawRect(0, 0, IoAllianceMembersPopup.CONTENT_W, listH);
        box.graphics.endFill();
        box.x = contentX;
        box.y = listTop;

        let holder: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        holder.x = contentX + 1;
        holder.y = listTop + 1;
        let rows: MovieClip = as3.as(holder.addChild(new MovieClip()), MovieClip);
        let i: int = 0;
        for (let member of as3.values(members)) {
            let row: Sprite = as3.as(rows.addChild(new Sprite()), Sprite);
            row.y = i * IoAllianceMembersPopup.ROW_H;
            row.graphics.beginFill((i % 2 == 0 ? 0xF4EDE0 : 0xFFFFFF) >>> 0, 1);
            row.graphics.drawRect(0, 0, IoAllianceMembersPopup.CONTENT_W - 18, IoAllianceMembersPopup.ROW_H);
            row.graphics.endFill();
            let name: TextField = as3.as(row.addChild(IoAllianceMembersPopup._label(String(member.display_name), 12, 0, true, 220, TextFormatAlign.LEFT)), TextField);
            name.x = 8;
            name.y = 4;
            if (GLOBAL.INFERNO_ONLY && (member.user_id | 0) > 0) {
                // (Inferno-only, QoL #171: a name opens the chat's name menu: Message, Mention, Jump, Find...)
                row.name = "ioAlMember" + (member.user_id | 0);
                row.buttonMode = true;
                row.mouseChildren = false;
                row.addEventListener(MouseEvent.CLICK, this._nameMenu(member, allianceId, tag));
            }
            let level: TextField = as3.as(row.addChild(IoAllianceMembersPopup._label("Level " + (member.level | 0), 12, 3355443, false, 70, TextFormatAlign.LEFT)), TextField);
            level.x = 232;
            level.y = 4;
            let note: string = member.is_leader ? "Leader" : (member.online ? "Online" : "");
            let noteField: TextField = as3.as(row.addChild(IoAllianceMembersPopup._label(note, 11, (member.is_leader ? 0x8A4B00 : 0x2E7D32) >>> 0, true, 80, TextFormatAlign.RIGHT)), TextField);
            noteField.x = IoAllianceMembersPopup.CONTENT_W - 18 - 88;
            noteField.y = 5;
            i++;
        }
        if (members.length == 0) {
            let none: TextField = as3.as(rows.addChild(IoAllianceMembersPopup._label("No members.", 12, 5592405, false, (IoAllianceMembersPopup.CONTENT_W - 18) | 0, TextFormatAlign.CENTER)), TextField);
            none.y = 4;
        }
        let maskMC: MovieClip = as3.as(holder.addChild(new MovieClip()), MovieClip);
        maskMC.graphics.beginFill(16711680, 1);
        maskMC.graphics.drawRect(0, 0, IoAllianceMembersPopup.CONTENT_W - 2, listH - 2);
        maskMC.graphics.endFill();
        rows.mask = maskMC;
        if (members.length * IoAllianceMembersPopup.ROW_H > listH) {
            let scroll: ScrollSetV = as3.as(holder.addChild(new ScrollSetV(rows, maskMC, true)), ScrollSetV);
            scroll.x = IoAllianceMembersPopup.CONTENT_W - 18;
        }

        let btn: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        btn.Setup(KEYS.Get("alliance_btn_ok"), false, 140, 36);
        btn.x = -((btn.width * 0.5) | 0);
        btn.y = frameY + totalH - 62;
        btn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onClose));

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    /**
     * (QoL #171) The chat's name menu for a member (IoChatMenu, as the leaderboards' rows open it: the own Members
     * tab has an Actions button instead). Jump and Find lead away from here (the map, the leaderboards), so those two
     * also close this list and the Alliances window, which would otherwise stay over them.
     */
    private _nameMenu(member: any, allianceId: int, tag: string): Function {
        return (e: MouseEvent): void => {
            let uid: string = String(member.user_id | 0);
            let ignored: boolean = Chat._bymChat != null && Chat._bymChat.userIsIgnored(uid);
            IoChatMenu.Show(uid, String(member.display_name), ignored, e.stageX, e.stageY, { "aid": allianceId > 0 ? allianceId : null, "tag": tag, "online": member.online == true });
            let stage: Stage = GLOBAL._ROOT.stage;
            let menu: DisplayObjectContainer = IoChatMenu.isOpen && stage.numChildren > 0 ? as3.as(stage.getChildAt(stage.numChildren - 1), DisplayObjectContainer) : null;
            if (menu == null) {
                return;
            }
            for (const $value of as3.values(["ioChatMenuJump", "ioChatMenuFind"])) {
                let item: DisplayObject = menu.getChildByName(as3.str($value));
                if (item != null) {
                    // (on the press, so they are gone before the menu's own click opens the map or the leaderboards)
                    item.addEventListener(MouseEvent.MOUSE_DOWN, (ev: MouseEvent): void => {
                        this._onClose();
                        if (ALLIANCEWINDOW._open) {
                            ALLIANCEWINDOW.Hide();
                        }
                    });
                }
            }
        };
    }

    // ---- (Inferno-only, QoL #164) the alliance's sent invites
    /** `response`: ALLIANCES.ioSentInvites's { invites: [{ invite_id, user_name, by_name, sent, expires }], days }. */
    public ShowInvites(response: any): void {
        this._mc = new MovieClip();
        this._mc.name = "ioAlInvites";
        this._invDays = response.days | 0 || 14;
        const titleH: int = (IoAllianceMembersPopup.TITLE_SIZE + 8) | 0;
        // (always as tall: the list is drawn again after a Cancel)
        const listH: int = IoAllianceMembersPopup.LIST_H;
        const totalH: int = (IoAllianceMembersPopup.PAD_TOP + titleH + 10 + 20 + listH + 76) | 0;
        const frameX: int = (-((IoAllianceMembersPopup.BG_W * 0.5) | 0)) | 0;
        const frameY: int = (-((totalH * 0.5) | 0)) | 0;
        const contentX: int = (frameX + IoAllianceMembersPopup.PAD_H) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoAllianceMembersPopup.BG_W;
        frame.height = totalH;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this._onClose));

        let tTitle: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = IoAllianceMembersPopup.CONTENT_W;
        tTitle.height = titleH;
        let titleFmt: TextFormat = new TextFormat("Groboldov", IoAllianceMembersPopup.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.CENTER;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = KEYS.Get("io_al2_invites_title");
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = contentX;
        tTitle.y = frameY + IoAllianceMembersPopup.PAD_TOP;

        this._invHeader = as3.as(this._mc.addChild(IoAllianceMembersPopup._label("", 12, 3355443, true, IoAllianceMembersPopup.CONTENT_W, TextFormatAlign.CENTER)), TextField);
        this._invHeader.x = contentX;
        this._invHeader.y = tTitle.y + titleH + 4;

        this._invX = contentX;
        this._invTop = (this._invHeader.y + 24) | 0;
        let box: Sprite = as3.as(this._mc.addChild(new Sprite()), Sprite);
        box.graphics.lineStyle(1, 9071173, 1);
        box.graphics.beginFill(16777215, 0.85);
        box.graphics.drawRect(0, 0, IoAllianceMembersPopup.CONTENT_W, listH);
        box.graphics.endFill();
        box.x = contentX;
        box.y = this._invTop;
        this._fillInvites(as3.as(response.invites, Array) || []);

        let btn: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        btn.Setup(KEYS.Get("alliance_btn_ok"), false, 140, 36);
        btn.x = -((btn.width * 0.5) | 0);
        btn.y = frameY + totalH - 62;
        btn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onClose));

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    /** The rows: who, when and by whom, how long it has left, and Cancel (ioAlInviteCancel0, 1...). */
    private _fillInvites(invites: any[]): void {
        if (this._mc == null) {
            return;
        }
        this._invHeader.text = invites.length == 0 ? KEYS.Get("io_al2_invites_none") : KEYS.Get("io_al2_invites_count", { "v1": String(invites.length), "v2": String(this._invDays) });
        // (in the old list's place, over the white box)
        let old: DisplayObject = this._mc.getChildByName("ioAlInviteList");
        let at: int = old != null ? this._mc.getChildIndex(old) : -1;
        if (old != null) {
            this._mc.removeChild(old);
        }
        const listH: int = IoAllianceMembersPopup.LIST_H;
        const rowW: int = (IoAllianceMembersPopup.CONTENT_W - 18) | 0;
        let holder: MovieClip = new MovieClip();
        holder.name = "ioAlInviteList";
        holder.x = this._invX + 1;
        holder.y = this._invTop + 1;
        if (at >= 0) {
            this._mc.addChildAt(holder, at);
        } else {
            this._mc.addChild(holder);
        }
        let rows: MovieClip = as3.as(holder.addChild(new MovieClip()), MovieClip);
        let now: number = GLOBAL.Timestamp();
        for (let i: int = 0; i < invites.length; i++) {
            let inv: any = invites[i];
            let row: Sprite = as3.as(rows.addChild(new Sprite()), Sprite);
            row.name = "ioAlInvite" + i;
            row.y = i * IoAllianceMembersPopup.ROW_H;
            row.graphics.beginFill((i % 2 == 0 ? 0xF4EDE0 : 0xFFFFFF) >>> 0, 1);
            row.graphics.drawRect(0, 0, rowW, IoAllianceMembersPopup.ROW_H);
            row.graphics.endFill();
            let name: TextField = as3.as(row.addChild(IoAllianceMembersPopup._label(String(inv.user_name), 12, 0, true, 120, TextFormatAlign.LEFT)), TextField);
            name.x = 6;
            name.y = 4;
            let left: string = IoAllianceUi.span(Math.max(0, Number(inv.expires) - now) | 0);
            let meta: string = inv.by_name ? KEYS.Get("io_al2_invite_meta", { "v1": IoAllianceUi.ago(Number(inv.sent)), "v2": String(inv.by_name), "v3": left }) : KEYS.Get("io_al2_invite_meta_noby", { "v1": IoAllianceUi.ago(Number(inv.sent)), "v3": left });
            let metaField: TextField = as3.as(row.addChild(IoAllianceMembersPopup._label(meta, 10, AllianceConstants.IO_MUTED, false, rowW - 126 - 76, TextFormatAlign.LEFT)), TextField);
            metaField.x = 126;
            metaField.y = 6;
            // (smaller when a long name doesn't fit)
            GLOBAL.ioFitText(metaField);
            GLOBAL.ioFitText(name, 9);
            let id: int = inv.invite_id | 0;
            let cancel: MovieClip = IoAllianceUi.button(KEYS.Get("io_al2_invite_cancel"), 70, 20, (e: MouseEvent): void => {
                this._cancelInvite(id);
            }, "grey", 10);
            cancel.name = "ioAlInviteCancel" + i;
            cancel.x = rowW - 74;
            cancel.y = 3;
            row.addChild(cancel);
        }
        let maskMC: MovieClip = as3.as(holder.addChild(new MovieClip()), MovieClip);
        maskMC.graphics.beginFill(16711680, 1);
        maskMC.graphics.drawRect(0, 0, IoAllianceMembersPopup.CONTENT_W - 2, listH - 2);
        maskMC.graphics.endFill();
        rows.mask = maskMC;
        if (invites.length * IoAllianceMembersPopup.ROW_H > listH) {
            let scroll: ScrollSetV = as3.as(holder.addChild(new ScrollSetV(rows, maskMC, true)), ScrollSetV);
            scroll.x = IoAllianceMembersPopup.CONTENT_W - 18;
        }
    }

    private _cancelInvite(id: int): void {
        ALLIANCES.ioSentInvites(id, (response: any): void => {
            if (IoAllianceUi.failed(response)) {
                return;
            }
            this._fillInvites(as3.as(response.invites, Array) || []);
        });
    }

    private static _label(text: string, size: int, color: uint, bold: boolean, width: int, align: string): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.width = width;
        field.height = size + 8;
        let fmt: TextFormat = new TextFormat("Verdana", size, color, bold);
        fmt.align = align;
        field.defaultTextFormat = fmt;
        field.text = text;
        return field;
    }

    private _onClose(e: MouseEvent = null): void {
        SOUNDS.Play("close");
        GLOBAL.BlockerRemove();
        if (this._mc && this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
    }
}

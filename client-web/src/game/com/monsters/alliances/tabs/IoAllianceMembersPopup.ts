import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Button_CLIP, GLOBAL, KEYS, POPUPSETTINGS, SOUNDS, ScrollSetV, frame_CLIP } from "@game";

/**
 * Inferno-only: the members of an alliance (Browse -> Actions -> Members). Same frame and title as
 * AllianceMessagePopup, with a scrolling list: name, level, and whether they lead it or are online.
 * Data: ALLIANCES.LoadAllianceMembers (server: /alliance/alliancemembers).
 */
export class IoAllianceMembersPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null });
    }

    private static readonly BG_W: int = 460;
    private static readonly PAD_H: int = 28;
    private static readonly PAD_TOP: int = 29;
    private static readonly TITLE_SIZE: int = 22;
    private static readonly LIST_H: int = 300;
    private static readonly ROW_H: int = 26;
    private static readonly CONTENT_W: int = (IoAllianceMembersPopup.BG_W - IoAllianceMembersPopup.PAD_H * 2) | 0;
    private _mc: MovieClip;


    public Show(allianceName: string, members: any[]): void {
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

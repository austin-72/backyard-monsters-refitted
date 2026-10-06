import * as as3 from "as3";
import { ASObject, int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Button_CLIP, GLOBAL, KEYS, POPUPSETTINGS, SOUNDS, frame_CLIP } from "@game";

export class AllianceMessagePopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _onAction: null });
    }

    private static readonly BG_W: int = 500;
    private static readonly PAD_H: int = 28;
    private static readonly PAD_TOP: int = 29;
    private static readonly PAD_BTN: int = 71;
    private static readonly TITLE_SIZE: int = 24;
    private static readonly BODY_SIZE: int = 15;
    private static readonly TITLE_GAP: int = 11;
    private static readonly CONTENT_W: int = (AllianceMessagePopup.BG_W - AllianceMessagePopup.PAD_H * 2) | 0;
    private _mc: MovieClip;
    private _onAction: Function;


    /**
     * Shows a dismissible alliance dialog.
     *
     * The button label and handler are overridable for the one dialog the
     * original gave a destination rather than an acknowledgement - the Speed Up
     * purchase, whose button reads "See Shouts" and lands on the feed the shout
     * was just posted to.
     *
     * @param {String} title - Heading text.
     * @param {String} body - Body copy, as HTML.
     * @param {String} buttonKey - Language key for the button, defaulting to Ok.
     * @param {Function} onAction - Ran after the dialog closes, when the button is clicked.
     */
    public Show(title: string, body: string, buttonKey: string = null, onAction: Function = null): void {
        this._mc = new MovieClip();
        this._onAction = onAction;

        let tBody: TextField = new TextField();
        tBody.wordWrap = true;
        tBody.multiline = true;
        tBody.width = AllianceMessagePopup.CONTENT_W;
        let bodyFmt: TextFormat = new TextFormat("Verdana", AllianceMessagePopup.BODY_SIZE, 0x000000);
        bodyFmt.align = TextFormatAlign.CENTER;
        tBody.defaultTextFormat = bodyFmt;
        tBody.htmlText = body;

        const titleH: int = (AllianceMessagePopup.TITLE_SIZE + 8) | 0;
        const bodyH: int = ((tBody.textHeight | 0) + 6) | 0;
        const totalH: int = (AllianceMessagePopup.PAD_TOP + titleH + AllianceMessagePopup.TITLE_GAP + bodyH + AllianceMessagePopup.PAD_BTN + 16) | 0;
        const frameX: int = (-((AllianceMessagePopup.BG_W * 0.5) | 0)) | 0;
        const frameY: int = (-((totalH * 0.5) | 0)) | 0;
        const contentX: int = (frameX + AllianceMessagePopup.PAD_H) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = AllianceMessagePopup.BG_W;
        frame.height = totalH;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this._onOk));

        let tTitle: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = AllianceMessagePopup.CONTENT_W;
        tTitle.height = titleH;
        let titleFmt: TextFormat = new TextFormat("Groboldov", AllianceMessagePopup.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.CENTER;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = title;
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = contentX;
        tTitle.y = frameY + AllianceMessagePopup.PAD_TOP;

        tBody.selectable = false;
        tBody.mouseEnabled = false;
        this._mc.addChild(tBody);
        tBody.x = contentX;
        tBody.y = tTitle.y + titleH + AllianceMessagePopup.TITLE_GAP;

        let btn: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        btn.Setup(KEYS.Get(buttonKey != null ? buttonKey : "alliance_btn_ok"), false, 140, 36);
        btn.x = -((btn.width * 0.5) | 0);
        btn.y = frameY + totalH - AllianceMessagePopup.PAD_BTN;
        btn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onButton));

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    /**
     * The button, which runs the action after closing. Separate from _onOk
     * because the frame's X also closes the dialog, and dismissing it should
     * not take the player anywhere.
     */
    private _onButton(e: MouseEvent = null): void {
        let action: Function = this._onAction;

        this._onOk();

        if (action != null) {
            action();
        }
    }

    private _onOk(e: MouseEvent = null): void {
        SOUNDS.Play("close");
        GLOBAL.BlockerRemove();
        if (this._mc && this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        this._onAction = null;
    }
}

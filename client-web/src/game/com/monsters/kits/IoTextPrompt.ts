import * as as3 from "as3";
import { int } from "as3";
import { Sprite } from "flash/display";
import { KeyboardEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { Button_CLIP, GLOBAL, POPUPSETTINGS, frame_CLIP } from "@game";

/**
 * Inferno-only: a small popup asking for one line of text (used to name a player kit).
 * OK calls back with what was typed; Cancel, or Escape, closes it without calling back.
 */
export class IoTextPrompt extends Sprite {
    static {
        as3.fields(this, { m_field: null, m_onOK: null });
    }

    private static readonly W: int = 420;

    private static readonly H: int = 230;
    private m_field: TextField;
    private m_onOK: Function;

    /** Drawn like the game's other popups: the stock frame, the game's title font, a gold button. */
    public $ctor(title?: string, text?: string, initial?: string, maxChars?: int, okLabel?: string, onOK?: Function): void {
        super.$ctor();
        this.m_onOK = onOK;
        let left: int = (-((IoTextPrompt.W / 2) | 0)) | 0;
        let top: int = (-((IoTextPrompt.H / 2) | 0)) | 0;

        let frame: frame_CLIP = as3.as(this.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoTextPrompt.W;
        frame.height = IoTextPrompt.H;
        frame.x = left;
        frame.y = top;
        frame.Setup(true, as3.bind(this, this.onCancel));

        let heading: TextField = as3.as(this.addChild(new TextField()), TextField);
        heading.selectable = false;
        heading.mouseEnabled = false;
        heading.embedFonts = true;
        heading.antiAliasType = AntiAliasType.NORMAL;
        let headingFormat: TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        headingFormat.align = TextFormatAlign.CENTER;
        heading.defaultTextFormat = headingFormat;
        heading.width = IoTextPrompt.W - 40;
        heading.height = 32;
        heading.x = left + 20;
        heading.y = top + 20;
        heading.text = title.toUpperCase();
        heading.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];

        let body: TextField = as3.as(this.addChild(new TextField()), TextField);
        body.selectable = false;
        body.mouseEnabled = false;
        body.wordWrap = true;
        body.multiline = true;
        let bodyFormat: TextFormat = new TextFormat("Verdana", 12, 0x46321E);
        bodyFormat.align = TextFormatAlign.CENTER;
        body.defaultTextFormat = bodyFormat;
        body.width = IoTextPrompt.W - 60;
        body.height = 36;
        body.x = left + 30;
        body.y = top + 58;
        body.text = text;

        // input: a sunken parchment box
        this.graphics.lineStyle(2, 8412216);
        this.graphics.beginFill(16776170);
        this.graphics.drawRoundRect(left + 40, top + 100, IoTextPrompt.W - 80, 34, 10, 10);
        this.graphics.endFill();

        this.m_field = new TextField();
        this.m_field.type = TextFieldType.INPUT;
        let inputFormat: TextFormat = new TextFormat("Verdana", 15, 0x3A1A08, true);
        inputFormat.align = TextFormatAlign.CENTER;
        this.m_field.defaultTextFormat = inputFormat;
        this.m_field.selectable = true;
        this.m_field.multiline = false;
        this.m_field.maxChars = maxChars;
        this.m_field.restrict = "^<>&\"";
        this.m_field.x = left + 48;
        this.m_field.y = top + 106;
        this.m_field.width = IoTextPrompt.W - 96;
        this.m_field.height = 24;
        this.m_field.text = initial;
        this.m_field.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onKey));
        this.addChild(this.m_field);

        let ok: Button_CLIP = new Button_CLIP();
        ok.Setup(okLabel, false, 140, 34);
        ok.Highlight = true;
        ok.x = -70;
        ok.y = top + IoTextPrompt.H - 34 - 28;
        ok.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onOK));
        this.addChild(ok);
    }

    public static Show(title: string, text: string, initial: string, maxChars: int, okLabel: string, onOK: Function): IoTextPrompt {
        let prompt: IoTextPrompt = new IoTextPrompt(title, text, initial, maxChars, okLabel, onOK);
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(prompt);
        POPUPSETTINGS.AlignToCenter(prompt);
        POPUPSETTINGS.ScaleUp(prompt);
        if (prompt.stage) {
            prompt.stage.focus = prompt.m_field;
            prompt.m_field.setSelection(0, prompt.m_field.length);
        }
        return prompt;
    }

    private onKey(e: KeyboardEvent): void {
        e.stopPropagation();
        if (e.keyCode == Keyboard.ENTER) {
            this.onOK(null);
        } else if (e.keyCode == Keyboard.ESCAPE) {
            this.onCancel(null);
        }
    }

    private onOK(e: MouseEvent = null): void {
        let callback: Function = this.m_onOK;
        let typed: string = this.m_field.text;
        this.close();
        if (callback != null) {
            callback(typed);
        }
    }

    private onCancel(e: MouseEvent = null): void {
        this.close();
    }

    private close(): void {
        this.m_onOK = null;
        if (this.parent) {
            this.parent.removeChild(this);
            GLOBAL.BlockerRemove();
        }
    }
}

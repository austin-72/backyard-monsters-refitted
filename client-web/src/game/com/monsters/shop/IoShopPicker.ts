import * as as3 from "as3";
import { int, uint } from "as3";
import { Sprite } from "flash/display";
import { KeyboardEvent, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { Button_CLIP, GLOBAL, KEYS, POPUPSETTINGS, SOUNDS, frame_CLIP } from "@game";

/**
 * Inferno-only (22 October): a small window to pick one of a few things (the Store's Extras, IoShop): who a gift is
 * for (an alliance member), a Name Tag's colour, the champion a statue shows, the outpost to guard. Drawn as the
 * game's other small windows are (IoTextPrompt): the stock frame, the title font, the game's buttons.
 *
 * A choice: { label, colour (a swatch instead of a button: "rrggbb"), onPick }. More than PER_PAGE: pages, with
 * Back and Next. Closed by its cross, Escape, or a pick (then onPick is called).
 */
export class IoShopPicker extends Sprite {
    static {
        as3.fields(this, { _choices: null, _page: 0, _list: null, _pageText: null });
    }

    private static readonly W: int = 460;

    private static readonly H: int = 380;

    private static readonly PER_PAGE: int = 10;

    private static _open: IoShopPicker = null;

    private _choices: any[];

    private _page: int;

    private _list: Sprite;

    private _pageText: TextField;

    public $ctor(title?: string, text?: string, choices?: any[]): void {
        super.$ctor();
        this.name = "ioShopPicker";
        this._choices = choices || [];
        let left: int = (-((IoShopPicker.W / 2) | 0)) | 0;
        let top: int = (-((IoShopPicker.H / 2) | 0)) | 0;
        let frame: frame_CLIP = as3.as(this.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoShopPicker.W;
        frame.height = IoShopPicker.H;
        frame.x = left;
        frame.y = top;
        frame.Setup(true, as3.bind(this, this.onCancel));

        let heading: TextField = as3.as(this.addChild(new TextField()), TextField);
        heading.selectable = false;
        heading.mouseEnabled = false;
        heading.embedFonts = true;
        heading.antiAliasType = AntiAliasType.NORMAL;
        let hf: TextFormat = new TextFormat("Groboldov", 22, 0xFFFFFF);
        hf.align = TextFormatAlign.CENTER;
        heading.defaultTextFormat = hf;
        heading.width = IoShopPicker.W - 40;
        heading.height = 32;
        heading.x = left + 20;
        heading.y = top + 18;
        heading.text = String(title).toUpperCase();
        heading.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];

        let body: TextField = as3.as(this.addChild(new TextField()), TextField);
        body.selectable = false;
        body.mouseEnabled = false;
        body.wordWrap = true;
        body.multiline = true;
        let bf: TextFormat = new TextFormat("Verdana", 12, 0x46321E);
        bf.align = TextFormatAlign.CENTER;
        body.defaultTextFormat = bf;
        body.width = IoShopPicker.W - 60;
        body.height = 36;
        body.x = left + 30;
        body.y = top + 54;
        body.text = text || "";

        this._list = new Sprite();
        this._list.x = left + 30;
        this._list.y = top + 96;
        this.addChild(this._list);

        if (this._choices.length > IoShopPicker.PER_PAGE) {
            let back: Button_CLIP = new Button_CLIP();
            back.Setup(KEYS.Get("io_shop_back"), false, 90, 28);
            back.name = "ioShopPickerBack";
            back.x = left + 30;
            back.y = top + IoShopPicker.H - 28 - 26;
            back.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                this.turn(-1);
            });
            this.addChild(back);
            let next: Button_CLIP = new Button_CLIP();
            next.Setup(KEYS.Get("io_shop_next"), false, 90, 28);
            next.name = "ioShopPickerNext";
            next.x = left + IoShopPicker.W - 30 - 90;
            next.y = back.y;
            next.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                this.turn(1);
            });
            this.addChild(next);
            this._pageText = new TextField();
            this._pageText.selectable = false;
            this._pageText.mouseEnabled = false;
            let pf: TextFormat = new TextFormat("Verdana", 12, 0x46321E, true);
            pf.align = TextFormatAlign.CENTER;
            this._pageText.defaultTextFormat = pf;
            this._pageText.width = 120;
            this._pageText.height = 20;
            this._pageText.x = -60;
            this._pageText.y = back.y + 5;
            this.addChild(this._pageText);
        }
        this.draw();
    }

    /** Opens a picker (the one open before closes). */
    public static Show(title: string, text: string, choices: any[]): IoShopPicker {
        IoShopPicker.Hide();
        let p: IoShopPicker = new IoShopPicker(title, text, choices);
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(p);
        POPUPSETTINGS.AlignToCenter(p);
        POPUPSETTINGS.ScaleUp(p);
        IoShopPicker._open = p;
        if (p.stage) {
            p.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoShopPicker.key);
        }
        return p;
    }

    /** The picker open now, or null (tests). */
    public static get open(): IoShopPicker {
        return IoShopPicker._open;
    }

    public static Hide(): void {
        let p: IoShopPicker = IoShopPicker._open;
        IoShopPicker._open = null;
        if (!p) {
            return;
        }
        if (p.stage) {
            p.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoShopPicker.key);
        }
        if (p.parent) {
            p.parent.removeChild(p);
            GLOBAL.BlockerRemove();
        }
    }

    private static key(e: KeyboardEvent): void {
        if (e.keyCode == Keyboard.ESCAPE) {
            IoShopPicker.Hide();
        }
    }

    /** Picks the choice at this index (tests, and a click). */
    public pick(i: int): void {
        let c: any = this._choices[i];
        if (!c) {
            return;
        }
        SOUNDS.Play("click1");
        IoShopPicker.Hide();
        if (c.onPick != null) {
            c.onPick();
        }
    }

    private turn(d: int): void {
        let pages: int = Math.max(1, Math.ceil(this._choices.length / IoShopPicker.PER_PAGE)) | 0;
        this._page = (((this._page + d) % pages) + pages) % pages;
        SOUNDS.Play("click1");
        this.draw();
    }

    private draw(): void {
        while (this._list.numChildren > 0) {
            this._list.removeChildAt(0);
        }
        const colW: int = ((IoShopPicker.W - 60 - 10) / 2) | 0;
        let from: int = (this._page * IoShopPicker.PER_PAGE) | 0;
        let swatches: boolean = this._choices.length > 0 && this._choices[0].colour != null;
        for (let i: int = from; i < Math.min(this._choices.length, from + IoShopPicker.PER_PAGE); i++) {
            let c: any = this._choices[i];
            let k: int = (i - from) | 0;
            let index: int = i;
            if (swatches) {
                // (a Name Tag's colours: five swatches a row)
                let sw: Sprite = new Sprite();
                sw.name = "ioShopPick:" + i;
                sw.buttonMode = true;
                let col: uint = parseInt(String(c.colour), 16) >>> 0;
                sw.graphics.lineStyle(2, 0x46321E, 1);
                sw.graphics.beginFill(col, 1);
                sw.graphics.drawRoundRect(0, 0, 64, 40, 10, 10);
                sw.graphics.endFill();
                sw.x = (k % 5) * 80 + 4;
                sw.y = ((k / 5) | 0) * 56;
                sw.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                    this.pick(index);
                });
                this._list.addChild(sw);
                continue;
            }
            let b: Button_CLIP = new Button_CLIP();
            b.Setup(String(c.label), false, colW, 32);
            b.name = "ioShopPick:" + i;
            b.x = (k % 2) * (colW + 10);
            b.y = ((k / 2) | 0) * 40;
            b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                this.pick(index);
            });
            this._list.addChild(b);
        }
        if (this._pageText) {
            this._pageText.text = (this._page + 1) + " / " + Math.max(1, Math.ceil(this._choices.length / IoShopPicker.PER_PAGE));
        }
    }

    private onCancel(e: MouseEvent = null): void {
        IoShopPicker.Hide();
    }
}

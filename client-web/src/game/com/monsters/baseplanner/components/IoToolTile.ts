import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";

/**
 * Inferno-only Yard Planner toolbar tile, in the style of the original tool icons: a white icon with a
 * black outline that turns yellow on hover and while its tool is active, with a small caption under it.
 */
export class IoToolTile extends Sprite {
    static {
        as3.fields(this, { id: null, _white: null, _yellow: null, _caption: null, _active: false, _over: false });
    }

    public static readonly W: int = 50;
    public id: string;
    private _white: Bitmap;
    private _yellow: Bitmap;
    private _caption: TextField;
    private _active: boolean;
    private _over: boolean;

    public $ctor(id?: string, caption?: string, white?: BitmapData, yellow?: BitmapData, withCaption: boolean = true): void {
        super.$ctor();
        this.id = id;
        this.buttonMode = true;
        this.mouseChildren = false;
        let w: int = withCaption ? IoToolTile.W : 30;
        // an invisible hit area the size of the tile
        this.graphics.beginFill(0, 0);
        this.graphics.drawRect(0, 0, w, withCaption ? 42 : 28);
        this.graphics.endFill();
        this._white = new Bitmap(white);
        this._yellow = new Bitmap(yellow);
        for (let icon of as3.values([this._white, this._yellow])) {
            icon.smoothing = true;
            icon.x = ((w - icon.width) / 2) | 0;
            icon.y = (1 + (26 - icon.height) / 2) | 0;
            this.addChild(icon);
        }
        if (withCaption) {
            this._caption = new TextField();
            this._caption.selectable = false;
            this._caption.mouseEnabled = false;
            let format: TextFormat = new TextFormat("Verdana", 9, 0xF4E6C8, true);
            format.align = TextFormatAlign.CENTER;
            this._caption.defaultTextFormat = format;
            this._caption.width = w;
            this._caption.height = 14;
            this._caption.y = 27;
            this._caption.text = caption;
            this.addChild(this._caption);
        }
        this.addEventListener(MouseEvent.ROLL_OVER, as3.bind(this, this.onOver));
        this.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onOut));
        this.refresh();
    }

    public set active(param1: boolean) {
        this._active = param1;
        this.refresh();
    }

    private onOver(e: MouseEvent): void {
        this._over = true;
        this.refresh();
    }

    private onOut(e: MouseEvent): void {
        this._over = false;
        this.refresh();
    }

    private refresh(): void {
        let lit: boolean = this._active || this._over;
        this._yellow.visible = lit;
        this._white.visible = !lit;
        if (this._caption) {
            this._caption.textColor = (this._active ? 0xFFE400 : 0xF4E6C8) >>> 0;
        }
    }
}

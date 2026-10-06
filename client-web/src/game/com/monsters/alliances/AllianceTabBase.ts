import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip } from "flash/display";
import { TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { AllianceConstants } from "@game";

export class AllianceTabBase extends MovieClip {
    static {
        as3.fields(this, { CONTENT_W: 0, CONTENT_H: 0 });
    }

    protected CONTENT_W: int;
    protected CONTENT_H: int;

    public $ctor(): void {
        this.CONTENT_W = AllianceConstants.CONTENT_W;
        this.CONTENT_H = AllianceConstants.CONTENT_H;
        super.$ctor();
    }

    public build(): void {
    }

    /**
     * Height of the popup's beige inner background for this tab. Override to
     * make a tab's content area taller/shorter than the shared default.
     * @returns {int} Desired inner-background height.
     */
    public get contentHeight(): int {
        return this.CONTENT_H;
    }

    /**
     * Adds a non-interactive text label, vertically centered within rowH.
     * @param {MovieClip} parent - Container to add the label to
     * @param {String} text - Label text
     * @param {int} colX - X position within parent
     * @param {int} colY - Y offset of the row within parent
     * @param {int} colW - Column width
     * @param {int} rowH - Row height (used for vertical centering)
     * @param {Boolean} bold - Bold text
     * @param {String} align - TextFormatAlign constant, defaults to CENTER
     * @param {uint} color - Text color, defaults to black
     */
    protected _addLabel(parent: MovieClip, text: string, colX: int, colY: int, colW: int, rowH: int, bold: boolean = false, align: string = null, color: uint = 0): void {
        let tf: TextField = as3.as(parent.addChild(new TextField()), TextField);
        tf.selectable = false;
        tf.mouseEnabled = false;
        tf.autoSize = TextFieldAutoSize.NONE;
        tf.width = colW;
        tf.height = 20;
        tf.x = colX;
        tf.y = colY + (((rowH - 18) / 2) | 0);
        let fmt: TextFormat = new TextFormat("Verdana", 12, color, bold);
        fmt.align = (align != null) ? align : TextFormatAlign.CENTER;
        tf.defaultTextFormat = fmt;
        tf.text = text;
    }
}

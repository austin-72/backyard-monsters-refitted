import * as as3 from "as3";
import { int } from "as3";
import { GradientType, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Matrix } from "flash/geom";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { AllianceConstants, KEYS, SOUNDS } from "@game";

/**
 * Compact action popup for a member/suggested row. Mirrors the brown
 * BrowseActionPopup styling and stacks one or more action buttons supplied by
 * the calling tab (e.g. Visit Base / Kick / Promote for Members, Invite for
 * Suggested). Each action is an object { labelKey:String, handler:Function };
 * the handler is invoked with rowData when its button is clicked.
 */
export class MemberActionPopup extends MovieClip {
    static {
        as3.fields(this, { _rowData: null, _dismiss: null, _actions: null });
    }

    public static readonly POPUP_W: int = 150;
    private static readonly BTN_W: int = 134;
    private static readonly BTN_H: int = 32;
    private static readonly BTN_GAP: int = 6;
    private static readonly BTN_FONT_SIZE: int = 12;
    private static readonly PAD: int = 8;
    private _rowData: any;
    private _dismiss: Function;
    private _actions: any[];

    /**
     * @param {Object} rowData - The row this popup acts on
     * @param {Function} dismiss - Callback supplied by the tab to clean up popup state
     * @param {Array} actions - Ordered list of { labelKey:String, handler:Function },
     * rendered top-to-bottom. Each handler is invoked with rowData on click.
     */
    public $ctor(rowData?: any, dismiss?: Function, actions?: any[]): void {
        super.$ctor();
        this._rowData = rowData;
        this._dismiss = dismiss;
        this._actions = actions;
        this._build();
    }

    /**
     * Total popup height for a given number of stacked buttons. Lets the
     * calling tab clamp the popup's on-screen position before it is built.
     * @param {int} count - Number of action buttons
     * @returns {int} Popup height in pixels
     */
    public static heightFor(count: int): int {
        return (MemberActionPopup.PAD + count * MemberActionPopup.BTN_H + Math.max(0, count - 1) * MemberActionPopup.BTN_GAP + MemberActionPopup.PAD) | 0;
    }

    private _build(): void {
        let popupH: int = MemberActionPopup.heightFor(this._actions.length);

        let bg: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        bg.mouseEnabled = false;
        bg.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 1);
        bg.graphics.beginFill(AllianceConstants.ACTION_BG, 1);
        bg.graphics.drawRoundRect(0, 0, MemberActionPopup.POPUP_W, popupH, 3, 3);
        bg.graphics.endFill();

        for (let i: int = 0; i < this._actions.length; i++) {
            let action: any = this._actions[i];
            let btn: MovieClip = this._makeBtn(KEYS.Get(String(action.labelKey)));
            btn.x = ((MemberActionPopup.POPUP_W - MemberActionPopup.BTN_W) / 2) | 0;
            btn.y = MemberActionPopup.PAD + i * (MemberActionPopup.BTN_H + MemberActionPopup.BTN_GAP);
            btn.addEventListener(MouseEvent.CLICK, this._makeClickHandler(action.handler));
        }
    }

    /**
     * Builds a click handler that dismisses the popup, then fires the action's
     * handler with this popup's rowData.
     * @param {Function} handler - The action handler to invoke
     * @returns {Function} MouseEvent handler
     */
    private _makeClickHandler(handler: Function): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this._dismiss();
            if (handler != null) {
                handler(this._rowData);
            }
        };
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
        tf.width = MemberActionPopup.BTN_W;
        tf.height = 18;
        tf.x = 0;
        tf.y = ((MemberActionPopup.BTN_H - 16) / 2) | 0;
        let fmt: TextFormat = new TextFormat("Verdana", MemberActionPopup.BTN_FONT_SIZE, 0x333333, true);
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
            mtx.createGradientBox(MemberActionPopup.BTN_W, MemberActionPopup.BTN_H, Math.PI / 2, 0, 0);
            mc.graphics.beginGradientFill(GradientType.LINEAR, [0xF4F5F2, 0xD9D9D9], [1, 1], [0, 255], mtx);
        }
        mc.graphics.drawRoundRect(0, 0, MemberActionPopup.BTN_W, MemberActionPopup.BTN_H, 6, 6);
        mc.graphics.endFill();
    }
}

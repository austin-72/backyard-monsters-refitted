import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { AntiAliasType, TextField, TextFieldAutoSize, TextFormat, TextFormatAlign } from "flash/text";
import { ALLIANCES, ALLIANCEWINDOW, AllianceMessagePopup, BASE, Button_CLIP, GLOBAL, ImageCache, KEYS, PLEASEWAIT, POPUPS, POPUPSETTINGS, SOUNDS, SecNum, frame_CLIP } from "@game";

/**
 * Speed Up / reduce-cooldown dialog for an alliance power-up. Opened from the
 * Power-Ups tab when the player clicks a row's "Speed Up" button. Mirrors the
 * original HTML #speedup-powerup-dialog (alliance.v343.css:1213): a header, a
 * radio selection of cooldown reductions (1h / 2h / 4h / Finish now), each
 * priced in Shiny, and a gold Buy button.
 *
 * The original header used per-power-up artwork (speed_up_*.png) which is
 * missing from the asset set, so — like the rest of the alliance UI — we
 * substitute a Groboldov text title alongside the existing ap_*_icon.jpg.
 */
export class SpeedUpPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _data: null, _rows: null, _selectedValue: 1, _onDone: null });
    }

    private static readonly MY_ALLIANCE_TAB: int = 1;

    private static readonly BG_W: int = 460;
    private static readonly BG_H: int = 360;
    private static readonly PAD_H: int = 28;
    private static readonly PAD_TOP: int = 22;
    private static readonly TITLE_SIZE: int = 24;
    private static readonly TITLE_H: int = 40;
    private static readonly PAD_BOTTOM: int = 20;

    private static readonly SEL_GAP: int = 14;
    private static readonly SEL_PAD: int = 12;
    private static readonly ROW_H: int = 38;
    private static readonly RADIO_SIZE: int = 16;
    private static readonly SHINY_SIZE: int = 18;

    private static readonly BTN_W: int = 150;
    private static readonly BTN_H: int = 36;
    private _mc: MovieClip;
    private _data: any;
    private _rows: any[];
    private _selectedValue: int;
    private _onDone: Function;

    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Opens the dialog for a power-up.
     * @param {Object} data - Power-up descriptor:
     *   { powerupId:int, nameKey:String, icon:String, hourlyCost:int, remainingHrs:int }.
     *   Costs are computed as hourlyCost × hours; rows whose reduction exceeds
     *   the remaining time are shown disabled, matching the original.
     * @param {Function} onDone - Called after a purchase lands, so the tab repaints.
     */
    public Show(data: any, onDone: Function = null): void {
        this._data = data;
        this._onDone = onDone;
        this._rows = [];
        this._selectedValue = 1;
        this._mc = new MovieClip();

        const frameX: int = (-((SpeedUpPopup.BG_W * 0.5) | 0)) | 0;
        const frameY: int = (-((SpeedUpPopup.BG_H * 0.5) | 0)) | 0;
        const contentX: int = (frameX + SpeedUpPopup.PAD_H) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = SpeedUpPopup.BG_W;
        frame.height = SpeedUpPopup.BG_H;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this._onClose));

        let tTitle: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.embedFonts = true;
        tTitle.antiAliasType = AntiAliasType.NORMAL;
        tTitle.width = SpeedUpPopup.BG_W - SpeedUpPopup.PAD_H * 2;
        tTitle.height = SpeedUpPopup.TITLE_H;
        let titleFmt: TextFormat = new TextFormat("Groboldov", SpeedUpPopup.TITLE_SIZE, 0xFFFFFF);
        titleFmt.align = TextFormatAlign.CENTER;
        tTitle.defaultTextFormat = titleFmt;
        tTitle.text = KEYS.Get(String(this._data.nameKey)).toUpperCase();
        tTitle.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        tTitle.x = contentX;
        tTitle.y = frameY + SpeedUpPopup.PAD_TOP;

        const selX: int = contentX;
        const selY: int = (frameY + SpeedUpPopup.PAD_TOP + SpeedUpPopup.TITLE_H + 8) | 0;
        const selW: int = (SpeedUpPopup.BG_W - SpeedUpPopup.PAD_H * 2) | 0;
        const rows: any[] = this._buildRowDescriptors();

        for (let i: int = 0; i < rows.length; i++) {
            this._buildRow((selX + SpeedUpPopup.SEL_PAD) | 0, (selY + SpeedUpPopup.SEL_PAD + i * SpeedUpPopup.ROW_H) | 0, (selW - SpeedUpPopup.SEL_PAD * 2) | 0, rows[i]);
        }

        // Highlight selects the gold button frame, matching the original
        // dialog's goldButton (same variant as the building-upgrade Speed Up).
        let buyBtn: Button_CLIP = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        buyBtn.Setup(KEYS.Get("button_buy"), false, SpeedUpPopup.BTN_W, SpeedUpPopup.BTN_H);
        buyBtn.Highlight = true;
        buyBtn.x = (((SpeedUpPopup.BG_W - SpeedUpPopup.BTN_W) / 2) | 0) + frameX;
        buyBtn.y = frameY + SpeedUpPopup.BG_H - SpeedUpPopup.PAD_BOTTOM - SpeedUpPopup.BTN_H;
        buyBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onBuy));

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    /**
     * Builds the ordered list of selectable reductions. Mirrors the original's
     * Ja(): fixed 1h / 2h / 4h steps plus a "Finish now" option for the full
     * remaining time, each disabled once it exceeds what is left to charge.
     *
     * Costs come out at the store's own 20 Shiny an hour (SP2 is 20 for one
     * hour, SP3 40 for two), so the rows read 20 / 40 / 80.
     *
     * @returns {Array} Row descriptors { value, hours, cost, labelKey, enabled, finish }
     */
    private _buildRowDescriptors(): any[] {
        const hourly: int = this._data.hourlyCost | 0;
        const remaining: int = Math.max(1, this._data.remainingHrs | 0) | 0;
        let out: any[] = [{ value: 1, hours: 1, enabled: true, finish: false }, { value: 2, hours: 2, enabled: remaining >= 2, finish: false }, { value: 4, hours: 4, enabled: remaining >= 4, finish: false }];
        out.push({ value: remaining, hours: remaining, enabled: remaining >= 2, finish: true });

        for (let row of as3.values(out)) {
            row.cost = hourly * (row.hours | 0);
        }
        return out;
    }

    /**
     * Renders one selectable radio row.
     * @param {int} x - Row left within the popup
     * @param {int} y - Row top within the popup
     * @param {int} w - Row width
     * @param {Object} row - Descriptor from _buildRowDescriptors
     */
    private _buildRow(x: int, y: int, w: int, row: any): void {
        const enabled: boolean = Boolean(row.enabled);
        const textColor: uint = (enabled ? 0x000000 : 0x999999) >>> 0;

        let radio: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        radio.x = x;
        radio.y = y + (((SpeedUpPopup.ROW_H - SpeedUpPopup.RADIO_SIZE) / 2) | 0);
        this._drawRadio(radio, (row.value | 0) == this._selectedValue, enabled);

        let label: TextField = as3.as(this._mc.addChild(new TextField()), TextField);
        label.selectable = false;
        label.mouseEnabled = false;
        label.autoSize = TextFieldAutoSize.LEFT;
        label.defaultTextFormat = new TextFormat("Verdana", 14, textColor);
        label.htmlText = this._rowText(row);
        label.x = x + SpeedUpPopup.RADIO_SIZE + 10;
        label.y = y + (((SpeedUpPopup.ROW_H - 20) / 2) | 0);

        let shiny: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
        shiny.mouseEnabled = false;
        shiny.x = (label.x + label.width + 6) | 0;
        shiny.y = y + (((SpeedUpPopup.ROW_H - SpeedUpPopup.SHINY_SIZE) / 2) | 0);
        this._loadIcon(shiny, "alliances/shiny-icon.png", SpeedUpPopup.SHINY_SIZE);
        if (!enabled) {
            shiny.alpha = 0.5;
        }

        if (enabled) {
            let hit: MovieClip = as3.as(this._mc.addChild(new MovieClip()), MovieClip);
            hit.buttonMode = true;
            hit.mouseChildren = false;
            hit.graphics.beginFill(0, 0);
            hit.graphics.drawRect(0, 0, w, SpeedUpPopup.ROW_H);
            hit.graphics.endFill();
            hit.x = x;
            hit.y = y;
            hit.addEventListener(MouseEvent.CLICK, this._makeSelectHandler(row.value | 0));
        }

        this._rows.push({ value: row.value | 0, radio: radio, enabled: enabled });
    }

    /**
     * Localised, bold-formatted label for a reduction row.
     * @param {Object} row - Descriptor from _buildRowDescriptors
     * @returns {String} HTML text for the row label
     */
    private _rowText(row: any): string {
        let cost: string = this._formatCost(row.cost | 0);
        if (row.finish) {
            return KEYS.Get("finish_now", { v1: cost });
        }
        let key: string = (row.hours | 0) == 1 ? "reduce_cooldown_time_hour" : "reduce_cooldown_time_hours";
        return KEYS.Get(key, { v1: String(row.hours), v2: cost });
    }

    /**
     * Formats a Shiny cost with thousands separators.
     * @param {int} cost - Raw cost
     * @returns {String} Grouped number, e.g. "1,200"
     */
    private _formatCost(cost: int): string {
        let s: string = String(cost);
        let out: string = "";
        let c: int = 0;
        for (let i: int = (s.length - 1) | 0; i >= 0; i--) {
            out = s.charAt(i) + out;
            if (++c % 3 == 0 && i > 0) {
                out = "," + out;
            }
        }
        return out;
    }

    /**
     * Builds a click handler that selects the given row value and repaints all
     * radios to reflect the new selection.
     * @param {int} value - The row's value to select
     * @returns {Function} MouseEvent handler
     */
    private _makeSelectHandler(value: int): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this._selectedValue = value;
            for (let r of as3.values(this._rows)) {
                this._drawRadio(as3.as(r.radio, MovieClip), (r.value | 0) == this._selectedValue, Boolean(r.enabled));
            }
        };
    }

    /**
     * Draws (or redraws) a radio bullet in its selected/unselected state.
     * @param {MovieClip} mc - The radio clip
     * @param {Boolean} selected - Whether to draw the filled inner dot
     * @param {Boolean} enabled - Disabled radios render greyed out
     */
    private _drawRadio(mc: MovieClip, selected: boolean, enabled: boolean): void {
        const r: number = SpeedUpPopup.RADIO_SIZE / 2;
        mc.graphics.clear();
        mc.graphics.lineStyle(1, (enabled ? 0x4D4D4D : 0xAAAAAA) >>> 0, 1);
        mc.graphics.beginFill(16777215, 1);
        mc.graphics.drawCircle(r, r, r);
        mc.graphics.endFill();
        if (selected) {
            mc.graphics.lineStyle(0, 0, 0);
            mc.graphics.beginFill((enabled ? 0x4A3A22 : 0xAAAAAA) >>> 0, 1);
            mc.graphics.drawCircle(r, r, r - 4);
            mc.graphics.endFill();
        }
    }

    /**
     * Loads an image into a container via ImageCache, scaled to fit size.
     * @param {MovieClip} container - Container to add the bitmap to
     * @param {String} key - ImageCache key (relative to GLOBAL._storageURL)
     * @param {int} size - Target square size in pixels
     */
    private _loadIcon(container: MovieClip, key: string, size: int): void {
        ImageCache.GetImageWithCallBack(key, (k: string, bmd: BitmapData, args: any[]): void => {
            let bmp: Bitmap = new Bitmap(bmd);
            bmp.smoothing = true;
            let mc: MovieClip = as3.as(args[0], MovieClip);
            let ts: int = args[1] | 0;
            if (bmd.width > 0 && bmd.height > 0) {
                let scale: number = Math.min(ts / bmd.width, ts / bmd.height);
                bmp.scaleX = bmp.scaleY = scale;
                bmp.x = ((ts - bmd.width * scale) / 2) | 0;
                bmp.y = ((ts - bmd.height * scale) / 2) | 0;
            }
            mc.addChild(bmp);
        }, true, 4, "", [container, size]);
    }

    /**
     * Buys the selected reduction.
     *
     * The balance is checked here before anything is sent, the way the original
     * did - a player who cannot afford it gets the Shiny prompt rather than a
     * refusal from the server. The server checks again regardless, since this
     * figure is only as fresh as the last base load.
     */
    private _onBuy(e: MouseEvent): void {
        let onDone: Function = null;
        SOUNDS.Play("click1");

        let hours: int = this._selectedValue;
        let cost: int = ((this._data.hourlyCost | 0) * hours) | 0;
        onDone = this._onDone;

        if (GLOBAL._credits == null || GLOBAL._credits.Get() < cost) {
            this._onClose();
            POPUPS.DisplayGetShiny();
            return;
        }
        if (!GLOBAL.ioConfirmShiny(cost, "on this power-up", (): void => {
            this._onBuy(e);
        })) {
            return;
        }

        this._onClose();
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));

        ALLIANCES.PurchasePowerup(this._data.powerupId | 0, hours, (response: any): void => {
            PLEASEWAIT.Hide();

            if (response == null || response.error) {
                GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
                return;
            }

            if (response.credits != null) {
                GLOBAL._credits = new SecNum(response.credits | 0);
                BASE._credits = new SecNum(response.credits | 0);
            }

            new AllianceMessagePopup().Show(KEYS.Get("alliance_powerup_purchase_title"), KEYS.Get("alliance_powerup_purchase_body", { "v1": KEYS.Get(String(this._data.nameKey)) }), "alliance_btn_see_shouts", (): void => {
                if (ALLIANCEWINDOW._mc != null) {
                    ALLIANCEWINDOW._mc.SelectTab(SpeedUpPopup.MY_ALLIANCE_TAB);
                }
            });

            if (onDone != null) {
                onDone();
            }
        });
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

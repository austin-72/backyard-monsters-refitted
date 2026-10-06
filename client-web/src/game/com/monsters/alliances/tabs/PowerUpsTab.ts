import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Timer } from "flash/utils";
import { ALLIANCES, AllianceConstants, AllianceTabBase, Button_CLIP, GLOBAL, ImageCache, KEYS, PLEASEWAIT, SOUNDS, SpeedUpPopup } from "@game";

/**
 * Alliance Power-Ups tab. Lists the alliance power-ups (Armament, Conquest,
 * Declare War) as stacked rows inside a single white panel. Each row shows the
 * power-up icon, its name and description, a progress bar, and an action.
 *
 * A row is in one of three states, matching the original:
 *
 *   Active   - green bar draining over the run, no action
 *   Ready    - full bar, Activate (leader only)
 *   Charging - cyan bar filling, Speed Up (any member)
 *
 * The bar is redrawn locally every second so the countdown reads true. There
 * is no interval poll: the original needed one because its rows persisted
 * across tab switches and went stale, whereas ALLIANCEPOPUP rebuilds this tab
 * from scratch every time it is opened, so opening it is the refresh.
 */
export class PowerUpsTab extends AllianceTabBase {
    static {
        as3.fields(this, { _data: null, _rows: null, _timer: null });
    }

    // Mirrors the base class's instance CONTENT_W as a class const so the
    // static layout constants can reference it; must be declared first as AS3
    // evaluates static initializers in textual order.
    private static CONTENT_W_C: int; // const

    private static PAD: int; // const

    private static PANEL_X: int; // const
    private static PANEL_Y: int; // const
    private static PANEL_W: int; // const

    private static ROW_H: int; // const
    private static ROW_PAD: int; // const

    private static ICON_SIZE: int; // const

    private static TEXT_X: int; // const
    private static TITLE_Y: int; // const
    private static DESC_Y: int; // const
    private static DESC_H: int; // const

    private static BAR_H: int; // const
    private static BAR_Y: int; // const

    private static BTN_W: int; // const
    private static BTN_H: int; // const
    private static BTN_GAP: int; // const

    private static BAR_CHARGING: uint; // const
    private static BAR_ACTIVE: uint; // const

    private static STATE_ACTIVE: string; // const
    private static STATE_READY: string; // const
    private static STATE_CHARGING: string; // const

    static {
        as3.lazyStatics(this, { CONTENT_W_C: 0, PAD: 0, PANEL_X: 0, PANEL_Y: 0, PANEL_W: 0, ROW_H: 0, ROW_PAD: 0, ICON_SIZE: 0, TEXT_X: 0, TITLE_Y: 0, DESC_Y: 0, DESC_H: 0, BAR_H: 0, BAR_Y: 0, BTN_W: 0, BTN_H: 0, BTN_GAP: 0, BAR_CHARGING: 0, BAR_ACTIVE: 0, STATE_ACTIVE: null, STATE_READY: null, STATE_CHARGING: null }, () => {
            PowerUpsTab.CONTENT_W_C = AllianceConstants.CONTENT_W;
            PowerUpsTab.PAD = 14;
            PowerUpsTab.PANEL_X = PowerUpsTab.PAD;
            PowerUpsTab.PANEL_Y = PowerUpsTab.PAD;
            PowerUpsTab.PANEL_W = (PowerUpsTab.CONTENT_W_C - PowerUpsTab.PAD * 2) | 0;
            PowerUpsTab.ROW_H = 104;
            PowerUpsTab.ROW_PAD = 8;
            PowerUpsTab.ICON_SIZE = 88;
            PowerUpsTab.TEXT_X = (PowerUpsTab.ROW_PAD + PowerUpsTab.ICON_SIZE + 12) | 0;
            PowerUpsTab.TITLE_Y = 4;
            PowerUpsTab.DESC_Y = 24;
            PowerUpsTab.DESC_H = 36;
            PowerUpsTab.BAR_H = 22;
            PowerUpsTab.BAR_Y = (PowerUpsTab.ROW_H - 8 - PowerUpsTab.BAR_H) | 0;
            PowerUpsTab.BTN_W = 140;
            PowerUpsTab.BTN_H = 32;
            PowerUpsTab.BTN_GAP = 13;
            PowerUpsTab.BAR_CHARGING = 65020;
            PowerUpsTab.BAR_ACTIVE = 1301765;
            PowerUpsTab.STATE_ACTIVE = "active";
            PowerUpsTab.STATE_READY = "ready";
            PowerUpsTab.STATE_CHARGING = "charging";
        });
    }
    private _data: any[];
    private _rows: any[];
    private _timer: Timer;

    public $ctor(): void {
        this._rows = [];
        super.$ctor();
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this._onRemoved));
    }

    public override build(): void {
        this._fetch();
    }

    /**
     * Pulls the alliance's power-ups and repaints. Runs on open, and again
     * whenever a run ends - the server is what decides when the next charge
     * lands, so the tab cannot derive that transition on its own.
     */
    private _fetch(): void {
        ALLIANCES.LoadPowerups((rows: any[]): void => {
            if (rows == null) {
                return;
            }
            this._data = rows;
            this._render();
            this._startTimer();
        });
    }

    private _startTimer(): void {
        if (this._timer != null) {
            return;
        }
        this._timer = new Timer(1000);
        this._timer.addEventListener(TimerEvent.TIMER, as3.bind(this, this._onTick));
        this._timer.start();
    }

    private _onRemoved(e: Event): void {
        if (this._timer == null) {
            return;
        }
        this._timer.removeEventListener(TimerEvent.TIMER, as3.bind(this, this._onTick));
        this._timer.stop();
        this._timer = null;
    }

    /**
     * Repaints each row's bar from the clock, and rebuilds a row's action only
     * when its state actually changes - the buttons are the expensive part and
     * a charge crossing zero is the only thing that moves them.
     */
    private _onTick(e: TimerEvent): void {
        for (let row of as3.values(this._rows)) {
            if (row.data.active && (row.data.endTime | 0) - GLOBAL.Timestamp() <= 0) {
                this._fetch();
                return;
            }

            let state: string = this._stateOf(row.data);
            this._paintBar(row, state);
            if (state != row.state) {
                row.state = state;
                this._buildAction(row);
            }
        }
    }

    private _stateOf(data: any): string {
        if (data.active) {
            return PowerUpsTab.STATE_ACTIVE;
        }
        return ((data.endTime | 0) - GLOBAL.Timestamp() <= 0) ? PowerUpsTab.STATE_READY : PowerUpsTab.STATE_CHARGING;
    }

    private _render(): void {
        while (this.numChildren > 0) {
            this.removeChildAt(0);
        }
        this._rows = [];

        let panelH: int = (PowerUpsTab.ROW_H * this._data.length) | 0;

        let panel: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        panel.mouseEnabled = false;
        panel.graphics.beginFill(16777215, 1);
        panel.graphics.lineStyle(1, 3355443, 1);
        panel.graphics.drawRect(0, 0, PowerUpsTab.PANEL_W, panelH);
        panel.graphics.endFill();
        panel.x = PowerUpsTab.PANEL_X;
        panel.y = PowerUpsTab.PANEL_Y;

        let container: MovieClip = as3.as(this.addChild(new MovieClip()), MovieClip);
        container.x = PowerUpsTab.PANEL_X;
        container.y = PowerUpsTab.PANEL_Y;

        for (let i: int = 0; i < this._data.length; i++) {
            if (i > 0) {
                container.graphics.lineStyle(1, 3355443, 1);
                container.graphics.moveTo(0, i * PowerUpsTab.ROW_H);
                container.graphics.lineTo(PowerUpsTab.PANEL_W, i * PowerUpsTab.ROW_H);
            }
            this._buildRow(container, i, this._data[i]);
        }
    }

    /**
     * Renders one power-up row and records the pieces the tick updates.
     *
     * @param {MovieClip} container - Panel container to draw into
     * @param {int} index - Zero-based row index (drives the vertical offset)
     * @param {Object} data - One getpowerups row
     */
    private _buildRow(container: MovieClip, index: int, data: any): void {
        const rowY: int = (index * PowerUpsTab.ROW_H) | 0;
        const btnX: int = (PowerUpsTab.PANEL_W - PowerUpsTab.ROW_PAD - PowerUpsTab.BTN_W) | 0;
        const barX: int = PowerUpsTab.TEXT_X;
        const barW: int = (btnX - PowerUpsTab.BTN_GAP - barX) | 0;
        const type: string = String(data.type);

        let iconMC: MovieClip = as3.as(container.addChild(new MovieClip()), MovieClip);
        iconMC.mouseEnabled = false;
        iconMC.x = PowerUpsTab.ROW_PAD;
        iconMC.y = rowY + (((PowerUpsTab.ROW_H - PowerUpsTab.ICON_SIZE) / 2) | 0);
        this._loadIcon(iconMC, "alliances/" + type + "_icon.jpg", PowerUpsTab.ICON_SIZE);

        let tTitle: TextField = as3.as(container.addChild(new TextField()), TextField);
        tTitle.selectable = false;
        tTitle.mouseEnabled = false;
        tTitle.width = barW;
        tTitle.height = 20;
        tTitle.x = PowerUpsTab.TEXT_X;
        tTitle.y = rowY + PowerUpsTab.TITLE_Y;
        tTitle.defaultTextFormat = new TextFormat("Verdana", 13, 0x000000, true);
        tTitle.text = KEYS.Get(type + "_name");

        let tDesc: TextField = as3.as(container.addChild(new TextField()), TextField);
        tDesc.selectable = false;
        tDesc.mouseEnabled = false;
        tDesc.wordWrap = true;
        tDesc.multiline = true;
        tDesc.width = barW;
        tDesc.height = PowerUpsTab.DESC_H;
        tDesc.x = PowerUpsTab.TEXT_X;
        tDesc.y = rowY + PowerUpsTab.DESC_Y;
        tDesc.defaultTextFormat = new TextFormat("Verdana", 13, 0x333333);
        tDesc.text = KEYS.Get(type + "_description");

        let bar: MovieClip = as3.as(container.addChild(new MovieClip()), MovieClip);
        bar.mouseEnabled = false;
        bar.graphics.beginFill(10066329, 1);
        bar.graphics.lineStyle(1, 0, 1);
        bar.graphics.drawRect(0, 0, barW, PowerUpsTab.BAR_H);
        bar.graphics.endFill();
        bar.x = barX;
        bar.y = rowY + PowerUpsTab.BAR_Y;

        let barFill: MovieClip = as3.as(container.addChild(new MovieClip()), MovieClip);
        barFill.mouseEnabled = false;
        barFill.x = barX + 1;
        barFill.y = rowY + PowerUpsTab.BAR_Y + 1;

        let tBar: TextField = as3.as(container.addChild(new TextField()), TextField);
        tBar.selectable = false;
        tBar.mouseEnabled = false;
        tBar.width = barW;
        tBar.height = 18;
        tBar.x = barX;
        tBar.y = rowY + PowerUpsTab.BAR_Y + 1;
        let barFmt: TextFormat = new TextFormat("Verdana", 12, 0x000000, true);
        barFmt.align = TextFormatAlign.CENTER;
        tBar.defaultTextFormat = barFmt;

        let actionMC: MovieClip = as3.as(container.addChild(new MovieClip()), MovieClip);
        actionMC.x = btnX;
        actionMC.y = rowY + PowerUpsTab.BAR_Y + PowerUpsTab.BAR_H - PowerUpsTab.BTN_H;

        let row: any = { data: data, barFill: barFill, barW: barW, tBar: tBar, actionMC: actionMC, state: null };
        this._rows.push(row);

        row.state = this._stateOf(data);
        this._paintBar(row, as3.str(row.state));
        this._buildAction(row);
    }

    /**
     * Draws the fill and caption for one row's bar.
     *
     * Charging fills as the wait shortens; an active power-up drains as its run
     * is spent, which is why the two use opposite fractions.
     *
     * @param {Object} row - Row record built by _buildRow
     * @param {String} state - One of the STATE_* constants
     */
    private _paintBar(row: any, state: string): void {
        const data: any = row.data;
        const remaining: int = ((data.endTime | 0) - GLOBAL.Timestamp()) | 0;

        let fraction: number = NaN;
        let colour: uint = 0;
        let caption: string = null;

        if (state == PowerUpsTab.STATE_ACTIVE) {
            fraction = Number(remaining) / Number(data.total_running_time);
            colour = PowerUpsTab.BAR_ACTIVE;
            caption = KEYS.Get("powerup_active") + " " + this._formatTime(remaining) + " " + KEYS.Get("powerup_remaining");
        } else if (state == PowerUpsTab.STATE_READY) {
            fraction = 1;
            colour = PowerUpsTab.BAR_CHARGING;
            caption = KEYS.Get("powerup_ready");
        } else {
            fraction = (Number(data.total_recharge_time) - Number(remaining)) / Number(data.total_recharge_time);
            colour = PowerUpsTab.BAR_CHARGING;
            caption = KEYS.Get("powerup_ready_in") + " " + this._formatTime(remaining);
        }

        if (fraction < 0) {
            fraction = 0;
        }
        if (fraction > 1) {
            fraction = 1;
        }

        let fillW: int = (((row.barW | 0) - 2) * fraction) | 0;

        row.barFill.graphics.clear();
        if (fillW > 0) {
            row.barFill.graphics.beginFill(colour, 1);
            row.barFill.graphics.drawRect(0, 0, fillW, PowerUpsTab.BAR_H - 2);
            row.barFill.graphics.endFill();
        }

        row.tBar.text = caption;
    }

    /**
     * Rebuilds a row's action for its current state: nothing while active,
     * Activate once charged, Speed Up while charging.
     *
     * A member sees the Activate button greyed rather than hidden, carrying the
     * reason on click - the original's treatment for this one action.
     *
     * @param {Object} row - Row record built by _buildRow
     */
    private _buildAction(row: any): void {
        let actionMC: MovieClip = as3.as(row.actionMC, MovieClip);
        while (actionMC.numChildren > 0) {
            actionMC.removeChildAt(0);
        }

        if (row.state == PowerUpsTab.STATE_ACTIVE) {
            return;
        }

        if (row.state == PowerUpsTab.STATE_CHARGING) {
            let speedBtn: Button_CLIP = as3.as(actionMC.addChild(new Button_CLIP()), Button_CLIP);
            speedBtn.Setup(KEYS.Get("button_speed_up"), false, PowerUpsTab.BTN_W, PowerUpsTab.BTN_H);
            speedBtn.Highlight = true;
            speedBtn.addEventListener(MouseEvent.CLICK, this._makeSpeedUpHandler(row.data));
            return;
        }

        let activateBtn: Button_CLIP = as3.as(actionMC.addChild(new Button_CLIP()), Button_CLIP);
        activateBtn.Setup(KEYS.Get("button_activate"), false, PowerUpsTab.BTN_W, PowerUpsTab.BTN_H);

        if (ALLIANCES._isLeader) {
            activateBtn.Highlight = true;
            activateBtn.addEventListener(MouseEvent.CLICK, this._makeActivateHandler(row.data));
            return;
        }

        activateBtn.Enabled = false;

        let blocker: MovieClip = as3.as(actionMC.addChild(new MovieClip()), MovieClip);
        blocker.buttonMode = true;
        blocker.graphics.beginFill(16777215, 0);
        blocker.graphics.drawRect(0, 0, PowerUpsTab.BTN_W, PowerUpsTab.BTN_H);
        blocker.graphics.endFill();
        blocker.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            GLOBAL.Message(KEYS.Get("alliance_err_powerup_leader_only"));
        });
    }

    /**
     * Formats a duration the way the original's progress bar did - days, hours
     * and minutes, with minutes rounded up and held below a full hour.
     *
     * @param {int} seconds - Seconds remaining; negatives read as zero.
     * @returns {String} e.g. "11days 23hrs 42mins"
     */
    private _formatTime(seconds: int): string {
        let left: int = seconds > 0 ? seconds : 0;

        let days: int = (left / 86400) | 0;
        left = (left - days * 86400) | 0;

        let hrs: int = (left / 3600) | 0;
        left = (left - hrs * 3600) | 0;

        let mins: int = Math.ceil(left / 60) | 0;
        if (mins >= 60) {
            mins = 59;
        }

        let out: string = "";
        if (days > 0) {
            out += days + (days == 1 ? "day" : "days");
        }
        if (days > 0 || hrs > 0) {
            out += (out.length > 0 ? " " : "") + hrs + (hrs == 1 ? "hr" : "hrs");
        }
        out += (out.length > 0 ? " " : "") + mins + (mins == 1 ? "min" : "mins");

        return out;
    }

    /**
     * Loads a power-up icon into a container via ImageCache, scaled to fit size.
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
     * Builds a click handler for a row's Speed Up button - opens the
     * reduce-cooldown dialog for that power-up.
     * @param {Object} data - The getpowerups row the button belongs to
     * @returns {Function} MouseEvent handler
     */
    private _makeSpeedUpHandler(data: any): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            let remaining: int = ((data.endTime | 0) - GLOBAL.Timestamp()) | 0;
            new SpeedUpPopup().Show({ powerupId: data.powerup_id | 0, nameKey: String(data.type) + "_name", icon: "alliances/" + String(data.type) + "_icon.jpg", hourlyCost: data.hourly_cost | 0, remainingHrs: Math.ceil(remaining / 3600) }, as3.bind(this, this._fetch));
        };
    }

    /**
     * Builds a click handler for a row's Activate button. The server answers
     * with the refreshed rows, so a success repaints from those rather than
     * costing a second request.
     * @param {Object} data - The getpowerups row the button belongs to
     * @returns {Function} MouseEvent handler
     */
    private _makeActivateHandler(data: any): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));

            ALLIANCES.ActivatePowerup(data.powerup_id | 0, (response: any): void => {
                PLEASEWAIT.Hide();

                if (response == null || response.error) {
                    GLOBAL.Message((response && response.error) ? String(response.error) : KEYS.Get("alliance_err_generic"));
                    return;
                }

                if (response.powerups != null) {
                    this._data = as3.as(response.powerups, Array);
                    this._render();
                }
            });
        };
    }
}

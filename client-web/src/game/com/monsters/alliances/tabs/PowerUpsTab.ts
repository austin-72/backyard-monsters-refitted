import * as as3 from "as3";
import { int, uint } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { TextField, TextFormat, TextFormatAlign } from "flash/text";
import { Timer } from "flash/utils";
import { ALLIANCES, AllianceConstants, AllianceTabBase, Button_CLIP, GLOBAL, ImageCache, IoShopPicker, KEYS, PLEASEWAIT, SOUNDS, SpeedUpPopup } from "@game";

/**
 * Alliance Power-Ups tab. Lists the alliance power-ups (Armament, Conquest,
 * Declare War; Inferno-only: Harvest Moon, Builders' Guild) as stacked rows inside a single white panel. Each row shows the
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
        as3.fields(this, { _data: null, _rows: null, _timer: null, _descSize: 13, _askedPlans: null });
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

    /** Inferno-only (22 October): planned starts already asked about once they came. */
    private _askedPlans: any;

    /** Inferno-only (22 October): the planned start's button's height. */
    private static readonly PLAN_H: int = 24;
    private _descSize: int;

    public $ctor(): void {
        this._rows = [];
        this._askedPlans = {};
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
            // (Inferno-only, 22 October: a planned start has come: the server starts it within 15 seconds; asked again
            // 20 seconds on, once)
            let planKey: string = row.data.powerup_id + ":" + row.data.plan_at;
            if ((row.data.plan_at | 0) > 0 && GLOBAL.Timestamp() >= (row.data.plan_at | 0) + 20 && !this._askedPlans[planKey]) {
                this._askedPlans[planKey] = true;
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
        // (Inferno-only, 22 October: five power-ups with Harvest Moon and Builders' Guild: the rows a little shorter so
        // all five fit the tab, the descriptions a size smaller)
        let compact: boolean = this._data.length > 4;
        PowerUpsTab.ROW_H = compact ? 84 : 104;
        PowerUpsTab.ICON_SIZE = compact ? 70 : 88;
        PowerUpsTab.TEXT_X = (PowerUpsTab.ROW_PAD + PowerUpsTab.ICON_SIZE + 12) | 0;
        PowerUpsTab.TITLE_Y = compact ? 3 : 4;
        PowerUpsTab.DESC_Y = compact ? 21 : 24;
        PowerUpsTab.DESC_H = compact ? 32 : 36;
        PowerUpsTab.BAR_H = compact ? 20 : 22;
        PowerUpsTab.BAR_Y = (PowerUpsTab.ROW_H - (compact ? 6 : 8) - PowerUpsTab.BAR_H) | 0;
        PowerUpsTab.BTN_H = compact ? 28 : 32;
        this._descSize = compact ? 11 : 13;

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
        tDesc.defaultTextFormat = new TextFormat("Verdana", this._descSize, 0x333333);
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

        // (Inferno-only, 22 October: a planned start's button, over the action, for whoever may start power-ups)
        let planMC: MovieClip = as3.as(container.addChild(new MovieClip()), MovieClip);
        planMC.x = btnX;
        planMC.y = actionMC.y - PowerUpsTab.PLAN_H - 6;

        let row: any = { data: data, barFill: barFill, barW: barW, tBar: tBar, actionMC: actionMC, planMC: planMC, state: null };
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

        // (Inferno-only, 22 October: a planned start said on the bar)
        if (GLOBAL.INFERNO_ONLY && state != PowerUpsTab.STATE_ACTIVE && (data.plan_at | 0) > 0) {
            caption = KEYS.Get(state == PowerUpsTab.STATE_READY ? "io_pu_bar_planned_ready" : "io_pu_bar_planned", { "v1": caption, "v2": GLOBAL.ioClock(data.plan_at | 0), "v3": (data.plan_tier | 0) == 2 ? KEYS.Get("io_pu_tier2_short") : "" });
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
        this._buildPlan(row);

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
        activateBtn.name = "ioPowerupActivate";

        // (Inferno-only, QoL #174: an officer too, when the leader lets officers start power-ups)
        if (ALLIANCES._isLeader || (GLOBAL.INFERNO_ONLY && ALLIANCES.ioCan("powerups"))) {
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
        blocker.name = "ioPowerupActivateBlocked";
        blocker.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            // (Inferno-only, QoL #174: an officer is told it is the leader's switch)
            if (GLOBAL.INFERNO_ONLY && ALLIANCES.ioRole() == "officer") {
                GLOBAL.Message(KEYS.Get("io_al7_perm_no_powerups"));
                return;
            }
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
            // (Inferno-only, QoL #499: asked first, with how long it runs and how long it then recharges; a click
            // spent the charge at once)
            // (22 October, the user's pick "B": at Tier I or Tier II, each with how long it runs and then charges)
            if (GLOBAL.INFERNO_ONLY) {
                this._pickTier(data, KEYS.Get("io_pu_start_title", { "v1": KEYS.Get(String(data.type) + "_name") }), KEYS.Get("io_pu_start_pick"), (tier: int): void => {
                    this._activate(data, tier);
                });
                return;
            }
            this._activate(data);
        };
    }

    /** Inferno-only (22 October): Tier I or Tier II picked (IoShopPicker), each with how long it runs and then charges. */
    private _pickTier(data: any, title: string, text: string, then: Function): void {
        let choices: any[] = [];
        for (let t of as3.values(data.tiers ?? [{ "tier": 1, "run": data.total_running_time, "recharge": data.total_recharge_time }])) {
            let tier: int = t.tier | 0;
            choices.push({ "label": KEYS.Get(tier == 2 ? "io_pu_tier2" : "io_pu_tier1", { "v1": GLOBAL.ioDuration(t.run | 0), "v2": GLOBAL.ioDuration(t.recharge | 0) }), "onPick": (): void => {
                then(tier);
            } });
        }
        IoShopPicker.Show(title, text, choices);
    }

    /**
     * Inferno-only (22 October, the user's pick "C"): over the action, for whoever may start power-ups (not while one
     * runs): Plan start (a time, then a tier), or, with one planned, Cancel plan.
     */
    private _buildPlan(row: any): void {
        let planMC: MovieClip = as3.as(row.planMC, MovieClip);
        if (!planMC) {
            return;
        }
        while (planMC.numChildren > 0) {
            planMC.removeChildAt(0);
        }
        if (!GLOBAL.INFERNO_ONLY || row.state == PowerUpsTab.STATE_ACTIVE || !(ALLIANCES._isLeader || ALLIANCES.ioCan("powerups"))) {
            return;
        }
        let data: any = row.data;
        let planned: boolean = (data.plan_at | 0) > 0;
        let b: Button_CLIP = as3.as(planMC.addChild(new Button_CLIP()), Button_CLIP);
        b.Setup(KEYS.Get(planned ? "io_pu_plan_cancel_btn" : "io_pu_plan_btn"), false, PowerUpsTab.BTN_W, PowerUpsTab.PLAN_H);
        b.name = planned ? "ioPowerupPlanCancel" : "ioPowerupPlan";
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            if (planned) {
                GLOBAL.Message(KEYS.Get("io_pu_plan_cancel_ask", { "v1": KEYS.Get(String(data.type) + "_name"), "v2": GLOBAL.ioClock(data.plan_at | 0) }), KEYS.Get("io_pu_plan_cancel_btn"), (): void => {
                    this._plan(data, 0, 1);
                }, null, KEYS.Get("io_powerup_not_now"), null);
                return;
            }
            this._pickTime(data);
        });
    }

    /** The times a start can be planned for: from when it's charged (and 5 minutes on) to 7 days ahead, in the player's clock. */
    private _pickTime(data: any): void {
        let now: number = GLOBAL.Timestamp();
        let ready: number = Math.max(now + 300, (data.endTime | 0) + 60);
        let last: number = now + 7 * 86400 - 60;
        let at: any[] = [];
        let add = (t: number, label: string): void => {
            t = Math.floor(t / 60) * 60;
            if (t < ready || t > last) {
                return;
            }
            for (let a of at) {
                if (Math.abs(a[0] - t) < 600) {
                    return;
                }
            }
            at.push([t, label]);
        };
        if ((data.endTime | 0) > now) {
            add(Math.ceil(ready / 60) * 60, KEYS.Get("io_pu_plan_when_charged", { "v1": GLOBAL.ioClock(Math.ceil(ready / 60) * 60) }));
        }
        for (let h of [1, 3, 6]) {
            add(now + h * 3600, KEYS.Get("io_pu_plan_in_hours", { "v1": h, "v2": GLOBAL.ioClock(now + h * 3600) }));
        }
        // (8 PM in the player's clock: today, tomorrow, then each of the next days, to fill the list)
        let d: Date = new Date(now * 1000);
        d.setHours(20, 0, 0, 0);
        for (let i: int = 0; i < 8 && at.length < 10; i++) {
            add(d.getTime() / 1000, GLOBAL.ioClock(d.getTime() / 1000));
            d.setDate(d.getDate() + 1);
        }
        at.sort((a: any, b: any): number => a[0] - b[0]);
        let choices: any[] = at.map((a: any): any => ({ "label": a[1], "onPick": (): void => {
            this._pickTier(data, KEYS.Get("io_pu_plan_title", { "v1": KEYS.Get(String(data.type) + "_name") }), KEYS.Get("io_pu_plan_pick_tier", { "v1": GLOBAL.ioClock(a[0]) }), (tier: int): void => {
                this._plan(data, a[0], tier);
            });
        } }));
        if (!choices.length) {
            GLOBAL.Message(KEYS.Get("io_pu_plan_none"));
            return;
        }
        IoShopPicker.Show(KEYS.Get("io_pu_plan_title", { "v1": KEYS.Get(String(data.type) + "_name") }), KEYS.Get("io_pu_plan_pick_time"), choices);
    }

    private _plan(data: any, at: number, tier: int): void {
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        ALLIANCES.ioPlanPowerup(data.powerup_id | 0, at, tier, (response: any): void => {
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
    }

    private _activate(data: any, tier: int = 1): void {
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
        }, tier);
    }
}

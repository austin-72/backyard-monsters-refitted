import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, Button_CLIP, GLOBAL, KEYS, POPUPSETTINGS, SOUNDS, URLLoaderApi, frame_CLIP, io_daily_tile7_done, io_daily_tile7_future, io_daily_tile7_today, io_daily_tile_done, io_daily_tile_future, io_daily_tile_today } from "@game";

/**
 * Inferno-only daily login reward popup (opened from the Daily Reward button, the gift button's place
 * in the top bar). Fourteen day tiles in two rows on the stock popup frame: collected days are faded with a
 * green tick, today's reward glows, every 7th day is a big one (100 Shiny; the 14th 200). The streak keeps
 * counting past 14, and the tiles then show days 15-28, and so on. Art: assets/popups/daily/tile[7]-{done,today,future}.png;
 * day labels and amounts are live text, so they follow InfernoOnlyConfig.dailyLogin.
 * Server: services/user/dailyLogin.ts (flag io_streak, POST dailyreward/collect).
 * (QoL #126: under the tiles, the streak savers held (one per completed 14-day stretch, forgiving one missed day) and a
 * line when one saved the streak; a streak that broke today can be bought back for Shiny (POST dailyreward/buyback),
 * the Collect button then being "Start again". The server decides all of it; this only shows it and asks.)
 */
export class IoDailyPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _status: null, _tiles: null, _subtitle: null, _button: null, _busy: false, _savers: null, _notice: null, _buyButton: null });
    }

    private static readonly BG_W: int = 660;

    /** Two rows of tiles: a 14-day stretch, a week per row. */
    private static readonly BG_H: int = (318 + 104 + 8) | 0;

    private static readonly ROW_GAP: int = 8;

    private static readonly TILE_W: int = 80;

    private static readonly TILE7_W: int = 128;

    private static readonly TILE_H: int = 104;

    /** Tiles overlap by their transparent glow margins. */
    private static readonly TILE_GAP: int = -4;

    private static _open: IoDailyPopup = null;
    private _mc: MovieClip;
    private _status: any;
    private _tiles: Sprite;
    private _subtitle: TextField;
    private _button: Button_CLIP;
    private _busy: boolean;
    /** (QoL #126) The streak savers held, under the tiles. */
    private _savers: TextField;
    /** (QoL #126) "Your streak was saved", or the buy-back offer. */
    private _notice: TextField;
    /** (QoL #126) Buy back the streak that broke (shown only while the server offers it). */
    private _buyButton: Button_CLIP;

    public $ctor(status?: any): void {
        super.$ctor();
        this._status = status;
        this._mc = new MovieClip();

        let frameX: int = (-((IoDailyPopup.BG_W / 2) | 0)) | 0;
        let frameY: int = (-((IoDailyPopup.BG_H / 2) | 0)) | 0;

        let frame: frame_CLIP = as3.as(this._mc.addChild(new frame_CLIP()), frame_CLIP);
        frame.width = IoDailyPopup.BG_W;
        frame.height = IoDailyPopup.BG_H;
        frame.x = frameX;
        frame.y = frameY;
        frame.Setup(true, as3.bind(this, this.close));

        let title: TextField = as3.as(this._mc.addChild(this.text("Groboldov", 26, 16777215, true)), TextField);
        title.width = IoDailyPopup.BG_W - 60;
        title.height = 38;
        title.text = "DAILY REWARD";
        title.filters = [new GlowFilter(0, 1, 3, 3, 9, 2), new DropShadowFilter(2, 45, 0, 0.55, 3, 3, 1, 2)];
        title.x = frameX + 30;
        title.y = frameY + 22;

        this._subtitle = as3.as(this._mc.addChild(this.text("Verdana", 12, 4600350, false)), TextField);
        this._subtitle.width = IoDailyPopup.BG_W - 60;
        this._subtitle.height = 20;
        this._subtitle.x = frameX + 30;
        this._subtitle.y = frameY + 66;

        this._tiles = as3.as(this._mc.addChild(new Sprite()), Sprite);
        this._tiles.y = frameY + 92;

        this._button = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
        this._button.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onButton));

        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #126: the savers' line and the notice, between the tiles (they end 308 down) and the button)
            this._mc.name = "ioDailyPopup";
            this._button.name = "ioDailyCollect";
            this._savers = as3.as(this._mc.addChild(this.text("Verdana", 11, 4600350, false)), TextField);
            this._savers.name = "ioDailySavers";
            this._savers.width = IoDailyPopup.BG_W - 60;
            this._savers.height = 18;
            this._savers.x = frameX + 30;
            this._savers.y = frameY + 314;
            this._notice = as3.as(this._mc.addChild(this.text("Verdana", 12, 4600350, false)), TextField);
            this._notice.name = "ioDailyNotice";
            this._notice.width = IoDailyPopup.BG_W - 60;
            this._notice.height = 20;
            this._notice.x = frameX + 30;
            this._notice.y = frameY + 336;
            this._buyButton = as3.as(this._mc.addChild(new Button_CLIP()), Button_CLIP);
            this._buyButton.name = "ioDailyBuyBack";
            this._buyButton.visible = false;
            this._buyButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onBuyBack));
        }

        this.render();

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
    }

    /** "Next reward in 5h 12m (at 02:00 your time)": the days are UTC days. */
    public static nextLine(): string {
        let now: number = GLOBAL.Timestamp();
        let next: number = (Math.floor(now / 86400) + 1) * 86400;
        let at: Date = new Date(next * 1000);
        let clock: string = (at.getHours() < 10 ? "0" : "") + at.getHours() + ":" + (at.getMinutes() < 10 ? "0" : "") + at.getMinutes();
        return "Next reward in " + GLOBAL.ioDuration(next - now) + " (at " + clock + " your time).";
    }

    public static Show(status: any): void {
        if (IoDailyPopup._open) {
            IoDailyPopup._open.close();
        }
        IoDailyPopup._open = new IoDailyPopup(status);
    }

    private get waiting(): boolean {
        return (this._status.collected | 0) != 1;
    }

    /** What collecting on day `d` of a streak pays (server: dailyLogin.ts payoutFor). */
    private payoutFor(d: int): int {
        let cycle: int = Math.max(1, this._status.streakDays | 0) | 0;
        let week: int = Math.max(1, (this._status.weekDays || 7) | 0) | 0;
        if (d % cycle == 0) {
            return this._status.streakShiny | 0;
        }
        if (d % week == 0) {
            return this._status.weekShiny | 0;
        }
        return this._status.shiny | 0;
    }

    private render(): void {
        let cycle: int = Math.max(1, this._status.streakDays | 0) | 0;
        let week: int = Math.max(1, (this._status.weekDays || 7) | 0) | 0;
        let done: int = this._status.day | 0;
        let today: int = this.waiting ? this._status.offerDay | 0 : -1;
        // Amounts come with the streak from the server; an older server does not send them, and then only
        // today's amount is known (never show "+0").
        let known: boolean = this._status.shiny !== undefined && this._status.streakShiny !== undefined && this._status.weekShiny !== undefined;

        // The streak counts on without end; the tiles show the 14-day stretch it is in (15-28, ...).
        let focus: int = (this.waiting ? today : Math.max(1, done)) | 0;
        let first: int = ((((focus - 1) / cycle) | 0) * cycle + 1) | 0;
        let next: int = focus;
        while (next % week != 0) {
            next++;
        }
        // (QoL #126: with a streak saver held, a missed day doesn't start it again)
        let missLine: string = GLOBAL.INFERNO_ONLY && (this._status.savers | 0) > 0 ? KEYS.Get("io_daily2_miss_saver") : "Miss a day and it starts again.";
        if (this.waiting) {
            this._subtitle.text = "Day " + today + ": collect " + (this._status.offerShiny | 0) + " Shiny!" + (known && next != today ? "  Keep going: day " + next + " pays " + this.payoutFor(next) + "." : "");
        } else {
            this._subtitle.text = "Day " + done + " collected. Come back tomorrow for day " + (done + 1) + (known ? " (" + this.payoutFor((done + 1) | 0) + " Shiny)" : "") + ". " + missLine;
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #127: when "tomorrow" is: the next UTC day, in the player's own time)
                this._subtitle.text += " " + IoDailyPopup.nextLine();
            }
        }

        while (this._tiles.numChildren > 0) {
            this._tiles.removeChildAt(0);
        }
        // One row per week, the week's last day the big card.
        let rowWidth: int = ((week - 1) * (IoDailyPopup.TILE_W + IoDailyPopup.TILE_GAP) + IoDailyPopup.TILE7_W) | 0;
        let d: int = first;
        while (d < first + cycle) {
            let col: int = ((d - first) % week) | 0;
            let row: int = ((d - first) / week) | 0;
            let x: int = (-((rowWidth / 2) | 0) + col * (IoDailyPopup.TILE_W + IoDailyPopup.TILE_GAP)) | 0;
            let big: boolean = d % week == 0;
            let state: string = d <= done ? "done" : (d == today ? "today" : "future");
            let amount: int = d == today ? this._status.offerShiny | 0 : (known ? this.payoutFor(d) : 0);
            this.addTile(x, (row * (IoDailyPopup.TILE_H + IoDailyPopup.ROW_GAP)) | 0, d, big, state, amount);
            d++;
        }

        this._button.Setup(this.waiting ? "Collect" : "OK", false, 150, 34);
        this._button.Highlight = this.waiting;
        this._button.x = -75;
        this._button.y = ((IoDailyPopup.BG_H / 2) | 0) - 34 - 26;
        if (GLOBAL.INFERNO_ONLY) {
            this.renderSaver();
        }
    }

    /** (QoL #126) The buy-back the server offers now (a streak that broke today), or null. */
    private get buyBack(): any {
        let offer: any = this._status ? this._status.buyBack : null;
        if (!offer || (offer.streak | 0) <= 0 || !this.waiting) {
            return null;
        }
        // (the offer ends at the next UTC midnight: past it, it is gone, whatever the flag still says)
        if (Number(offer.until) > 0 && Number(offer.until) / 1000 <= GLOBAL.Timestamp()) {
            return null;
        }
        return offer;
    }

    /**
     * (QoL #126) The savers' line ("Streak savers: 1/1"), the notice (the streak saved, or the buy-back offer) and, while a
     * buy-back is offered, its button beside Collect, which then reads "Start again".
     */
    private renderSaver(): void {
        if (!this._savers) {
            return;
        }
        let held: int = this._status.savers | 0;
        let most: int = Math.max(1, this._status.saverMax | 0) | 0;
        let every: int = Math.max(1, (this._status.saverEvery || this._status.streakDays || 14) | 0) | 0;
        let line: string = KEYS.Get("io_daily2_savers", { "v1": held, "v2": most, "v3": every });
        if (held < most) {
            // the next completed stretch earns one: the day collected next that is a multiple of `every`
            let from: int = (this.waiting ? Math.max(1, this._status.offerDay | 0) : ((this._status.day | 0) + 1)) | 0;
            let at: int = (Math.ceil(from / every) * every) | 0;
            line += " " + KEYS.Get("io_daily2_next_saver", { "v1": at });
        }
        this._savers.text = this._status.savers === undefined ? "" : line;
        GLOBAL.ioFitText(this._savers, 8);

        let offer: any = this.buyBack;
        if (this.waiting && (this._status.saved | 0) == 1) {
            this.notice(KEYS.Get("io_daily2_saved"), 0x2E7D32);
        } else if (offer) {
            let left: number = Number(offer.until) > 0 ? Math.max(60, Number(offer.until) / 1000 - GLOBAL.Timestamp()) : 0;
            this.notice(KEYS.Get("io_daily2_offer", { "v1": offer.streak | 0, "v2": GLOBAL.FormatNumber(offer.price | 0), "v3": left > 0 ? GLOBAL.ioDuration(left) : "" }), 0xA02010);
        } else {
            this.notice("", 4600350);
        }

        this._buyButton.visible = Boolean(offer);
        if (offer) {
            // [Buy back: 100 Shiny] [Start again], centred together
            this._buyButton.Setup(KEYS.Get("io_daily2_buy_btn", { "v1": GLOBAL.FormatNumber(offer.price | 0) }), false, 210, 34);
            this._buyButton.Highlight = true;
            this._buyButton.x = -185;
            this._buyButton.y = this._button.y;
            this._button.Setup(KEYS.Get("io_daily2_restart_btn"), false, 150, 34);
            this._button.Highlight = false;
            this._button.x = 35;
        }
    }

    /** (QoL #126) The notice line's text, in its colour (set after the text: a new text takes the field's default format). */
    private notice(text: string, color: uint): void {
        if (!this._notice) {
            return;
        }
        this._notice.text = text;
        this._notice.textColor = color;
        GLOBAL.ioFitText(this._notice, 8);
    }

    /** (QoL #126) Spends the Shiny (asked first, by the page's settings and the account's Shiny lock), then buys the streak back. */
    private onBuyBack(e: MouseEvent = null): void {
        let offer: any = this.buyBack;
        if (!this._mc || this._busy || !offer) {
            return;
        }
        if (!GLOBAL.ioConfirmShiny(offer.price | 0, KEYS.Get("io_daily2_confirm", { "v1": offer.streak | 0 }), (): void => {
            this.onBuyBack();
        })) {
            return;
        }
        this._busy = true;
        this._buyButton.Setup(KEYS.Get("io_daily2_buying"), false, 210, 34);
        new URLLoaderApi().load(GLOBAL.serverUrl + "dailyreward/buyback", [["streak", offer.streak | 0]], as3.bind(this, this.onBoughtBack), as3.bind(this, this.onBuyFailed));
    }

    private onBoughtBack(serverData: any): void {
        this._busy = false;
        if (serverData && serverData.status) {
            GLOBAL._flags.io_streak = JSON.stringify(serverData.status);
            this._status = serverData.status;
        }
        if (serverData && serverData.error == 0) {
            BASE._credits.Set(serverData.credits | 0);
            BASE._hpCredits = serverData.credits | 0;
            GLOBAL._credits.Set(serverData.credits | 0);
            SOUNDS.Play("purchasepopup");
            if (this._mc) {
                this.render();
                this.notice(KEYS.Get("io_daily2_bought", { "v1": serverData.streak | 0 }), 0x2E7D32);
            }
            return;
        }
        if (this._mc) {
            this.render();
        }
        GLOBAL.Message(serverData && serverData.message ? String(serverData.message) : KEYS.Get("io_daily2_buy_failed"));
    }

    private onBuyFailed(e: Event): void {
        this._busy = false;
        if (this._mc) {
            this.render();
        }
        GLOBAL.Message(KEYS.Get("io_daily2_buy_failed"));
    }

    private addTile(x: int, y: int, day: int, last: boolean, state: string, amount: int): void {
        let w: int = last ? IoDailyPopup.TILE7_W : IoDailyPopup.TILE_W;
        let holder: Sprite = as3.as(this._tiles.addChild(new Sprite()), Sprite);
        holder.x = x;
        holder.y = y;
        // The card artwork is built into the game (io_daily_tile*), so it is always there.
        let art: BitmapData = IoDailyPopup.tileArt(last, state);
        if (art) {
            holder.addChild(new Bitmap(art));
        } else {
            holder.addChild(this.drawCard(w, state));
        }

        let label: TextField = as3.as(holder.addChild(this.text("Groboldov", 12, (state == "today" ? 0x7A3A06 : 0x5A3C1E) >>> 0, true)), TextField);
        label.width = w;
        label.height = 18;
        label.y = 10;
        label.text = "Day " + day;

        let value: TextField = as3.as(holder.addChild(this.text("Groboldov", 15, 16777215, true)), TextField);
        value.width = w;
        value.height = 22;
        value.y = IoDailyPopup.TILE_H - 32;
        value.text = amount > 0 ? "+" + amount : "";
        value.filters = [new GlowFilter(0x5A320A, 1, 3, 3, 8, 2)];
        if (state == "done") {
            value.alpha = 0.7;
        }
    }

    private static tileArt(last: boolean, state: string): BitmapData {
        if (last) {
            return as3.cast(state == "done" ? new io_daily_tile7_done(0, 0) : (state == "today" ? new io_daily_tile7_today(0, 0) : new io_daily_tile7_future(0, 0)), BitmapData);
        }
        return as3.cast(state == "done" ? new io_daily_tile_done(0, 0) : (state == "today" ? new io_daily_tile_today(0, 0) : new io_daily_tile_future(0, 0)), BitmapData);
    }

    private tileLoaded(key: string, image: BitmapData, args: any[]): void {
        let holder: Sprite = as3.as(args[0], Sprite);
        if (holder && holder.parent && image) {
            // Replace the drawn card (child 0) with the artwork, under the text.
            holder.removeChildAt(0);
            holder.addChildAt(new Bitmap(image), 0);
        }
    }

    /** A day card drawn in code, matching the tile artwork (used until, or instead of, the artwork). */
    private drawCard(w: int, state: string): Shape {
        let card: Shape = new Shape();
        let pad: int = 6;
        let cw: int = (w - pad * 2) | 0;
        let ch: int = (IoDailyPopup.TILE_H - pad * 2) | 0;
        let matrix: Matrix = new Matrix();
        matrix.createGradientBox(cw, ch, Math.PI / 2, pad, pad);
        let colors: any[] = state == "today" ? [0xFDECB2, 0xF3C976] : (state == "done" ? [0xDED4B0, 0xCCBF96] : [0xE8DEBA, 0xD6C79B]);
        let border: uint = (state == "today" ? 0xD66A16 : (state == "done" ? 0x8C7654 : 0x805C38)) >>> 0;
        card.graphics.lineStyle(state == "today" ? 3 : 2, border);
        card.graphics.beginGradientFill(GradientType.LINEAR, colors, [1, 1], [0, 255], matrix);
        card.graphics.drawRoundRect(pad, pad, cw, ch, 20, 20);
        card.graphics.endFill();
        if (state == "today") {
            card.filters = [new GlowFilter(0xFF8C1E, 0.9, 14, 14, 2, 2)];
        } else if (state == "done") {
            // green tick badge, top right
            card.graphics.lineStyle(2, 2513436);
            card.graphics.beginFill(5021754);
            card.graphics.drawCircle(w - 9, 9, 8);
            card.graphics.endFill();
            card.graphics.lineStyle(3, 16777215);
            card.graphics.moveTo(w - 13, 9);
            card.graphics.lineTo(w - 10, 12);
            card.graphics.lineTo(w - 4, 5);
        }
        return card;
    }

    private text(font: string, size: int, color: uint, embedded: boolean): TextField {
        let field: TextField = new TextField();
        field.selectable = false;
        field.mouseEnabled = false;
        field.embedFonts = embedded;
        field.antiAliasType = AntiAliasType.NORMAL;
        let format: TextFormat = new TextFormat(font, size, color, !embedded);
        format.align = TextFormatAlign.CENTER;
        field.defaultTextFormat = format;
        return field;
    }

    private onButton(e: MouseEvent): void {
        if (!this.waiting) {
            this.close();
            return;
        }
        if (this._busy) {
            return;
        }
        // (QoL #126: collecting while a buy-back is offered starts again at day 1: asked first)
        let offer: any = GLOBAL.INFERNO_ONLY ? this.buyBack : null;
        if (offer && e) {
            GLOBAL.Message(KEYS.Get("io_daily2_restart_confirm", { "v1": offer.streak | 0 }), KEYS.Get("btn_yes"), (): void => {
                if (this._mc) {
                    this.onButton(null);
                }
            }, null, KEYS.Get("btn_no"), (): void => {
            });
            return;
        }
        let saversBefore: int = this._status.savers | 0;
        this._busy = true;
        this._button.Setup("Collecting...", false, 150, 34);
        new URLLoaderApi().load(GLOBAL.serverUrl + "dailyreward/collect", [["collect", 1]], (serverData: any): void => {
            this.onCollected(serverData, saversBefore);
        }, as3.bind(this, this.onFailed));
    }

    private onCollected(serverData: any, saversBefore: int = 0): void {
        this._busy = false;
        if (serverData && serverData.error == 0) {
            BASE._credits.Set(serverData.credits | 0);
            BASE._hpCredits = serverData.credits | 0;
            GLOBAL._credits.Set(serverData.credits | 0);
            if (serverData.status) {
                GLOBAL._flags.io_streak = JSON.stringify(serverData.status);
                this._status = serverData.status;
            }
            // (QoL #629: a reward's sound, not a plain click)
            SOUNDS.Play("chaching", 0.6);
            if (this._mc) {
                this.render();
                this._subtitle.text = "You collected " + (serverData.shiny | 0) + " Shiny! " + this._subtitle.text;
                GLOBAL.ioFitText(this._subtitle, 9);
                // (QoL #126: a saver covered the missed day; or this completed a stretch and earned one)
                if (GLOBAL.INFERNO_ONLY && this._notice) {
                    let earned: boolean = serverData.savers !== undefined && (serverData.savers | 0) > saversBefore - ((serverData.saved | 0) == 1 ? 1 : 0);
                    let note: string = (serverData.saved | 0) == 1 ? KEYS.Get("io_daily2_saved") : "";
                    if (earned) {
                        note = (note != "" ? note + " " : "") + KEYS.Get("io_daily2_earned");
                    }
                    if (note != "") {
                        this.notice(note, 0x2E7D32);
                    }
                }
            }
            return;
        }
        if (this._mc) {
            this.render();
        }
        GLOBAL.Message(serverData && serverData.message ? String(serverData.message) : "The reward could not be collected right now.");
    }

    private onFailed(e: Event): void {
        this._busy = false;
        if (this._mc) {
            this.render();
        }
        GLOBAL.Message("The reward could not be collected right now. Please try again in a moment.");
    }

    public close(e: MouseEvent = null): void {
        if (!this._mc) {
            return;
        }
        SOUNDS.Play("close");
        GLOBAL.BlockerRemove();
        if (this._mc.parent) {
            this._mc.parent.removeChild(this._mc);
        }
        this._mc = null;
        if (IoDailyPopup._open == this) {
            IoDailyPopup._open = null;
        }
    }
}

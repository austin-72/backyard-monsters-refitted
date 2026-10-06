import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { DropShadowFilter, GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { AntiAliasType, TextField, TextFormat, TextFormatAlign } from "flash/text";
import { BASE, Button_CLIP, GLOBAL, POPUPSETTINGS, SOUNDS, URLLoaderApi, frame_CLIP, io_daily_tile7_done, io_daily_tile7_future, io_daily_tile7_today, io_daily_tile_done, io_daily_tile_future, io_daily_tile_today } from "@game";

/**
 * Inferno-only daily login reward popup (opened from the Daily Reward button, the gift button's place
 * in the top bar). Fourteen day tiles in two rows on the stock popup frame: collected days are faded with a
 * green tick, today's reward glows, every 7th day is a big one (100 Shiny; the 14th 200). The streak keeps
 * counting past 14, and the tiles then show days 15-28, and so on. Art: assets/popups/daily/tile[7]-{done,today,future}.png;
 * day labels and amounts are live text, so they follow InfernoOnlyConfig.dailyLogin.
 * Server: services/user/dailyLogin.ts (flag io_streak, POST dailyreward/collect).
 */
export class IoDailyPopup extends ASObject {
    static {
        as3.fields(this, { _mc: null, _status: null, _tiles: null, _subtitle: null, _button: null, _busy: false });
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

        this.render();

        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this._mc);
        POPUPSETTINGS.AlignToCenter(this._mc);
        POPUPSETTINGS.ScaleUp(this._mc);
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
        if (this.waiting) {
            this._subtitle.text = "Day " + today + ": collect " + (this._status.offerShiny | 0) + " Shiny!" + (known && next != today ? "  Keep going: day " + next + " pays " + this.payoutFor(next) + "." : "");
        } else {
            this._subtitle.text = "Day " + done + " collected. Come back tomorrow for day " + (done + 1) + (known ? " (" + this.payoutFor((done + 1) | 0) + " Shiny)" : "") + ". Miss a day and it starts again.";
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
        this._busy = true;
        this._button.Setup("Collecting...", false, 150, 34);
        new URLLoaderApi().load(GLOBAL.serverUrl + "dailyreward/collect", [["collect", 1]], as3.bind(this, this.onCollected), as3.bind(this, this.onFailed));
    }

    private onCollected(serverData: any): void {
        this._busy = false;
        if (serverData && serverData.error == 0) {
            BASE._credits.Set(serverData.credits | 0);
            BASE._hpCredits = serverData.credits | 0;
            GLOBAL._credits.Set(serverData.credits | 0);
            if (serverData.status) {
                GLOBAL._flags.io_streak = JSON.stringify(serverData.status);
                this._status = serverData.status;
            }
            SOUNDS.Play("click1");
            if (this._mc) {
                this.render();
                this._subtitle.text = "You collected " + (serverData.shiny | 0) + " Shiny! " + this._subtitle.text;
                GLOBAL.ioFitText(this._subtitle, 9);
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

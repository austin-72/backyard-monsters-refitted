import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData, BlendMode, IBitmapDrawable, Shape, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Rectangle } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { CASINO, CasinoUI, CasinoWindow, ImageCache, SOUNDS } from "@game";

/**
 * Brimstone Scratchers: a 3 x 3 card bought for 5, 25 or 100 Shiny; three of one symbol win that
 * symbol's prize times the price. The server draws the card when it is bought
 * (server/src/services/casino/games/scratchers.ts); scratching only shows it. The Shiny shown drops by
 * the price when the card is bought and rises by its prize when it has been scratched.
 */
export class ScratchersGame extends Sprite {
    static {
        as3.fields(this, { _win: null, _tier: "bone", _tierButtons: null, _buy: null, _revealAll: null, _card: null, _cardArt: null, _symbols: null, _cells: null, _coating: null, _coatingBitmap: null, _coatings: null, _disposed: false, _scratched: null, _scratchedCount: 0, _brush: null, _stamp: null, _hint: null, _ticketName: null, _ticket: null, _buying: false, _revealed: true, _fading: 0, _scratching: false, _lastX: 0, _lastY: 0, _pulse: 0, _serverCredits: -1 });
    }

    public static readonly TIERS: any[] = ["bone", "obsidian", "magma"];

    public static readonly NAMES: any = { "crown": "Moloch's Crown", "balthazar": "Balthazar", "spurtz": "Spurtz", "magma": "Magma", "sulfur": "Sulfur", "coal": "Coal", "bone": "Bone" };

    /** The card, from the content area's top left, and its cells in the card. */
    private static readonly CARD_X: int = 310;

    private static readonly CARD_Y: int = 46;

    private static readonly CARD: int = 300;

    private static readonly EDGE: int = 24;

    private static readonly CELL: int = 84;

    private static readonly AREA: int = 252;

    private static readonly SYMBOL: int = 70;

    private static readonly BRUSH: number = 17;

    /** Scratched progress is kept on a grid of GRID x GRID points over the coating. */
    private static readonly GRID: int = 36;

    private static readonly AUTO_REVEAL: number = 0.7;
    private _win: CasinoWindow;
    private _tier: string;
    private _tierButtons: any;
    private _buy: Sprite;
    private _revealAll: Sprite;
    private _card: Sprite;
    private _cardArt: Sprite;
    private _symbols: Sprite;
    private _cells: any[];
    private _coating: BitmapData;
    private _coatingBitmap: Bitmap;
    private _coatings: any;
    /** Closed (dispose): pictures still loading are ignored (bug report #62: their coating was gone). */
    private _disposed: boolean;
    private _scratched: any[];
    private _scratchedCount: int;
    private _brush: Shape;
    private _stamp: Sprite;
    private _hint: TextField;
    private _ticketName: TextField;
    /** The card being scratched (the server's answer), or null. */
    private _ticket: any;
    private _buying: boolean;
    private _revealed: boolean;
    private _fading: int;
    private _scratching: boolean;
    private _lastX: number;
    private _lastY: number;
    private _pulse: int;
    private _serverCredits: int;

    public $ctor(win?: CasinoWindow): void {
        let table: Sprite = null;
        this._tierButtons = {};
        this._cells = [];
        this._coatings = {};
        this._scratched = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoScratchers";
        // controls
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(210, 400)), Sprite);
        let back: Sprite = CasinoUI.button("LOBBY", 90, 26, as3.bind(win, win.toLobby), true, 12);
        back.x = 10;
        back.y = 10;
        p.addChild(back);
        p.addChild(CasinoUI.at(CasinoUI.label("SCRATCHERS", 14, CasinoUI.GOLD, true, 190, TextFormatAlign.CENTER), 10, 44));
        p.addChild(CasinoUI.at(CasinoUI.label("TICKET", 11, CasinoUI.EMBER, true, 190), 12, 68));
        let i: int = 0;
        while (i < ScratchersGame.TIERS.length) {
            let id: string = as3.str(ScratchersGame.TIERS[i]);
            let t: Sprite = CasinoUI.toggle(id.toUpperCase(), 60, 26, this.tierClick(id));
            t.x = 10 + i * 64;
            t.y = 84;
            p.addChild(t);
            this._tierButtons[id] = t;
            let price: TextField = CasinoUI.label(this.tierPrice(id) + " Shiny", 10, CasinoUI.ASH, false, 60, TextFormatAlign.CENTER);
            price.name = "casinoTierPrice:" + id;
            price.x = t.x;
            price.y = 112;
            p.addChild(price);
            i++;
        }
        this._buy = CasinoUI.button("BUY", 190, 40, as3.bind(this, this.onBuy), true, 18);
        this._buy.x = 10;
        this._buy.y = 136;
        p.addChild(this._buy);
        this._revealAll = CasinoUI.button("REVEAL ALL", 190, 28, as3.bind(this, this.onRevealAll), false, 13);
        this._revealAll.x = 10;
        this._revealAll.y = 182;
        p.addChild(this._revealAll);
        p.addChild(CasinoUI.at(CasinoUI.label("THREE OF A KIND PAYS", 11, CasinoUI.EMBER, true, 190), 12, 220));
        let prizes: any[] = this.prizes();
        i = 0;
        while (i < prizes.length) {
            let row: Sprite = as3.as(p.addChild(new Sprite()), Sprite);
            row.x = 12;
            row.y = 238 + i * 22;
            CasinoUI.picture(row, "casino/scratch/symbol_" + prizes[i].symbol + ".png", 0, 0, 20, 20);
            row.addChild(CasinoUI.at(CasinoUI.label(as3.str(ScratchersGame.NAMES[prizes[i].symbol] || prizes[i].symbol), 11, 15260872, false, 120), 26, 1));
            row.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.mult(Number(prizes[i].pays)), 11, CasinoUI.GOLD, true, 50, TextFormatAlign.RIGHT), 136, 1));
            i++;
        }
        // the table the card lies on
        table = as3.as(this.addChild(new Sprite()), Sprite);
        table.x = 220;
        table.addChild(CasinoUI.panel(480, 400, 1));
        CasinoUI.picture(table, "casino/magmadrop/board_bg.jpg", 3, 3, 474, 394, (b: Bitmap): void => {
            b.alpha = 0.55;
            table.setChildIndex(b, Math.min(1, table.numChildren - 1) | 0);
        });
        this._ticketName = CasinoUI.label("", 13, CasinoUI.GOLD, true, ScratchersGame.CARD, TextFormatAlign.CENTER);
        this._ticketName.x = ScratchersGame.CARD_X;
        this._ticketName.y = ScratchersGame.CARD_Y - 30;
        this.addChild(this._ticketName);
        // the card: its art, the symbols under the coating, the coating
        this._card = as3.as(this.addChild(new Sprite()), Sprite);
        this._card.name = "casinoScratchCard";
        this._card.x = ScratchersGame.CARD_X;
        this._card.y = ScratchersGame.CARD_Y;
        this._card.graphics.beginFill(0, 0.01);
        this._card.graphics.drawRect(0, 0, ScratchersGame.CARD, ScratchersGame.CARD);
        this._card.graphics.endFill();
        this._card.filters = [new GlowFilter(0xFF6A00, 0.5, 18, 18, 2, 2)];
        this._cardArt = as3.as(this._card.addChild(new Sprite()), Sprite);
        this._symbols = as3.as(this._card.addChild(new Sprite()), Sprite);
        this._symbols.x = this._symbols.y = ScratchersGame.EDGE;
        i = 0;
        while (i < 9) {
            let cell: Sprite = as3.as(this._symbols.addChild(new Sprite()), Sprite);
            cell.name = "casinoCell:" + i;
            cell.x = (i % 3) * ScratchersGame.CELL + ScratchersGame.CELL / 2;
            cell.y = ((i / 3) | 0) * ScratchersGame.CELL + ScratchersGame.CELL / 2;
            this._cells.push(cell);
            i++;
        }
        this._coating = new BitmapData(ScratchersGame.AREA, ScratchersGame.AREA, true, 0);
        this._coatingBitmap = new Bitmap(this._coating);
        this._coatingBitmap.x = this._coatingBitmap.y = ScratchersGame.EDGE;
        this._card.addChild(this._coatingBitmap);
        this._hint = CasinoUI.label("", 13, 16777215, true, ScratchersGame.AREA, TextFormatAlign.CENTER);
        this._hint.filters = [new GlowFilter(0, 1, 4, 4, 6, 1)];
        this._hint.x = ScratchersGame.EDGE;
        this._hint.y = ScratchersGame.EDGE + ScratchersGame.AREA / 2 - 10;
        this._card.addChild(this._hint);
        this._stamp = as3.as(this.addChild(new Sprite()), Sprite);
        this._stamp.mouseEnabled = this._stamp.mouseChildren = false;
        this._stamp.x = ScratchersGame.CARD_X + ScratchersGame.CARD / 2;
        this._stamp.y = ScratchersGame.CARD_Y + ScratchersGame.CARD + 24;
        this._brush = new Shape();
        this._brush.graphics.beginFill(16777215, 1);
        this._brush.graphics.drawCircle(0, 0, ScratchersGame.BRUSH);
        this._brush.graphics.endFill();
        this._card.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this._card.addEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        this._card.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this._card.addEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onUp));
        // the pictures, fetched now so a card shows at once
        let k: string = null;
        for (const $value of as3.values(ScratchersGame.TIERS)) {
            k = as3.str($value);
            ImageCache.GetImageWithCallBack("casino/scratch/coating_" + k + ".png", as3.bind(this, this.coatingLoaded), true, 1, "", [k]);
        }
        for (let pr of as3.values(prizes)) {
            ImageCache.GetImageWithCallBack("casino/scratch/symbol_" + pr.symbol + ".png", (key: string, bmd: BitmapData, args: any[] = null): void => {
            });
        }
        this.setTier("bone");
    }

    private coatingLoaded(key: string, bmd: BitmapData, args: any[] = null): void {
        if (!bmd || !args || this._disposed) {
            return;
        }
        this._coatings[args[0]] = bmd;
        if (this._revealed && !this._ticket && args[0] == this._tier) {
            this.cover();
        }
    }

    private prizes(): any[] {
        let st: any = CASINO.state;
        return st && st.rules && st.rules.scratch ? as3.as(st.rules.scratch.prizes, Array) : [];
    }

    private tierRules(id: string): any {
        let st: any = CASINO.state;
        return st && st.rules && st.rules.scratch && st.rules.scratch.tiers ? st.rules.scratch.tiers[id] : null;
    }

    private tierPrice(id: string): int {
        let t: any = this.tierRules(id);
        return t ? t.price | 0 : 0;
    }

    private tierOpen(id: string): boolean {
        let t: any = this.tierRules(id);
        let level: int = CASINO.state ? CASINO.state.level | 0 : 0;
        return t != null && level >= (t.level | 0);
    }

    private tierClick(id: string): Function {
        return (e: MouseEvent): void => {
            if (!this.tierOpen(id)) {
                let t: any = this.tierRules(id);
                this._win.message(id.charAt(0).toUpperCase() + id.substr(1) + " tickets are sold from Pit level " + (t ? t.level | 0 : 3) + ".", CasinoUI.ASH);
                SOUNDS.Play("error1");
                return;
            }
            if (this._ticket && !this._revealed) {
                this._win.message("Scratch the card you have first.", CasinoUI.ASH);
                return;
            }
            this.setTier(id);
        };
    }

    private setTier(id: string): void {
        this._tier = id;
        let k: string = null;
        for (k in this._tierButtons) {
            CasinoUI.choose(as3.cast(this._tierButtons[k], Sprite), k == id);
            this._tierButtons[k].alpha = this.tierOpen(k) ? 1 : 0.45;
        }
        this._ticketName.text = id.toUpperCase() + " TICKET  -  " + this.tierPrice(id) + " SHINY";
        CasinoUI.removeAll(this._cardArt);
        CasinoUI.picture(this._cardArt, "casino/scratch/card_" + id + ".png", 0, 0, ScratchersGame.CARD, ScratchersGame.CARD);
        if (!this._ticket || this._revealed) {
            this.clearCard();
            this.cover();
            this._hint.text = "BUY A TICKET";
        }
    }

    /** The card covered again with its tier's coating. */
    private cover(): void {
        if (this._disposed) {
            return;
        }
        this._coating.fillRect(this._coating.rect, 0);
        let src: BitmapData = as3.cast(this._coatings[this._tier], BitmapData);
        if (src) {
            let m: Matrix = new Matrix();
            m.scale(ScratchersGame.AREA / src.width, ScratchersGame.AREA / src.height);
            this._coating.draw(as3.cast(src, IBitmapDrawable), m, null, null, null, true);
        } else {
            this._coating.fillRect(this._coating.rect, 4287266936);
        }
        this._coatingBitmap.alpha = 1;
        this._fading = 0;
        this._scratched = [];
        let i: int = 0;
        while (i < ScratchersGame.GRID * ScratchersGame.GRID) {
            this._scratched.push(false);
            i++;
        }
        this._scratchedCount = 0;
    }

    private clearCard(): void {
        let c: Sprite = null;
        for (c of as3.values(this._cells)) {
            CasinoUI.removeAll(c);
            c.graphics.clear();
            c.filters = [];
        }
        CasinoUI.removeAll(this._stamp);
    }

    private onBuy(e: MouseEvent = null): void {
        let price: int = 0;
        let st: any = CASINO.state;
        if (!st || st.closed || st.shiny_locked) {
            this._win.message(st && st.closed ? String(st.closed) : "The Pit is not open.", CasinoUI.LOSS);
            return;
        }
        if (this._buying || (this._ticket && !this._revealed)) {
            return;
        }
        if (!this.tierOpen(this._tier)) {
            return;
        }
        price = this.tierPrice(this._tier);
        if (CASINO.credits() < price) {
            this._win.message("You do not have enough Shiny for that ticket.", CasinoUI.LOSS);
            SOUNDS.Play("error1");
            return;
        }
        this._buying = true;
        CASINO.setCredits((CASINO.credits() - price) | 0);
        this._ticket = null;
        this.clearCard();
        this.cover();
        this._hint.text = "...";
        let tier: string = this._tier;
        CASINO.scratch(tier, (r: any): void => {
            this._buying = false;
            if (!this.parent) {
                return;
            }
            if (r.error) {
                CASINO.setCredits((CASINO.credits() + price) | 0);
                this._hint.text = "BUY A TICKET";
                this._win.message(String(r.error), CasinoUI.LOSS);
                SOUNDS.Play("error1");
                return;
            }
            this._serverCredits = r.credits | 0;
            this.deal(r);
        });
    }

    /** The card the server drew, under its coating. */
    private deal(r: any): void {
        this._ticket = r;
        this._revealed = false;
        this._hint.text = "";
        let grid: any[] = as3.as(r.grid, Array);
        let i: int = 0;
        while (i < 9 && grid) {
            CasinoUI.picture(as3.cast(this._cells[i], Sprite), "casino/scratch/symbol_" + grid[i] + ".png", -ScratchersGame.SYMBOL / 2, -ScratchersGame.SYMBOL / 2, ScratchersGame.SYMBOL, ScratchersGame.SYMBOL);
            i++;
        }
        SOUNDS.Play("purchasepopup");
        this._win.message("Scratch the card!", CasinoUI.GOLD);
    }

    private onDown(e: MouseEvent): void {
        if (!this._ticket || this._revealed) {
            return;
        }
        this._scratching = true;
        this._lastX = this._card.mouseX - ScratchersGame.EDGE;
        this._lastY = this._card.mouseY - ScratchersGame.EDGE;
        this.scratchAt(this._lastX, this._lastY);
        this.checkProgress();
    }

    private onMove(e: MouseEvent): void {
        if (!this._scratching || !this._ticket || this._revealed) {
            return;
        }
        if (!e.buttonDown) {
            this._scratching = false;
            return;
        }
        let x: number = this._card.mouseX - ScratchersGame.EDGE;
        let y: number = this._card.mouseY - ScratchersGame.EDGE;
        let dx: number = x - this._lastX;
        let dy: number = y - this._lastY;
        let d: number = Math.sqrt(dx * dx + dy * dy);
        let steps: int = Math.max(1, Math.ceil(d / (ScratchersGame.BRUSH * 0.4))) | 0;
        let s: int = 1;
        while (s <= steps) {
            this.scratchAt(this._lastX + dx * s / steps, this._lastY + dy * s / steps);
            s++;
        }
        this._lastX = x;
        this._lastY = y;
        this.checkProgress();
    }

    private onUp(e: MouseEvent): void {
        this._scratching = false;
    }

    /** Rubs the coating off in a circle at (x, y) of the scratch area. */
    private scratchAt(x: number, y: number): void {
        let m: Matrix = new Matrix();
        m.translate(x, y);
        this._coating.draw(as3.cast(this._brush, IBitmapDrawable), m, null, BlendMode.ERASE, new Rectangle(x - ScratchersGame.BRUSH - 1, y - ScratchersGame.BRUSH - 1, ScratchersGame.BRUSH * 2 + 2, ScratchersGame.BRUSH * 2 + 2));
        // the grid points under the brush
        let step: number = ScratchersGame.AREA / ScratchersGame.GRID;
        let gx0: int = Math.max(0, Math.floor((x - ScratchersGame.BRUSH) / step)) | 0;
        let gx1: int = Math.min(ScratchersGame.GRID - 1, Math.ceil((x + ScratchersGame.BRUSH) / step)) | 0;
        let gy0: int = Math.max(0, Math.floor((y - ScratchersGame.BRUSH) / step)) | 0;
        let gy1: int = Math.min(ScratchersGame.GRID - 1, Math.ceil((y + ScratchersGame.BRUSH) / step)) | 0;
        let r2: number = ScratchersGame.BRUSH * ScratchersGame.BRUSH;
        let gy: int = gy0;
        while (gy <= gy1) {
            let gx: int = gx0;
            while (gx <= gx1) {
                let px: number = (gx + 0.5) * step - x;
                let py: number = (gy + 0.5) * step - y;
                if (px * px + py * py <= r2) {
                    let k: int = (gy * ScratchersGame.GRID + gx) | 0;
                    if (!this._scratched[k]) {
                        this._scratched[k] = true;
                        ++this._scratchedCount;
                    }
                }
                gx++;
            }
            gy++;
        }
    }

    /** How much of the coating is gone (0 to 1). */
    public get scratched(): number {
        return this._scratchedCount / (ScratchersGame.GRID * ScratchersGame.GRID);
    }

    private checkProgress(): void {
        if (this.scratched >= ScratchersGame.AUTO_REVEAL) {
            this.reveal();
        }
    }

    private onRevealAll(e: MouseEvent = null): void {
        if (this._ticket && !this._revealed) {
            this.reveal();
        }
    }

    /** The whole card shown, and its prize. */
    private reveal(): void {
        if (!this._ticket || this._revealed) {
            return;
        }
        this._revealed = true;
        this._scratching = false;
        this._fading = 12;
        let r: any = this._ticket;
        let payout: int = r.payout | 0;
        let price: int = r.price | 0;
        CASINO.setCredits((CASINO.credits() + payout) | 0);
        if (!this._buying && this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        let label: TextField = null;
        if (r.prize) {
            let cells: any[] = as3.as(r.cells, Array);
            for (const $value of as3.values(cells)) {
                let c: int = $value | 0;
                // a hot tile behind the three that match
                let cell: Sprite = as3.cast(this._cells[c], Sprite);
                cell.graphics.lineStyle(2, 16769184, 1);
                cell.graphics.beginFill(16747040, 0.45);
                cell.graphics.drawRoundRect(-ScratchersGame.CELL / 2 + 3, -ScratchersGame.CELL / 2 + 3, ScratchersGame.CELL - 6, ScratchersGame.CELL - 6, 12, 12);
                cell.graphics.endFill();
                cell.filters = [new GlowFilter(0xFFD040, 1, 18, 18, 3, 2)];
            }
            label = CasinoUI.title("WIN " + CasinoUI.number(payout) + " SHINY!", 26, 360);
            this._win.message("Three " + (ScratchersGame.NAMES[r.prize] || r.prize) + ": " + CasinoUI.mult(Number(r.multiplier)) + ", +" + CasinoUI.number(payout) + " Shiny", CasinoUI.WIN);
            SOUNDS.Play(Number(r.multiplier) >= 10 ? "chaching" : "purchasepopup");
            this._win.bigWin(payout, r.price | 0);
        } else {
            label = CasinoUI.label("NO WIN - TRY ANOTHER", 16, CasinoUI.ASH, true, 360, TextFormatAlign.CENTER);
            this._win.message("No three of a kind on this one.", CasinoUI.ASH);
        }
        label.x = -180;
        label.y = -16;
        CasinoUI.removeAll(this._stamp);
        this._stamp.addChild(label);
        this._stamp.scaleX = this._stamp.scaleY = 1.6;
        this._stamp.alpha = 0;
        this._pulse = 0;
    }

    public tick(): void {
        if (this._disposed) {
            return;
        }
        if (this._fading > 0) {
            this._fading--;
            this._coatingBitmap.alpha = this._fading / 12;
            if (this._fading == 0) {
                this._coating.fillRect(this._coating.rect, 0);
                this._coatingBitmap.alpha = 1;
            }
        }
        if (this._stamp.numChildren > 0 && this._stamp.alpha < 1) {
            this._stamp.alpha = Math.min(1, this._stamp.alpha + 0.12);
            this._stamp.scaleX = this._stamp.scaleY = Math.max(1, this._stamp.scaleX - 0.08);
        }
        if (this._ticket && this._revealed && this._ticket.prize) {
            this._pulse++;
            let a: number = 0.6 + 0.4 * Math.sin(this._pulse / 5);
            for (const $value of as3.values(this._ticket.cells)) {
                let c: int = $value | 0;
                this._cells[c].filters = [new GlowFilter(0xFFD040, a, 18, 18, 3, 2)];
            }
        }
        let busy: boolean = this._buying || (this._ticket != null && !this._revealed);
        CasinoUI.enable(this._buy, !busy && this.tierOpen(this._tier));
        CasinoUI.enable(this._revealAll, this._ticket != null && !this._revealed);
    }

    public get showing(): boolean {
        return this._buying || (this._ticket != null && !this._revealed);
    }

    public dispose(): void {
        // a card left unscratched: its prize is already paid
        if (this._ticket && !this._revealed && this._serverCredits >= 0) {
            CASINO.setCredits(this._serverCredits);
        }
        this._card.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this._card.removeEventListener(MouseEvent.MOUSE_MOVE, as3.bind(this, this.onMove));
        this._card.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this._card.removeEventListener(MouseEvent.ROLL_OUT, as3.bind(this, this.onUp));
        this._disposed = true;
        this._coating.dispose();
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}

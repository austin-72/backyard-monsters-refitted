import * as as3 from "as3";
import { int, uint } from "as3";
import { Shape, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { GLOBAL, IoFormat, CASINO, CasinoUI, CasinoWindow, KEYS } from "@game";

// (QoL #235: the Pit's texts in the player's language: keys io_t3c_*, the games' names left as they are)
/**
 * Inferno-only: the Brimstone Pit's Live tab. Every player's latest bets as they are made (the admins'
 * are not shown: the server leaves them out), the day's biggest wins and the last jackpots, asked of the
 * server (casino/live) every two seconds while the tab is open. Kept by the window like a game (tick,
 * dispose).
 */
export class LiveTab extends Sprite {
    static {
        as3.fields(this, { _win: null, _list: null, _side: null, _status: null, _t: 0, _asking: false, _lastId: -1, _fresh: null });
    }

    private static readonly ROWS: int = 17;
    private _win: CasinoWindow;
    private _list: Sprite;
    private _side: Sprite;
    private _status: TextField;
    private _t: int;
    private _asking: boolean;
    /** The newest bet id shown, and the rows that came in since (they glow a moment). */
    private _lastId: number;
    private _fresh: any[];

    public $ctor(win?: CasinoWindow): void {
        this._fresh = [];
        super.$ctor();
        this._win = win;
        this.name = "casinoLive";
        let p: Sprite = as3.as(this.addChild(CasinoUI.panel(440, (CasinoWindow.CH - 10) | 0)), Sprite);
        p.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_live_bets"), 13, CasinoUI.GOLD, true, 200), 14, 10));
        let dot: Shape = as3.as(p.addChild(new Shape()), Shape);
        dot.graphics.beginFill(16726570, 1);
        dot.graphics.drawCircle(0, 0, 4);
        dot.graphics.endFill();
        dot.x = 98;
        dot.y = 20;
        dot.filters = [new GlowFilter(0xFF3A2A, 1, 8, 8, 2, 2)];
        dot.name = "casinoLiveDot";
        this._status = CasinoUI.label(KEYS.Get("io_t3c_live_watching"), 10, CasinoUI.ASH, false, 300, TextFormatAlign.RIGHT);
        this._status.x = 126;
        this._status.y = 12;
        p.addChild(this._status);
        // (QoL #581: the multiplier column headed ×, as the Pit writes them; "x" outside the Inferno)
        let cols: any[] = [[KEYS.Get("io_t3c_col_player"), 14, 120, TextFormatAlign.LEFT], [KEYS.Get("io_t3c_col_game"), 138, 104, TextFormatAlign.LEFT], [KEYS.Get("io_t3c_col_bet"), 242, 66, TextFormatAlign.RIGHT], [CasinoUI.times(), 310, 50, TextFormatAlign.RIGHT], [KEYS.Get("io_t3c_col_paid"), 362, 64, TextFormatAlign.RIGHT]];
        for (let c of as3.values(cols)) {
            p.addChild(CasinoUI.at(CasinoUI.label(as3.str(c[0]), 10, CasinoUI.EMBER, true, c[2] | 0, as3.str(c[3])), Number(c[1]), 32));
        }
        this._list = as3.as(p.addChild(new Sprite()), Sprite);
        this._list.y = 50;
        let side: Sprite = as3.as(this.addChild(CasinoUI.panel(250, (CasinoWindow.CH - 10) | 0)), Sprite);
        side.x = 450;
        this._side = as3.as(side.addChild(new Sprite()), Sprite);
        this.ask();
    }

    public static gameName(id: string): string {
        let names: any = { "magmadrop": "Magma Drop", "scratch": "Scratchers", "roulette": "Roulette", "bonepile": "Bone Pile", "slots": "Magma Slots", "ascent": "Ascent", "derby": "Derby", "fortune": "Korath's Fortune", "favor": "Moloch's Favor", "dice": "Devil's Dice", "blackjack": "Cinderjack", "hilo": "Higher or Lower", "deal": "Undertaker's Offer" };
        return as3.str(names[id] || id);
    }

    private ask(): void {
        if (this._asking) {
            return;
        }
        this._asking = true;
        CASINO.live((r: any): void => {
            this._asking = false;
            if (!this.parent) {
                return;
            }
            if (r.error) {
                this._status.text = String(r.error);
                return;
            }
            this.show(r);
        });
    }

    private show(r: any): void {
        let bets: any[] = as3.as(r.bets, Array) || [];
        this._status.text = bets.length ? "" : KEYS.Get("io_t3c_live_none");
        CasinoUI.removeAll(this._list);
        let newest: number = bets.length ? Number(bets[0].id) : this._lastId;
        let first: boolean = this._lastId < 0;
        this._fresh = [];
        let i: int = 0;
        while (i < Math.min(bets.length, LiveTab.ROWS)) {
            let b: any = bets[i];
            let row: Sprite = as3.as(this._list.addChild(new Sprite()), Sprite);
            row.name = "casinoLiveRow:" + b.id;
            row.y = i * 20;
            if (i % 2 == 0) {
                row.graphics.beginFill(16777215, 0.04);
                row.graphics.drawRect(8, -1, 424, 19);
                row.graphics.endFill();
            }
            let free: boolean = b.free_bet != null && (b.stake | 0) == 0;
            let won: boolean = !b.open && (b.payout | 0) > (b.stake | 0);
            let color: uint = (b.jackpot ? 0xD090FF : (won ? CasinoUI.WIN : (b.open ? CasinoUI.GOLD : CasinoUI.ASH))) >>> 0;
            let vals: any[] = [[String(b.name), 14, 120, TextFormatAlign.LEFT, b.me ? CasinoUI.GOLD : 0xE8DCC8], [LiveTab.gameName(String(b.game)), 138, 104, TextFormatAlign.LEFT, 0xE8DCC8], [free ? KEYS.Get("io_t3c_free") : CasinoUI.number(b.stake | 0), 242, 66, TextFormatAlign.RIGHT, 0xE8DCC8], [b.open ? "" : (b.jackpot ? KEYS.Get("io_t3c_jackpot") : CasinoUI.mult(Number(b.multiplier))), 310, 50, TextFormatAlign.RIGHT, color], [b.open ? KEYS.Get("io_pit_hist_open") : CasinoUI.number(b.payout | 0), 362, 64, TextFormatAlign.RIGHT, color]];
            for (let v of as3.values(vals)) {
                // ("JACKPOT" is wider than the x column at 11: it ran into the Paid column; 9 October)
                row.addChild(CasinoUI.at(CasinoUI.label(as3.str(v[0]), v == vals[3] && b.jackpot ? 9 : 11, v[4] >>> 0, v == vals[4] && won, v[2] | 0, as3.str(v[3])), Number(v[1]), v == vals[3] && b.jackpot ? 2 : 0));
            }
            if (!first && Number(b.id) > this._lastId) {
                this._fresh.push({ "s": row, "t": 30, "c": b.jackpot ? 0xD090FF : (won ? 0x9CFF6A : 0xFF8A2A) });
            }
            i++;
        }
        this._lastId = newest;
        // the day's biggest wins and the last jackpots
        CasinoUI.removeAll(this._side);
        this._side.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_live_top"), 12, CasinoUI.GOLD, true, 230), 12, 10));
        let top: any[] = as3.as(r.top, Array) || [];
        if (!top.length) {
            this._side.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_live_top_none"), 10, CasinoUI.ASH, false, 230), 12, 32));
        }
        i = 0;
        while (i < Math.min(top.length, 10)) {
            let t: any = top[i];
            let y: int = (32 + i * 21) | 0;
            this._side.addChild(CasinoUI.at(CasinoUI.label((i + 1) + ". " + t.name, 11, (t.me ? CasinoUI.GOLD : 0xE8DCC8) >>> 0, i == 0, 140), 12, y));
            this._side.addChild(CasinoUI.at(CasinoUI.label("+" + CasinoUI.number((t.payout | 0) - (t.stake | 0)), 11, (t.jackpot ? 0xD090FF : CasinoUI.WIN) >>> 0, true, 84, TextFormatAlign.RIGHT), 152, y));
            this._side.addChild(CasinoUI.at(CasinoUI.label(t.jackpot ? KEYS.Get("io_t3c_live_top_jp", { "v1": LiveTab.gameName(String(t.game)) }) : LiveTab.gameName(String(t.game)) + ", " + CasinoUI.mult(Number(t.multiplier)), 9, CasinoUI.ASH, false, 220), 24, y + 12));
            i++;
        }
        let jy: int = (32 + 10 * 21 + 14) | 0;
        this._side.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_live_jps"), 12, 13668607, true, 230), 12, jy));
        let jackpots: any[] = as3.as(r.jackpots, Array) || [];
        if (!jackpots.length) {
            this._side.addChild(CasinoUI.at(CasinoUI.label(KEYS.Get("io_t3c_live_pool", { "v1": CasinoUI.number(Number(r.jackpot)) }), 10, CasinoUI.ASH, false, 230), 12, jy + 22));
        }
        i = 0;
        while (i < Math.min(jackpots.length, 5)) {
            let j: any = jackpots[i];
            let ago: string = this.ago(Number(r.server_ts) - Number(j.at));
            this._side.addChild(CasinoUI.at(CasinoUI.label(String(j.name), 11, (j.me ? CasinoUI.GOLD : 0xE8DCC8) >>> 0, false, 130), 12, jy + 22 + i * 17));
            this._side.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.number(j.payout | 0) + " - " + ago, 10, 13668607, true, 110, TextFormatAlign.RIGHT), 126, jy + 23 + i * 17));
            i++;
        }
    }

    private ago(ms: number): string {
        if (GLOBAL.INFERNO_ONLY) {
            return IoFormat.since(ms / 1000, true); // (QoL #572)
        }
        let m: int = Math.max(0, Math.floor(ms / 60000)) | 0;
        return m < 1 ? "now" : (m < 60 ? m + "m ago" : (m < 1440 ? Math.floor(m / 60) + "h ago" : Math.floor(m / 1440) + "d ago"));
    }

    public tick(): void {
        if (++this._t >= 80) {
            this._t = 0;
            this.ask();
        }
        let i: int = (this._fresh.length - 1) | 0;
        while (i >= 0) {
            let f: any = this._fresh[i];
            f.t--;
            f.s.filters = f.t > 0 ? [new GlowFilter(f.c, f.t / 30, 10, 10, 2, 2)] : [];
            if (f.t <= 0) {
                this._fresh.splice(i, 1);
            }
            i--;
        }
    }

    public get showing(): boolean {
        return false;
    }

    public dispose(): void {
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}

import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObject, GradientType, MovieClip, Shape, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { ColorMatrixFilter, GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { AscentGame, BonePileGame, CASINO, CasinoUI, DerbyGame, GLOBAL, LiveTab, MagmaDropGame, POPUPSETTINGS, RouletteGame, SOUNDS, ScratchersGame, SlotsGame } from "@game";

/**
 * Inferno-only: the Brimstone Pit's window (opened from the Pit's info panel: BRIMSTONEPIT). A lobby of
 * the eight games (those not open at the Pit's level greyed, those not in yet marked coming soon) with
 * the jackpot and Moloch's Favor (the free Slots spin of the day), everyone's bets live (LiveTab), the
 * player's last bets, and the fairness panel (the seeds every result is drawn from, and how to check
 * them). The games are played on the server (server/src/controllers/casino); this only shows them.
 */
export class CasinoWindow extends ASObject {
    static {
        as3.fields(this, { _big: null, _bigT: 0, _bigAmount: 0, _bigText: null, _bigGems: null, _favorLine: null, mc: null, _content: null, _shiny: null, _level: null, _tabs: null, _game: null, _toast: null, _toastT: 0, _embers: null, _live: null, _liveT: 0, _emberLayer: null });
    }

    public static readonly W: int = 740;

    public static readonly H: int = 530;

    /** The area games and tabs draw in, from the window's centre. */
    public static readonly CX: int = -350;

    public static readonly CY: int = -170;

    public static readonly CW: int = 700;

    public static readonly CH: int = 410;

    private static _open: CasinoWindow = null;

    /** A win paying this many times its bet or more is celebrated across the window (bigWin). */
    public static readonly BIG_WIN: int = 10;
    private _big: Sprite;
    private _bigT: int;
    private _bigAmount: int;
    private _bigText: TextField;
    private _bigGems: any[];
    private _favorLine: TextField;
    public mc: MovieClip;
    private _content: Sprite;
    private _shiny: TextField;
    private _level: TextField;
    private _tabs: any[];
    private _game: any;
    private _toast: TextField;
    private _toastT: int;
    private _embers: any[];
    /** The lobby's live lines (Ascent, Derby), by game. */
    private _live: any;
    private _liveT: int;
    private _emberLayer: Sprite;

    public $ctor(): void {
        this._bigGems = [];
        this._tabs = [];
        this._embers = [];
        this._live = {};
        super.$ctor();
        this.mc = new MovieClip();
        this.mc.name = "casinoWindow";
        this.drawFrame();
        // the header: title, level, Shiny
        this.mc.addChild(CasinoUI.at(CasinoUI.title("THE BRIMSTONE PIT", 30, (CasinoWindow.W - 200) | 0), -CasinoWindow.W / 2 + 100, -CasinoWindow.H / 2 + 12));
        this._level = as3.as(this.mc.addChild(CasinoUI.label("", 12, CasinoUI.ASH, true, 200, TextFormatAlign.LEFT)), TextField);
        this._level.x = -CasinoWindow.W / 2 + 26;
        this._level.y = -CasinoWindow.H / 2 + 26;
        this._shiny = as3.as(this.mc.addChild(CasinoUI.label("", 15, CasinoUI.GOLD, true, 160, TextFormatAlign.RIGHT)), TextField);
        this._shiny.x = CasinoWindow.W / 2 - 210;
        this._shiny.y = -CasinoWindow.H / 2 + 24;
        let gem: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        gem.graphics.lineStyle(1, 16777215, 0.9);
        gem.graphics.beginFill(8052991, 1);
        gem.graphics.moveTo(0, -8);
        gem.graphics.lineTo(7, -2);
        gem.graphics.lineTo(0, 9);
        gem.graphics.lineTo(-7, -2);
        gem.graphics.lineTo(0, -8);
        gem.graphics.endFill();
        gem.x = CasinoWindow.W / 2 - 38;
        gem.y = -CasinoWindow.H / 2 + 36;
        gem.filters = [new GlowFilter(0x7AE0FF, 0.8, 8, 8, 2, 2)];
        // tabs
        let names: any[] = ["Games", "Live", "History", "Fairness"];
        let i: int = 0;
        while (i < names.length) {
            let tab: Sprite = CasinoUI.toggle(as3.str(names[i]), 110, 26, this.tabClick(i));
            tab.x = -CasinoWindow.W / 2 + 26 + i * 118;
            tab.y = -CasinoWindow.H / 2 + 62;
            this.mc.addChild(tab);
            this._tabs.push(tab);
            i++;
        }
        this._content = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._content.x = CasinoWindow.CX;
        this._content.y = CasinoWindow.CY;
        this._emberLayer = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._emberLayer.mouseEnabled = false;
        this._emberLayer.mouseChildren = false;
        this._big = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._big.name = "casinoBigWin";
        this._big.visible = false;
        // (it never stands in the way: a click anywhere in the window goes through, and puts it away)
        this._big.mouseEnabled = this._big.mouseChildren = false;
        // (inside the window's rim)
        let bigMask: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        bigMask.graphics.beginFill(0);
        bigMask.graphics.drawRoundRect(-CasinoWindow.W / 2 + 6, -CasinoWindow.H / 2 + 6, CasinoWindow.W - 12, CasinoWindow.H - 12, 18, 18);
        bigMask.graphics.endFill();
        this._big.mask = bigMask;
        this.mc.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            if (this._bigT > 25) {
                this._bigT = 25;
            }
        });
        this._toast = as3.as(this.mc.addChild(CasinoUI.label("", 14, 16777215, true, (CasinoWindow.W - 100) | 0, TextFormatAlign.CENTER)), TextField);
        this._toast.name = "casinoToast";
        this._toast.x = -CasinoWindow.W / 2 + 50;
        this._toast.y = CasinoWindow.H / 2 - 44;
        this._toast.filters = [new GlowFilter(0x3A0A04, 1, 4, 4, 8, 2)];
        // close
        let x: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        x.name = "casinoClose";
        x.buttonMode = true;
        x.mouseChildren = false;
        x.graphics.lineStyle(2, 14708778, 1);
        x.graphics.beginFill(2755078, 1);
        x.graphics.drawCircle(0, 0, 14);
        x.graphics.endFill();
        x.graphics.lineStyle(3, 16766346, 1);
        x.graphics.moveTo(-5, -5);
        x.graphics.lineTo(5, 5);
        x.graphics.moveTo(5, -5);
        x.graphics.lineTo(-5, 5);
        x.x = CasinoWindow.W / 2 - 22;
        x.y = -CasinoWindow.H / 2 + 22;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));
        this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        this.selectTab(0);
        this.message("Entering the Pit...", CasinoUI.ASH);
        CASINO.getState(as3.bind(this, this.onState));
    }

    /** Opens the window (the player's own yard only, not during an attack). */
    public static Show(): void {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL.Message("The Brimstone Pit only opens in your own yard.");
            return;
        }
        if (CasinoWindow._open) {
            CasinoWindow._open.close();
        }
        CasinoWindow._open = new CasinoWindow();
    }

    /** A game is showing a result the Shiny shown has not caught up with yet. */
    public static get showingResult(): boolean {
        return CasinoWindow._open != null && CasinoWindow._open._game != null && Boolean(CasinoWindow._open._game.showing);
    }

    public static get isOpen(): boolean {
        return CasinoWindow._open != null;
    }

    /** The games a Pit level opens (the building's description; the server's config decides). */
    public static gamesAtLevel(level: int): string {
        let names: any[] = ["Magma Drop and Brimstone Scratchers", "Wormzer Roulette and Bone Pile", "Magma Slots and Magma tickets", "Balthazar's Ascent", "Magma Derby", "Korath's Fortune"];
        let out: any[] = [];
        let i: int = 0;
        while (i < Math.min(level, names.length)) {
            out.push(names[i]);
            i++;
        }
        return out.join("; ") + (level < names.length ? ". Next level: " + names[level] + "." : ".");
    }

    /** Obsidian, a molten rim, the cavern behind (casino/lobby/lobby_bg.jpg). */
    private drawFrame(): void {
        let bg: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(CasinoWindow.W, CasinoWindow.H, Math.PI / 2, -CasinoWindow.W / 2, -CasinoWindow.H / 2);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(-CasinoWindow.W / 2, -CasinoWindow.H / 2, CasinoWindow.W, CasinoWindow.H, 22, 22);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        let art: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        CasinoUI.picture(art, "casino/lobby/lobby_bg.jpg", -CasinoWindow.W / 2 + 6, -CasinoWindow.H / 2 + 6, CasinoWindow.W - 12, CasinoWindow.H - 12, (b: any): void => {
            b.alpha = 0.95;
        });
        let mask: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(-CasinoWindow.W / 2 + 6, -CasinoWindow.H / 2 + 6, CasinoWindow.W - 12, CasinoWindow.H - 12, 18, 18);
        mask.graphics.endFill();
        art.mask = mask;
        // a dark band behind the header
        let band: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        let m2: Matrix = new Matrix();
        m2.createGradientBox(CasinoWindow.W, 100, Math.PI / 2, -CasinoWindow.W / 2, -CasinoWindow.H / 2);
        band.graphics.beginGradientFill(GradientType.LINEAR, [0x0C0605, 0x0C0605], [0.85, 0], [0, 255], m2);
        band.graphics.drawRect(-CasinoWindow.W / 2 + 6, -CasinoWindow.H / 2 + 6, CasinoWindow.W - 12, 100);
        band.graphics.endFill();
    }

    private tabClick(i: int): Function {
        return (e: MouseEvent): void => {
            this.selectTab(i);
        };
    }

    public selectTab(i: int): void {
        let k: int = 0;
        while (k < this._tabs.length) {
            CasinoUI.choose(as3.cast(this._tabs[k], Sprite), k == i);
            k++;
        }
        this.endGame();
        CasinoUI.removeAll(this._content);
        this.message("", 0);
        // (a game's last line went on showing over the History table)
        if (i == 0) {
            this.lobby();
        } else if (i == 1) {
            this._game = this._content.addChild(new LiveTab(this));
        } else if (i == 2) {
            this.historyTab();
        } else {
            this.fairnessTab();
        }
    }

    private onState(r: any): void {
        if (!this.mc) {
            return;
        }
        if (r.error) {
            this.message(String(r.error), CasinoUI.LOSS);
            return;
        }
        this.message("", 0);
        if (CASINO.state && CASINO.state.shiny_locked) {
            this.message("Shiny is turned off on your account, so you cannot play in the Brimstone Pit.", CasinoUI.LOSS);
        } else if (CASINO.state && CASINO.state.closed) {
            this.message(String(CASINO.state.closed), CasinoUI.LOSS);
        }
        if (!this._game) {
            this.selectTab(0);
        }
    }

    // ---- the lobby
    private lobby(): void {
        this._live = {};
        let st: any = CASINO.state;
        let games: any[] = st ? as3.as(st.games, Array) : [];
        if (!games || !games.length) {
            return;
        }
        let TW: int = 160;
        let TH: int = 150;
        let i: int = 0;
        while (i < games.length) {
            let g: any = games[i];
            let row: int = i < 4 ? 0 : 1;
            let col: int = (i < 4 ? i : i - 4) | 0;
            let rowCount: int = (row == 0 ? 4 : games.length - 4) | 0;
            let x0: number = (CasinoWindow.CW - (rowCount * TW + (rowCount - 1) * 20)) / 2;
            let tile: Sprite = this.tile(g, TW, TH);
            tile.x = x0 + col * (TW + 20);
            tile.y = 6 + row * (TH + 14);
            this._content.addChild(tile);
            i++;
        }
        // the jackpot ticker (the Slots', shared by Korath's Fortune), and Moloch's Favor beside it
        let favor: any = st.favor && st.favor.enabled ? st.favor : null;
        let jw: int = favor ? 400 : 420;
        let jp: Sprite = CasinoUI.panel(jw, 40);
        jp.x = Number(favor ? 20 : (CasinoWindow.CW - 420) / 2);
        jp.y = 6 + 2 * TH + 14 + 16;
        let jl: TextField = CasinoUI.label("SLOTS JACKPOT", 11, CasinoUI.ASH, true, 200, TextFormatAlign.LEFT);
        jl.x = 16;
        jl.y = 12;
        jp.addChild(jl);
        let jv: TextField = CasinoUI.label(CasinoUI.number(Number(st.jackpot)) + " Shiny", 18, CasinoUI.GOLD, true, 200, TextFormatAlign.RIGHT);
        jv.name = "casinoLobbyJackpot";
        jv.x = jw - 216;
        jv.y = 8;
        jv.filters = [new GlowFilter(0xFF8A00, 0.8, 8, 8, 2, 2)];
        jp.addChild(jv);
        this._content.addChild(jp);
        this._favorLine = null;
        if (favor) {
            let ready: boolean = Boolean(favor.ready) && !st.closed && !st.shiny_locked;
            let fb: Sprite = CasinoUI.button(ready ? "FREE SPIN" : "MOLOCH'S FAVOR", 260, 40, (e: MouseEvent): void => {
                this.openGame("slots");
                if (this._game instanceof SlotsGame) {
                    (as3.as(this._game, SlotsGame)).playFavor();
                }
            }, ready, 15);
            fb.name = "casinoFavor";
            fb.x = 420;
            fb.y = jp.y;
            this._content.addChild(fb);
            // under it: what it is worth, or when the next one comes (midnight UTC)
            this._favorLine = CasinoUI.label("", 10, ready ? CasinoUI.GOLD : CasinoUI.ASH, true, 260, TextFormatAlign.CENTER);
            this._favorLine.x = 420;
            this._favorLine.y = jp.y + 42;
            this._favorLine.name = ready ? "ready" : "used";
            this._content.addChild(this._favorLine);
            if (ready) {
                this._favorLine.text = "Moloch's Favor: a free " + CasinoUI.number(favor.bet | 0) + " Shiny spin";
            }
        }
    }

    private tile(g: any, w: int, h: int): Sprite {
        let frame: Sprite = null;
        let t: MovieClip = new MovieClip();
        t.name = "casinoTile:" + g.id;
        let st: any = CASINO.state;
        let playable: boolean = Boolean(Boolean(g.unlocked) && st && !st.closed && !st.shiny_locked);
        frame = as3.as(t.addChild(CasinoUI.panel(w, h, 0.95)), Sprite);
        let art: Sprite = as3.as(t.addChild(new Sprite()), Sprite);
        CasinoUI.picture(art, "casino/lobby/tile_" + g.id + ".png", 4, 4, w - 8, h - 8);
        if (!g.unlocked) {
            // greyed and darkened
            art.filters = [new ColorMatrixFilter([0.2, 0.4, 0.1, 0, -10, 0.2, 0.4, 0.1, 0, -10, 0.2, 0.4, 0.1, 0, -10, 0, 0, 0, 1, 0])];
        }
        let name: TextField = CasinoUI.label(String(g.name), 13, 16777215, true, w, TextFormatAlign.CENTER);
        name.y = h - 40;
        name.filters = [new GlowFilter(0x000000, 1, 4, 4, 8, 2)];
        t.addChild(name);
        let status: string = !g.open ? "Coming soon" : (!g.unlocked ? "Pit level " + g.level : (g.id == "bonepile" && st && st.bonepile ? "Your game is open" : ""));
        let live: boolean = Boolean(g.unlocked && (g.id == "ascent" || g.id == "derby"));
        if (status || live) {
            let s: TextField = CasinoUI.label(status, 11, g.open ? CasinoUI.EMBER : CasinoUI.ASH, true, w, TextFormatAlign.CENTER);
            s.y = h - 22;
            s.filters = [new GlowFilter(0x000000, 1, 4, 4, 8, 2)];
            t.addChild(s);
            if (live) {
                // the round going on now, kept up to date in tick()
                s.name = "casinoLive:" + g.id;
                this._live[g.id] = s;
            }
        }
        if (playable) {
            t.buttonMode = true;
            t.mouseChildren = false;
            t.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                frame.filters = [new GlowFilter(0xFF8A2A, 1, 14, 14, 2, 2)];
            });
            t.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                frame.filters = [];
            });
            t.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                this.openGame(String(g.id));
            });
        }
        return t;
    }

    /** Opens a game in the window (the lobby comes back with its Lobby button). */
    public openGame(id: string): void {
        this.endGame();
        CasinoUI.removeAll(this._content);
        let k: int = 0;
        while (k < this._tabs.length) {
            CasinoUI.choose(as3.cast(this._tabs[k], Sprite), false);
            k++;
        }
        if (id == "magmadrop") {
            this._game = new MagmaDropGame(this);
        } else if (id == "scratch") {
            this._game = new ScratchersGame(this);
        } else if (id == "roulette") {
            this._game = new RouletteGame(this);
        } else if (id == "slots") {
            this._game = new SlotsGame(this);
        } else if (id == "bonepile") {
            this._game = new BonePileGame(this);
        } else if (id == "ascent") {
            this._game = new AscentGame(this);
        } else if (id == "derby") {
            this._game = new DerbyGame(this);
        } else if (id == "fortune") {
            this._game = new SlotsGame(this, "fortune");
        }
        if (this._game) {
            this._content.addChild(as3.as(this._game, Sprite));
        }
    }

    private endGame(): void {
        if (this._game) {
            this._game.dispose();
            this._game = null;
        }
    }

    /** Back to the lobby (a game's button). */
    public toLobby(e: MouseEvent = null): void {
        this.selectTab(0);
    }

    // ---- History
    private historyTab(): void {
        let p: Sprite = null;
        let t: TextField = null;
        p = as3.as(this._content.addChild(CasinoUI.panel(CasinoWindow.CW, (CasinoWindow.CH - 10) | 0)), Sprite);
        t = CasinoUI.label("Loading your last bets...", 12, CasinoUI.ASH, true, (CasinoWindow.CW - 40) | 0);
        t.x = 20;
        t.y = 14;
        p.addChild(t);
        CASINO.history((r: any): void => {
            if (!this.mc || !p.parent) {
                return;
            }
            if (r.error) {
                t.text = String(r.error);
                return;
            }
            let bets: any[] = as3.as(r.bets, Array);
            t.text = bets.length ? "Your last bets (every one can be checked against its seeds in Fairness)" : "No bets yet.";
            let cols: any[] = [["Game", 20, 170], ["Bet", 190, 80], ["Paid", 270, 90], ["x", 360, 70], ["Nonce", 430, 70], ["When", 500, 180]];
            let c: any[] = null;
            for (c of as3.values(cols)) {
                let hd: TextField = CasinoUI.label(as3.str(c[0]), 11, CasinoUI.EMBER, true, c[2] | 0);
                hd.x = Number(c[1]);
                hd.y = 40;
                p.addChild(hd);
            }
            let i: int = 0;
            while (i < Math.min(bets.length, 18)) {
                let b: any = bets[i];
                let won: boolean = (b.payout | 0) > (b.stake | 0);
                let vals: any[] = [LiveTab.gameName(String(b.game)), b.game == "favor" ? "FREE" : CasinoUI.number(b.stake | 0), CasinoUI.number(b.payout | 0), CasinoUI.mult(Number(b.multiplier)), b.nonce == null ? "-" : String(b.nonce), String(b.created_at).replace("T", " ").substr(0, 19)];
                let j: int = 0;
                while (j < cols.length) {
                    let v: TextField = CasinoUI.label(as3.str(vals[j]), 11, (j == 2 ? (won ? CasinoUI.WIN : ((b.payout | 0) > 0 ? CasinoUI.GOLD : CasinoUI.ASH)) : 0xE8DCC8) >>> 0, false, cols[j][2] | 0);
                    v.x = Number(cols[j][1]);
                    v.y = 60 + i * 19;
                    p.addChild(v);
                    j++;
                }
                i++;
            }
        });
    }

    // ---- Fairness
    private fairnessTab(): void {
        let p: Sprite = null;
        let y: int = 0;
        let client: TextField = null;
        let revealed: TextField = null;
        let btn: Sprite = null;
        p = as3.as(this._content.addChild(CasinoUI.panel(CasinoWindow.CW, (CasinoWindow.CH - 10) | 0)), Sprite);
        let st: any = CASINO.state;
        y = 12;
        let put: Function = (text: string, size: int, color: uint, bold: boolean, h: int = 0): TextField => {
            let f: TextField = CasinoUI.label(text, size, color, bold, (CasinoWindow.CW - 40) | 0);
            f.x = 20;
            f.y = y;
            f.multiline = true;
            f.wordWrap = true;
            f.height = Number(h > 0 ? h : size + 10);
            p.addChild(f);
            y = (y + ((h > 0 ? h : size + 10) + 2)) | 0;
            return f;
        };
        put("Every result is drawn from your seeds, before you see it, and can be checked.", 13, CasinoUI.GOLD, true);
        put("A bet's numbers are HMAC-SHA256(server seed, \"client seed:nonce:block\"), four bytes to a number between 0 and 1. The server seed stays secret while it is in use: you see its SHA-256 hash first. Change seeds to see it, then recompute any past bet from the server seed, your client seed and the bet's nonce. A win with part of a Shiny (1.5x on 1) pays one more Shiny with that part's chance, decided by the bet's next number.", 11, 0xE8DCC8, false, 60);
        y += 4;
        if (!st || !st.seed) {
            put("Loading...", 11, CasinoUI.ASH, false);
            return;
        }
        put("Server seed (hash)", 11, CasinoUI.EMBER, true);
        let hash: TextField = as3.cast(put(String(st.seed.server_seed_hash), 11, 0xFFFFFF, false), TextField);
        hash.selectable = true;
        hash.mouseEnabled = true;
        put("Client seed (yours to choose: letters, digits, - and _)", 11, CasinoUI.EMBER, true);
        client = CasinoUI.input(300, 24, String(st.seed.client_seed), 32, "A-Za-z0-9_\\-");
        client.x = 20;
        client.y = y;
        p.addChild(client);
        let nonce: TextField = CasinoUI.label("Bets on these seeds: " + st.seed.nonce, 11, CasinoUI.ASH, true, 220);
        nonce.x = 340;
        nonce.y = y + 4;
        p.addChild(nonce);
        y += 34;
        revealed = null;
        btn = CasinoUI.button("CHANGE SEEDS", 180, 32, (e: MouseEvent): void => {
            CasinoUI.enable(btn, false);
            CASINO.rotateSeed(client.text, (r: any): void => {
                if (!this.mc) {
                    return;
                }
                if (r.error) {
                    this.message(String(r.error), CasinoUI.LOSS);
                    CasinoUI.enable(btn, true);
                    return;
                }
                this.message("New seeds. The old server seed is shown below.", CasinoUI.GOLD);
                this.selectTab(3);
            });
        });
        btn.x = 20;
        btn.y = y;
        p.addChild(btn);
        y += 44;
        put("Seeds you have changed (their server seeds, now shown)", 11, CasinoUI.EMBER, true);
        revealed = as3.cast(put("...", 10, 0xE8DCC8, false, 150), TextField);
        revealed.selectable = true;
        revealed.mouseEnabled = true;
        CASINO.history((r: any): void => {
            if (!this.mc || !revealed.parent || r.error) {
                return;
            }
            let list: any[] = as3.as(r.revealed_seeds, Array);
            let lines: any[] = [];
            let s: any = null;
            for (s of as3.values(list)) {
                lines.push("server " + s.server_seed + "\n   hash " + s.server_seed_hash + "  client " + s.client_seed + "  bets " + s.nonces);
            }
            revealed.text = lines.length ? lines.slice(0, 4).join("\n") : "None yet.";
        });
    }

    // ---- shared
    /** A line at the bottom of the window (results, refusals). */
    public message(text: string, color: uint = 16777215): void {
        if (!this.mc) {
            return;
        }
        this._toast.text = text;
        this._toast.textColor = color;
        this._toastT = (text ? 40 * 5 : 0) | 0;
        this._toast.alpha = 1;
    }

    private tick(e: Event): void {
        this._shiny.text = CasinoUI.number(CASINO.credits());
        this._level.text = CASINO.state ? ((CASINO.state.level | 0) > 0 ? "Pit level " + CASINO.state.level : "") : "";
        if (this._toastT > 0) {
            --this._toastT;
            if (this._toastT < 30) {
                this._toast.alpha = this._toastT / 30;
            }
        }
        if (this._game) {
            this._game.tick();
        } else {
            this.liveLines();
            this.favorCountdown();
        }
        this.embers();
        this.bigWinTick();
    }

    /** The lobby's "Next Favor in 5:12:03" (the server's clock: the day turns at midnight UTC). */
    private favorCountdown(): void {
        let f: TextField = this._favorLine;
        if (!f || !f.parent || f.name != "used") {
            return;
        }
        let st: any = CASINO.state;
        let now: number = new Date().getTime() + Number(st && st.live_offset ? st.live_offset : 0);
        let left: int = Math.ceil((86400000 - now % 86400000) / 1000) | 0;
        if (left >= 86399) {
            // a new day: ask again (the button turns into today's spin)
            f.name = "asked";
            CASINO.getState((r: any): void => {
                if (this.mc && !this._game && !r.error) {
                    this.selectTab(0);
                }
            });
            return;
        }
        let h: int = (left / 3600) | 0;
        let m: int = (((left / 60) | 0) % 60) | 0;
        let sec: int = (left % 60) | 0;
        f.text = "Next free spin in " + h + ":" + (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
    }

    /**
     * A big win (BIG_WIN times the bet or more) told across the window: BIG, MEGA (50x) or EPIC (200x)
     * WIN, the Shiny counting up, gems bursting.
     * The games call it as their result is shown (the Slots' jackpot has its own). Clicks go through it;
     * the first one anywhere in the window shows the whole amount and fades it out.
     */
    public bigWin(payout: int, bet: int): boolean {
        if (!this.mc || bet <= 0 || payout < bet * CasinoWindow.BIG_WIN) {
            return false;
        }
        let x: number = payout / bet;
        let word: string = x >= 200 ? "EPIC WIN!" : (x >= 50 ? "MEGA WIN!" : "BIG WIN!");
        let col: uint = (x >= 200 ? 0xFF4AD0 : (x >= 50 ? 0x6AE0FF : 0xFFD040)) >>> 0;
        CasinoUI.removeAll(this._big);
        this._big.graphics.clear();
        this._big.graphics.beginFill(0, 0.45);
        this._big.graphics.drawRoundRect(-CasinoWindow.W / 2 + 6, -CasinoWindow.H / 2 + 6, CasinoWindow.W - 12, CasinoWindow.H - 12, 18, 18);
        this._big.graphics.endFill();
        // rays behind the words
        let rays: Shape = as3.as(this._big.addChild(new Shape()), Shape);
        rays.name = "rays";
        let k: int = 0;
        while (k < 16) {
            let a: number = k * Math.PI / 8;
            rays.graphics.beginFill(col, 0.18);
            rays.graphics.moveTo(0, 0);
            rays.graphics.lineTo(Math.cos(a - 0.09) * 320, Math.sin(a - 0.09) * 320);
            rays.graphics.lineTo(Math.cos(a + 0.09) * 320, Math.sin(a + 0.09) * 320);
            rays.graphics.endFill();
            k++;
        }
        rays.y = -10;
        let words: Sprite = as3.as(this._big.addChild(new Sprite()), Sprite);
        words.name = "words";
        words.y = -10;
        let t: TextField = CasinoUI.title(word, 54, 600);
        t.x = -300;
        t.y = -70;
        t.filters = [new GlowFilter(col, 1, 18, 18, 3, 2), new GlowFilter(0x3A0A04, 1, 4, 4, 8, 2)];
        words.addChild(t);
        this._bigText = CasinoUI.label("+0 SHINY", 30, 16777215, true, 600, TextFormatAlign.CENTER);
        this._bigText.x = -300;
        this._bigText.y = 6;
        this._bigText.filters = [new GlowFilter(0x000000, 1, 6, 6, 6, 2)];
        words.addChild(this._bigText);
        words.addChild(CasinoUI.at(CasinoUI.label(CasinoUI.mult(Math.floor(x * 100) / 100) + " YOUR BET", 13, col, true, 600, TextFormatAlign.CENTER), -300, 48));
        this._bigAmount = payout;
        this._bigT = 230;
        this._big.visible = true;
        this._big.alpha = 1;
        SOUNDS.Play("chaching");
        SOUNDS.Play("iquestshow");
        return true;
    }

    private bigWinTick(): void {
        if (this._bigT <= 0) {
            let g0: int = (this._bigGems.length - 1) | 0;
            while (g0 >= 0) {
                this._big.removeChild(as3.cast(this._bigGems[g0].s, DisplayObject));
                g0--;
            }
            this._bigGems = [];
            this._big.visible = false;
            return;
        }
        this._bigT--;
        let age: int = (230 - this._bigT) | 0;
        // counts up over its first 2 seconds
        let shown: int = age >= 80 ? this._bigAmount : (this._bigAmount * (1 - Math.pow(1 - age / 80, 3))) | 0;
        this._bigText.text = "+" + CasinoUI.number(shown) + " SHINY";
        let words: Sprite = as3.as(this._big.getChildByName("words"), Sprite);
        let rays: Shape = as3.as(this._big.getChildByName("rays"), Shape);
        if (words) {
            let pop: number = age < 12 ? 0.4 + 0.75 * age / 12 : 1.15 - 0.15 * Math.min(1, (age - 12) / 10);
            words.scaleX = words.scaleY = pop + 0.03 * Math.sin(age / 4);
        }
        if (rays) {
            rays.rotation += 0.8;
        }
        if (age < 90 && age % 2 == 0) {
            let s: Shape = as3.as(this._big.addChild(new Shape()), Shape);
            s.graphics.lineStyle(1, 16777215, 0.9);
            s.graphics.beginFill(8052991, 1);
            s.graphics.moveTo(0, -7);
            s.graphics.lineTo(6, -2);
            s.graphics.lineTo(0, 8);
            s.graphics.lineTo(-6, -2);
            s.graphics.lineTo(0, -7);
            s.graphics.endFill();
            let ang: number = Math.random() * Math.PI * 2;
            let sp: number = 3 + Math.random() * 5;
            this._bigGems.push({ "s": s, "vx": Math.cos(ang) * sp, "vy": Math.sin(ang) * sp - 2, "vr": (Math.random() - 0.5) * 14 });
        }
        let i: int = (this._bigGems.length - 1) | 0;
        while (i >= 0) {
            let d: any = this._bigGems[i];
            d.s.x += d.vx;
            d.s.y += d.vy;
            d.vy += 0.18;
            d.s.rotation += d.vr;
            if (d.s.y > CasinoWindow.H / 2) {
                this._big.removeChild(as3.cast(d.s, DisplayObject));
                this._bigGems.splice(i, 1);
            }
            i--;
        }
        this._big.alpha = Number(this._bigT > 25 ? 1 : this._bigT / 25);
    }

    /** "Flying: 2.41x", "Next race in 3:12": the shared games' rounds, from casino/state's clock. */
    private liveLines(): void {
        let st: any = CASINO.state;
        if (!st || !st.live) {
            return;
        }
        // the rounds move on: asked again every few seconds while the lobby is open
        if (++this._liveT >= 160) {
            this._liveT = 0;
            let any: boolean = false;
            for (let k in this._live) {
                any = true;
            }
            if (any) {
                CASINO.getState((r: any): void => {
                });
            }
        }
        let now: number = new Date().getTime() + Number(st.live_offset || 0);
        let id: string = null;
        for (id in this._live) {
            let f: TextField = as3.cast(this._live[id], TextField);
            if (!f.parent) {
                continue;
            }
            let r: any = st.live[id];
            if (!r) {
                f.text = "";
                continue;
            }
            let left: int = Math.max(0, Math.ceil((Number(r.starts_at) - now) / 1000)) | 0;
            if (id == "ascent") {
                f.text = r.phase == "running" && now >= Number(r.starts_at) ? "Flying: " + (Math.floor(100 * Math.exp(0.00006 * (now - Number(r.starts_at)))) / 100).toFixed(2) + "x" : (r.phase == "betting" && left > 0 ? "Taking off in " + left + "s" : "Next flight soon");
            } else {
                f.text = r.phase == "running" ? "Racing now!" : (r.phase == "betting" && left > 0 ? "Next race in " + ((left / 60) | 0) + ":" + (left % 60 < 10 ? "0" : "") + (left % 60) : "Next race soon");
            }
        }
    }

    /** Embers rising through the window. */
    private embers(): void {
        if (this._embers.length < 26 && Math.random() < 0.3) {
            let s: Shape = as3.as(this._emberLayer.addChild(new Shape()), Shape);
            let colors: any[] = [0xFFB040, 0xFF6A1A, 0xFFE08A, 0xFF4A10];
            s.graphics.beginFill(colors[(Math.random() * colors.length) | 0] >>> 0, 1);
            s.graphics.drawCircle(0, 0, 0.8 + Math.random() * 1.6);
            s.graphics.endFill();
            s.x = -CasinoWindow.W / 2 + 10 + Math.random() * (CasinoWindow.W - 20);
            s.y = CasinoWindow.H / 2 - 10;
            this._embers.push({ "s": s, "vy": 0.4 + Math.random() * 0.9, "sway": Math.random() * 6.28, "life": 0 });
        }
        let i: int = (this._embers.length - 1) | 0;
        while (i >= 0) {
            let em: any = this._embers[i];
            em.life++;
            em.s.y -= em.vy;
            em.s.x += Math.sin(Number(em.sway + em.life * 0.05)) * 0.4;
            em.s.alpha = Math.max(0, 1 - em.life / 260);
            if (em.life > 260 || em.s.y < -CasinoWindow.H / 2 + 10) {
                this._emberLayer.removeChild(as3.cast(em.s, DisplayObject));
                this._embers.splice(i, 1);
            }
            i--;
        }
    }

    public close(e: MouseEvent = null): void {
        if (!this.mc) {
            return;
        }
        SOUNDS.Play("close");
        this.endGame();
        this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        GLOBAL.BlockerRemove();
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        this.mc = null;
        this._embers = [];
        if (CasinoWindow._open == this) {
            CasinoWindow._open = null;
        }
        // (bets answered while it was open: the Shiny as the server has it)
        CASINO.getState((r: any): void => {
        });
    }
}

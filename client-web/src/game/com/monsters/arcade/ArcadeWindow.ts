import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObjectContainer, GradientType, MovieClip, Shape, Sprite, Stage } from "flash/display";
import { Event, KeyboardEvent, MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer, setTimeout, Timer } from "flash/utils";
import { IoPinchZoom, ARCADE, KEYS, ArcadeArt, ArcadeGame, ArcadeNet, BASE, BoneBrawlGame, BreakoutGame, CasinoUI, FlightGame, FusebugGame, GLOBAL, GolfGame, HockeyGame, IoChatLift, IoKit, IoSiege, IoTd, IoTd2, IoTdLink, LavaFloorGame, LOGIN, POPUPSETTINGS, RunnerGame, SmashGame, SoulSnatchGame, SOUNDS, StackGame, SwarmGame, WMATTACK, WormzerGame } from "@game";

/**
 * Inferno-only: the Devil's Arcade's window (from the building's info panel: DEVILSARCADE). The lobby: fifteen
 * cabinets on two pages (PAGES: the first seven and Hellgate Defense 2 (10 October), then the eight added on 7 October, marked NEW). A cabinet's page:
 * how to play, its ways to play (Solo, Versus, ...), and its leaderboards. Then
 * the game itself, in the window (com/monsters/arcade/games), or, for Hellgate Defense and Siege, in a yard of
 * their own (the window closes).
 *
 * Live games wait for a match here ("Looking for a rival..."; a bot or a ghost is offered after a while
 * where the game has one), through the arcade's socket (ArcadeNet). Scores of solo runs are sent when the game
 * is over (ARCADE.submit); live results are kept by the server.
 *
 * Inferno-only (QoL #373, 15 October): "Wait in the background" while waiting for a match: the window goes (taken off
 * the screen, its socket and queue kept) and a chip (ioArc3QueueChip: the game, the time waited, a ✕ to leave the
 * queue) stays in the top bar (UI_TOP places it with ioChipIn; until then at the top of the screen). The match found,
 * the window comes back and starts it, when the player is in their own yard; when not (the map, an attack, a yard
 * loading), the queue is left and the chip says so. A click on the chip brings the window back.
 */
export class ArcadeWindow extends ASObject {
    static {
        as3.fields(this, { mc: null, _content: null, _surround: null, _toast: null, _toastT: 0, _game: null, _gameId: null, _modeId: null, _run: null, _last: 0, _waiting: null, _waitLine: null, _botButton: null, _title: null, _busy: false, _boardMode: null, _boardPanel: null, _lights: null, _glows: null, _lobbyLayers: null, _stage: null, _lightT: 0, _lobbyPage: 0, _nav: 0, _ioPaused: false, _ioPauseBox: null, _ioSound: null, _ioRankBefore: -1, _ioRankKey: null, _ioPlayers: null, _ioBackground: false, _ioBgButton: null });
    }

    public static readonly W: int = 760;

    public static readonly H: int = 540;

    /** The area pages and games draw in (from the window's centre). */
    public static readonly GX: int = -360;

    public static readonly GY: int = -198;

    private static _open: ArcadeWindow = null;

    /**
     * The games' order in the lobby, and what each says. `score` and `score2` name the leaderboard's columns
     * (score2 null: runs played); games ranked by wins show Wins and Played. The lobby shows them a page at a
     * time (PAGES): the first seven and Hellgate Defense 2, then the eight added on 7 October (the user's picks), marked NEW.
     */
    public static readonly GAMES: any[] = [{ "id": "hellgate", "name": "Hellgate Defense", "modes": [["solo", "SOLO"], ["versus", "VERSUS"], ["coop", "CO-OP"]], "touch": "Tap.", "keys": "Mouse", "score": "Waves", "text": "Wall a maze with the Yard Planner, buy towers and upgrade them, and hold the Under Hall against endless waves.<br><br><b>Solo:</b> how many waves can you survive?<br><b>Versus:</b> two arenas, waves in step. Spend gold to send monsters at your rival. Last Hall standing wins.<br><b>Co-op:</b> whatever gets through your maze runs on into your partner's. 20 lives, shared." }, { "id": "hellgate2", "name": "Hellgate Defense 2", "modes": [["solo", "CAMPAIGN"], ["daily", "DAILY"]], "touch": "Tap. Spells: the buttons over the shop.", "keys": "Mouse. Keys 1-4: spells.", "score": "Points", "score2": "Waves", "isNew": true, "text": "Twice the Hellgate: <b>4 maps</b>, <b>12 towers</b> with a fourth <b>Special</b> upgrade each, <b>spells</b>, <b>elite monsters</b>, bosses with powers and <b>the Hellgate Warden</b> at wave 40.<br><br><b>Campaign:</b> win each map on four difficulties; embers buy Hellforge perks.<br><b>Daily:</b> today's map and two modifiers, the same for everyone." }, { "id": "siege", "name": "Siege", "modes": [["daily", "DAILY"], ["duel", "DUEL"]], "touch": "Tap.", "keys": "Mouse", "score": "Wrecked", "score2": "Time", "text": "One yard, one army, the same for everyone. Fling the monsters and wreck as much as you can, as fast as you can. Your own monsters stay home: nothing is lost.<br><br><b>Daily:</b> a new yard every day, 3 tries, your best counts.<br><b>Duel:</b> challenge a player to the same yard and army. The better attack wins." }, { "id": "wormzer", "name": "Wormzer", "modes": [["solo", "SOLO"], ["live", "LIVE"]], "touch": "Stick, or a finger on the arena: steer. BOOST: burrow faster.", "keys": "Mouse: steer. Hold the button: burrow faster.", "score": "Length", "score2": "Kills", "text": "Steer your King Wormzer round the lava arena and eat embers to grow. Run into another Wormzer's body and you fall apart; make them run into yours.<br><br><b>Solo:</b> you and seven bots.<br><b>Live:</b> one arena for everyone online (bots fill the gaps)." }, { "id": "fusebug", "name": "Fusebug Blast", "modes": [["solo", "SOLO"], ["live", "LIVE"]], "touch": "Stick: move. BOMB: drop a Fusebug.", "keys": "Arrows or WASD: move. Space: drop a Fusebug.", "text": "Drop Fusebugs, blow the bone crates apart for power-ups (more Fusebugs, bigger blasts, faster feet) and blast your rivals. Last one standing wins; after two minutes the lava closes in.<br><br><b>Solo:</b> against three bots.<br><b>Live:</b> two to four players (bots fill the corners)." }, { "id": "flight", "name": "Balthazar's Flight", "modes": [["solo", "SOLO"], ["race", "RACE"]], "touch": "Tap: flap.", "keys": "Click, Space or Up: flap.", "text": "Flap Balthazar through the fire vents and rock spires as far as you can. Grab embers on the way.<br><br><b>Solo:</b> race the ghosts of the best flights.<br><b>Race:</b> fly the same course as another player, at the same time." }, { "id": "smash", "name": "Spurtz Smash", "modes": [["solo", "SOLO"], ["versus", "VERSUS"]], "touch": "Tap: smash.", "keys": "Mouse: smash. Keys 1-9 work too.", "text": "Sixty seconds. Smash the Spurtz as they pop out of the lava. Chains of hits multiply your score; golden Spurtz are worth five times more. Don't smash the Fusebugs!<br><br><b>Versus:</b> the same Spurtz for both of you; a golden one throws a Fusebug onto your rival's board." }, { "id": "breakout", "name": "Magma Breakout", "modes": [["solo", "SOLO"], ["versus", "VERSUS"]], "touch": "Drag: move. Tap: launch.", "keys": "Mouse or arrows: move. Click or Space: launch.", "text": "Bounce the Spurtz off your obsidian paddle and break the wall, level after level. Catch what falls: a wider paddle, more balls, a fireball. Three lives.<br><br><b>Versus:</b> magma bricks you break push a new row down onto your rival's wall." }, { "id": "lavafloor", "name": "Lava Floor", "modes": [["solo", "SOLO"], ["live", "LIVE"]], "touch": "Stick: move. SHOVE: shove.", "keys": "Arrows or WASD: move. Space: shove.", "isNew": true, "text": "The floor is crumbling into the lava: every tile you step on cracks and falls a moment later. Shove the others off, keep your feet, and be the last monster standing.<br><br><b>Solo:</b> against five bots.<br><b>Live:</b> two to six players (bots fill the gaps)." }, { "id": "bonebrawl", "name": "Bone Brawl", "modes": [["solo", "SOLO"], ["live", "LIVE"]], "touch": "Stick: move. THROW: at the nearest. Or tap where to throw.", "keys": "Arrows or WASD: move. Mouse: aim. Click: throw a bone.", "isNew": true, "text": "Grab the bones lying about and throw them at the others. Three hits and you're out; every 30 seconds the lava closes in. Last one standing wins.<br><br><b>Solo:</b> against five bots.<br><b>Live:</b> two to six players (bots fill the gaps)." }, { "id": "hockey", "name": "Ember Hockey", "modes": [["solo", "SOLO"], ["versus", "1 V 1"], ["team", "2 V 2"]], "touch": "Stick: skate. SHOOT: shoot.", "keys": "Arrows or WASD: skate. Space: shoot.", "isNew": true, "text": "Knock the fireball into the other goal. First to 5 goals wins, or the most after three minutes.<br><br><b>Solo:</b> against a bot.<br><b>1 v 1:</b> against another player.<br><b>2 v 2:</b> teams of two (bots fill in)." }, { "id": "soulsnatch", "name": "Soul Snatch", "modes": [["solo", "SOLO"], ["live", "LIVE"]], "touch": "Stick: run. DASH: dash.", "keys": "Arrows or WASD: run. Space: dash.", "isNew": true, "text": "Two teams, two souls. Steal the other team's soul from their base and carry it home while yours is safe. Touch a raider on your side to send them back. First to 3 captures wins.<br><br><b>Solo:</b> you and a bot against two bots.<br><b>Live:</b> teams of up to three (bots fill in)." }, { "id": "stack", "name": "Magma Stack", "modes": [["solo", "SOLO"], ["versus", "VERSUS"]], "touch": "LEFT / RIGHT: move. TURN. DOWN: faster. DROP. HOLD.", "keys": "Left / Right: move. Up: turn. Down: faster. Space: drop. C: hold.", "score2": "Rows", "isNew": true, "text": "Stack the falling blocks of bone, coal, sulfur and magma. Fill a row to clear it: the more rows at once, the more points. They fall faster as you go.<br><br><b>Versus:</b> rows you clear push junk up into your rival's pit. Top out and you lose." }, { "id": "swarm", "name": "Spurtz Swarm", "modes": [["solo", "SOLO"], ["versus", "VERSUS"]], "touch": "Drag: fly. A finger down: fire.", "keys": "Mouse or arrows: fly. Hold the button or Space: fire.", "score2": "Wave", "isNew": true, "text": "Balthazar against the swarm. Wave after wave of Spurtz, Zagnoids and Valgos dive at you. Grab the power-ups and keep your three lives.<br><br><b>Versus:</b> the same waves for both of you; shoot a golden Spurtz to send a swarm at your rival. The higher score wins." }, { "id": "runner", "name": "Rezghul Runner", "modes": [["solo", "SOLO"], ["race", "RACE"]], "touch": "Tap left or right of Rezghul: change lane. Above him: jump. Below: slide.", "keys": "Left / Right: change lane. Up or Space: jump. Down: slide.", "score2": "Metres", "isNew": true, "text": "Rezghul runs the endless road through the Inferno. Jump the rocks, slide under the fire bars, dodge the pillars and grab the embers. It only gets faster.<br><br><b>Race:</b> the same road as another player, at the same time. The better run wins." }, { "id": "golf", "name": "Valgos Golf", "modes": [["daily", "DAILY"], ["versus", "VERSUS"]], "touch": "Drag back from Valgos and let go to putt.", "keys": "Drag back from Valgos and let go to putt.", "score": "Strokes", "score2": "Aces", "isNew": true, "text": "Nine holes through the Inferno: bumpers, lava pools, spinning blades. Fewest strokes wins.<br><br><b>Daily:</b> the same nine holes for everyone today; your best round counts.<br><b>Versus:</b> play a course at the same time as another player." }];

    /** The lobby's pages: which games each shows. */
    public static readonly PAGES: any[] = [[0, 8], [8, 16]];

    /** Modes ranked by wins rather than score. */
    public static readonly WINS: any = { "fusebug:solo": true, "fusebug:live": true, "smash:versus": true, "breakout:versus": true, "flight:race": true, "hellgate:versus": true, "siege:duel": true, "lavafloor:solo": true, "lavafloor:live": true, "bonebrawl:solo": true, "bonebrawl:live": true, "hockey:solo": true, "hockey:versus": true, "hockey:team": true, "soulsnatch:solo": true, "soulsnatch:live": true, "stack:versus": true, "swarm:versus": true, "runner:race": true, "golf:versus": true };

    /** Games run on the server (waited for through the socket, even alone). */
    public static readonly LIVE: any = { "wormzer": true, "fusebug": true, "lavafloor": true, "bonebrawl": true, "hockey": true, "soulsnatch": true };
    public mc: MovieClip;
    private _content: Sprite;
    private _surround: Shape;
    private _toast: TextField;
    private _toastT: int;
    private _game: ArcadeGame;
    private _gameId: string;
    private _modeId: string;
    private _run: any;
    private _last: int;
    private _waiting: Sprite;
    private _waitLine: TextField;
    private _botButton: Sprite;
    private _title: TextField;
    private _busy: boolean;
    private _boardMode: string;
    private _boardPanel: Sprite;
    private _lights: any[];
    /** The bulbs' glows (one each, shown when the bulb is on: no filter rebuilt as they chase). */
    private _glows: any[];
    /** The lobby's own layers under the content (the hall's picture, the band under the title, the window's
     * inside): hidden while a game is played, as the game covers them (they were drawn again under it every
     * frame). */
    private _lobbyLayers: any[];
    private _stage: Stage;
    private _lightT: int;
    /** The lobby's page shown (kept while the window is open). */
    private _lobbyPage: int;

    /** (Inferno-only, QoL #374) the lobby's page last shown */
    private static _ioLastPage: int = 0;
    /** Counts page changes: an answer that comes after the player moved on is not acted on (9 October). */
    private _nav: int;
    /** Inferno-only (QoL #394): the sound switch, left of the close button. */
    private _ioSound: Sprite;
    /** Inferno-only (QoL #371): the player's place on the live game's board as its match began (-1: not known), and
     * which game and mode that was ("wormzer:live"). */
    private _ioRankBefore: int;
    private _ioRankKey: string;
    /** Inferno-only (QoL #367): the live match's players (its "start"), for the rival's name when they drop and come back. */
    private _ioPlayers: any[];
    /** Inferno-only (QoL #373): waiting for a match with the window off the screen, and the waiting panel's button for it. */
    private _ioBackground: boolean;
    private _ioBgButton: Sprite;

    public $ctor(): void {
        this._lights = [];
        this._glows = [];
        this._lobbyLayers = [];
        super.$ctor();
        this.mc = new MovieClip();
        this.mc.name = "arcadeWindow";
        this.drawFrame();
        this._title = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("io_t3a_title"), 30, (ArcadeWindow.W - 200) | 0)), TextField);
        this._title.x = -ArcadeWindow.W / 2 + 100;
        this._title.y = -ArcadeWindow.H / 2 + 14;
        this._title.filters = [new GlowFilter(0xFF2A6A, 1, 10, 10, 3, 2), new GlowFilter(0x6A1404, 1, 4, 4, 6, 2)];
        this._content = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._content.x = ArcadeWindow.GX;
        this._content.y = ArcadeWindow.GY;
        this._toast = as3.as(this.mc.addChild(CasinoUI.label("", 13, 16777215, true, (ArcadeWindow.W - 100) | 0, TextFormatAlign.CENTER)), TextField);
        this._toast.name = "arcadeToast";
        this._toast.x = -ArcadeWindow.W / 2 + 50;
        this._toast.y = ArcadeWindow.H / 2 - 36;
        this._toast.filters = [new GlowFilter(0x3A0A04, 1, 4, 4, 8, 2)];
        // (the kit's close button, 11 October)
        let x: Sprite = as3.as(this.mc.addChild(IoKit.closeButton("arcadeClose", 14, (e: any): void => {})), Sprite);
        x.x = ArcadeWindow.W / 2 - 22;
        x.y = -ArcadeWindow.H / 2 + 22;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));
        // (QoL #394: the sound switch left of the close button, right of the title's 560 px, under the marquee's bulbs)
        if (GLOBAL.INFERNO_ONLY) {
            this._ioSound = CasinoUI.ioSoundToggle("ioArcadeSound");
            this._ioSound.x = ArcadeWindow.W / 2 - 80;
            this._ioSound.y = -ArcadeWindow.H / 2 + 14;
            this.mc.addChild(this._ioSound);
        }
        this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.frame));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        POPUPSETTINGS.ScaleUp(this.mc);
        // (the chat stays usable over the window)
        IoChatLift.lift();
        this._stage = this.mc.stage;
        if (this._stage) {
            this._stage.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onKeyDown));
            this._stage.addEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.onKeyUp));
            this._stage.addEventListener(Event.DEACTIVATE, as3.bind(this, this.onDeactivate));
        }
        ArcadeArt.preload(["arcade/lobby/lobby_bg.jpg", "spurtz", "fusebug", "balthazar", "wormzer"]);
        this._last = getTimer();
        this.message(KEYS.Get("io_t3a_lights"), CasinoUI.ASH);
        ARCADE.status((r: any): void => {
            if (!this.mc) {
                return;
            }
            this.message(r.error ? String(r.error) : "", (r.error ? CasinoUI.LOSS : 0) >>> 0);
            if (!this._game && !this._waiting && !this._gameId) {
                this.lobby();
            }
        });
    }

    /** A mode played alone for a score the game sends (ARCADE.start, ARCADE.submit). */
    public static soloRun(id: string, mode: string): boolean {
        return !ArcadeWindow.LIVE[id] && (mode == "solo" || (id == "golf" && mode == "daily"));
    }

    public static Show(): void {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            GLOBAL.Message(KEYS.Get("io_t3a_own_yard"));
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            GLOBAL.Message(KEYS.Get("io_t3a_attacked"));
            return;
        }
        // (QoL #373: waiting in the background: the window comes back as it was)
        if (ArcadeWindow._open && ArcadeWindow._open._ioBackground) {
            ArcadeWindow._open.ioFromBackground();
            return;
        }
        if (ArcadeWindow._open) {
            ArcadeWindow._open.close();
        }
        ArcadeWindow._open = new ArcadeWindow();
    }

    /** (18 October) The game being played, for the Watch menu (IoWatch): {title, mode, mc}, or null. */
    public static ioLiveInfo(): any {
        let w: ArcadeWindow = ArcadeWindow._open;
        if (!w || w._ioBackground || !w._game || w._game.ended || !w._gameId || w._gameId == "siege" || w._gameId == "hellgate" || w._gameId == "hellgate2" || !w.mc || !w.mc.stage) {
            return null;
        }
        let name: string = w._gameId;
        let mode: string = w._modeId || "";
        for (let g of as3.values(ArcadeWindow.GAMES)) {
            if (g.id == w._gameId) {
                name = String(g.name);
                for (let m of as3.values(as3.as(g.modes, Array) || [])) {
                    if (m[0] == w._modeId) {
                        mode = String(m[1]);
                    }
                }
            }
        }
        return { "title": name, "mode": mode, "mc": w.mc };
    }

    public static get isOpen(): boolean {
        // (QoL #373: not while waiting in the background: the window isn't there and the yard is played as usual)
        return ArcadeWindow._open != null && !ArcadeWindow._open._ioBackground;
    }

    /** Opens the window on Siege's Daily or Duels (back from a Siege attack: IoSiege.AfterHome). */
    public static ShowSiege(mode: string): void {
        ArcadeWindow.Show();
        if (ArcadeWindow._open) {
            ArcadeWindow._open.siegeView(mode);
        }
    }

    /** Siege's Daily or Duels page (com/monsters/arcade/siege/IoSiege draws it). */
    public siegeView(mode: string): void {
        this.leaveLive();
        this.clear();
        this._gameId = "siege";
        this._modeId = mode;
        this._title.text = KEYS.Get(mode == "daily" ? "io_t3a_siege_daily_title" : "io_t3a_siege_duels_title");
        IoSiege.Draw(this, this._content, mode);
    }

    /** Opens the window at a game's page (back from Hellgate or Siege). */
    public static ShowGame(id: string): void {
        ArcadeWindow.Show();
        if (ArcadeWindow._open) {
            ArcadeWindow._open.page(id);
        }
    }

    /** The lobby page a game is on. */
    public static pageOf(id: string): int {
        let i: int = 0;
        while (i < ArcadeWindow.GAMES.length) {
            if (ArcadeWindow.GAMES[i].id == id) {
                let p: int = 0;
                while (p < ArcadeWindow.PAGES.length) {
                    if (i >= (ArcadeWindow.PAGES[p][0] | 0) && i < (ArcadeWindow.PAGES[p][1] | 0)) {
                        return p;
                    }
                    p++;
                }
            }
            i++;
        }
        return 0;
    }

    public static gameInfo(id: string): any {
        for (let g of as3.values(ArcadeWindow.GAMES)) {
            if (g.id == id) {
                return g;
            }
        }
        return null;
    }

    /**
     * Inferno-only (QoL #235): a game's texts (GAMES: text, touch, keys, score, score2) in the player's language
     * (io_t3a_g_<id>_<field>); the English here when the language file hasn't the key. (GAMES stays English: it is
     * set when the class loads, before the language file is.)
     */
    public static ioGameText(g: any, field: string): string {
        let key: string = "io_t3a_g_" + String(g.id) + "_" + field;
        let s: string = KEYS.Get(key);
        return s == key ? String(g[field]) : s;
    }

    /** Inferno-only (QoL #235): a mode's label ("SOLO", "1 V 1") in the player's language (io_t3a_mode_solo, io_t3a_mode_1v1). */
    public static ioModeLabel(label: string): string {
        let key: string = "io_t3a_mode_" + String(label).toLowerCase().replace(/[^a-z0-9]/g, "");
        let s: string = KEYS.Get(key);
        return s == key ? String(label) : s;
    }

    /** Inferno-only (QoL #235): a button's (or a toggle's) label drawn smaller when its translation is wider than it. */
    public static ioFitButton(b: Sprite, smallest: int = 9): Sprite {
        let t: TextField = b && b.numChildren ? as3.as(b.getChildAt(0), TextField) : null;
        if (t) {
            GLOBAL.ioFitText(t, smallest);
        }
        return b;
    }

    /**
     * Inferno-only (QoL #372): the arcade's "looking for a rival" lines in Global chat (server services/arcade/hub.ts
     * maybeAnnounce): what each names, and the game and mode it waits in.
     */
    public static readonly IO_ANNOUNCED: any[] = [["looking for a Hellgate Defense Versus rival", "hellgate", "versus"], ["looking for a Hellgate Defense Co-op partner", "hellgate", "coop"], ["looking for a Spurtz Smash Versus rival", "smash", "versus"], ["looking for a Magma Breakout Versus rival", "breakout", "versus"], ["looking for a Magma Stack Versus rival", "stack", "versus"], ["looking for a Spurtz Swarm Versus rival", "swarm", "versus"], ["looking for a Balthazar's Flight Race rival", "flight", "race"], ["looking for a Rezghul Runner Race rival", "runner", "race"], ["looking for a Valgos Golf Versus rival", "golf", "versus"], ["waiting for players in Ember Hockey 2 v 2", "hockey", "team"], ["waiting for players in Ember Hockey", "hockey", "versus"], ["waiting for players in Lava Floor", "lavafloor", "live"], ["waiting for players in Bone Brawl", "bonebrawl", "live"], ["waiting for players in Soul Snatch", "soulsnatch", "live"], ["waiting for players in Fusebug Blast", "fusebug", "live"]];

    /**
     * Inferno-only (QoL #372): an announcement's game: {game, mode, name} for "<name> is looking for a Spurtz Smash
     * Versus rival at the Devil's Arcade!" and the like (IO_ANNOUNCED), else null. For the chat's join pill: only for
     * the server's own lines (an event message), not what a player typed.
     */
    public static ioJoinOf(text: string): any {
        let t: string = String(text || "");
        let end: string = " at the Devil's Arcade!";
        if (t.length < end.length || t.substr(t.length - end.length) != end) {
            return null;
        }
        for (let a of as3.values(ArcadeWindow.IO_ANNOUNCED)) {
            let at: int = t.lastIndexOf(" is " + a[0] + end);
            if (at > 0 && at + (" is " + a[0] + end).length == t.length) {
                return { "game": String(a[1]), "mode": String(a[2]), "name": t.substr(0, at) };
            }
        }
        return null;
    }

    /**
     * Inferno-only (QoL #372): join an announced match (the chat's pill): the arcade opens on the game and waits for
     * that match, as its button would. Not out of a game, a Hellgate run or a Siege attack under way. False if it
     * didn't open.
     */
    public static ioJoin(game: string, mode: string): boolean {
        if (!GLOBAL.INFERNO_ONLY || !ArcadeWindow.gameInfo(game)) {
            return false;
        }
        if (IoTd.on || IoSiege.attacking) {
            GLOBAL.Message(KEYS.Get("io_arc2_join_busy"));
            return false;
        }
        let w: ArcadeWindow = ArcadeWindow._open;
        if (w && w._game && !w._game.ended) {
            w.message(KEYS.Get("io_arc2_join_busy"), CasinoUI.LOSS, 160);
            return false;
        }
        ArcadeWindow.ShowGame(game);
        if (!ArcadeWindow._open) {
            return false;
        }
        ArcadeWindow._open.play(game, mode);
        return true;
    }

    /** Inferno-only (QoL #367): a player's name in the live match (seat i), or "Your rival". */
    private ioPlayerName(i: int): string {
        let p: any = this._ioPlayers && i >= 0 && i < this._ioPlayers.length ? this._ioPlayers[i] : null;
        return p && p.name ? String(p.name) : KEYS.Get("io_arc2_rival");
    }

    /**
     * Obsidian with a neon rim; the arcade's hall behind (arcade/lobby/lobby_bg.jpg); marquee bulbs round it.
     * (7 October, performance: the rim's glow is four strips, so the glow's layer is not drawn again under a
     * game that changes every frame; the inside is its own shape, hidden during a game.)
     */
    private drawFrame(): void {
        let inside: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        let m: Matrix = new Matrix();
        m.createGradientBox(ArcadeWindow.W, ArcadeWindow.H, Math.PI / 2, -ArcadeWindow.W / 2, -ArcadeWindow.H / 2);
        inside.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1018, 0x0A0608], [1, 1], [0, 255], m);
        inside.graphics.drawRoundRect(-ArcadeWindow.W / 2, -ArcadeWindow.H / 2, ArcadeWindow.W, ArcadeWindow.H, 22, 22);
        inside.graphics.endFill();
        // the game area's surround stays (a frame round the game, the inside's own colours)
        let surround: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        surround.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1018, 0x0A0608], [1, 1], [0, 255], m);
        surround.graphics.drawRoundRect(-ArcadeWindow.W / 2, -ArcadeWindow.H / 2, ArcadeWindow.W, ArcadeWindow.H, 22, 22);
        surround.graphics.drawRect(ArcadeWindow.GX + 2, ArcadeWindow.GY + 2, ArcadeGame.GW - 4, ArcadeGame.GH - 4);
        surround.graphics.endFill();
        surround.visible = false;
        this._surround = surround;
        // the rim: its four edges, each glowing on its own (with the corners' quarter curves at its ends)
        let r: number = 11;
        let x0: number = -ArcadeWindow.W / 2;
        let y0: number = -ArcadeWindow.H / 2;
        let x1: number = ArcadeWindow.W / 2;
        let y1: number = ArcadeWindow.H / 2;
        let rimEdges: any[] = [];
        for (let e: int = 0; e < 4; e++) {
            let edge: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
            rimEdges.push(edge);
            let eg: any = edge.graphics;
            eg.lineStyle(3, 0xFF5A2A, 1);
            if (e == 0) {
                eg.moveTo(x0, y0 + r);
                eg.curveTo(x0, y0, x0 + r, y0);
                eg.lineTo(x1 - r, y0);
                eg.curveTo(x1, y0, x1, y0 + r);
            } else if (e == 1) {
                eg.moveTo(x0, y1 - r);
                eg.curveTo(x0, y1, x0 + r, y1);
                eg.lineTo(x1 - r, y1);
                eg.curveTo(x1, y1, x1, y1 - r);
            } else {
                let ex: number = e == 2 ? x0 : x1;
                eg.moveTo(ex, y0 + r);
                eg.lineTo(ex, y1 - r);
            }
            edge.filters = [new GlowFilter(0xFF2A55, 0.55, 18, 18, 2, 2)];
        }
        this._lobbyLayers.push(inside);
        let art: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        CasinoUI.picture(art, "arcade/lobby/lobby_bg.jpg", -ArcadeWindow.W / 2 + 6, -ArcadeWindow.H / 2 + 6, ArcadeWindow.W - 12, ArcadeWindow.H - 12, (b: any): void => {
            b.alpha = 0.9;
        });
        let mask: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(-ArcadeWindow.W / 2 + 6, -ArcadeWindow.H / 2 + 6, ArcadeWindow.W - 12, ArcadeWindow.H - 12, 18, 18);
        mask.graphics.endFill();
        art.mask = mask;
        this._lobbyLayers.push(art);
        let band: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        this._lobbyLayers.push(band);
        let m2: Matrix = new Matrix();
        m2.createGradientBox(ArcadeWindow.W, 90, Math.PI / 2, -ArcadeWindow.W / 2, -ArcadeWindow.H / 2);
        band.graphics.beginGradientFill(GradientType.LINEAR, [0x0A0508, 0x0A0508], [0.85, 0], [0, 255], m2);
        band.graphics.drawRect(-ArcadeWindow.W / 2 + 6, -ArcadeWindow.H / 2 + 6, ArcadeWindow.W - 12, 90);
        band.graphics.endFill();
        // the kit's forged rim (11 October): the four glowing edges above until it has loaded
        let rim: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
        rim.name = "arcadeRim";
        let drawRim: Function = (): void => {
            rim.graphics.clear();
            if (IoKit.frame(rim.graphics, x0, y0, x1 - x0, y1 - y0)) {
                for (const e2 of as3.values(rimEdges)) {
                    (e2 as Shape).visible = false;
                }
            }
        };
        drawRim();
        IoKit.whenLoaded(["frame"], drawRim);
        // the marquee's bulbs along the top edge (they chase: frame())
        let i: int = 0;
        while (i < 34) {
            // (the glow: a soft disc drawn once, shown with the bulb; a filter rebuilt on every chase was dearer)
            let glow: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
            let gm: Matrix = new Matrix();
            gm.createGradientBox(18, 18, 0, -9, -9);
            glow.graphics.beginGradientFill(GradientType.RADIAL, [0xFFB040, 0xFFB040], [0.85, 0], [0, 255], gm);
            glow.graphics.drawCircle(0, 0, 9);
            glow.graphics.endFill();
            let bulb: Shape = as3.as(this.mc.addChild(new Shape()), Shape);
            bulb.graphics.beginFill(16769162, 1);
            bulb.graphics.drawCircle(0, 0, 3);
            bulb.graphics.endFill();
            bulb.x = glow.x = -ArcadeWindow.W / 2 + 30 + i * ((ArcadeWindow.W - 60) / 33);
            bulb.y = glow.y = -ArcadeWindow.H / 2 + 6;
            this._lights.push(bulb);
            this._glows.push(glow);
            i++;
        }
    }

    private frame(e: Event): void {
        // (the yard reloaded under it, a visit from the chat say: its layer was thrown away, and the window
        // kept playing and its socket open, unseen; 9 October)
        if (this.mc && !this.mc.stage) {
            this.close();
            return;
        }
        let now: int = getTimer();
        let ms: int = (now - this._last) | 0;
        this._last = now;
        if (this._toastT > 0 && --this._toastT == 0) {
            this._toast.text = "";
        }
        this._lightT++;
        let k: int = 0;
        while (k < this._lights.length) {
            let on: boolean = (k + ((this._lightT / 5) | 0)) % 4 == 0;
            this._lights[k].alpha = on ? 1 : 0.3;
            this._glows[k].visible = on;
            k++;
        }
        if (this._ioSound) {
            // (QoL #394: muted or not, as it is now)
            this._ioSound["ioSoundRedraw"]();
        }
        if (this._game && !this._ioPaused) {
            this._game.tick(ms);
        }
    }

    // ---- Inferno-only (QoL #369): pause in solo games
    private _ioPaused: boolean;
    private _ioPauseBox: Sprite;

    /** A solo run is being played (pausing it costs nobody anything). */
    public get ioCanPause(): boolean {
        return GLOBAL.INFERNO_ONLY && this._game != null && !this._game.ended && ArcadeWindow.soloRun(this._gameId, this._modeId);
    }

    public get ioPaused(): boolean {
        return this._ioPaused;
    }

    /** Pauses (P, Esc, the page losing the focus) or goes on. */
    public ioPause(on: boolean): void {
        if (on && !this.ioCanPause || on == this._ioPaused) {
            return;
        }
        this._ioPaused = on;
        if (this._game) {
            this._game.releaseKeys();
        }
        if (this._ioPauseBox && this._ioPauseBox.parent) {
            this._ioPauseBox.parent.removeChild(this._ioPauseBox);
        }
        this._ioPauseBox = null;
        if (!on) {
            return;
        }
        let box: Sprite = CasinoUI.panel(300, 150, 0.96);
        box.name = "arcadePaused";
        box.x = (ArcadeGame.GW - 300) / 2;
        box.y = (ArcadeGame.GH - 150) / 2;
        let head: TextField = CasinoUI.label(KEYS.Get("io_t3a_paused"), 26, 0xFFD58A, true, 300, TextFormatAlign.CENTER);
        head.y = 14;
        box.addChild(head);
        let line: TextField = CasinoUI.label(KEYS.Get("io_t3a_paused_keys"), 12, CasinoUI.ASH, false, 300, TextFormatAlign.CENTER);
        line.y = 54;
        box.addChild(line);
        GLOBAL.ioFitText(line, 9);
        let go: Sprite = CasinoUI.button(KEYS.Get("io_t3a_go_on"), 120, 36, (e: MouseEvent): void => {
            this.ioPause(false);
        }, true, 14);
        ArcadeWindow.ioFitButton(go);
        go.name = "arcadeResume";
        go.x = 24;
        go.y = 94;
        box.addChild(go);
        let quit: Sprite = CasinoUI.button(KEYS.Get("io_t3a_quit"), 120, 36, (e: MouseEvent): void => {
            this.ioPause(false);
            this.leaveGame();
        }, true, 14);
        ArcadeWindow.ioFitButton(quit);
        quit.name = "arcadeQuit";
        quit.x = 156;
        quit.y = 94;
        box.addChild(quit);
        this._ioPauseBox = box;
        if (this._game && this._game.parent) {
            this._game.parent.addChild(box);
        } else {
            this._content.addChild(box);
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        // (QoL #373: the window is away: its keys aren't)
        if (this._ioBackground) {
            return;
        }
        // (typing in the chat: the keys are the chat's, not the game's)
        if (GLOBAL.INFERNO_ONLY && !IoChatLift.typing(this._stage) && this.ioMenuKey(e.keyCode | 0)) {
            return;
        }
        if (this._ioPaused) {
            // (paused: P goes on, Q quits; nothing reaches the game)
            if (!IoChatLift.typing(this._stage)) {
                if (e.keyCode == 80) {
                    this.ioPause(false);
                } else if (e.keyCode == 81) {
                    this.ioPause(false);
                    this.leaveGame();
                }
            }
            return;
        }
        if (e.keyCode == 80 && this.ioCanPause && !IoChatLift.typing(this._stage)) {
            this.ioPause(true);
            return;
        }
        if (this._game && !IoChatLift.typing(this._stage)) {
            this._game.keyDown(e.keyCode | 0);
        }
    }

    /** A button of the window's own, by name (the result's, a game page's). */
    private ioButton(name: string): Sprite {
        let hit: Sprite = null;
        let walk: Function = (o: any): void => {
            if (hit || !o || o.visible === false) {
                return;
            }
            if (o.name == name && o instanceof Sprite) {
                hit = o as Sprite;
                return;
            }
            if (o instanceof DisplayObjectContainer) {
                for (let i: int = 0; i < (o as DisplayObjectContainer).numChildren; i++) {
                    walk((o as DisplayObjectContainer).getChildAt(i));
                }
            }
        };
        walk(this._content);
        return hit;
    }

    private ioPress(b: Sprite): boolean {
        if (!b) {
            return false;
        }
        b.dispatchEvent(new MouseEvent(MouseEvent.CLICK, true, false));
        return true;
    }

    /**
     * Inferno-only (QoL #375): the menus' keys: Enter plays again on a result, ← and → turn the lobby's pages.
     * (Esc goes back: ioEscBack, from IoEscape.)
     */
    public ioMenuKey(k: int): boolean {
        if (k == 13 && this._content && this._content.getChildByName("arcadeResult")) {
            return this.ioPress(this.ioButton("arcadeAgain"));
        }
        if ((k == 37 || k == 39) && !this._game && !this._gameId && ArcadeWindow.PAGES.length > 1) {
            let to: int = Math.max(0, Math.min(ArcadeWindow.PAGES.length - 1, this._lobbyPage + (k == 39 ? 1 : -1))) | 0;
            if (to != this._lobbyPage) {
                SOUNDS.Play("click1");
                this.lobby(to);
            }
            return true;
        }
        return false;
    }

    /** Inferno-only (QoL #375): Esc on a result or a game's page goes back (a result to its page, a page to the lobby). */
    public ioEscBack(): boolean {
        // (QoL #369: in a solo run, Esc pauses and goes on)
        if (this._ioPaused) {
            this.ioPause(false);
            return true;
        }
        if (this.ioCanPause) {
            this.ioPause(true);
            return true;
        }
        if (this._content && this._content.getChildByName("arcadeResult")) {
            return this.ioPress(this.ioButton("arcadeResultBack"));
        }
        if (!this._game) {
            return this.ioPress(this.ioButton("arcadeBack"));
        }
        return false;
    }

    public static ioEscBack(): boolean {
        return ArcadeWindow._open != null && !ArcadeWindow._open._ioBackground && ArcadeWindow._open.ioEscBack();
    }

    private onKeyUp(e: KeyboardEvent): void {
        // (always: a key let go while typing in the chat stayed held in the game, and the monster walked on;
        // 9 October)
        if (this._game) {
            this._game.keyUp(e.keyCode | 0);
        }
    }

    /** The page lost the focus (another window, a tab): keys held are let go, their key-ups never come. */
    private onDeactivate(e: Event): void {
        if (this._game) {
            this._game.releaseKeys();
        }
        // (QoL #369: a solo run waits while the page is away)
        this.ioPause(true);
    }

    public message(text: string, color: uint = 16777215, frames: int = 0): void {
        this._toast.text = text;
        this._toast.textColor = (color ? color : 0xFFFFFF) >>> 0;
        this._toastT = frames;
    }

    private clear(): void {
        this._nav++;
        this.endGame();
        this._waiting = null;
        this._waitLine = null;
        this._botButton = null;
        this._boardPanel = null;
        CasinoUI.removeAll(this._content);
    }

    // ---- the lobby
    public lobby(pageNo: int = -1): void {
        this.leaveLive();
        this.clear();
        this._gameId = null;
        this._title.text = KEYS.Get("io_t3a_title");
        if (pageNo >= 0) {
            this._lobbyPage = Math.min(ArcadeWindow.PAGES.length - 1, pageNo) | 0;
        } else if (GLOBAL.INFERNO_ONLY) {
            // (QoL #374: the page last looked at, this session)
            this._lobbyPage = Math.max(0, Math.min(ArcadeWindow.PAGES.length - 1, ArcadeWindow._ioLastPage)) | 0;
        }
        ArcadeWindow._ioLastPage = this._lobbyPage;
        let range: any[] = as3.cast(ArcadeWindow.PAGES[this._lobbyPage], Array);
        let first: int = range[0] | 0;
        let count: int = ((range[1] | 0) - first) | 0;
        let TW: int = 164;
        let TH: int = 186;
        let i: int = 0;
        while (i < count) {
            let g: any = ArcadeWindow.GAMES[first + i];
            let row: int = i < 4 ? 0 : 1;
            let col: int = (i < 4 ? i : i - 4) | 0;
            let rowCount: int = (row == 0 ? Math.min(4, count) : count - 4) | 0;
            let x0: number = (ArcadeGame.GW - (rowCount * TW + (rowCount - 1) * 14)) / 2;
            let t: Sprite = this.cabinet(g, TW, TH);
            t.x = x0 + col * (TW + 14);
            t.y = 4 + row * (TH + 14);
            this._content.addChild(t);
            i++;
        }
        // the pages: an arrow each side, and a dot for each page under the cabinets
        if (ArcadeWindow.PAGES.length > 1) {
            if (this._lobbyPage > 0) {
                this._content.addChild(this.pageArrow(-1, -6, 196));
            }
            if (this._lobbyPage < ArcadeWindow.PAGES.length - 1) {
                this._content.addChild(this.pageArrow(1, ArcadeGame.GW + 6, 196));
            }
            let p: int = 0;
            while (p < ArcadeWindow.PAGES.length) {
                let dot: Sprite = new Sprite();
                dot.name = "arcadePageDot:" + p;
                dot.graphics.beginFill(0, 0);
                dot.graphics.drawRect(-9, -9, 18, 18);
                dot.graphics.endFill();
                dot.graphics.lineStyle(1.5, 16766346, 1);
                dot.graphics.beginFill((p == this._lobbyPage ? 0xFFD58A : 0x2A0A06) >>> 0, 1);
                dot.graphics.drawCircle(0, 0, 5);
                dot.graphics.endFill();
                dot.x = ArcadeGame.GW / 2 + (p - (ArcadeWindow.PAGES.length - 1) / 2) * 22;
                dot.y = 4 + 2 * TH + 14 + 10;
                dot.buttonMode = true;
                dot.addEventListener(MouseEvent.CLICK, this.pageClick(p));
                this._content.addChild(dot);
                p++;
            }
        }
    }

    private pageClick(p: int): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this.lobby(p);
        };
    }

    /** A round arrow at the lobby's edge to the next or the last page (the next says how many new games wait). */
    private pageArrow(dir: int, x: number, y: number): Sprite {
        let a: Sprite = new Sprite();
        a.name = dir > 0 ? "arcadePageNext" : "arcadePagePrev";
        a.buttonMode = true;
        a.mouseChildren = false;
        let g: any = a.graphics;
        let hot: boolean = false;
        let piece: string = dir > 0 ? "arrow_right" : "arrow_left";
        // the kit's obsidian arrow (11 October); a drawn disc and chevron until it has loaded
        let draw: Function = (): void => {
            g.clear();
            if (IoKit.stamp(g, piece + (hot ? "_h" : ""), 0, 0, 42, 42)) {
                a.filters = [new GlowFilter(0xFF2A55, hot ? 0.8 : 0.5, 12, 12, 2, 2)];
                return;
            }
            g.lineStyle(2, 0xFF5A2A, 1);
            g.beginFill(0x2A0A06, 0.95);
            g.drawCircle(0, 0, 19);
            g.endFill();
            g.lineStyle(4, 0xFFD58A, 1);
            g.moveTo(-5 * dir, -9);
            g.lineTo(5 * dir, 0);
            g.lineTo(-5 * dir, 9);
            a.filters = [new GlowFilter(0xFF2A55, 0.7, 12, 12, 2, 2)];
        };
        draw();
        IoKit.whenLoaded([piece, piece + "_h"], draw);
        a.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hot = true;
            draw();
        });
        a.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hot = false;
            draw();
        });
        a.x = x;
        a.y = y;
        if (dir > 0) {
            let news: int = 0;
            let range: any[] = as3.cast(ArcadeWindow.PAGES[this._lobbyPage + 1], Array);
            for (let i: int = range[0] | 0; i < (range[1] | 0); i++) {
                if (ArcadeWindow.GAMES[i].isNew) {
                    news++;
                }
            }
            if (news > 0) {
                let badge: TextField = CasinoUI.label(KEYS.Get("io_t3a_page_new", { "v1": news }), 10, 2755078, true, 44, TextFormatAlign.CENTER);
                badge.background = true;
                badge.backgroundColor = 16766346;
                badge.height = 15;
                GLOBAL.ioFitText(badge, 7);
                badge.x = -40;
                badge.y = 22;
                a.addChild(badge);
            }
        }
        a.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this.lobby((this._lobbyPage + dir) | 0);
        });
        return a;
    }

    private cabinet(g: any, w: int, h: int): Sprite {
        let frame: Sprite = null;
        let t: MovieClip = new MovieClip();
        t.name = "arcadeTile:" + g.id;
        frame = as3.as(t.addChild(CasinoUI.panel(w, h, 0.95)), Sprite);
        let art: Sprite = as3.as(t.addChild(new Sprite()), Sprite);
        CasinoUI.picture(art, "arcade/lobby/tile_" + g.id + ".png", 4, 4, w - 8, h - 50);
        let name: TextField = CasinoUI.label(String(g.name), 14, 16777215, false, w, TextFormatAlign.CENTER, "Groboldov");
        name.y = h - 44;
        name.filters = [new GlowFilter(0x000000, 1, 4, 4, 8, 2)];
        t.addChild(name);
        let modes: any[] = [];
        for (let md of as3.values(g.modes)) {
            // (QoL #235: in the player's language)
            let ml: string = ArcadeWindow.ioModeLabel(String(md[1]));
            modes.push(ml.charAt(0) + ml.substr(1).toLowerCase());
        }
        let line: string = modes.join(" · ");
        let best: string = this.bestLine(String(g.id));
        let s: TextField = CasinoUI.label(best ? best : line, 10, best ? CasinoUI.GOLD : CasinoUI.ASH, true, w, TextFormatAlign.CENTER);
        s.y = h - 22;
        t.addChild(s);
        GLOBAL.ioFitText(s, 8);
        // (QoL #365, 14 October: how many are waiting for a match of this game, from the status's counts)
        let waitingNow: int = 0;
        let counts: any = ARCADE.state && ARCADE.state.waiting ? ARCADE.state.waiting : null;
        if (counts) {
            for (let key in counts) {
                if (key.indexOf(String(g.id) + ":") == 0) {
                    waitingNow += counts[key] | 0;
                }
            }
        }
        if (waitingNow > 0) {
            let wait: TextField = CasinoUI.label(KEYS.Get("io_t3a_tile_waiting", { "v1": waitingNow }), 10, 2755078, true, 70, TextFormatAlign.CENTER);
            wait.name = "arcadeWaiting:" + g.id;
            wait.background = true;
            wait.backgroundColor = 0x7CFF6A;
            wait.height = 15;
            GLOBAL.ioFitText(wait, 7);
            wait.x = w - 76;
            wait.y = 8;
            t.addChild(wait);
        }
        if (g.isNew) {
            let ribbon: TextField = CasinoUI.label(KEYS.Get("io_t3a_tile_new"), 11, 2755078, true, 48, TextFormatAlign.CENTER, "Groboldov");
            ribbon.background = true;
            ribbon.backgroundColor = 16764992;
            ribbon.height = 17;
            GLOBAL.ioFitText(ribbon, 7);
            ribbon.x = -6;
            ribbon.y = 6;
            ribbon.rotation = -14;
            t.addChild(ribbon);
        }
        t.buttonMode = true;
        t.mouseChildren = false;
        t.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            frame.filters = [new GlowFilter(0xFF3A7A, 1, 14, 14, 2, 2)];
        });
        t.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            frame.filters = [];
        });
        t.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this.page(String(g.id));
        });
        return t;
    }

    /** "Best: 1,240" for a cabinet, from the player's records. */
    private bestLine(id: string): string {
        let g: any = ArcadeWindow.gameInfo(id);
        if (!g) {
            return "";
        }
        let mode: string = String(g.modes[0][0]);
        if (id == "hellgate") {
            return IoTd.best && (IoTd.best.best_wave | 0) > 0 ? KEYS.Get("io_t3a_best_wave", { "v1": IoTd.best.best_wave | 0 }) : "";
        }
        let r: any = ARCADE.record(id, mode);
        if (!r) {
            return "";
        }
        if (ArcadeWindow.WINS[id + ":" + mode]) {
            return KEYS.Get((r.wins | 0) == 1 ? "io_t3a_best_win" : "io_t3a_best_wins", { "v1": r.wins | 0 });
        }
        if ((r.best | 0) <= 0) {
            return "";
        }
        if (id == "golf") {
            return KEYS.Get("io_t3a_best_strokes", { "v1": ArcadeWindow.valueOf(id, r.best | 0) });
        }
        if (id == "hellgate2") {
            return KEYS.Get("io_t3a_best_points", { "v1": CasinoUI.number(r.best | 0) });
        }
        return KEYS.Get("io_t3a_best", { "v1": CasinoUI.number(r.best | 0) });
    }

    // ---- a game's page
    /** Out of the game under way, back to its page (a finished player not waiting for the rival). */
    public leaveGame(): void {
        if (this._gameId) {
            this.page(this._gameId);
        }
    }

    public page(id: string): void {
        this.leaveLive();
        this.clear();
        let g: any = ArcadeWindow.gameInfo(id);
        if (!g) {
            this.lobby();
            return;
        }
        this._gameId = id;
        this._title.text = String(g.name).toUpperCase();
        let left: Sprite = as3.as(this._content.addChild(CasinoUI.panel(330, 412, 0.9)), Sprite);
        left.x = 0;
        left.y = 4;
        let art: Sprite = as3.as(left.addChild(new Sprite()), Sprite);
        CasinoUI.picture(art, "arcade/lobby/banner_" + id + ".jpg", 8, 8, 314, 150);
        let about: TextField = CasinoUI.label("", 11, 15655632, false, 310, TextFormatAlign.LEFT);
        about.multiline = true;
        about.wordWrap = true;
        // (QoL #235: the game's texts in the player's language; a longer one drawn smaller to fit)
        about.htmlText = ArcadeWindow.ioGameText(g, "text");
        about.height = 150;
        about.x = 10;
        about.y = 164;
        left.addChild(about);
        if (about.htmlText != "" && ArcadeWindow.ioGameText(g, "text") != String(g.text)) {
            // (only a translation: the English stays as it was laid out)
            GLOBAL.ioFitHeight(about, 9);
        }
        let keys: TextField = CasinoUI.label(String((GLOBAL.ioOnPhone || IoPinchZoom.touched) && g.touch ? ArcadeWindow.ioGameText(g, "touch") : ArcadeWindow.ioGameText(g, "keys")), 10, CasinoUI.GOLD, true, 310, TextFormatAlign.LEFT);
        keys.x = 10;
        keys.y = 318;
        left.addChild(keys);
        if (ArcadeWindow.ioGameText(g, "keys") != String(g.keys)) {
            GLOBAL.ioFitText(keys, 8);
        }
        let modes: any[] = as3.as(g.modes, Array);
        let bw: int = ((310 - (modes.length - 1) * 8) / modes.length) | 0;
        let i: int = 0;
        while (i < modes.length) {
            let b: Sprite = ArcadeWindow.ioFitButton(CasinoUI.button(ArcadeWindow.ioModeLabel(String(modes[i][1])), bw, 40, this.playClick(id, String(modes[i][0])), true, 15));
            b.name = "arcadePlay:" + modes[i][0];
            b.x = 10 + i * (bw + 8);
            b.y = 342;
            left.addChild(b);
            i++;
        }
        let back: Sprite = ArcadeWindow.ioFitButton(CasinoUI.button(KEYS.Get("io_t3a_back"), 80, 26, (e: MouseEvent): void => {
            this.lobby(ArcadeWindow.pageOf(id));
        }, true, 12));
        back.name = "arcadeBack";
        back.x = 10;
        back.y = 388;
        left.addChild(back);
        // the leaderboards
        this._boardPanel = as3.as(this._content.addChild(CasinoUI.panel(378, 412, 0.9)), Sprite);
        this._boardPanel.x = 342;
        this._boardPanel.y = 4;
        this.showBoard(String(modes[0][0]));
    }

    private playClick(id: string, mode: string): Function {
        return (e: MouseEvent): void => {
            this.play(id, mode);
        };
    }

    private showBoard(mode: string): void {
        let id: string = null;
        let g: any = null;
        let rows: Sprite = null;
        let wins: boolean = false;
        if (!this._boardPanel || !this._gameId) {
            return;
        }
        id = this._gameId;
        this._boardMode = mode;
        let p: Sprite = this._boardPanel;
        CasinoUI.removeAll(p);
        g = ArcadeWindow.gameInfo(id);
        // (Balthazar's Flight: its course changes weekly, so a "This week" board beside the all-time one; QoL #291.
        // The tab's mode is "solo:week": the solo board, this week's.)
        let boardMode: string = mode.split(":")[0];
        let week: boolean = mode.indexOf(":week") > 0;
        let head: TextField = CasinoUI.label(KEYS.Get("io_t3a_boards"), 16, 16777215, false, 378, TextFormatAlign.CENTER, "Groboldov");
        head.y = 8;
        head.filters = [new GlowFilter(0x6A1404, 1, 4, 4, 6, 2)];
        p.addChild(head);
        let modes: any[] = (as3.as(g.modes, Array) as any[]).slice();
        if (id == "flight") {
            modes.splice(1, 0, ["solo:week", "THIS WEEK"]);
        }
        let tw: int = ((358 - (modes.length - 1) * 6) / modes.length) | 0;
        let i: int = 0;
        while (i < modes.length) {
            let tab: Sprite = ArcadeWindow.ioFitButton(CasinoUI.toggle(ArcadeWindow.ioModeLabel(String(modes[i][1])), tw, 24, this.boardClick(String(modes[i][0])), "tab"));
            tab.name = "arcadeBoardTab:" + modes[i][0];
            tab.x = 10 + i * (tw + 6);
            tab.y = 36;
            CasinoUI.choose(tab, modes[i][0] == mode);
            p.addChild(tab);
            i++;
        }
        rows = as3.as(p.addChild(new Sprite()), Sprite);
        rows.name = "arcadeBoardRows";
        rows.y = 70;
        let loading: TextField = CasinoUI.label(KEYS.Get("io_t3a_loading"), 12, CasinoUI.ASH, true, 378, TextFormatAlign.CENTER);
        loading.y = 40;
        rows.addChild(loading);
        wins = Boolean(ArcadeWindow.WINS[id + ":" + boardMode]);
        let period: string = week ? "week" : ((id == "siege" || id == "golf" || id == "hellgate2") && mode == "daily" ? "today" : "");
        ARCADE.board(id, boardMode, period, (r: any): void => {
            if (this._boardMode != mode || this._gameId != id || !rows.parent) {
                return;
            }
            CasinoUI.removeAll(rows);
            if (r.error) {
                let err: TextField = CasinoUI.label(String(r.error), 12, CasinoUI.LOSS, true, 378, TextFormatAlign.CENTER);
                err.y = 40;
                rows.addChild(err);
                return;
            }
            let cols: any[] = wins ? ["#", KEYS.Get("io_t3a_col_player"), KEYS.Get("io_t3a_col_wins"), KEYS.Get("io_t3a_col_played")] : ["#", KEYS.Get("io_t3a_col_player"), g.score ? ArcadeWindow.ioGameText(g, "score") : KEYS.Get("io_t3a_col_score"), g.score2 ? ArcadeWindow.ioGameText(g, "score2") : KEYS.Get("io_t3a_col_runs")];
            let cx: any[] = [14, 44, 230, 304];
            let k: int = 0;
            while (k < cols.length) {
                let h: TextField = CasinoUI.label(String(cols[k]), 10, CasinoUI.ASH, true, k == 2 ? 72 : 90, TextFormatAlign.LEFT);
                h.x = Number(cx[k]);
                rows.addChild(h);
                GLOBAL.ioFitText(h, 8);
                k++;
            }
            let top: any[] = as3.as(r.top, Array);
            if (!top || !top.length) {
                let none: TextField = CasinoUI.label(KEYS.Get("io_t3a_board_none"), 12, CasinoUI.ASH, true, 378, TextFormatAlign.CENTER);
                none.y = 60;
                rows.addChild(none);
            }
            // (all of the 20 the server sends, ten a page, and "Around you" for a player outside them: only 13 were
            // drawn; QoL #290)
            let myUid: int = LOGIN._playerID;
            let around: any[] = as3.as(r.around, Array);
            let page: Sprite = as3.as(rows.addChild(new Sprite()), Sprite);
            page.name = "arcadeBoardPage";
            let draw = (list: any[], first: int, places: boolean): void => {
                CasinoUI.removeAll(page);
                let n: int = 0;
                while (list && n < list.length && n < 10) {
                    let row: any = list[n];
                    let place: int = (places ? row.place | 0 : first + n + 1) | 0;
                    let mine: boolean = (row.uid | 0) == myUid;
                    let vals: any[] = [String(place), String(row.name), wins ? String(row.wins) : ArcadeWindow.valueOf(id, row.best | 0), wins ? String(row.runs) : (id == "siege" ? ArcadeWindow.timeOf((36000 - (row.best2 | 0)) | 0) : (g.score2 ? CasinoUI.number(row.best2 | 0) : String(row.runs)))];
                    let k2: int = 0;
                    while (k2 < vals.length) {
                        let c: TextField = CasinoUI.label(String(vals[k2]), 11, (mine ? CasinoUI.GOLD : (place <= 3 ? 0xFFFFFF : 0xE0D4C4)) >>> 0, true, k2 == 1 ? 180 : 80, TextFormatAlign.LEFT);
                        c.x = Number(cx[k2]);
                        c.y = 18 + n * 20;
                        page.addChild(c);
                        k2++;
                    }
                    n++;
                }
            };
            let pages: any[] = [];
            if (top && top.length) {
                pages.push([KEYS.Get("io_t3a_board_top10"), top.slice(0, 10), 0, false]);
            }
            if (top && top.length > 10) {
                pages.push(["11-" + Math.min(20, top.length), top.slice(10, 20), 10, false]);
            }
            if (around && around.length) {
                pages.push([KEYS.Get("io_t3a_board_around"), around, 0, true]);
            }
            if (pages.length) {
                draw(pages[0][1], pages[0][2], pages[0][3]);
            }
            if (pages.length > 1) {
                let pw: int = ((358 - (pages.length - 1) * 6) / pages.length) | 0;
                let tabs: Sprite[] = [];
                let pi: int = 0;
                while (pi < pages.length) {
                    let which: any[] = pages[pi];
                    let t: Sprite = CasinoUI.toggle(String(which[0]), pw, 20, (e: MouseEvent): void => {
                        draw(which[1], which[2], which[3]);
                        for (let other of tabs) {
                            CasinoUI.choose(other, other == t);
                        }
                    }, "tab");
                    ArcadeWindow.ioFitButton(t);
                    t.name = "arcadeBoardPage:" + pi;
                    t.x = 10 + pi * (pw + 6);
                    t.y = 224;
                    CasinoUI.choose(t, pi == 0);
                    rows.addChild(t);
                    tabs.push(t);
                    pi++;
                }
            }
            let me: any = r.me;
            let foot: TextField = CasinoUI.label("", 11, CasinoUI.GOLD, true, 358, TextFormatAlign.CENTER);
            foot.name = "arcadeBoardMe";
            foot.x = 10;
            foot.y = 300;
            if (me) {
                foot.text = KEYS.Get(week ? "io_t3a_me_week" : "io_t3a_me", { "v1": me.place | 0 }) + "  ·  " + (wins ? KEYS.Get("io_t3a_me_record", { "v1": me.wins | 0, "v2": me.losses | 0 }) : KEYS.Get("io_t3a_me_best", { "v1": ArcadeWindow.valueOf(id, me.best | 0) })) + "  ·  " + KEYS.Get("io_t3a_me_played", { "v1": me.runs | 0 });
            } else {
                foot.text = KEYS.Get(week ? "io_t3a_me_none_week" : "io_t3a_me_none");
            }
            rows.addChild(foot);
            GLOBAL.ioFitText(foot, 8);
        });
    }

    /** A leaderboard's score as shown (Valgos Golf keeps 999 less the strokes, so fewer strokes rank higher). */
    public static valueOf(id: string, v: int): string {
        if (id == "siege") {
            return v / 10 + "%";
        }
        if (id == "golf") {
            return String(999 - v);
        }
        return CasinoUI.number(v);
    }

    /** "1:23.4": the tenths kept (QoL #580: two "1:23" rows ranked 1 and 2 with nothing to tell them apart). */
    private static timeOf(tenths: int): string {
        let t: int = Math.abs(tenths) | 0;
        let s: int = (t / 10) | 0;
        return ((s / 60) | 0) + ":" + (s % 60 < 10 ? "0" : "") + s % 60 + (GLOBAL.INFERNO_ONLY ? "." + (t % 10) : "");
    }

    public static ioTimeOf(tenths: int): string {
        return ArcadeWindow.timeOf(tenths);
    }

    private boardClick(mode: string): Function {
        return (e: MouseEvent): void => {
            this.showBoard(mode);
        };
    }

    // ---- playing
    public play(id: string, mode: string): void {
        let nav: int = 0;
        if (this._busy) {
            return;
        }
        this._gameId = id;
        this._modeId = mode;
        if (id == "hellgate") {
            if (mode == "solo") {
                this.close();
                IoTd.Show();
                return;
            }
            this.waitFor(id, mode);
            return;
        }
        // (Hellgate Defense 2: its own start window, IoTd2Ui; Campaign or the Daily Challenge)
        if (id == "hellgate2") {
            this.close();
            IoTd2.Show(mode);
            return;
        }
        if (id == "siege") {
            this.siegeView(mode);
            return;
        }
        if (!ArcadeWindow.soloRun(id, mode)) {
            this.waitFor(id, mode);
            return;
        }
        // a solo run: the server gives it an id and a seed
        this._busy = true;
        this.message(KEYS.Get("io_t3a_coin"), CasinoUI.ASH);
        nav = this._nav;
        ARCADE.start(id, mode, (r: any): void => {
            // (the player went back or to another mode meanwhile: the solo game opened over it; 9 October)
            if (!this.mc || nav != this._nav) {
                this._busy = false;
                return;
            }
            if (r.error) {
                this._busy = false;
                this.message(String(r.error), CasinoUI.LOSS, 120);
                return;
            }
            this._run = r;
            if (id == "flight") {
                ARCADE.ghosts((g: any): void => {
                    this._busy = false;
                    if (!this.mc || nav != this._nav) {
                        return;
                    }
                    r.ghosts = g.error ? [] : g.ghosts;
                    this.startGame(id, mode, r);
                });
                return;
            }
            this._busy = false;
            this.startGame(id, mode, r);
        });
    }

    public startGame(id: string, mode: string, ctx: any): void {
        this.clear();
        this.message("", 0);
        this._gameId = id;
        this._modeId = mode;
        let g: any = ArcadeWindow.gameInfo(id);
        this._title.text = String(g.name).toUpperCase();
        if (id == "smash") {
            this._game = new SmashGame(this, mode, ctx);
        } else if (id == "breakout") {
            this._game = new BreakoutGame(this, mode, ctx);
        } else if (id == "flight") {
            this._game = new FlightGame(this, mode, ctx);
        } else if (id == "wormzer") {
            this._game = new WormzerGame(this, mode, ctx);
        } else if (id == "fusebug") {
            this._game = new FusebugGame(this, mode, ctx);
        } else if (id == "stack") {
            this._game = new StackGame(this, mode, ctx);
        } else if (id == "swarm") {
            this._game = new SwarmGame(this, mode, ctx);
        } else if (id == "runner") {
            this._game = new RunnerGame(this, mode, ctx);
        } else if (id == "golf") {
            this._game = new GolfGame(this, mode, ctx);
        } else if (id == "lavafloor") {
            this._game = new LavaFloorGame(this, mode, ctx);
        } else if (id == "bonebrawl") {
            this._game = new BoneBrawlGame(this, mode, ctx);
        } else if (id == "hockey") {
            this._game = new HockeyGame(this, mode, ctx);
        } else if (id == "soulsnatch") {
            this._game = new SoulSnatchGame(this, mode, ctx);
        }
        if (this._game) {
            this._game.name = "arcadeGame:" + id;
            this._content.addChild(this._game);
            this.lobbyLayers(false);
            // (QoL #371: a live match: the place on its board now, so the result can say how far it moved)
            if (GLOBAL.INFERNO_ONLY && !ArcadeWindow.soloRun(id, mode)) {
                let key: string = id + ":" + mode;
                this._ioRankKey = key;
                this._ioRankBefore = -1;
                ARCADE.rank(id, mode, "", (r: any): void => {
                    if (this.mc && this._ioRankKey == key && !r.error) {
                        this._ioRankBefore = r.place | 0;
                    }
                });
            }
        }
    }

    /** Inferno-only (QoL #371): "#7 (up 3)" on a result: the place on the board, and how far it moved (before -1: not known; 0: not on the board before). */
    public static ioRankText(place: int, before: int): string {
        if (place <= 0) {
            return "";
        }
        if (before > place) {
            return KEYS.Get("io_arc_rank_up", { "v1": place, "v2": before - place });
        }
        if (before == 0) {
            return KEYS.Get("io_arc_rank_new", { "v1": place });
        }
        return KEYS.Get("io_arc_rank", { "v1": place });
    }

    /** The lobby's layers under the content: hidden while a game covers them (only the game's surround shows). */
    private lobbyLayers(on: boolean): void {
        for (let l of as3.values(this._lobbyLayers)) {
            l.visible = on;
        }
        if (this._surround) {
            this._surround.visible = !on;
        }
    }

    /** The game is over: its result shown over it; solo runs are recorded. */
    /** QoL #630: whether a game's result is a win (its own flag, or its title says so). */
    public static ioWonResult(result: any): boolean {
        if (!result) {
            return false;
        }
        if (result.won != null) {
            return Boolean(result.won);
        }
        // (QoL #235: the games' titles are in the player's language: "YOU WIN!" is told by its key's text too)
        let title: string = String(result.title || "");
        if (title != "" && title == KEYS.Get("io_t3a_you_win")) {
            return true;
        }
        return /\b(win|wins|won|victory|cleared|champion)\b/i.test(title);
    }

    public gameOver(game: ArcadeGame, result: any): void {
        let id: string = null;
        let mode: string = null;
        let note: TextField = null;
        if (game != this._game) {
            return;
        }
        id = this._gameId;
        mode = this._modeId;
        // (QoL #630: a game ends with a sting: a fanfare for a win, a short low one otherwise; only a new best
        // made a sound, once the server had answered)
        SOUNDS.Play(ArcadeWindow.ioWonResult(result) ? "levelup" : "iquesthide", 0.7);
        let panel: Sprite = CasinoUI.panel(360, 230, 0.96);
        panel.name = "arcadeResult";
        panel.x = (ArcadeGame.GW - 360) / 2;
        panel.y = (ArcadeGame.GH - 230) / 2;
        panel.filters = [new GlowFilter(0xFF3A7A, 0.8, 16, 16, 2, 2)];
        let head: TextField = CasinoUI.label(String(result.title ? result.title : KEYS.Get("io_t3a_game_over")), 26, 16777215, false, 360, TextFormatAlign.CENTER, "Groboldov");
        head.height = 40;
        head.y = 14;
        GLOBAL.ioFitText(head, 16);
        head.textColor = (result.color ? result.color >>> 0 : 0xFFD58A) >>> 0;
        head.filters = [new GlowFilter(0x6A1404, 1, 4, 4, 6, 2)];
        panel.addChild(head);
        let line: TextField = CasinoUI.label(String(result.line ? result.line : ""), 15, 16777215, true, 340, TextFormatAlign.CENTER);
        line.multiline = true;
        line.wordWrap = true;
        line.height = 60;
        line.x = 10;
        line.y = 62;
        line.name = "arcadeResultLine";
        panel.addChild(line);
        note = CasinoUI.label("", 13, CasinoUI.GOLD, true, 340, TextFormatAlign.CENTER);
        note.x = 10;
        note.y = 124;
        note.name = "arcadeResultNote";
        panel.addChild(note);
        // (QoL #371: the place on the game's board after it ("#7 (up 3)"), under the note; a match ranked by wins
        // shows the wins and losses beside it ("14 W – 6 L"))
        let live: boolean = !ArcadeWindow.soloRun(id, mode);
        let rankLine: TextField = null;
        let recordLine: TextField = null;
        if (GLOBAL.INFERNO_ONLY) {
            let side: boolean = live && Boolean(ArcadeWindow.WINS[id + ":" + mode]);
            rankLine = CasinoUI.label("", 12, CasinoUI.GOLD, true, side ? 165 : 340, side ? TextFormatAlign.RIGHT : TextFormatAlign.CENTER);
            rankLine.name = "ioArcRank";
            rankLine.x = 10;
            rankLine.y = 146;
            panel.addChild(rankLine);
            if (side) {
                recordLine = CasinoUI.label("", 12, 0xE0D4C4, true, 165, TextFormatAlign.LEFT);
                recordLine.name = "ioArcRecord";
                recordLine.x = 185;
                recordLine.y = 146;
                panel.addChild(recordLine);
            }
        }
        let again: Sprite = ArcadeWindow.ioFitButton(CasinoUI.button(KEYS.Get("io_t3a_play_again"), 150, 38, (e: MouseEvent): void => {
            this.play(id, mode);
        }, true, 14));
        again.name = "arcadeAgain";
        again.x = 22;
        again.y = 172;
        panel.addChild(again);
        let back: Sprite = ArcadeWindow.ioFitButton(CasinoUI.button(KEYS.Get("io_t3a_back"), 150, 38, (e: MouseEvent): void => {
            this.page(id);
        }, true, 14));
        back.name = "arcadeResultBack";
        back.x = 188;
        back.y = 172;
        panel.addChild(back);
        this._content.addChild(panel);
        if (this._run && ArcadeWindow.soloRun(id, mode) && result.score != null && result.submit !== false) {
            let run: any = this._run;
            this._run = null;
            note.text = KEYS.Get("io_t3a_recording");
            // Inferno-only (14 October, QoL #430): a score whose request got no answer is sent again by itself
            // (twice), then with SEND AGAIN; the server answers a repeat of a recorded run as it did the first time.
            let tries: int = 0;
            let send: Function = null;
            send = (): void => {
            ARCADE.submit(String(run.run), result.score | 0, result.score2 | 0, result.ghost ? String(result.ghost) : "", (r: any): void => {
                if (!note.parent) {
                    return;
                }
                if (r.error) {
                    // (QoL #235: told by ARCADE's flag, the message being in the player's language)
                    let lost: boolean = r.lost === true || String(r.error).indexOf("did not answer") >= 0;
                    if (lost && ++tries <= 2) {
                        setTimeout(send, 1500 * tries);
                        return;
                    }
                    note.textColor = CasinoUI.LOSS;
                    note.text = String(r.error);
                    if (lost && !panel.getChildByName("arcadeSendAgain")) {
                        let retry: Sprite = CasinoUI.button(KEYS.Get("io_t3a_send_again"), 120, 26, (e: MouseEvent): void => {
                            retry.visible = false;
                            note.textColor = CasinoUI.GOLD;
                            note.text = KEYS.Get("io_t3a_recording");
                            tries = 0;
                            send();
                        }, true, 11);
                        ArcadeWindow.ioFitButton(retry, 8);
                        retry.name = "arcadeSendAgain";
                        retry.x = note.x + 10;
                        retry.y = note.y + 22;
                        panel.addChild(retry);
                    }
                    return;
                }
                note.text = r.newBest ? KEYS.Get("io_t3a_new_best") : (id == "golf" ? KEYS.Get("io_t3a_your_best_strokes", { "v1": ArcadeWindow.valueOf(id, r.best | 0) }) : KEYS.Get("io_t3a_your_best", { "v1": CasinoUI.number(r.best | 0) }));
                if (r.newBest) {
                    SOUNDS.Play("chaching");
                }
                // (QoL #371: the board's place, before and after, from the server's answer)
                if (rankLine && r.place != null) {
                    rankLine.text = ArcadeWindow.ioRankText(r.place | 0, r.placeBefore | 0);
                }
            });
            };
            send();
        } else if (result.note) {
            note.text = String(result.note);
        }
        // (QoL #371: a live match: its board's place and record once the server has recorded it, a moment after the end)
        if (rankLine && live && id != "hellgate") {
            let key: string = id + ":" + mode;
            let before: int = (this._ioRankKey == key ? this._ioRankBefore : -1) | 0;
            setTimeout((): void => {
                if (!this.mc || !panel.parent) {
                    return;
                }
                ARCADE.rank(id, mode, "", (r: any): void => {
                    if (!this.mc || !panel.parent || r.error) {
                        return;
                    }
                    this.ioShowRank(rankLine, recordLine, r, before);
                    if (this._ioRankKey == key) {
                        // (the next match's move counts from here)
                        this._ioRankBefore = r.place | 0;
                    }
                });
            }, 1200);
        }
    }

    /** Inferno-only (QoL #371): a rank answer ({place, wins, losses}) on a result's lines. */
    public ioShowRank(rankLine: TextField, recordLine: TextField, r: any, before: int): void {
        if (rankLine) {
            rankLine.text = ArcadeWindow.ioRankText(r.place | 0, before);
        }
        if (recordLine) {
            recordLine.text = KEYS.Get("io_arc_record", { "v1": r.wins | 0, "v2": r.losses | 0 });
        }
    }

    private endGame(): void {
        this._ioPaused = false;
        this._ioPauseBox = null;
        if (this._game) {
            this._game.destroy();
            if (this._game.parent) {
                this._game.parent.removeChild(this._game);
            }
            this._game = null;
            this.lobbyLayers(true);
        }
    }

    // ---- waiting for a match (the live games)
    private waitFor(id: string, mode: string): void {
        let p: Sprite = null;
        let head: TextField = null;
        this.clear();
        this._gameId = id;
        this._modeId = mode;
        let g: any = ArcadeWindow.gameInfo(id);
        this._title.text = String(g.name).toUpperCase();
        // (QoL #373: a row more, for Wait in the background)
        p = as3.as(this._content.addChild(CasinoUI.panel(420, GLOBAL.INFERNO_ONLY ? 262 : 220, 0.95)), Sprite);
        p.name = "arcadeWaiting";
        p.x = (ArcadeGame.GW - 420) / 2;
        p.y = 90;
        this._waiting = p;
        head = CasinoUI.label(KEYS.Get("io_t3a_connecting"), 22, 16777215, false, 420, TextFormatAlign.CENTER, "Groboldov");
        head.height = 34;
        head.y = 20;
        head.filters = [new GlowFilter(0x6A1404, 1, 4, 4, 6, 2)];
        p.addChild(head);
        this._waitLine = CasinoUI.label("", 13, 15655632, true, 400, TextFormatAlign.CENTER);
        this._waitLine.multiline = true;
        this._waitLine.wordWrap = true;
        this._waitLine.height = 60;
        this._waitLine.x = 10;
        this._waitLine.y = 68;
        p.addChild(this._waitLine);
        this._botButton = CasinoUI.button(KEYS.Get(id == "flight" ? "io_t3a_ghost" : (ArcadeWindow.LIVE[id] ? "io_t3a_start_bots" : "io_t3a_play_bot")), 170, 38, (e: MouseEvent): void => {
            ArcadeNet.send({ "t": "bot" });
        }, true, 14);
        ArcadeWindow.ioFitButton(this._botButton);
        this._botButton.name = "arcadeBot";
        this._botButton.x = 30;
        this._botButton.y = 150;
        this._botButton.visible = false;
        p.addChild(this._botButton);
        let cancel: Sprite = ArcadeWindow.ioFitButton(CasinoUI.button(KEYS.Get("io_t3a_cancel"), 170, 38, (e: MouseEvent): void => {
            this.page(id);
        }, true, 14));
        cancel.name = "arcadeCancel";
        cancel.x = 220;
        cancel.y = 150;
        p.addChild(cancel);
        // (QoL #373: the window goes, the wait goes on, a chip in the top bar; shown once the queue is joined)
        this._ioBgButton = null;
        if (GLOBAL.INFERNO_ONLY) {
            let bg: Sprite = CasinoUI.button(KEYS.Get("io_op3_arc_background"), 360, 34, (e: MouseEvent): void => {
                this.ioToBackground();
            }, true, 13);
            bg.name = "ioArc3Background";
            bg.x = 30;
            bg.y = 202;
            bg.visible = false;
            p.addChild(bg);
            this._ioBgButton = bg;
        }
        ArcadeNet.handler = as3.bind(this, this.onNet);
        ArcadeNet.onLost = as3.bind(this, this.onLost);
        ArcadeNet.connect((err: string): void => {
            if (!this.mc || this._waiting != p) {
                return;
            }
            if (err) {
                head.text = KEYS.Get("io_t3a_out_of_order");
                this._waitLine.text = err;
                return;
            }
            head.text = KEYS.Get(id == "wormzer" || (ArcadeWindow.LIVE[id] && mode == "solo") ? "io_t3a_entering" : (ArcadeWindow.LIVE[id] && id != "hockey" ? "io_t3a_looking_players" : "io_t3a_looking_rival"));
            if (mode == "coop") {
                head.text = KEYS.Get("io_t3a_looking_partner");
            }
            if (mode == "team") {
                head.text = KEYS.Get("io_t3a_looking_players");
            }
            GLOBAL.ioFitText(head, 14);
            this._waitLine.text = "";
            ArcadeNet.send({ "t": "q", "game": id, "mode": mode });
            if (this._ioBgButton) {
                this._ioBgButton.visible = true;
            }
        });
    }

    /** The socket's messages: the queue and match start here, the rest to the game. */
    private onNet(msg: any): void {
        if (!this.mc) {
            return;
        }
        let t: string = String(msg.t);
        if (t == "wait" && this._waitLine) {
            let n: int = ((msg.waiting | 0) - 1) | 0;
            this._waitLine.text = (n > 0 ? KEYS.Get("io_t3a_wait_more", { "v1": n, "v2": msg.seconds | 0 }) : KEYS.Get("io_t3a_wait_none", { "v1": msg.seconds | 0 })) + (msg.bot ? "\n" + KEYS.Get("io_t3a_wait_bot") : "");
            if (this._botButton) {
                this._botButton.visible = Boolean(msg.bot);
            }
            ArcadeWindow.ioChipWait(msg.seconds | 0, Boolean(msg.bot));
            return;
        }
        if (t == "lobby" && this._waitLine) {
            let players: any[] = as3.as(msg.players, Array);
            let startsIn: int = msg.startsIn | 0;
            let where: string = KEYS.Get(this._gameId == "fusebug" ? "io_t3a_lobby_maze" : "io_t3a_lobby_here", { "v1": players ? players.join(", ") : "" });
            let fill: string = KEYS.Get(this._gameId == "fusebug" ? "io_t3a_fill_corners" : "io_t3a_fill_places");
            this._waitLine.text = where + "\n" + (startsIn >= 0 ? KEYS.Get("io_t3a_starting_in", { "v1": Math.ceil(startsIn / 1000) }) : (msg.need ? KEYS.Get("io_t3a_need_more", { "v1": msg.need | 0, "v2": fill }) : KEYS.Get("io_t3a_need_one", { "v1": fill })));
            if (this._botButton && msg.bot != null) {
                this._botButton.visible = Boolean(msg.bot);
            }
            ArcadeWindow.ioChipWait(-1, Boolean(msg.bot));
            return;
        }
        if (t == "start") {
            // (QoL #373: found while waiting in the background: back to the window for it, when the player is in
            // their own yard; otherwise the match is left, and the chip says so)
            if (this._ioBackground && this._waiting) {
                if (!ArcadeWindow.ioCanReturn()) {
                    ArcadeNet.send({ "t": "x" });
                    this.ioMissed();
                    return;
                }
                this.ioFromBackground();
            }
            // (only while waiting for it: one that came after CANCEL or BACK opened a match the player had left,
            // which waited for an end that never came; 9 October)
            if (!this._waiting) {
                ArcadeNet.send({ "t": "x" });
                return;
            }
            this._ioPlayers = as3.as(msg.players, Array);
            if (this._gameId == "hellgate") {
                // the arenas are yards: the window closes and the run opens, linked to the other player's
                let gid: string = this._gameId;
                this._waiting = null;
                ArcadeNet.handler = null;
                this.closeKeepSocket();
                IoTdLink.Begin(msg);
                return;
            }
            this.startGame(String(msg.game), String(msg.mode), msg);
            return;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #367: a dropped connection's grace, this player's (ArcadeNet comes back) or the rival's)
            if (t == "reconnecting") {
                this.message(KEYS.Get("io_arc2_reconnecting", { "v1": msg.s | 0 }), CasinoUI.LOSS, 600);
                return;
            }
            if (t == "reconnected") {
                this.message(KEYS.Get("io_arc2_reconnected"), CasinoUI.GOLD, 160);
                return;
            }
            if (t == "away") {
                this.message(KEYS.Get("io_arc2_away", { "v1": this.ioPlayerName(msg.i | 0), "v2": msg.s | 0 }), CasinoUI.GOLD, 600);
                return;
            }
            if (t == "back") {
                this.message(KEYS.Get("io_arc2_back", { "v1": this.ioPlayerName(msg.i | 0) }), CasinoUI.GOLD, 160);
                return;
            }
        }
        if (t == "err") {
            this.message(String(msg.msg), CasinoUI.LOSS, 160);
            if (this._waitLine && !this._game) {
                this._waitLine.text = String(msg.msg);
            }
            return;
        }
        if (this._game) {
            this._game.onNet(msg);
        }
    }

    private onLost(message: string): void {
        if (!this.mc) {
            return;
        }
        // (QoL #373: the chip says so; a click on it brings the window back)
        if (this._ioBackground) {
            ArcadeWindow.ioChipNote(KEYS.Get("io_op3_arc_chip_lost"), false);
        }
        this.message(message, CasinoUI.LOSS, 200);
        if (this._game && !this._game.ended) {
            this._game.onNet({ "t": "lost" });
        }
        if (this._waitLine && !this._game) {
            this._waitLine.text = message;
        }
    }

    /** Out of a queue or a live match (back to a page, the lobby, or closing). */
    private leaveLive(): void {
        if (ArcadeNet.connected) {
            ArcadeNet.send({ "t": "x" });
        }
    }

    private closeKeepSocket(): void {
        this.dispose();
    }

    public close(e: MouseEvent = null): void {
        // (Inferno-only, QoL #368: the X during a game asks first: a match against someone counts as lost)
        if (GLOBAL.INFERNO_ONLY && e != null && this._game && !this._game.ended) {
            GLOBAL.ioDanger(KEYS.Get("io_arcade_leave_ask"), KEYS.Get("io_arcade_leave"), (): void => {
                this.close(null);
            }, null, KEYS.Get("io_arcade_keep"));
            return;
        }
        this.leaveLive();
        ArcadeNet.close();
        this.dispose();
    }

    private dispose(): void {
        // (QoL #373: waiting in the background: no blocker or chat lift of its own to take away)
        let ioAway: boolean = this._ioBackground;
        this._ioBackground = false;
        if (ArcadeWindow._open == this) {
            ArcadeWindow.ioChipHide();
        }
        this.endGame();
        if (this._stage) {
            this._stage.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onKeyDown));
            this._stage.removeEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.onKeyUp));
            this._stage.removeEventListener(Event.DEACTIVATE, as3.bind(this, this.onDeactivate));
            this._stage = null;
        }
        if (this.mc) {
            this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.frame));
            if (this.mc.parent) {
                this.mc.parent.removeChild(this.mc);
            }
            if (!ioAway) {
                GLOBAL.BlockerRemove();
                IoChatLift.drop();
            }
        }
        this.mc = null;
        if (ArcadeWindow._open == this) {
            ArcadeWindow._open = null;
        }
    }

    // ---- Inferno-only (QoL #373): waiting for a match in the background
    /** The chip's width (UI_TOP places it: ioChipIn). */
    public static readonly IO_CHIP_W: int = 226;

    private static _ioChip: Sprite = null;

    private static _ioChipText: TextField = null;

    private static _ioChipCancel: Sprite = null;

    private static _ioChipTimer: Timer = null;

    /** Where UI_TOP wants the chip (its top bar, at x, y), or null: the top of the screen, in the middle. */
    private static _ioChipHost: DisplayObjectContainer = null;

    private static _ioChipX: number = 0;

    private static _ioChipY: number = 0;

    /** The game waited for ("Spurtz Smash"), the seconds waited as the server last said and when (getTimer), a bot offered. */
    private static _ioChipGame: string = "";

    private static _ioChipSeconds: int = 0;

    private static _ioChipSince: int = 0;

    private static _ioChipBot: boolean = false;

    /** A line in place of the wait (connection lost, match missed), and whether the chip goes after it (getTimer; 0: stays). */
    private static _ioChipNote: string = null;

    private static _ioChipUntil: int = 0;

    /**
     * Inferno-only (QoL #373): UI_TOP's hook: the chip goes in `host` (the top bar) at x, y while a wait is in the
     * background. Called each time the bar lays itself out; harmless when nothing waits.
     */
    public static ioChipIn(host: DisplayObjectContainer, x: number, y: number): void {
        ArcadeWindow._ioChipHost = host;
        ArcadeWindow._ioChipX = x;
        ArcadeWindow._ioChipY = y;
        ArcadeWindow.ioChipPlace();
    }

    /** True while a match is waited for in the background (the chip is up). */
    public static get ioWaitingInBackground(): boolean {
        return ArcadeWindow._open != null && ArcadeWindow._open._ioBackground;
    }

    /** The window can come back now: the player's own yard, not loading, no map, no attack. */
    private static ioCanReturn(): boolean {
        return GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !GLOBAL.isMapOpen() && !BASE._loading && !WMATTACK._inProgress && !BASE.ioAttackRunning() && !IoTd.on && !IoSiege.attacking;
    }

    /** Wait in the background: the window off the screen (its socket, queue and state kept), the chip up. */
    private ioToBackground(): void {
        if (!GLOBAL.INFERNO_ONLY || !this.mc || !this._waiting || this._game || this._ioBackground) {
            return;
        }
        SOUNDS.Play("click1");
        this._ioBackground = true;
        this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.frame));
        if (this.mc.parent) {
            this.mc.parent.removeChild(this.mc);
        }
        GLOBAL.BlockerRemove();
        IoChatLift.drop();
        let g: any = ArcadeWindow.gameInfo(this._gameId);
        ArcadeWindow._ioChipGame = g ? String(g.name) : String(this._gameId);
        ArcadeWindow._ioChipSeconds = 0;
        ArcadeWindow._ioChipSince = getTimer();
        ArcadeWindow._ioChipBot = this._botButton ? this._botButton.visible : false;
        ArcadeWindow._ioChipNote = null;
        ArcadeWindow._ioChipUntil = 0;
        ArcadeWindow.ioChipShow();
    }

    /** Back on the screen as it was (from the chip, the arcade's building, or a match found). */
    private ioFromBackground(): void {
        if (!this._ioBackground || !this.mc) {
            return;
        }
        if (!ArcadeWindow.ioCanReturn()) {
            GLOBAL.Message(KEYS.Get("io_op3_arc_notnow"));
            return;
        }
        this._ioBackground = false;
        ArcadeWindow.ioChipHide();
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
        IoChatLift.lift();
        this._last = getTimer();
        this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.frame));
    }

    /** A match came while the player was busy: left; the window goes and the chip says so for a while. */
    private ioMissed(): void {
        let note: string = KEYS.Get("io_op3_arc_chip_missed", { "v1": ArcadeWindow._ioChipGame });
        this._waiting = null;
        ArcadeNet.handler = null;
        ArcadeNet.close();
        this.dispose();
        ArcadeWindow.ioChipNote(note, true);
    }

    /** The server's "wait" (seconds waited; -1: a lobby's line, no count) and whether a bot can be played now. */
    private static ioChipWait(seconds: int, bot: boolean): void {
        if (seconds >= 0) {
            ArcadeWindow._ioChipSeconds = seconds;
            ArcadeWindow._ioChipSince = getTimer();
        }
        ArcadeWindow._ioChipBot = bot;
        ArcadeWindow.ioChipTick();
    }

    private static ioChipNote(text: string, goes: boolean): void {
        ArcadeWindow._ioChipNote = text;
        ArcadeWindow._ioChipUntil = goes ? (getTimer() + 12000) | 0 : 0;
        ArcadeWindow.ioChipShow();
    }

    /** The chip: dark glass with a neon rim, "Spurtz Smash · waiting 1:12", ✕ to leave the queue. */
    private static ioChipShow(): void {
        if (!ArcadeWindow._ioChip) {
            let chip: Sprite = new Sprite();
            chip.name = "ioArc3QueueChip";
            chip.buttonMode = true;
            chip.graphics.lineStyle(1.5, 0xFF2A6A, 0.9);
            chip.graphics.beginFill(0x1A0606, 0.92);
            chip.graphics.drawRoundRect(0, 0, ArcadeWindow.IO_CHIP_W, 26, 12, 12);
            chip.graphics.endFill();
            chip.filters = [new GlowFilter(0xFF2A6A, 0.45, 6, 6, 2, 1)];
            let text: TextField = CasinoUI.label("", 11, 16777215, true, (ArcadeWindow.IO_CHIP_W - 34) | 0, TextFormatAlign.LEFT);
            text.name = "ioArc3ChipText";
            text.mouseEnabled = false;
            text.x = 10;
            text.y = 4;
            chip.addChild(text);
            let cancel: Sprite = new Sprite();
            cancel.name = "ioArc3ChipCancel";
            cancel.buttonMode = true;
            cancel.graphics.beginFill(0, 0);
            cancel.graphics.drawRect(0, 0, 22, 22);
            cancel.graphics.endFill();
            cancel.graphics.lineStyle(2, 0xFFB0C8, 1);
            cancel.graphics.moveTo(7, 7);
            cancel.graphics.lineTo(15, 15);
            cancel.graphics.moveTo(15, 7);
            cancel.graphics.lineTo(7, 15);
            cancel.x = ArcadeWindow.IO_CHIP_W - 24;
            cancel.y = 2;
            chip.addChild(cancel);
            cancel.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                e.stopPropagation();
                SOUNDS.Play("close");
                // (leave the queue: the window, kept off the screen, closes)
                let w: ArcadeWindow = ArcadeWindow._open;
                if (w && w._ioBackground) {
                    w.close();
                }
                ArcadeWindow.ioChipHide();
            });
            chip.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                let w: ArcadeWindow = ArcadeWindow._open;
                if (w && w._ioBackground) {
                    w.ioFromBackground();
                } else {
                    // (only a note was left: the arcade, from the start)
                    ArcadeWindow.ioChipHide();
                }
            });
            ArcadeWindow._ioChip = chip;
            ArcadeWindow._ioChipText = text;
            ArcadeWindow._ioChipCancel = cancel;
        }
        if (!ArcadeWindow._ioChipTimer) {
            ArcadeWindow._ioChipTimer = new Timer(500);
            ArcadeWindow._ioChipTimer.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
                ArcadeWindow.ioChipTick();
            });
        }
        ArcadeWindow._ioChipTimer.start();
        ArcadeWindow.ioChipPlace();
        ArcadeWindow.ioChipTick();
    }

    /** In the top bar where UI_TOP said, else at the top of the screen in the middle (put back if a layer was redrawn). */
    private static ioChipPlace(): void {
        let chip: Sprite = ArcadeWindow._ioChip;
        if (!chip || !ArcadeWindow._ioChipTimer || !ArcadeWindow._ioChipTimer.running) {
            return;
        }
        let host: DisplayObjectContainer = ArcadeWindow._ioChipHost && ArcadeWindow._ioChipHost.stage ? ArcadeWindow._ioChipHost : GLOBAL._layerUI;
        if (!host) {
            return;
        }
        if (chip.parent != host) {
            if (chip.parent) {
                chip.parent.removeChild(chip);
            }
            host.addChild(chip);
        } else {
            host.setChildIndex(chip, (host.numChildren - 1) | 0);
        }
        if (host == ArcadeWindow._ioChipHost) {
            chip.x = ArcadeWindow._ioChipX;
            chip.y = ArcadeWindow._ioChipY;
        } else {
            chip.x = Math.round(GLOBAL._SCREENCENTER.x - ArcadeWindow.IO_CHIP_W / 2);
            chip.y = Math.round(GLOBAL._SCREEN.y + 78);
        }
    }

    private static ioChipTick(): void {
        let chip: Sprite = ArcadeWindow._ioChip;
        if (!chip || !ArcadeWindow._ioChipTimer || !ArcadeWindow._ioChipTimer.running) {
            return;
        }
        if (ArcadeWindow._ioChipUntil > 0 && getTimer() > ArcadeWindow._ioChipUntil) {
            ArcadeWindow.ioChipHide();
            return;
        }
        if (!chip.stage) {
            ArcadeWindow.ioChipPlace();
        }
        let waiting: boolean = ArcadeWindow.ioWaitingInBackground;
        ArcadeWindow._ioChipCancel.visible = waiting;
        if (ArcadeWindow._ioChipNote) {
            ArcadeWindow._ioChipText.text = ArcadeWindow._ioChipNote;
        } else {
            let sec: int = (ArcadeWindow._ioChipSeconds + (getTimer() - ArcadeWindow._ioChipSince) / 1000) | 0;
            let time: string = ((sec / 60) | 0) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60);
            ArcadeWindow._ioChipText.text = KEYS.Get(ArcadeWindow._ioChipBot ? "io_op3_arc_chip_bot" : "io_op3_arc_chip_wait", { "v1": ArcadeWindow._ioChipGame, "v2": time });
        }
        GLOBAL.ioFitText(ArcadeWindow._ioChipText, 8);
        // (nothing waits and no note: gone)
        if (!waiting && !ArcadeWindow._ioChipNote) {
            ArcadeWindow.ioChipHide();
        }
    }

    private static ioChipHide(): void {
        if (ArcadeWindow._ioChipTimer) {
            ArcadeWindow._ioChipTimer.stop();
        }
        ArcadeWindow._ioChipNote = null;
        ArcadeWindow._ioChipUntil = 0;
        if (ArcadeWindow._ioChip && ArcadeWindow._ioChip.parent) {
            ArcadeWindow._ioChip.parent.removeChild(ArcadeWindow._ioChip);
        }
    }
}

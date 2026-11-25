import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { POPUPS, ARCADE, ATTACK, ArcadeWindow, BASE, BFOUNDATION, CasinoUI, CellData, EnumYardType, GLOBAL, InstanceManager, KEYS, SecNum, WMATTACK } from "@game";

/**
 * Inferno-only: Siege, the Devil's Arcade's attack game (server/src/services/arcade/siege.ts). A yard (one of
 * Moloch's strongholds) and an army that are the arcade's, the same for everyone who plays them: the player's
 * own monsters and champions stay home, nothing is used, lost or won. Wreck as much as possible, as fast as
 * possible (the clock starts with the first monster flung).
 *
 *  - Daily: one yard and army a day, three tries, the best counts on the day's board.
 *  - Duel: challenge a player by name (or anyone: an open duel); both attack the same yard with the same army.
 *
 * Its page is in the arcade's window (Draw). An attack is an ordinary "wmattack" on the player's siege yard:
 * the army in ATTACK._curCreaturesAvailable, no cells in range (so no monsters are taken from any yard), no
 * champions, no catapult, the arcade's flinger, its monsters at the army's level (ATTACK.Spawn asks `level`),
 * three minutes. The attack's end (popup_attackend) says how it went; home, the result goes to the server and
 * the arcade opens again on Siege.
 */
export class IoSiege extends ASObject {
    /** An attack is being made (from the start to home again). */
    public static attacking: boolean = false;

    private static _attack: any = null;

    private static _firstFling: int = 0;

    private static _endedAt: int = 0;

    private static _pct: number = 0;

    private static _result: any = null;

    private static _showOnHome: boolean = false;

    private static _champions: Vector<any> = null;

    /** The flinger an attack has (the Compound's top capacity, 1820 housing). */
    public static readonly FLINGER: int = 6;

    private static readonly NAMES: any = { "IC1": "Spurtz", "IC2": "Zagnoid", "IC3": "Malphus", "IC4": "Valgos", "IC5": "Balthazar", "IC6": "Grokus", "IC7": "Sabnox", "IC8": "King Wormzer", "IC12": "Clinkerjaw", "IC14": "Flickerfiend", "IC15": "Fusebug", "IC20": "Emberghoul" };

    // ---- the page in the arcade's window
    private static _win: ArcadeWindow = null;

    private static _box: Sprite = null;

    private static _mode: string = "daily";

    private static _status: any = null;

    private static _busy: boolean = false;

    private static _resultMode: string = "daily";

    /** Draws Siege's page (Daily or Duel) into the window's area. */
    public static Draw(win: ArcadeWindow, area: Sprite, mode: string): void {
        IoSiege._win = win;
        IoSiege._mode = mode;
        // (one page at a time: drawn again, the old one stayed under it; 9 October)
        if (IoSiege._box && IoSiege._box.parent) {
            IoSiege._box.parent.removeChild(IoSiege._box);
        }
        IoSiege._box = new Sprite();
        IoSiege._box.name = "siegePage";
        area.addChild(IoSiege._box);
        // (QoL #235: Siege's words in the player's language; the monsters' names stay as they are)
        let loading: TextField = CasinoUI.label(KEYS.Get("io_t3a_si_scouting"), 14, CasinoUI.ASH, true, 720, TextFormatAlign.CENTER);
        loading.y = 180;
        IoSiege._box.addChild(loading);
        ARCADE.call("siege", [["op", "status"]], (r: any): void => {
            if (!IoSiege._box || !IoSiege._box.parent) {
                return;
            }
            CasinoUI.removeAll(IoSiege._box);
            if (r.error) {
                let err: TextField = CasinoUI.label(String(r.error), 13, CasinoUI.LOSS, true, 720, TextFormatAlign.CENTER);
                err.y = 180;
                IoSiege._box.addChild(err);
                return;
            }
            IoSiege._status = r;
            if (mode == "daily") {
                IoSiege.drawDaily(r);
            } else {
                IoSiege.drawDuels(r);
            }
            if (IoSiege._result) {
                let res: any = IoSiege._result;
                IoSiege._result = null;
                win.message(res.error ? String(res.error) : KEYS.Get("io_t3a_si_result", { "v1": IoSiege.pctText(Number(res.pct)), "v2": IoSiege.timeText(res.tenths | 0) }), res.error ? CasinoUI.LOSS : CasinoUI.GOLD, 400);
            }
        });
    }

    private static heading(text: string, x: int, y: int, w: int): void {
        let t: TextField = CasinoUI.label(text, 18, 16777215, false, w, TextFormatAlign.LEFT, "Groboldov");
        t.height = 28;
        t.x = x;
        t.y = y;
        t.filters = [new GlowFilter(0x6A1404, 1, 4, 4, 6, 2)];
        IoSiege._box.addChild(t);
    }

    private static line(text: string, x: int, y: int, w: int, size: int = 12, color: uint = 15655632): TextField {
        let t: TextField = CasinoUI.label(text, size, color, true, w, TextFormatAlign.LEFT);
        t.multiline = true;
        t.wordWrap = true;
        t.height = size * 3 + 10;
        t.x = x;
        t.y = y;
        IoSiege._box.addChild(t);
        return t;
    }

    /** Inferno-only (QoL #235): a line() drawn smaller while it takes more lines than its field was made for (a longer translation). */
    private static ioFitLines(t: TextField, lines: int, smallest: int = 9): void {
        if (!GLOBAL.INFERNO_ONLY || !t) {
            return;
        }
        let f: any = t.getTextFormat();
        let size: int = f.size | 0;
        while (size > smallest && t.numLines > lines) {
            size--;
            f.size = size;
            t.setTextFormat(f);
        }
    }

    /** The army: a portrait and a count for each kind. */
    private static army(spec: any, x: int, y: int, w: int): void {
        let ids: any[] = [];
        for (let id in spec.army) {
            ids.push(id);
        }
        as3.sort(ids);
        let cw: int = Math.min(86, (w / Math.max(1, ids.length)) | 0) | 0;
        let i: int = 0;
        while (i < ids.length) {
            let cell: Sprite = new Sprite();
            cell.x = x + i * cw;
            cell.y = y;
            CasinoUI.picture(cell, "arcade/portraits/" + ids[i] + ".png", (cw - 60) / 2, 0, 60, 60);
            let n: TextField = CasinoUI.label("x" + (spec.army[ids[i]] | 0), 13, CasinoUI.GOLD, true, cw, TextFormatAlign.CENTER);
            n.y = 58;
            n.filters = [new GlowFilter(0, 1, 3, 3, 6, 1)];
            cell.addChild(n);
            let nm: TextField = CasinoUI.label(String(IoSiege.NAMES[ids[i]] || ids[i]), 9, CasinoUI.ASH, true, cw, TextFormatAlign.CENTER);
            nm.y = 76;
            cell.addChild(nm);
            IoSiege._box.addChild(cell);
            i++;
        }
    }

    private static drawDaily(r: any): void {
        let d: any = r.daily;
        let p: Sprite = CasinoUI.panel(720, 412, 0.9);
        p.y = 4;
        IoSiege._box.addChild(p);
        IoSiege.heading(KEYS.Get("io_t3a_si_today"), 20, 14, 400);
        IoSiege.ioFitLines(IoSiege.line(KEYS.Get("io_t3a_si_daily_about", { "v1": d.stronghold | 0, "v2": d.level | 0 }), 20, 46, 680), 3);
        IoSiege.army(d, 20, 100, 680);
        let best: string = d.best ? KEYS.Get("io_t3a_si_best", { "v1": IoSiege.pctText(Number(d.best.pct)), "v2": IoSiege.timeText(d.best.tenths | 0) }) : KEYS.Get("io_t3a_si_none");
        IoSiege.line(best, 20, 206, 680, 14, CasinoUI.GOLD).name = "siegeBest";
        IoSiege.line(KEYS.Get("io_t3a_si_tries", { "v1": d.triesLeft | 0, "v2": GLOBAL.ioNewDayLine() }), 20, 230, 680, 12, ((d.triesLeft | 0) > 0 ? 0xFFFFFF : CasinoUI.LOSS) >>> 0).name = "siegeTries";
        // (QoL #538: a try cut short by a crash or a reload before it wrecked anything isn't counted: said under the
        // tries, left of ATTACK!)
        if (GLOBAL.INFERNO_ONLY && d.givenBack) {
            let back: TextField = IoSiege.line(KEYS.Get("io_arc2_siege_back"), 20, 250, 225, 10, CasinoUI.GOLD);
            back.name = "ioArc2SiegeBack";
        }
        let go: Sprite = CasinoUI.button(KEYS.Get("io_t3a_si_attack_go"), 220, 46, (e: MouseEvent): void => {
            IoSiege.start([["op", "daily"]]);
        }, (d.triesLeft | 0) > 0, 18);
        go.name = "siegeAttack";
        go.x = 250;
        go.y = 270;
        IoSiege._box.addChild(go);
        let back: Sprite = ArcadeWindow.ioFitButton(CasinoUI.button(KEYS.Get("io_t3a_back"), 80, 26, (e: MouseEvent): void => {
            IoSiege._win.page("siege");
        }, true, 12));
        back.name = "siegeBack";
        back.x = 20;
        back.y = 374;
        IoSiege._box.addChild(back);
    }

    private static drawDuels(r: any): void {
        let nameBox: TextField = null;
        let state: string = null;
        let p: Sprite = CasinoUI.panel(720, 412, 0.9);
        p.y = 4;
        IoSiege._box.addChild(p);
        IoSiege.heading(KEYS.Get("io_t3a_si_duels"), 20, 12, 300);
        IoSiege.ioFitLines(IoSiege.line(KEYS.Get("io_t3a_si_duels_about"), 20, 42, 680, 11), 3);
        // challenge
        nameBox = CasinoUI.input(180, 26, "", 24, null);
        nameBox.name = "siegeName";
        nameBox.x = 20;
        nameBox.y = 86;
        IoSiege._box.addChild(nameBox);
        let ch: Sprite = CasinoUI.button(KEYS.Get("io_t3a_si_challenge"), 130, 28, (e: MouseEvent): void => {
            let n: string = nameBox.text.replace(/^\s+|\s+$/g, "");
            if (!n) {
                IoSiege._win.message(KEYS.Get("io_t3a_si_type_name"), CasinoUI.LOSS, 160);
                return;
            }
            IoSiege.start([["op", "challenge"], ["name", n]]);
        }, true, 13);
        ArcadeWindow.ioFitButton(ch);
        ch.name = "siegeChallenge";
        ch.x = 208;
        ch.y = 85;
        IoSiege._box.addChild(ch);
        let open: Sprite = CasinoUI.button(KEYS.Get("io_t3a_si_open_duel"), 130, 28, (e: MouseEvent): void => {
            IoSiege.start([["op", "challenge"], ["name", ""]]);
        }, true, 13);
        ArcadeWindow.ioFitButton(open);
        open.name = "siegeOpenDuel";
        open.x = 346;
        open.y = 85;
        IoSiege._box.addChild(open);
        IoSiege.line(KEYS.Get("io_t3a_si_open_note"), 484, 90, 230, 10, CasinoUI.ASH);
        // the player's duels
        let y: int = 124;
        IoSiege.line(KEYS.Get("io_t3a_si_your_duels"), 20, y, 300, 11, CasinoUI.ASH);
        y += 18;
        let duels: any[] = as3.as(r.duels, Array);
        // (QoL #366: the rivals given a REMATCH button already, lower-cased)
        let rematched: any = {};
        if (!duels || !duels.length) {
            IoSiege.line(KEYS.Get("io_t3a_si_none_yet"), 20, y, 400, 12, CasinoUI.ASH);
            y += 22;
        }
        for (let d of as3.values(duels)) {
            if (y > 330) {
                break;
            }
            let who: string = d.rival ? String(d.rival) : KEYS.Get("io_t3a_si_open_anyone");
            if (d.state == "done") {
                state = KEYS.Get((d.won | 0) > 0 ? "io_t3a_si_won" : ((d.won | 0) < 0 ? "io_t3a_si_lost" : "io_t3a_si_draw")) + "  ·  " + KEYS.Get("io_t3a_si_you_v", { "v1": IoSiege.pctText(Number(d.you.pct)), "v2": IoSiege.pctText(Number(d.them.pct)) });
            } else if (d.state == "expired") {
                state = KEYS.Get("io_t3a_si_expired");
            } else if (!d.you) {
                state = KEYS.Get(d.them ? (d.them.pending ? "io_t3a_si_they_attacking" : "io_t3a_si_they_attacked") : "io_t3a_si_your_turn");
            } else if (d.you.pending) {
                state = KEYS.Get("io_t3a_si_under_way");
            } else {
                state = KEYS.Get("io_t3a_si_waiting_them", { "v1": IoSiege.pctText(Number(d.you.pct)), "v2": IoSiege.timeText(d.you.tenths | 0) });
            }
            // (Inferno-only, QoL #132: a duel not answered yet says how long it waits: "· 2d 5h left")
            let left: string = GLOBAL.INFERNO_ONLY ? IoSiege.ioLeftText(d, r) : "";
            let row: TextField = IoSiege.line(KEYS.Get(d.youChallenged ? "io_t3a_si_row_you_v" : "io_t3a_si_row_v_you", { "v1": who, "v2": state }) + left, 20, y, 520, 12, (d.state == "done" ? ((d.won | 0) > 0 ? CasinoUI.WIN : ((d.won | 0) < 0 ? CasinoUI.LOSS : CasinoUI.GOLD)) : 0xEEE2D0) >>> 0);
            row.height = 20;
            if (left != "") {
                row.name = "ioSiegeDuelLeft:" + d.id;
                GLOBAL.ioFitText(row, 9);
            }
            if (d.canAttack) {
                let a: Sprite = CasinoUI.button(KEYS.Get("io_t3a_si_attack"), 110, 24, IoSiege.attackDuel(d.id | 0), true, 12);
                ArcadeWindow.ioFitButton(a);
                a.name = "siegeDuel:" + d.id;
                a.x = 590;
                a.y = y - 2;
                IoSiege._box.addChild(a);
            } else if (GLOBAL.INFERNO_ONLY && d.state == "done" && d.rival && !rematched[String(d.rival).toLowerCase()]) {
                // (QoL #366: a finished duel against a named player: REMATCH challenges them again, as CHALLENGE with
                // their name does (a new yard, the challenger attacks first); the newest duel with each rival only)
                rematched[String(d.rival).toLowerCase()] = true;
                let again: Sprite = CasinoUI.button(KEYS.Get("io_arc_rematch"), 110, 24, IoSiege.rematch(String(d.rival)), true, 12);
                again.name = "ioArcRematch:" + d.id;
                again.x = 590;
                again.y = y - 2;
                IoSiege._box.addChild(again);
            }
            y += 24;
        }
        // open duels to take
        let opens: any[] = as3.as(r.open, Array);
        if (opens && opens.length) {
            y += 6;
            IoSiege.line(KEYS.Get("io_t3a_si_open_duels"), 20, y, 300, 11, CasinoUI.ASH);
            y += 18;
            for (let o of as3.values(opens)) {
                if (y > 360) {
                    break;
                }
                let oLeft: string = GLOBAL.INFERNO_ONLY ? IoSiege.ioLeftText(o, r) : "";
                let t: TextField = IoSiege.line(KEYS.Get("io_t3a_si_open_row", { "v1": String(o.challenger), "v2": o.result ? IoSiege.pctText(Number(o.result.pct)) : "?" }) + oLeft, 20, y, 520, 12);
                t.height = 20;
                if (oLeft != "") {
                    t.name = "ioSiegeOpenLeft:" + o.id;
                    GLOBAL.ioFitText(t, 9);
                }
                let take: Sprite = CasinoUI.button(KEYS.Get("io_t3a_si_take"), 110, 24, IoSiege.attackDuel(o.id | 0), true, 12);
                ArcadeWindow.ioFitButton(take);
                take.name = "siegeTake:" + o.id;
                take.x = 590;
                take.y = y - 2;
                IoSiege._box.addChild(take);
                y += 24;
            }
        }
        let back: Sprite = ArcadeWindow.ioFitButton(CasinoUI.button(KEYS.Get("io_t3a_back"), 80, 26, (e: MouseEvent): void => {
            IoSiege._win.page("siege");
        }, true, 12));
        back.name = "siegeBack";
        back.x = 20;
        back.y = 382;
        IoSiege._box.addChild(back);
    }

    /**
     * Inferno-only (QoL #132): "  ·  2d 5h left" for a duel (or an open one) that waits for an answer (the server's
     * `expires`, by its clock `now`), "" for one that doesn't.
     */
    public static ioLeftText(d: any, r: any): string {
        let at: number = d ? Number(d.expires) || 0 : 0;
        if (at <= 0 || d.state == "done" || d.state == "expired") {
            return "";
        }
        let now: number = r && r.now ? Number(r.now) : GLOBAL.Timestamp();
        return "  ·  " + KEYS.Get("io_away_duel_left", { "v1": GLOBAL.ioDuration(Math.max(0, at - now)) });
    }

    /**
     * Inferno-only (QoL #132): the duels in a Siege status (op status) waiting for the player's attack: { n, first:
     * the rival of the one that expires first, left: seconds until it does (0: unknown) }.
     */
    public static ioTurns(r: any): any {
        let out: any = { "n": 0, "first": "", "left": 0 };
        let now: number = r && r.now ? Number(r.now) : GLOBAL.Timestamp();
        for (let d of as3.values(r ? as3.as(r.duels, Array) || [] : [])) {
            if (!d || !d.canAttack || d.state == "done" || d.state == "expired") {
                continue;
            }
            out.n++;
            let left: number = Number(d.expires) > 0 ? Math.max(0, Number(d.expires) - now) : 0;
            if (out.n == 1 || (left > 0 && (out.left == 0 || left < out.left))) {
                out.left = left;
                out.first = d.rival ? String(d.rival) : "";
            }
        }
        return out;
    }

    /** Inferno-only (QoL #366): a new duel against the same rival (the server's challenge, by name). */
    public static rematch(rival: string): Function {
        return (e: MouseEvent): void => {
            IoSiege.start([["op", "challenge"], ["name", rival]]);
        };
    }

    private static attackDuel(id: int): Function {
        return (e: MouseEvent): void => {
            IoSiege.start([["op", "answer"], ["id", id]]);
        };
    }

    /** Asks the server for an attack, then goes to it. */
    private static start(vars: any[]): void {
        if (IoSiege._busy) {
            return;
        }
        if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
            IoSiege._win.message(KEYS.Get("io_t3a_attacked"), CasinoUI.LOSS, 160);
            return;
        }
        IoSiege._busy = true;
        IoSiege._win.message(KEYS.Get("io_t3a_si_marching"), CasinoUI.ASH);
        ARCADE.call("siege", vars, (r: any): void => {
            IoSiege._busy = false;
            if (r.error) {
                if (IoSiege._win) {
                    IoSiege._win.message(String(r.error), CasinoUI.LOSS, 220);
                }
                return;
            }
            IoSiege.attack(r);
        });
    }

    // ---- the attack
    /** The army's level for a monster flung in a Siege (ATTACK.Spawn), or 0 (the usual rule). */
    public static level(id: string): int {
        return IoSiege.attacking && IoSiege._attack ? IoSiege._attack.level | 0 : 0;
    }

    /** A monster was flung (ATTACK.Spawn): the clock starts with the first. */
    public static flung(): void {
        if (IoSiege.attacking && IoSiege._firstFling == 0) {
            IoSiege._firstFling = getTimer();
        }
    }

    /** The attack's time and flinger (GLOBAL.Setup, as the yard loads). */
    public static setupAttack(): void {
        if (!IoSiege.attacking || !IoSiege._attack) {
            return;
        }
        GLOBAL._attackersCatapult = 0;
        GLOBAL._attackersFlinger = IoSiege.FLINGER;
        ATTACK._countdown = IoSiege._attack.seconds | 0;
    }

    public static inAttack(): boolean {
        return IoSiege.attacking && (GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL._loadmode == GLOBAL.e_BASE_MODE.WMATTACK);
    }

    private static attack(r: any): void {
        IoSiege._attack = r;
        IoSiege._firstFling = 0;
        IoSiege._endedAt = 0;
        IoSiege._pct = 0;
        IoSiege.attacking = true;
        // the army, no one else's: no cells in range (nothing taken from any yard), no champions, no resources
        ATTACK._curCreaturesAvailable = new Array();
        for (let id in r.army) {
            ATTACK._curCreaturesAvailable[id] = r.army[id] | 0;
        }
        IoSiege._champions = GLOBAL._playerGuardianData;
        GLOBAL._playerGuardianData = new Vector<any>(0, false, Object);
        GLOBAL._attackerMapResources = { "r1": 0, "r2": 0, "r3": 0, "catapult": new SecNum(0), "flinger": new SecNum(IoSiege.FLINGER) };
        GLOBAL._attackerCellsInRange = new Vector<CellData>(0, true, CellData);
        GLOBAL._currentCell = null;
        if (IoSiege._win) {
            IoSiege._win.close();
        }
        BASE.LoadBase(null, 0, Number(r.baseid), "wmattack", false, EnumYardType.MAIN_YARD);
    }

    /** How much is wrecked, as the attack's end works it out (walls aside). */
    private static wrecked(): number {
        let health: number = 0;
        let max: number = 0;
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b._class != "wall" && (b._type == 53 && b._expireTime < GLOBAL.Timestamp()) === false) {
                health += b.health;
                max += b.maxHealth;
            }
        }
        return Number(max > 0 ? Math.round(1000 - 1000 / max * health) / 10 : 0);
    }

    /** The attack's end window's words (popup_attackend): the clock stops here. */
    public static endTitle(success: boolean): string {
        if (!IoSiege._endedAt) {
            IoSiege._endedAt = getTimer();
            IoSiege._pct = IoSiege.wrecked();
        }
        return KEYS.Get(IoSiege._pct >= 100 ? "io_t3a_si_flattened" : "io_t3a_si_over");
    }

    public static endMessage(success: boolean): string {
        return KEYS.Get("io_t3a_si_end_msg", { "v1": IoSiege.pctText(IoSiege._pct), "v2": IoSiege.timeText(IoSiege.tenths()) });
    }

    private static tenths(): int {
        if (!IoSiege._firstFling) {
            return (IoSiege._attack ? (IoSiege._attack.seconds | 0) * 10 : 0) | 0;
        }
        return Math.max(0, (((IoSiege._endedAt ? IoSiege._endedAt : getTimer()) - IoSiege._firstFling) / 100) | 0) | 0;
    }

    /** The end window's button: the result to the server, home, and the arcade on Siege. */
    public static ReturnHome(): void {
        let a: any = null;
        if (!IoSiege._endedAt) {
            IoSiege.endTitle(false);
        }
        a = IoSiege._attack;
        let pct: number = IoSiege._pct;
        let t: int = IoSiege.tenths();
        IoSiege._showOnHome = true;
        IoSiege.restore();
        BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
        if (a) {
            ARCADE.call("siege", [["op", "finish"], ["attack", a.attack | 0], ["pct", pct], ["tenths", t]], (r: any): void => {
                IoSiege._result = r.error ? { "error": r.error } : r.result;
                IoSiege._resultMode = String(a.mode);
                if (ArcadeWindow.isOpen && IoSiege._box && IoSiege._box.stage && IoSiege._win && IoSiege._win.mc && IoSiege._win.mc.stage) {
                    // (the arcade opened before the answer came: its page again, in the window open now; a
                    // window closed meanwhile kept the page, which was drawn into it unseen; 9 October)
                    IoSiege._win.siegeView(IoSiege._resultMode);
                }
            });
        }
    }

    private static restore(): void {
        IoSiege.attacking = false;
        if (IoSiege._champions) {
            GLOBAL._playerGuardianData = IoSiege._champions;
            IoSiege._champions = null;
        }
    }

    /** Home again (BASE): the arcade opens on Siege. */
    public static AfterHome(): void {
        if (IoSiege.attacking && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            // (home without the end window: the game was left mid-attack)
            IoSiege.restore();
        }
        if (IoSiege._showOnHome && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYardOrInfernoMainYard) {
            IoSiege._showOnHome = false;
            let ioMode: string = IoSiege._attack ? String(IoSiege._attack.mode) : "daily";
            POPUPS.ioWhenClear((): void => { ArcadeWindow.ShowSiege(ioMode); }); // (QoL #462)
        }
    }

    public static pctText(p: number): string {
        return (Math.round(p * 10) / 10) + "%";
    }

    public static timeText(tenths: int): string {
        let s: number = tenths / 10;
        let m: int = (s / 60) | 0;
        let sec: number = s - m * 60;
        let ss: string = (Math.round(sec * 10) / 10).toFixed(1);
        return m + ":" + (sec < 10 ? "0" : "") + ss;
    }
}

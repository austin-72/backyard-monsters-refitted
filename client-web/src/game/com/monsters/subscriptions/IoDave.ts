import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { getTimer } from "flash/utils";
import { CASINO, GLOBAL, KEYS, URLLoaderApi } from "@game";

/**
 * Inferno-only (10 October): the D.A.V.E. Club's choices besides the ground (the server: services/yard/dave.ts).
 *
 *  - mine: the player's own (the flag io_dave): their chat name's colour, their workers' look, their champions'
 *    looks, and what they may choose (the colours; the frozen looks once Hell Freezes Over's last wave is won)
 *  - yard: the loaded yard's owner's looks (io_dave with the yard's load), which everyone looking at it sees
 *
 * Who a Korath or Drull belongs to: one on the yard's side (housed, defending: friendly) is the yard owner's; an
 * attacker in the player's own attack is the player's; wild attackers have no looks.
 *
 * (16 October) "The player's own attack" is every kind of attack: on a player's yard, on a tribe's yard (wmattack)
 * and a Gauntlet stage (wmattack too), and the Inferno modes of both; before, only the first wore its skins. A
 * replay wears the looks it recorded (withRecorded), not the viewer's.
 */
export class IoDave extends ASObject {
    private static _yard: any = null;

    private static _mineRaw: string = null;

    private static _mine: any = null;

    /** (16 October) A replay's recorded look for the monster being made (withRecorded), or undefined. */
    private static _recorded: string = undefined;

    public $ctor(): void {
        super.$ctor();
    }

    /** From the yard's load (BASE). */
    public static setYard(data: any): void {
        IoDave._yard = data && typeof data == "object" ? data : null;
    }

    public static get mine(): any {
        let raw: string = GLOBAL._flags && GLOBAL._flags.io_dave ? String(GLOBAL._flags.io_dave) : "";
        // (16 October) a load without them (an older server's attack load) keeps the ones the player had
        if (!raw && IoDave._mine) {
            return IoDave._mine;
        }
        if (raw != IoDave._mineRaw) {
            IoDave._mineRaw = raw;
            IoDave._mine = null;
            try {
                IoDave._mine = raw ? JSON.parse(raw) : null;
            } catch (e) {
                IoDave._mine = null;
            }
        }
        return IoDave._mine || {};
    }

    private static setMine(d: any): void {
        if (GLOBAL._flags && d) {
            GLOBAL._flags.io_dave = JSON.stringify(d);
        }
    }

    /**
     * (27 November, 72's suggestion: "Add two new worker types: Frog - he hops all around / Red Frog - same frog but in
     * red") The loaded yard's workers are frogs, green ("frog") or red ("frog_red"): their sheet, else null.
     */
    public static get frogWorkers(): string {
        return IoDave.workerKind == "frog" ? IoDave.workerSheet : null;
    }

    /**
     * (27 November, the user's: "add 1/2/4/5/6/7 (in 3 colors)") The workers drawn from a sheet of their own, by look:
     * the frogs, the lava crabs, the skeletons, the penguins, the ghosts, the clockwork robots, the slugs (orange,
     * green, purple). Each sheet is in the imps' layout, a row for each pose (art/workers/make_frogs.py, make_workers.py).
     */
    public static readonly WORKER_SHEETS: any = { "frog": "monsters/io_frog.png", "frog_red": "monsters/io_frog_red.png", "crab": "monsters/io_crab.png", "skeleton": "monsters/io_skeleton.png", "penguin": "monsters/io_penguin.png", "ghost": "monsters/io_ghost.png", "robot": "monsters/io_robot.png", "slug_orange": "monsters/io_slug_orange.png", "slug_green": "monsters/io_slug_green.png", "slug_purple": "monsters/io_slug_purple.png" };

    /** The loaded yard's workers' own sheet (one of WORKER_SHEETS), or null for the imps and the builders. */
    public static get workerSheet(): string {
        let s: string = GLOBAL.INFERNO_ONLY && IoDave._yard != null ? String(IoDave._yard.workerSkin) : "";
        return IoDave.WORKER_SHEETS[s] ? String(IoDave.WORKER_SHEETS[s]) : null;
    }

    /** (27 November) The loaded yard's workers' look ("inferno", "overworld", "frog"... ; "" none). */
    public static get yardWorkerSkin(): string {
        return GLOBAL.INFERNO_ONLY && IoDave._yard != null && IoDave._yard.workerSkin ? String(IoDave._yard.workerSkin) : "";
    }

    /** (27 November, admintester's reports) The loaded yard's owner's own Hellforge ground (IoForge), or null. */
    public static get yardForgeGround(): any {
        return GLOBAL.INFERNO_ONLY && IoDave._yard != null && IoDave._yard.forgeGround ? IoDave._yard.forgeGround : null;
    }

    /** (27 November) A slug's trail's colour, by its look. */
    public static get workerSkinColor(): number {
        let s: string = GLOBAL.INFERNO_ONLY && IoDave._yard != null ? String(IoDave._yard.workerSkin) : "";
        return s == "slug_green" ? 0xB8F040 : (s == "slug_purple" ? 0xD080FF : 0xFF9A30);
    }

    /** What kind they are, for how they move (WORKER.ioLook): frog, crab, skeleton, penguin, ghost, robot, slug; "" none. */
    public static get workerKind(): string {
        let s: string = GLOBAL.INFERNO_ONLY && IoDave._yard != null ? String(IoDave._yard.workerSkin) : "";
        if (!IoDave.WORKER_SHEETS[s]) {
            return "";
        }
        return s == "frog_red" ? "frog" : (s.indexOf("slug_") == 0 ? "slug" : s);
    }

    /** The loaded yard's workers are the overworld's builders (their owner's choice). */
    public static get overworldWorkers(): boolean {
        return GLOBAL.INFERNO_ONLY && IoDave._yard != null && IoDave._yard.workerSkin == "overworld";
    }

    /** Is this Korath (IC9 / G4) or Drull (IC10 / G2) to be drawn frozen? */
    public static frozen(id: string, friendly: boolean): boolean {
        return IoDave.skin(id, friendly) == "frozen";
    }

    /**
     * The look of a champion (14 October: Korath IC9 / G4, Drull IC10 / G2, Ashkarr IC24, Rimegrave IC25, the
     * Basilisk IC32): "frozen", a Shiny skin (IoSkins), or null for its own.
     */
    public static skin(id: string, friendly: boolean): string {
        if (!GLOBAL.INFERNO_ONLY) {
            return null;
        }
        let key: string = id == "G4" ? "IC9" : (id == "G2" ? "IC10" : id);
        if (key != "IC9" && key != "IC10" && key != "IC24" && key != "IC25" && key != "IC32") {
            return null;
        }
        if (IoDave._recorded !== undefined) {
            return IoDave._recorded;
        }
        let skins: any = null;
        if (friendly) {
            skins = IoDave._yard ? IoDave._yard.champSkins : null;
        } else if (IoDave.attacking(GLOBAL.mode) || IoDave.attacking(GLOBAL._loadmode)) {
            skins = IoDave.mine.champSkins;
        }
        return skins && skins[key] ? String(skins[key]) : null;
    }

    /** (16 October) Is this mode one of the player's attacks (a player's yard, a tribe's, a Gauntlet stage)? */
    public static attacking(mode: string): boolean {
        let M: any = GLOBAL.e_BASE_MODE;
        return mode == M.ATTACK || mode == M.WMATTACK || mode == M.IATTACK || mode == M.IWMATTACK;
    }

    /** (16 October) make() with every champion made in it wearing `look` (a replay's recorded one; null: its own). */
    public static withRecorded(look: string, make: Function): any {
        IoDave._recorded = look ? String(look) : null;
        try {
            return make();
        } finally {
            IoDave._recorded = undefined;
        }
    }

    /** A Shiny skin bought (and put on); onDone(error or null). */
    public static buy(key: string, value: string, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "dave/buy", [["key", key], ["value", value]], (r: any): void => {
            if (!r || r.error !== 0 && r.error !== "0") {
                onDone(r && r.error ? String(r.error) : KEYS.Get("io_t3m_no_answer"));
                return;
            }
            IoDave.setMine(r.dave);
            if (r.dave) {
                IoDave._yard = { "workerSkin": r.dave.workerSkin, "champSkins": r.dave.champSkins, "forgeGround": r.dave.forgeGround };
            }
            if (r.credits != null) {
                CASINO.setCredits(r.credits | 0);
            }
            onDone(null);
        }, (e: IOErrorEvent): void => {
            onDone(KEYS.Get("io_t3m_no_answer2"));
        });
    }

    /** Has the player bought this champion's skin? */
    public static owns(champion: string, skin: string): boolean {
        let o: any[] = IoDave.mine.ownedSkins;
        return o != null && o.indexOf(champion + "." + skin) >= 0;
    }

    /** A choice made (the server keeps it); onDone(error or null). */
    public static set(key: string, value: string, onDone: Function): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "dave/set", [["key", key], ["value", value]], (r: any): void => {
            if (!r || r.error !== 0 && r.error !== "0") {
                onDone(r && r.error ? String(r.error) : KEYS.Get("io_t3m_no_answer"));
                return;
            }
            IoDave.setMine(r.dave);
            // (the player's own yard: its looks are theirs)
            if (r.dave) {
                IoDave._yard = { "workerSkin": r.dave.workerSkin, "champSkins": r.dave.champSkins, "forgeGround": r.dave.forgeGround };
            }
            onDone(null);
        }, (e: IOErrorEvent): void => {
            onDone(KEYS.Get("io_t3m_no_answer2"));
        });
    }

    /** Friends who have joined through the player's invite link (they open the invite-only looks). */
    public static get invites(): int {
        return IoDave.mine.invites | 0;
    }

    /** Admins and moderators have every invite-only look without inviting. */
    public static get inviteFree(): boolean {
        return Boolean(IoDave.mine.inviteFree);
    }

    /** May the player have an invite-only look that needs `need` friends? */
    public static unlocked(need: int): boolean {
        return IoDave.inviteFree || IoDave.invites >= need;
    }

    /** "Invite 2 friends\n(1 so far)": a locked invite-only look's label. */
    public static inviteLock(need: int): string {
        return KEYS.Get(need == 1 ? "io_t3m_dv_invite_one" : "io_t3m_dv_invite_n", { "v1": need, "v2": IoDave.invites });
    }

    /** A name effect's spec (grad:, shine:, flow:, and 27 November's pulse:, fire:, beat:, spark:, chase:, with its colours), or null if this is not one. */
    public static fxOf(look: string): any {
        // (27 November, admintester's report: a Hellforge name its owner made: "fire@2:..." at twice the speed, "@0.5" half)
        let m: any = look ? /^(grad|shine|flow|pulse|fire|beat|spark|chase)(?:@(0\.5|2))?:(#[0-9A-Fa-f]{6}(?:,#[0-9A-Fa-f]{6})+)$/.exec(look) : null;
        if (!m) {
            return null;
        }
        let stops: any[] = [];
        for (let c of String(m[3]).split(",")) {
            stops.push(parseInt(c.substr(1), 16));
        }
        return { "kind": String(m[1]), "stops": stops, "speed": m[2] ? Number(m[2]) : 1 };
    }

    /** Does this look move (it has to be drawn again as time goes)? */
    public static fxMoves(look: string): boolean {
        let fx: any = IoDave.fxOf(look);
        return fx != null && fx.kind != "grad";
    }

    private static blend(a: int, b: int, t: number): int {
        let r: int = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t) | 0;
        let g: int = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t) | 0;
        let l: int = Math.round((a & 255) * (1 - t) + (b & 255) * t) | 0;
        return (r << 16) | (g << 8) | l;
    }

    /** Along the stops at t (0 to 1). */
    private static along(stops: any[], t: number): int {
        let n: int = (stops.length - 1) | 0;
        let x: number = Math.max(0, Math.min(1, t)) * n;
        let i: int = Math.min(n - 1, Math.floor(x)) | 0;
        return IoDave.blend(stops[i] | 0, stops[i + 1] | 0, x - i);
    }

    private static hex(c: int): string {
        let s: string = (c & 0xFFFFFF).toString(16).toUpperCase();
        while (s.length < 6) {
            s = "0" + s;
        }
        return "#" + s;
    }

    /**
     * Inferno-only (12 October): text in a name effect, as html (one colour per letter; the caller makes it bold).
     *  - grad: shaded from the first colour to the last, letter by letter
     *  - shine: shaded the same way, a bright amber light sweeping across it every 2.4 seconds
     *  - flow: the colours flowing along it, round and round, every 3 seconds
     * (27 November, 72's suggestion: the looks opened by outposts and by level)
     *  - pulse: the whole name breathing from the first colour to the last and back, every 1.8 seconds
     *  - fire: each letter flickering through the colours on its own, as a flame does
     *  - beat: a heartbeat, the whole name throbbing to the last colour twice, then resting (1.2 seconds)
     *  - spark: shaded through the colours, a letter now and then twinkling white-bright
     *  - chase: shaded through the colours, a bright band running back and forth along it (2 seconds each way)
     * at time ms (getTimer() if not given), so a moving one is drawn again with a later time.
     */
    public static fxHtml(look: string, text: string, ms: number = -1): string {
        let fx: any = IoDave.fxOf(look);
        let out: string = "";
        let chars: any[] = text.split("");
        let n: int = Math.max(1, chars.length - 1) | 0;
        let now: number = (ms >= 0 ? ms : getTimer()) * (fx ? Number(fx.speed) : 1);
        let sweep: number = (now % 2400) / 2400 * 1.8 - 0.4;
        let flow: number = (now % 3000) / 3000;
        for (let i: int = 0; i < chars.length; i++) {
            let ch: string = String(chars[i]);
            let esc: string = ch == "&" ? "&amp;" : (ch == "<" ? "&lt;" : (ch == ">" ? "&gt;" : (ch == "\"" ? "&quot;" : ch)));
            if (!fx || ch == " ") {
                out += esc;
                continue;
            }
            let t: number = i / n;
            let c: int = 0;
            if (fx.kind == "flow") {
                // (the stops wrap round: the last is the first again)
                c = IoDave.along(fx.stops, (t * 0.5 + flow) % 1);
            } else if (fx.kind == "pulse") {
                c = IoDave.along(fx.stops, 0.5 - 0.5 * Math.cos((now % 1800) / 1800 * Math.PI * 2));
            } else if (fx.kind == "beat") {
                // (two throbs in the first half of each 1.2 seconds, then rest)
                let p: number = (now % 1200) / 1200;
                let throb: number = Math.max(Math.max(0, 1 - Math.abs(p - 0.1) / 0.09), 0.75 * Math.max(0, 1 - Math.abs(p - 0.3) / 0.09));
                c = IoDave.along(fx.stops, throb);
            } else if (fx.kind == "fire") {
                // (each letter its own flicker: two waves out of step, by its place)
                let f: number = 0.5 + 0.3 * Math.sin(now / 90 + i * 2.7) + 0.2 * Math.sin(now / 37 + i * 5.3);
                c = IoDave.along(fx.stops, Math.max(0, Math.min(1, f)));
            } else if (fx.kind == "spark") {
                c = IoDave.along(fx.stops, t);
                // (each letter twinkles for 0.3 seconds once in a while, at its own moments)
                let slot: int = Math.floor((now + i * 977) / 300) | 0;
                let hash: number = Math.abs(Math.sin(slot * 12.9898 + i * 78.233) * 43758.5453) % 1;
                if (hash < 0.12) {
                    let k: number = ((now + i * 977) % 300) / 300;
                    c = IoDave.blend(c, 0xFFFFFF, Math.sin(k * Math.PI) * 0.9);
                }
            } else if (fx.kind == "chase") {
                c = IoDave.along(fx.stops, t * 0.7);
                let ping: number = (now % 4000) / 2000;
                let at: number = ping <= 1 ? ping : 2 - ping;
                let band: number = Math.max(0, 1 - Math.abs(t - (at * 1.2 - 0.1)) / 0.22);
                c = IoDave.blend(c, fx.stops[fx.stops.length - 1] | 0, band);
            } else {
                c = IoDave.along(fx.stops, t);
                if (fx.kind == "shine") {
                    let lightT: number = Math.max(0, 1 - Math.abs(t - sweep) / 0.16);
                    c = IoDave.blend(c, 0xFFB52E, lightT * 0.8);
                }
            }
            out += "<font color=\"" + IoDave.hex(c) + "\">" + esc + "</font>";
        }
        return out;
    }

    /** A colour's #hex, or null (black). */
    public static colorHex(name: string): string {
        let c: any = IoDave.mine.chatColors;
        return c && name && c[name] ? String(c[name]) : null;
    }
}

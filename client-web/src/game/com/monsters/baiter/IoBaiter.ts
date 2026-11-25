import * as as3 from "as3";
import { int } from "as3";
import { Point } from "flash/geom";
import { getTimer, setTimeout } from "flash/utils";
import { BASE, BFOUNDATION, BMUSHROOM, CHAMPIONCAGE, CREATURELOCKER, CREEPS, CUSTOMATTACKS, EnumYardType, GLOBAL, GRID, InstanceManager, IoBaiterWindow, IoHfo, IoTrapRearm, KEYS, MAP, MONSTERBAITER, MonsterBase, POPUPS, SOUNDS, UI2, WMATTACK } from "@game";

/**
 * Inferno-only (22 November, the user's): the Monster Baiter, brought over from the overworld and made better.
 *
 * What it can bait:
 *  - every overworld monster (C1-C19), at every level;
 *  - every overworld champion (Gorgo, Drull, Fomor, Korath, Krallen: G1-G5), at every level;
 *  - the Inferno monsters and champions the player has unlocked (the Strongbox), from level 1 up to the level the
 *    Academy has trained them to;
 *  - once the player has finished Hell Freezes Over (IoHfo.championFree): Rimegrave at every level and the six ice
 *    cretins.
 *
 * A wave is a list of "id@level" -> count (the musk it costs, cStorage or a champion's bucket, up to the baiter's
 * capacity). The player also picks where they come from (one of eight sides, all sides, or anywhere), whether they
 * arrive at once or in 2 or 3 waves (WAVE_GAP seconds apart), the speed (1x or 2x, as Hell Freezes Over's), and
 * Practice (the default) or Real:
 *  - Practice: nothing of the raid is kept. Nothing is saved while it is on (BASE._blockSave, as in any raid), and at
 *    the end the yard is loaded again from the server, as it was before the countdown (PrepAttack saves first).
 *  - Real: as the overworld's baiter: the damage needs repairing and what they take is gone (WMATTACK.CleanUp).
 * Either way a report follows (IoBaiterWindow.ShowReport): how long it lasted, each kind sent and killed, what was
 * destroyed, the traps set off and what they took (or would have). Three waves can be saved and loaded again, and
 * the report has Send again.
 *
 * Saved with the yard in the baiter's own field (MONSTERBAITER.Export: "io"); the old queue stays as it was.
 */
export class IoBaiter {
    public static readonly OW_IDS: string[] = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C18", "C19"];
    public static readonly OW_CHAMPS: string[] = ["G1", "G2", "G3", "G4", "G5"];
    public static readonly INF_IDS: string[] = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC12", "IC14", "IC15", "IC20"];
    public static readonly INF_CHAMPS: string[] = ["IC9", "IC10", "IC24", "IC32"];
    public static readonly HFO_IDS: string[] = ["IC25", "IC26", "IC27", "IC28", "IC29", "IC30", "IC31"];
    public static readonly TABS: string[] = ["ow", "owc", "inf", "infc", "hfo"];

    /** The eight sides, as the old window's arrows had them (grid angles): tl, tr, br, bl, t, r, b, l. */
    public static readonly DIRS: int[] = [180, 270, 0, 90, 225, 315, 45, 135];
    public static readonly DIR_ALL: int = 8;
    public static readonly DIR_ANY: int = 9;
    /** How far out they start (grid units: 800 + SPREAD / 2 from the middle, as a wild raid's) and how spread out. */
    public static readonly SPREAD: int = 400;
    /** Seconds between the waves, when they come in 2 or 3. */
    public static readonly WAVE_GAP: int = 15;
    public static readonly SLOTS: int = 3;
    /** The most of one kind in a wave (a cheap monster and a big baiter would otherwise make thousands). */
    public static readonly MAX_EACH: int = 250;

    // ---- what the player picked (saved)
    public static _q: any = {};
    public static _order: string[] = [];
    public static _dir: int = 0;
    public static _practice: boolean = true;
    public static _speed: int = 1;
    public static _waves: int = 1;
    public static _slots: any[] = [null, null, null];

    // ---- a raid on
    public static _run: any = null;
    /** The report of a practice raid, shown once the yard is back (yardArrived). */
    public static _report: any = null;
    /** The last report (tests). */
    public static lastReport: any = null;

    // ---- what can be baited
    public static isChamp(id: string): boolean {
        return !!id && id.charAt(0) == "G";
    }

    public static exists(id: string): boolean {
        if (IoBaiter.isChamp(id)) {
            return Boolean(CHAMPIONCAGE._guardians && CHAMPIONCAGE._guardians[id]);
        }
        return Boolean(CREATURELOCKER._creatures && CREATURELOCKER._creatures[id]);
    }

    /** How many levels it has. */
    public static levels(id: string): int {
        let props: any = null;
        if (IoBaiter.isChamp(id)) {
            props = CHAMPIONCAGE._guardians && CHAMPIONCAGE._guardians[id] ? CHAMPIONCAGE._guardians[id].props : null;
        } else {
            props = CREATURELOCKER._creatures && CREATURELOCKER._creatures[id] ? CREATURELOCKER._creatures[id].props : null;
        }
        let h: any[] = props ? as3.as(props.health, Array) : null;
        return Math.max(1, h ? h.length : 1) | 0;
    }

    public static unlocked(id: string): boolean {
        if (GLOBAL.ioTestMode()) {
            return true;
        }
        let d: any = CREATURELOCKER._lockerData ? CREATURELOCKER._lockerData[id] : null;
        return Boolean(d) && (d.t | 0) == 2;
    }

    public static hfoDone(): boolean {
        try {
            return IoHfo.championFree();
        } catch (e) {
        }
        return false;
    }

    public static tabOf(id: string): string {
        if (IoBaiter.OW_IDS.indexOf(id) >= 0) {
            return "ow";
        }
        if (IoBaiter.OW_CHAMPS.indexOf(id) >= 0) {
            return "owc";
        }
        if (IoBaiter.INF_IDS.indexOf(id) >= 0) {
            return "inf";
        }
        if (IoBaiter.INF_CHAMPS.indexOf(id) >= 0) {
            return "infc";
        }
        if (IoBaiter.HFO_IDS.indexOf(id) >= 0) {
            return "hfo";
        }
        return null;
    }

    /** The highest level it can be baited at now: 0 when it can't be. */
    public static maxLevel(id: string): int {
        let tab: string = IoBaiter.tabOf(id);
        if (!tab || !IoBaiter.exists(id)) {
            return 0;
        }
        if (tab == "hfo") {
            return IoBaiter.hfoDone() ? IoBaiter.levels(id) : 0;
        }
        if (tab == "inf" || tab == "infc") {
            if (!IoBaiter.unlocked(id)) {
                return 0;
            }
            if (GLOBAL.ioTestMode()) {
                return IoBaiter.levels(id);
            }
            return Math.max(1, Math.min(IoBaiter.levels(id), CREATURELOCKER.ioLevel(id))) | 0;
        }
        return IoBaiter.levels(id);
    }

    /** The ids a tab shows: every one there is, for the overworld's; the ones that can be baited, for the Inferno's. */
    public static ids(tab: string): string[] {
        let all: string[] = tab == "ow" ? IoBaiter.OW_IDS : tab == "owc" ? IoBaiter.OW_CHAMPS : tab == "inf" ? IoBaiter.INF_IDS : tab == "infc" ? IoBaiter.INF_CHAMPS : tab == "hfo" ? IoBaiter.HFO_IDS : [];
        let out: string[] = [];
        for (let id of all) {
            if (IoBaiter.maxLevel(id) > 0) {
                out.push(id);
            }
        }
        return out;
    }

    public static nameOf(id: string): string {
        if (IoBaiter.isChamp(id)) {
            let g: any = CHAMPIONCAGE._guardians ? CHAMPIONCAGE._guardians[id] : null;
            return g ? String(g.name) : id;
        }
        let c: any = CREATURELOCKER._creatures ? CREATURELOCKER._creatures[id] : null;
        return c ? KEYS.Get(as3.str(c.name)) : id;
    }

    /** Its picture (monsters/...): a champion's changes with its level; Krallen has the one; the C18's is the C17's. */
    public static icon(id: string, level: int): string {
        if (IoBaiter.isChamp(id)) {
            if (id == "G5") {
                return "monsters/G5_L6-150.png";
            }
            return "monsters/" + id + "_L" + Math.max(1, Math.min(6, level)) + "-150.png";
        }
        if (id == "C18") {
            return "monsters/C17-medium.jpg";
        }
        return "monsters/" + id + "-medium.jpg";
    }

    /** The musk one costs (a monster's housing; a champion's bucket). */
    public static cost(id: string, level: int = 1): int {
        let arr: any[] = null;
        if (IoBaiter.isChamp(id)) {
            let g: any = CHAMPIONCAGE._guardians ? CHAMPIONCAGE._guardians[id] : null;
            arr = g ? as3.as(g.props.bucket, Array) : null;
        } else {
            let c: any = CREATURELOCKER._creatures ? CREATURELOCKER._creatures[id] : null;
            arr = c ? as3.as(c.props.cStorage, Array) : null;
        }
        if (!arr || !arr.length) {
            return 10;
        }
        let i: int = Math.max(0, Math.min(arr.length - 1, level - 1)) | 0;
        return Math.max(1, Number(arr[i]) | 0) | 0;
    }

    /** The baiter's musk: the most a wave can cost. */
    public static capacity(): int {
        MONSTERBAITER.Update();
        return Math.max(0, MONSTERBAITER._muskLimit | 0) | 0;
    }

    // ---- the wave
    public static key(id: string, level: int): string {
        return id + "@" + level;
    }

    public static parse(key: string): any {
        let at: int = key ? key.indexOf("@") : -1;
        if (at <= 0) {
            return null;
        }
        return { "id": key.substr(0, at), "level": Number(key.substr(at + 1)) | 0 };
    }

    /** Whether a picked entry can still be baited (a monster unlocked, the event done, the level trained). */
    public static validKey(key: string): boolean {
        let p: any = IoBaiter.parse(key);
        return Boolean(p) && p.level >= 1 && p.level <= IoBaiter.maxLevel(p.id);
    }

    /** The wave, in the order it was picked: [{ key, id, level, count, cost }]. */
    public static entries(): any[] {
        let out: any[] = [];
        for (let k of IoBaiter._order) {
            let n: int = IoBaiter._q[k] | 0;
            if (n <= 0 || !IoBaiter.validKey(k)) {
                continue;
            }
            let p: any = IoBaiter.parse(k);
            out.push({ "key": k, "id": p.id, "level": p.level, "count": n, "cost": IoBaiter.cost(p.id, p.level) });
        }
        return out;
    }

    public static used(): int {
        let total: int = 0;
        for (let e of IoBaiter.entries()) {
            total = (total + e.count * e.cost) | 0;
        }
        return total;
    }

    public static count(key: string): int {
        return IoBaiter.validKey(key) ? IoBaiter._q[key] | 0 : 0;
    }

    /** Of one monster, at every level. */
    public static countAll(id: string): int {
        let n: int = 0;
        for (let e of IoBaiter.entries()) {
            if (e.id == id) {
                n = (n + e.count) | 0;
            }
        }
        return n;
    }

    /** How many more of it fit in the musk. */
    public static room(id: string, level: int): int {
        let c: int = IoBaiter.cost(id, level);
        let left: int = (IoBaiter.capacity() - IoBaiter.used()) | 0;
        return Math.max(0, Math.floor(left / c)) | 0;
    }

    /** Adds n (or takes them away, n < 0); as many as fit. Returns how many it changed by. */
    public static add(id: string, level: int, n: int): int {
        let k: string = IoBaiter.key(id, level);
        if (!IoBaiter.validKey(k)) {
            return 0;
        }
        let have: int = IoBaiter._q[k] | 0;
        let want: int = Math.max(0, have + n) | 0;
        if (n > 0) {
            want = Math.min(want, have + IoBaiter.room(id, level), IoBaiter.MAX_EACH) | 0;
        }
        if (want == have) {
            return 0;
        }
        if (want <= 0) {
            delete IoBaiter._q[k];
            let i: int = IoBaiter._order.indexOf(k);
            if (i >= 0) {
                IoBaiter._order.splice(i, 1);
            }
        } else {
            if (!(have > 0) || IoBaiter._order.indexOf(k) < 0) {
                IoBaiter._order.push(k);
            }
            IoBaiter._q[k] = want;
        }
        return (want - have) | 0;
    }

    public static remove(key: string): void {
        delete IoBaiter._q[key];
        let i: int = IoBaiter._order.indexOf(key);
        if (i >= 0) {
            IoBaiter._order.splice(i, 1);
        }
    }

    public static clear(): void {
        IoBaiter._q = {};
        IoBaiter._order = [];
    }

    /** Takes out what can't be baited any more, and what is over the musk (from the end). */
    public static prune(): void {
        let keep: string[] = [];
        for (let k of IoBaiter._order) {
            if ((IoBaiter._q[k] | 0) > 0 && IoBaiter.validKey(k)) {
                keep.push(k);
            } else {
                delete IoBaiter._q[k];
            }
        }
        IoBaiter._order = keep;
        let cap: int = IoBaiter.capacity();
        while (IoBaiter._order.length && IoBaiter.used() > cap) {
            let last: string = IoBaiter._order[IoBaiter._order.length - 1];
            let p: any = IoBaiter.parse(last);
            IoBaiter.add(p.id, p.level, -1);
        }
    }

    // ---- saved waves
    public static saveSlot(i: int): void {
        if (i < 0 || i >= IoBaiter.SLOTS || !IoBaiter.entries().length) {
            return;
        }
        let q: any = {};
        for (let e of IoBaiter.entries()) {
            q[e.key] = e.count;
        }
        IoBaiter._slots[i] = { "q": q, "o": IoBaiter._order.slice(), "dir": IoBaiter._dir, "waves": IoBaiter._waves };
        BASE.Save();
    }

    public static loadSlot(i: int): boolean {
        let s: any = IoBaiter._slots[i];
        if (!s || !s.q) {
            return false;
        }
        IoBaiter.clear();
        let order: any[] = as3.as(s.o, Array) || [];
        for (let k in s.q) {
            if (order.indexOf(k) < 0) {
                order.push(k);
            }
        }
        for (let k of order) {
            let p: any = IoBaiter.parse(String(k));
            if (p && (s.q[k] | 0) > 0) {
                IoBaiter.add(p.id, p.level, s.q[k] | 0);
            }
        }
        IoBaiter._dir = Math.max(0, Math.min(IoBaiter.DIR_ANY, s.dir | 0)) | 0;
        IoBaiter._waves = Math.max(1, Math.min(3, s.waves | 0)) | 0;
        return true;
    }

    /** A saved wave, in a line ("12 monsters, 1,200 musk"), or null. */
    public static slotSize(i: int): any {
        let s: any = IoBaiter._slots[i];
        if (!s || !s.q) {
            return null;
        }
        let n: int = 0;
        let musk: int = 0;
        for (let k in s.q) {
            let p: any = IoBaiter.parse(k);
            if (p) {
                n = (n + (s.q[k] | 0)) | 0;
                musk = (musk + (s.q[k] | 0) * IoBaiter.cost(p.id, p.level)) | 0;
            }
        }
        return { "count": n, "musk": musk };
    }

    // ---- saved with the yard (MONSTERBAITER.Export / Setup)
    public static exportData(): any {
        let q: any = {};
        for (let k of IoBaiter._order) {
            if ((IoBaiter._q[k] | 0) > 0) {
                q[k] = IoBaiter._q[k] | 0;
            }
        }
        return { "q": q, "o": IoBaiter._order.slice(), "dir": IoBaiter._dir, "practice": IoBaiter._practice ? 1 : 0, "speed": IoBaiter._speed, "waves": IoBaiter._waves, "slots": IoBaiter._slots.slice() };
    }

    /** From the yard's save; `old` is the old window's queue ({ C1: 5 }), read when there's nothing newer. */
    public static load(io: any, old: any): void {
        IoBaiter.clear();
        IoBaiter._dir = 0;
        IoBaiter._practice = true;
        IoBaiter._speed = 1;
        IoBaiter._waves = 1;
        IoBaiter._slots = [null, null, null];
        if (typeof io == "string") {
            try {
                io = JSON.parse(io);
            } catch (e) {
                io = null;
            }
        }
        if (io && typeof io == "object") {
            let order: any[] = as3.as(io.o, Array) || [];
            if (io.q) {
                for (let k in io.q) {
                    if (order.indexOf(k) < 0) {
                        order.push(k);
                    }
                }
                for (let k of order) {
                    let n: int = io.q[k] | 0;
                    if (n > 0 && IoBaiter.parse(String(k))) {
                        IoBaiter._q[String(k)] = Math.min(n, IoBaiter.MAX_EACH) | 0;
                        IoBaiter._order.push(String(k));
                    }
                }
            }
            IoBaiter._dir = Math.max(0, Math.min(IoBaiter.DIR_ANY, io.dir | 0)) | 0;
            IoBaiter._practice = io.practice == null ? true : (io.practice | 0) == 1;
            IoBaiter._speed = (io.speed | 0) == 2 ? 2 : 1;
            IoBaiter._waves = Math.max(1, Math.min(3, io.waves | 0)) | 0;
            let slots: any[] = as3.as(io.slots, Array);
            if (slots) {
                for (let i: int = 0; i < IoBaiter.SLOTS; i++) {
                    IoBaiter._slots[i] = slots[i] && slots[i].q ? slots[i] : null;
                }
            }
            return;
        }
        if (old && typeof old == "object") {
            for (let id in old) {
                let n: int = old[id] | 0;
                if (n > 0 && IoBaiter.OW_IDS.indexOf(id) >= 0) {
                    IoBaiter._q[IoBaiter.key(id, 1)] = n;
                    IoBaiter._order.push(IoBaiter.key(id, 1));
                }
            }
        }
    }

    // ---- sending them
    /** Why the wave can't go now, or null. */
    public static whyNot(): string {
        if (!GLOBAL._bBaiter || !BASE.isInfernoMainYardOrOutpost || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return KEYS.Get("io_bt_own_yard");
        }
        if (GLOBAL._bBaiter.health <= 0) {
            return KEYS.Get("io_bt_broken");
        }
        if (BASE.ioAttackRunning() || IoBaiter._run || MONSTERBAITER._attPrep > 0 || BASE._loading) {
            return KEYS.Get("io_bt_busy");
        }
        IoBaiter.prune();
        if (!IoBaiter.entries().length) {
            return KEYS.Get("io_bt_empty_send");
        }
        return null;
    }

    /** The window's button (and the report's Send again): the baiter's countdown, then launch. */
    public static send(): boolean {
        let why: string = IoBaiter.whyNot();
        if (why) {
            GLOBAL.Message(why);
            return false;
        }
        // (the old queue too, by monster, for an overworld client reading this save)
        let old: any = {};
        for (let e of IoBaiter.entries()) {
            if (!IoBaiter.isChamp(e.id)) {
                old[e.id] = ((old[e.id] | 0) + e.count) | 0;
            }
        }
        MONSTERBAITER._queue = old;
        MONSTERBAITER._attackDir = IoBaiter._dir < 8 ? IoBaiter._dir : 0;
        IoBaiterWindow.Close();
        MONSTERBAITER.PrepAttack();
        return true;
    }

    /** The countdown is over (MONSTERBAITER.Tick): the monsters come. */
    public static launch(): void {
        let list: any[] = IoBaiter.entries();
        if (!list.length || !GLOBAL._bBaiter) {
            MONSTERBAITER._attacking = 0;
            MONSTERBAITER._scaredAway = false;
            UI2.Hide("warning");
            UI2.Show("top");
            UI2.Show("bottom");
            return;
        }
        let res: any[] = BASE._resources ? [BASE._resources.r1.Get(), BASE._resources.r2.Get(), BASE._resources.r3.Get(), BASE._resources.r4.Get()] : [0, 0, 0, 0];
        let run: any = { "practice": IoBaiter._practice, "start": getTimer(), "res": res, "traps": IoTrapRearm.disarmed().length, "spawned": [], "pending": [], "scared": false, "ending": false, "speed": IoBaiter._speed, "waves": IoBaiter._waves, "wave": 1, "dir": IoBaiter._dir, "turn": 0, "list": list };
        IoBaiter._run = run;
        CUSTOMATTACKS._started = true;
        WMATTACK._isAI = false;
        WMATTACK._type = WMATTACK.TYPE_DAMAGE;
        WMATTACK.AttackB();
        WMATTACK.setEnd(IoBaiter.allGone);
        UI2.Show("scareAway");
        if (UI2._scareAway) {
            UI2._scareAway.addEventListener("scareAway", IoBaiter.scareAway);
        }
        if (run.speed == 2) {
            GLOBAL.ioStepScale = 2;
        }
        // split into the waves: wave w gets its share of each kind (the first the most)
        let waves: int = run.waves | 0;
        let groups: any[] = [];
        for (let w: int = 0; w < waves; w++) {
            groups.push([]);
        }
        for (let e of list) {
            let left: int = e.count | 0;
            for (let w: int = 0; w < waves; w++) {
                let n: int = Math.ceil(left / (waves - w)) | 0;
                left = (left - n) | 0;
                if (n > 0) {
                    groups[w].push({ "key": e.key, "id": e.id, "level": e.level, "count": n });
                }
            }
        }
        MONSTERBAITER._currentAttackers = [[]];
        IoBaiter.spawn(groups[0]);
        for (let w: int = 1; w < waves; w++) {
            if (groups[w].length) {
                run.pending.push({ "at": getTimer() + (w * IoBaiter.WAVE_GAP * 1000) / run.speed, "list": groups[w] });
            }
        }
        // (from one side: there; from all sides or anywhere: the baiter, in the middle of it)
        if (run.dir >= 8 && GLOBAL._bBaiter) {
            MAP.FocusTo(GLOBAL._bBaiter.x | 0, GLOBAL._bBaiter.y | 0, 2);
        } else if (run.spawned.length) {
            let m: any = run.spawned[0].m;
            MAP.FocusTo(m.x | 0, m.y | 0, 2);
        }
    }

    private static spawn(list: any[]): void {
        let run: any = IoBaiter._run;
        if (!run || !list) {
            return;
        }
        let r: number = 800 + IoBaiter.SPREAD / 2;
        for (let e of list) {
            let angle: number = run.dir < 8 ? IoBaiter.DIRS[run.dir] : Math.random() * 360;
            for (let i: int = 0; i < (e.count | 0); i++) {
                let a: number = angle;
                if (run.dir == IoBaiter.DIR_ALL) {
                    a = IoBaiter.DIRS[run.turn % 8];
                    run.turn++;
                }
                let rad: number = a * 0.0174532925;
                let off: number = Math.random() * Math.PI * 2;
                let dist: number = Math.random() * IoBaiter.SPREAD / 2;
                let x: number = Math.cos(rad) * r + Math.cos(off) * dist;
                let y: number = Math.sin(rad) * r + Math.sin(off) * dist;
                let iso: Point = GRID.ToISO(x, y, 0);
                let m: MonsterBase = null;
                try {
                    if (IoBaiter.isChamp(e.id)) {
                        m = CREEPS.SpawnGuardian(Number(e.id.substr(1)) | 0, MAP._BUILDINGTOPS, "bounce", e.level | 0, iso, Math.random() * 360, int.MAX_VALUE, 0, 3, true);
                    } else {
                        m = CREEPS.Spawn(e.id, MAP._BUILDINGTOPS, "bounce", iso, Math.random() * 360, 1, true, false, e.level | 0);
                    }
                } catch (err) {
                    m = null;
                }
                if (!m) {
                    continue;
                }
                m._hitLimit = int.MAX_VALUE;
                run.spawned.push({ "key": e.key, "id": e.id, "level": e.level, "m": m });
                if (MONSTERBAITER._currentAttackers && MONSTERBAITER._currentAttackers[0]) {
                    MONSTERBAITER._currentAttackers[0].push(m);
                }
            }
        }
    }

    /** Each second (MONSTERBAITER.Tick): the next waves as they are due, and the line that says when. */
    public static tick(): void {
        let run: any = IoBaiter._run;
        if (!run || run.ending) {
            return;
        }
        let now: number = getTimer();
        while (run.pending.length && now >= Number(run.pending[0].at)) {
            run.wave++;
            IoBaiter.spawn(run.pending.shift().list);
            SOUNDS.Play("wmbhorn");
        }
        if (UI2._warning) {
            if (run.pending.length) {
                let s: int = Math.max(0, Math.ceil((Number(run.pending[0].at) - now) / 1000)) | 0;
                UI2._warning.Update("<font size=\"22\">" + KEYS.Get("io_bt_next_wave", { "v1": (run.wave + 1) | 0, "v2": run.waves | 0, "v3": s }) + "</font>");
            } else if (run.waves > 1 && !run.lastSaid) {
                run.lastSaid = true;
                UI2._warning.Update("<font size=\"28\">" + KEYS.Get("msg_dontpanic") + "</font>");
            }
        }
        GLOBAL.UpdateAFKTimer();
    }

    /** WMATTACK's end, once every monster is gone (or none attacks any more). */
    public static allGone(): void {
        let run: any = IoBaiter._run;
        if (!run) {
            // (not ours: a raid that came after one that didn't end here)
            WMATTACK.setEnd();
            WMATTACK.CleanUp();
            return;
        }
        if (run.pending.length && !run.scared) {
            return;
        }
        IoBaiter.finish();
    }

    /** The baiter's siren (the scare-away button). */
    public static scareAway(e: any = null): void {
        let run: any = IoBaiter._run;
        if (!run || run.ending) {
            return;
        }
        run.scared = true;
        run.pending = [];
        if (run.practice) {
            SOUNDS.Play("wmbhorn");
            IoBaiter.finish();
            return;
        }
        MONSTERBAITER.End();
    }

    /** The raid is over: the report, then the yard as it was (Practice) or its repairs (Real). */
    public static finish(): void {
        let run: any = IoBaiter._run;
        if (!run || run.ending) {
            return;
        }
        run.ending = true;
        let report: any = IoBaiter.makeReport(run);
        IoBaiter.lastReport = report;
        IoBaiter._run = null;
        GLOBAL.ioStepScale = 1;
        if (UI2._scareAway) {
            UI2._scareAway.removeEventListener("scareAway", IoBaiter.scareAway);
        }
        WMATTACK.setEnd();
        if (!run.practice) {
            WMATTACK.CleanUp();
            MONSTERBAITER._attacking = 0;
            MONSTERBAITER._currentAttackers = [];
            POPUPS.ioWhenClear((): void => {
                IoBaiterWindow.ShowReport(report);
            });
            return;
        }
        // Practice: nothing of it is saved (BASE._blockSave, since AttackB), and the yard is loaded again as the
        // server has it (saved by PrepAttack, before the countdown)
        for (let c of as3.values(CREEPS._creeps)) {
            try {
                as3.cast(c, MonsterBase).changeModeRetreat();
            } catch (err) {
            }
        }
        WMATTACK._inProgress = false;
        CUSTOMATTACKS._started = false;
        MONSTERBAITER._attacking = 0;
        MONSTERBAITER._scaredAway = false;
        MONSTERBAITER._currentAttackers = [];
        UI2.Hide("warning");
        UI2.Hide("scareAway");
        SOUNDS.PlayMusic("musicibuild");
        BASE._blockSave = true;
        IoBaiter._report = report;
        IoBaiter.reloadYard(0);
    }

    private static reloadYard(tries: int): void {
        if ((BASE._saving || BASE._loading) && tries < 40) {
            setTimeout((): void => {
                IoBaiter.reloadYard((tries + 1) | 0);
            }, 250);
            return;
        }
        BASE._needCurrentCell = false;
        GLOBAL._currentCell = null;
        BASE.LoadBase(null, 0, GLOBAL._homeBaseID, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.MAIN_YARD);
    }

    /** The yard is changing (BASE): a raid still on is let go (its end can't come in another yard). */
    public static yardLeft(): void {
        if (IoBaiter._run) {
            IoBaiter._run = null;
            GLOBAL.ioStepScale = 1;
            WMATTACK.setEnd();
            if (UI2._scareAway) {
                UI2._scareAway.removeEventListener("scareAway", IoBaiter.scareAway);
            }
        }
    }

    /** A yard of the player's has opened (UI_TOP): a practice raid's report, once its yard is back. */
    public static yardArrived(): void {
        let report: any = IoBaiter._report;
        if (!report) {
            return;
        }
        IoBaiter._report = null;
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isInfernoMainYardOrOutpost) {
            return;
        }
        POPUPS.ioWhenClear((): void => {
            IoBaiterWindow.ShowReport(report);
        });
    }

    /** What the raid did: { practice, scared, secs, sent, killed, rows: [{ id, level, sent, killed }], lost, lostNames, walls, traps, damage, took: [r1-r4] }. */
    public static makeReport(run: any): any {
        let rows: any[] = [];
        let byKey: any = {};
        let sent: int = 0;
        let killed: int = 0;
        for (let s of run.spawned) {
            let row: any = byKey[s.key];
            if (!row) {
                row = byKey[s.key] = { "id": s.id, "level": s.level, "sent": 0, "killed": 0 };
                rows.push(row);
            }
            row.sent++;
            sent++;
            let m: any = s.m;
            let dead: boolean = false;
            try {
                dead = Boolean(m.dead) || m.health <= 0;
            } catch (e) {
            }
            if (dead) {
                row.killed++;
                killed++;
            }
        }
        let lost: int = 0;
        let walls: int = 0;
        let names: string[] = [];
        let health: number = 0;
        let max: number = 0;
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!b || b._id <= 0 || b instanceof BMUSHROOM || b._class == "trap" || b._class == "decoration" || b._class == "enemy" || b._class == "immovable") {
                continue;
            }
            if (b._class == "wall") {
                if (b.health <= 0) {
                    walls++;
                }
                continue;
            }
            health += Math.max(0, b.health);
            max += b.maxHealth;
            if (b.health <= 0) {
                lost++;
                let n: string = b._buildingProps ? KEYS.Get(as3.str(b._buildingProps.name)) : "";
                if (n && names.indexOf(n) < 0) {
                    names.push(n);
                }
            }
        }
        let took: any[] = [0, 0, 0, 0];
        if (BASE._resources && run.res) {
            let now: any[] = [BASE._resources.r1.Get(), BASE._resources.r2.Get(), BASE._resources.r3.Get(), BASE._resources.r4.Get()];
            for (let i: int = 0; i < 4; i++) {
                took[i] = Math.max(0, Math.floor(Number(run.res[i]) - Number(now[i])));
            }
        }
        return {
            "practice": Boolean(run.practice), "scared": Boolean(run.scared), "secs": Math.max(1, Math.round((getTimer() - run.start) / 1000)) | 0,
            "sent": sent, "killed": killed, "rows": rows, "lost": lost, "lostNames": names, "walls": walls,
            "traps": Math.max(0, IoTrapRearm.disarmed().length - (run.traps | 0)) | 0,
            "damage": max > 0 ? Math.round(100 - (100 * health) / max) | 0 : 0, "took": took,
        };
    }
}

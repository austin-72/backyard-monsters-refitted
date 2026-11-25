import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { SharedObject } from "flash/net";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer, setTimeout } from "flash/utils";
import { IoWin, ALLIANCEWINDOW, ArcadeWindow, BASE, BFOUNDATION, BMUSHROOM, BRESOURCE, BTOWER, BUILDING14, BUILDINGOPTIONS, BUILDINGS, BYMChat, CASINO, CREATURES, CasinoUI, CasinoWindow, Chat, GLOBAL, HOUSING, InstanceManager, IoAttackLogs, IoChangelog, IoGauntlet, IoHfoIce, IoLeaderboards, IoOutpostsPopup, IoQuestArt, IoQuestBook, IoReplayPlayer, IoSiege, IoTd, IoUnderworld, KEYS, LOGGER, LOGIN, MAILBOX, MAP, MapRoomCell, PLANNER, UI2, UI_TOP, URLLoaderApi, WMATTACK, IoToast, SOUNDS, BUILDINGSPOPUP } from "@game";

/**
 * Inferno-only: the quest book's data (the user's design of 2 October). The server keeps every count and
 * pays every reward (server/src/services/quests/); this keeps the book as it last said, reports what only
 * the game sees (a hatch, a win, a wart picked: event/once/best, sent together every few seconds), and
 * collects. IoQuestBook draws the book, IoQuestTracker the dock's rows, IoQuestArt the pictures.
 *
 * A quest from the server: {id, cat, parent, tmpl, vars, icon, go, target, value, state, reward, optional,
 * staff}; state is "locked", "progress", "ready" or "claimed". Text: KEYS "io_qt_<tmpl>" (its name) and
 * "io_qd_<tmpl>" (what to do), #v1#... from vars ("#key#" vars are language keys themselves).
 */
export class IoQuests extends ASObject {
    /** The book is asked for again after this long (seconds), when something shows it. */
    private static readonly STATUS_GAP: int = 120;

    /** Reports are gathered this long (ms) and sent together. */
    private static readonly FLUSH_MS: int = 2500;

    /** The most one report may add (the server's CLIENT_EVENTS): more is sent as several. */
    private static readonly CHUNK: any = { "hatch": 100, "hatch_housing": 3000, "juice": 100, "juice_housing": 3000, "wart_pick": 3, "fling_monsters": 2000, "loot": 2000000000, "towers_destroyed": 500, "buildings_destroyed": 2000, "ics_queue": 100, "spent": 2000000000 };

    /** The four tribes' highest-level yards (server InfernoOnlyConfig tribeSpawns: each ladder's top). */
    private static readonly TRIBE_TOP: any = { "L": 41, "K": 42, "A": 43, "D": 44 };

    private static readonly MOLOCH_FIRST: int = 51;

    private static readonly MOLOCH_LAST: int = 60;

    public static book: any = null;

    /** Goes up each time the book changes (the tracker and the window redraw on it). */
    public static version: int = 0;

    private static _byId: any = {};

    private static _fetchedAt: int = 0;

    private static _loading: boolean = false;

    private static _pending: any = {};

    private static _pendingBest: any = {};

    private static _flushQueued: boolean = false;

    private static _sentOnce: any = {};

    private static _best: any = {};

    private static _toasts: any[] = [];

    private static _toast: Sprite = null;

    private static _toastUntil: int = 0;

    private static _claiming: boolean = false;

    // ---- 8 October (the book doubled): more the game sees
    /** Cells looked at from the map (counted once each, by the server). */
    private static _views: any[] = [];

    /** Set when one of the player's buildings falls during a wild monster attack (reset as each begins). */
    public static wildLost: boolean = false;

    private static _watchAt: int = 0;

    private static _allcapAt: int = 0;

    public $ctor(): void {
        super.$ctor();
    }

    /** When the book shown was sent (the daily quests' countdown counts from it). */
    public static get fetchedAt(): int {
        return IoQuests._fetchedAt;
    }

    public static get on(): boolean {
        return GLOBAL.INFERNO_ONLY;
    }

    public static get ready(): int {
        return IoQuests.book ? IoQuests.book.ready | 0 : 0;
    }

    public static quest(id: string): any {
        return IoQuests._byId[id];
    }

    // ---- the book from the server
    /** Asks for the book if it is older than STATUS_GAP (or now, `force`). */
    public static refresh(force: boolean = false): void {
        if (!IoQuests.on || IoQuests._loading || !LOGIN.token) {
            return;
        }
        let now: int = GLOBAL.Timestamp();
        if (!force && IoQuests.book && now - IoQuests._fetchedAt < IoQuests.STATUS_GAP) {
            return;
        }
        if (!force && !IoQuests.book && IoQuests._fetchedAt > 0 && now - IoQuests._fetchedAt < 30) {
            return;
        }
        IoQuests._loading = true;
        IoQuests._fetchedAt = now;
        new URLLoaderApi().load(GLOBAL.serverUrl + "quests/status", [["v", 1]], (r: any): void => {
            IoQuests._loading = false;
            if (r && !r.error && r.quests) {
                IoQuests.update(r);
            }
        }, (e: IOErrorEvent): void => {
            IoQuests._loading = false;
        });
    }

    private static _sig: string = null;

    /** What the book holds, less the daily quests' countdown: two answers alike are the same book. */
    private static signature(r: any): string {
        let ends: any = r && r.daily ? r.daily.endsIn : undefined;
        if (r && r.daily) {
            delete r.daily.endsIn;
        }
        let s: string = "";
        try {
            s = JSON.stringify(r);
        } catch (e) {
            s = String(Math.random());
        }
        if (r && r.daily && ends !== undefined) {
            r.daily.endsIn = ends;
        }
        return s;
    }

    /** The book as the server said it is now; newly ready quests are told about (the toast). */
    public static update(r: any): void {
        // (12 October) the same book as before (every save sends the quests an event, and the answer is the book): kept,
        // and nothing drawn again. The Quest Book and the dock were built again from nothing at every answer, a stall
        // each time while the book was open. (Only the daily quests' countdown, endsIn, moves on by itself.)
        let sig: string = IoQuests.signature(r);
        if (IoQuests.book && sig == IoQuests._sig) {
            IoQuests.book = r;
            IoQuests._fetchedAt = GLOBAL.Timestamp();
            IoQuests.tick();
            IoQuestBook.ioRefreshCountdown();
            return;
        }
        IoQuests._sig = sig;
        let before: any = IoQuests.book ? IoQuests._byId : null;
        IoQuests.book = r;
        IoQuests._byId = {};
        IoQuests._fetchedAt = GLOBAL.Timestamp();
        let fresh: any[] = [];
        let revealed: any[] = [];
        for (let q of as3.values(r.quests)) {
            IoQuests._byId[q.id] = q;
            if (before && q.state == "ready" && (!before[q.id] || before[q.id].state != "ready")) {
                fresh.push(q);
            }
            // (a classified quest revealed: said once)
            if (before && before[q.id] && before[q.id].state == "classified" && q.state != "classified") {
                revealed.push(q);
            }
        }
        if (revealed.length > 0) {
            // (its own heading and seal; one revealed: named, and the book opens at it)
            IoQuests._toasts.push([revealed.length == 1 ? IoQuests.title(revealed[0]) : KEYS.Get("io_quest_revealed", { "v1": revealed.length }), revealed.length == 1 ? String(revealed[0].id) : "", "io_quest_reveal_head", "secret"]);
        }
        if (r.daily && r.daily.quests) {
            for (let d of as3.values(r.daily.quests)) {
                let did: string = "daily:" + d.id;
                IoQuests._byId[did] = d;
                if (before && d.state == "ready" && (!before[did] || before[did].state != "ready")) {
                    fresh.push(d);
                }
            }
        }
        // (QoL #118: quests the dock tracked that are collected now, or gone, are let go)
        IoQuests.ioPruneTracked();
        if (fresh.length > 0) {
            // (QoL #635)
            SOUNDS.ioNotify("quest");
        }
        if (fresh.length == 1) {
            IoQuests._toasts.push([IoQuests.title(fresh[0]), String(fresh[0].id)]);
        } else if (fresh.length > 1) {
            IoQuests._toasts.push([KEYS.Get("io_quest_toast_many", { "v1": fresh.length }), ""]);
        }
        IoQuests.version++;
        IoQuests.tick();
    }

    // ---- what the game saw
    /** Something only the game sees (a kind the server's CLIENT_EVENTS knows), `n` of it. */
    public static event(type: string, n: int = 1): void {
        if (!IoQuests.on || n <= 0 || GLOBAL.ioDesignMode()) {
            return;
        }
        IoQuests._pending[type] = ((IoQuests._pending[type] || 0) | 0) + n;
        IoQuests.queueFlush();
    }

    /** Once each time the game is started (the quests that count it need it once). */
    public static once(type: string): void {
        if (!IoQuests.on || IoQuests._sentOnce[type]) {
            return;
        }
        IoQuests._sentOnce[type] = true;
        IoQuests.event(type, 1);
    }

    /** A best so far (the biggest bank, the outposts' hourly total): sent when it is bigger. */
    public static best(type: string, value: number): void {
        if (!IoQuests.on || !(value > 0) || value <= Number(IoQuests._best[type] || 0)) {
            return;
        }
        IoQuests._best[type] = value;
        IoQuests._pendingBest[type] = Math.floor(value);
        IoQuests.queueFlush();
    }

    /** A monster hatched (the incubators and the Incubator Control Center). */
    public static hatched(id: string): void {
        // (only the player's own yard: another's hatcheries catch up when it is looked at or attacked)
        if (!IoQuests.on || !id || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        IoQuests.event("hatch", 1);
        IoQuests.event("hatch_housing", Math.max(1, CREATURES.GetProperty(id, "cStorage") | 0) | 0);
        // (each kind: the quests that name one, and "every kind")
        if (/^I?C\d{1,2}$/.test(id)) {
            IoQuests.event("hatch_" + id, 1);
        }
    }

    /** A yard looked at from the map (its View button). */
    public static viewed(x: int, y: int): void {
        if (!IoQuests.on || x < 0 || y < 0) {
            return;
        }
        let cell: int = (x * 1000 + y + 1) | 0;
        if (IoQuests._views.indexOf(cell) < 0 && IoQuests._views.length < 20) {
            IoQuests._views.push(cell);
            IoQuests.queueFlush();
        }
    }

    /** Resources spent in the yard (BASE.Charge): the server keeps the day's total. */
    public static spent(amount: number): void {
        if (!IoQuests.on || !(amount > 0) || IoTd.on || GLOBAL._catchup || GLOBAL.ioTestMode()) {
            return;
        }
        IoQuests.event("spent", Math.min(amount, 2000000000) | 0);
    }

    /** A building fell (BFOUNDATION.Destroyed): in the player's attack, counted; in a wild attack on the yard, noted. */
    public static buildingDown(b: BFOUNDATION): void {
        if (!IoQuests.on || !b || b._class == "wall" || GLOBAL.ioTestMode() || IoReplayPlayer.playing) {
            return;
        }
        let m: string = GLOBAL.mode;
        if (m == GLOBAL.e_BASE_MODE.ATTACK || m == GLOBAL.e_BASE_MODE.IATTACK || m == GLOBAL.e_BASE_MODE.WMATTACK || m == GLOBAL.e_BASE_MODE.IWMATTACK) {
            if (IoSiege.attacking || b._class == "trap" || b._class == "decoration" || b._class == "enemy") {
                return;
            }
            // (18 October: buildings destroyed, wins and loot are counted by the server from the attack's log)
            if (b instanceof BTOWER) {
                IoQuests.event("towers_destroyed", 1);
            }
            if (b instanceof BUILDING14 && (m == GLOBAL.e_BASE_MODE.ATTACK || m == GLOBAL.e_BASE_MODE.IATTACK)) {
                IoQuests.event("player_hall", 1);
            }
        } else if (WMATTACK._inProgress && b._class != "trap") {
            IoQuests.wildLost = true;
        }
    }

    /** Monsters flung into an attack (ATTACK.Spawn); the first fling: how far the yard is from home. */
    public static flung(n: int, first: boolean): void {
        if (!IoQuests.on || IoSiege.attacking || GLOBAL.ioTestMode()) {
            return;
        }
        if (n > 0) {
            IoQuests.event("fling_monsters", n);
        }
        if (first) {
            try {
                let cell: MapRoomCell = as3.as(GLOBAL._currentCell, MapRoomCell);
                if (cell && GLOBAL._mapHome && IoUnderworld.hexDistance(GLOBAL._mapHome.x | 0, GLOBAL._mapHome.y | 0, cell.cellX, cell.cellY) >= 20) {
                    IoQuests.event("long_reach", 1);
                }
            } catch (e) {
            }
        }
    }

    /**
     * An attack's end (ATTACK.EndB, before attackEnded): the yard wholly destroyed, won without losing a monster,
     * the loot, a tribe's highest yard or a level 50 Moloch beaten (flawless), Gauntlet gate 13 without the catapult.
     */
    public static attackReport(won: boolean, wholly: boolean, lost: int, loot: number, catapult: boolean): void {
        if (!IoQuests.on || IoSiege.attacking || GLOBAL.ioTestMode()) {
            return;
        }
        let wm: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK;
        let attack: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IATTACK;
        if (!wm && !attack) {
            return;
        }
        if (IoGauntlet.inAttack()) {
            if (won && IoGauntlet.attackStage == 13 && !catapult) {
                IoQuests.event("gate13_nocat", 1);
            }
            return;
        }
        if (wholly) {
            IoQuests.event("attack_total", 1);
        }
        if (won && lost == 0) {
            IoQuests.event("attack_flawless", 1);
        }
        if (won && wm) {
            let id: int = BASE._wmID;
            let level: int = IoQuests.currentCellLevel();
            if (id >= IoQuests.MOLOCH_FIRST && id <= IoQuests.MOLOCH_LAST) {
                if (level >= 50 && lost == 0) {
                    IoQuests.event("win_M50_flawless", 1);
                }
            } else {
                let tribe: string = IoQuests.tribeOf(id);
                if (tribe && level >= (IoQuests.TRIBE_TOP[tribe] | 0)) {
                    IoQuests.event("win_" + tribe + "_top", 1);
                }
            }
        }
    }

    /**
     * Every few seconds in the player's own yard: the hour (the night owl), resources at their limits (one,
     * all four, the most held), the Compounds full, how many monsters are housed, the three champions at once.
     */
    private static watch(): void {
        if (getTimer() - IoQuests._watchAt < 5000) {
            return;
        }
        IoQuests._watchAt = getTimer();
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYardOrInfernoMainYard || GLOBAL._catchup || GLOBAL.ioTestMode() || GLOBAL.ioDesignMode()) {
            return;
        }
        try {
            let hour: int = new Date().getHours() | 0;
            if (hour < 5) {
                IoQuests.once("night_reveal");
            }
            if (hour >= 2 && hour < 4) {
                IoQuests.once("night_owl");
            }
            let all: boolean = true;
            let peak: number = 0;
            for (let i: int = 1; i <= 4; i++) {
                let have: number = Number(BASE._resources["r" + i] ? Number(BASE._resources["r" + i].Get()) : 0);
                let cap: number = Number(BASE._resources["r" + i + "max"] || 0);
                peak = Math.max(peak, have);
                if (cap > 0 && have >= cap) {
                    IoQuests.once("capped");
                } else {
                    all = false;
                }
            }
            IoQuests.best("res_peak", peak);
            if (all && (IoQuests._allcapAt == 0 || getTimer() - IoQuests._allcapAt > 5 * 60000)) {
                IoQuests._allcapAt = getTimer();
                IoQuests.event("allcap", 1);
            } else if (!all && IoQuests._allcapAt != 0) {
                IoQuests._allcapAt = 0;
                IoQuests.event("allcap_off", 1);
            }
            let room: number = Number(HOUSING._housingCapacity ? Number(HOUSING._housingCapacity.Get()) : 0);
            let used: number = Number(HOUSING._housingUsed ? Number(HOUSING._housingUsed.Get()) : 0);
            if (room > 0 && room < 9999999 && used >= room) {
                IoQuests.once("housing_full");
            }
            let housed: int = 0;
            let champions: any = {};
            for (let m of (GLOBAL.player.monsterList ?? [])) {
                let n: int = m.numCreeps | 0;
                housed += n;
                if (n > 0) {
                    champions[String(m.m_creatureID)] = true;
                }
            }
            IoQuests.best("housed", housed);
            if (champions["IC9"] && champions["IC10"] && champions["IC24"]) {
                IoQuests.once("big_three");
            }
        } catch (e) {
        }
    }

    /** A monster went into the juicer. */
    public static juiced(id: string): void {
        if (!IoQuests.on || !id || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        IoQuests.event("juice", 1);
        IoQuests.event("juice_housing", Math.max(1, CREATURES.GetProperty(id, "cStorage") | 0) | 0);
    }

    /**
     * An attack ended (ATTACK.EndB). Won: a win, and which tribe (or Moloch, by his level) or a player it
     * was on. Moloch's Gauntlet and the admin's test attacks don't count.
     */
    public static attackEnded(won: boolean): void {
        if (!IoQuests.on || !won || IoGauntlet.inAttack() || IoSiege.attacking || GLOBAL.ioTestMode()) {
            return;
        }
        let wmattack: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK;
        let attack: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IATTACK;
        if (!wmattack && !attack) {
            return;
        }
        if (attack) {
            IoQuests.event("attack_player", 1);
            return;
        }
        let wm: int = BASE._wmID;
        if (wm >= IoQuests.MOLOCH_FIRST && wm <= IoQuests.MOLOCH_LAST) {
            let level: int = IoQuests.currentCellLevel();
            if (level >= 46) {
                IoQuests.event("win_M46", 1);
            }
            if (level >= 50) {
                IoQuests.event("win_M50", 1);
            }
            return;
        }
        let tribe: string = IoQuests.tribeOf(wm);
        if (tribe) {
            IoQuests.event("win_" + tribe, 1);
        }
    }

    /** The four tribes by the yard's wild monster id (TRIBES): L, K, A, D. */
    public static tribeOf(wm: int): string {
        if (wm >= 1 && wm <= 10 || wm == 41 || wm == 42) {
            return "L";
        }
        if (wm >= 11 && wm <= 20 || wm == 43 || wm == 44) {
            return "K";
        }
        if (wm >= 21 && wm <= 30 || wm == 45 || wm == 46) {
            return "A";
        }
        if (wm >= 31 && wm <= 40 || wm == 47 || wm == 48 || wm >= 101 && wm <= 110) {
            return "D";
        }
        return "";
    }

    private static currentCellLevel(): int {
        try {
            let cell: MapRoomCell = as3.as(GLOBAL._currentCell, MapRoomCell);
            return cell ? cell.ioLevel : 0;
        } catch (e) {
        }
        return 0;
    }

    private static queueFlush(): void {
        if (IoQuests._flushQueued) {
            return;
        }
        IoQuests._flushQueued = true;
        setTimeout(IoQuests.flush, IoQuests.FLUSH_MS);
    }

    private static flush(): void {
        IoQuests._flushQueued = false;
        let list: any[] = [];
        let type: string = null;
        // Inferno-only (14 October, QoL #427): what doesn't fit in one request stays for the next (it was thrown
        // away past 20), and a request that fails or is refused (a 429) is put back and sent again, up to 5
        // times, a little later each time. Hatches, warts, flings and loot were lost on a blip.
        let leftOver: any = {};
        let counted: any[] = [];
        let bests: any = {};
        for (type in IoQuests._pending) {
            let left: int = IoQuests._pending[type] | 0;
            let chunk: int = IoQuests.CHUNK[type] ? IoQuests.CHUNK[type] | 0 : 1;
            while (left > 0 && list.length < 20) {
                let n: int = Math.min(left, chunk) | 0;
                list.push({ "e": type, "n": n });
                counted.push([type, n]);
                left -= n;
            }
            if (left > 0) {
                leftOver[type] = left;
            }
        }
        let bestLeft: any = {};
        for (type in IoQuests._pendingBest) {
            if (list.length < 20) {
                list.push({ "e": type, "n": IoQuests._pendingBest[type] });
                bests[type] = IoQuests._pendingBest[type];
            } else {
                bestLeft[type] = IoQuests._pendingBest[type];
            }
        }
        let views: any[] = [];
        while (IoQuests._views.length && list.length < 30) {
            let v: any = IoQuests._views.shift();
            views.push(v);
            list.push({ "e": "map_view", "n": v });
        }
        IoQuests._pending = leftOver;
        IoQuests._pendingBest = bestLeft;
        if (!list.length || !LOGIN.token) {
            return;
        }
        let putBack: Function = (): void => {
            for (let c of counted) {
                IoQuests._pending[c[0]] = (IoQuests._pending[c[0]] | 0) + (c[1] | 0);
            }
            for (let b in bests) {
                IoQuests._pendingBest[b] = Math.max(Number(IoQuests._pendingBest[b]) || 0, Number(bests[b]) || 0);
            }
            IoQuests._views = views.concat(IoQuests._views);
            if (++IoQuests._flushFails <= 5 && !IoQuests._flushQueued) {
                IoQuests._flushQueued = true;
                setTimeout(IoQuests.flush, IoQuests.FLUSH_MS * (1 + IoQuests._flushFails * 2));
            }
        };
        new URLLoaderApi().load(GLOBAL.serverUrl + "quests/event", [["events", JSON.stringify(list)]], (r: any): void => {
            if (!r || r.error) {
                putBack();
                return;
            }
            IoQuests._flushFails = 0;
            if (r.book && r.book.quests) {
                IoQuests.update(r.book);
            }
            if (!IoQuests._flushQueued && (IoQuests.hasKeys(IoQuests._pending) || IoQuests.hasKeys(IoQuests._pendingBest) || IoQuests._views.length)) {
                IoQuests._flushQueued = true;
                setTimeout(IoQuests.flush, IoQuests.FLUSH_MS);
            }
        }, (e: IOErrorEvent): void => {
            putBack();
        });
    }

    /** Inferno-only (QoL #427): failed quest-event requests in a row. */
    private static _flushFails: int = 0;

    private static hasKeys(o: any): boolean {
        for (let k in o) {
            return true;
        }
        return false;
    }

    // ---- collecting
    public static get claiming(): boolean {
        return IoQuests._claiming;
    }

    /**
     * Collects quests ("id,id", "daily:<id>", "daily:bonus") or everything ready ("all"). The server pays
     * the main yard; the yard shown here gets the same at once. onDone(reward or null, message).
     */
    public static claim(ids: string, onDone: Function = null): void {
        if (!IoQuests.on || IoQuests._claiming) {
            return;
        }
        IoQuests._claiming = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "quests/claim", [["ids", ids]], (r: any): void => {
            IoQuests._claiming = false;
            if (!r || r.error) {
                if (onDone != null) {
                    onDone(null, r && r.error ? String(r.error) : KEYS.Get("io_quest_err"));
                }
                return;
            }
            IoQuests.pay(r);
            if (r.book && r.book.quests) {
                IoQuests.update(r.book);
            }
            if (onDone != null) {
                onDone(r.reward, "");
            }
        }, (e: IOErrorEvent): void => {
            IoQuests._claiming = false;
            if (onDone != null) {
                onDone(null, KEYS.Get("io_quest_err"));
            }
        });
    }

    /**
     * What the server paid, on the yard shown here: the Shiny as the server has it now, and the resources
     * added to what is shown and to what was last saved together (so the next save's change stays the
     * same). Away from the main yard only the Shiny: the main yard has the rest when it loads.
     */
    private static pay(r: any): void {
        if (r.credits != null && !CASINO.holdsCredits()) {
            CASINO.setCredits(r.credits | 0);
        }
        let reward: any = r.reward;
        if (!reward || !BASE.isMainYardOrInfernoMainYard || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            return;
        }
        for (let i: int = 1; i <= 4; i++) {
            let add: number = Number(reward["r" + i] || 0);
            if (add <= 0) {
                continue;
            }
            if (BASE._resources && BASE._resources["r" + i]) {
                BASE._resources["r" + i].Add(add);
                if (BASE._hpResources) {
                    BASE._hpResources["r" + i] = Number(BASE._hpResources["r" + i] || 0) + add;
                }
            }
            if (GLOBAL._resources && GLOBAL._resources["r" + i]) {
                GLOBAL._resources["r" + i].Add(add);
                if (GLOBAL._hpResources) {
                    GLOBAL._hpResources["r" + i] = Number(GLOBAL._hpResources["r" + i] || 0) + add;
                }
            }
        }
        try {
            UI2.Update();
        } catch (e) {
        }
    }

    // ---- (QoL #119) the day's free reroll of a daily quest
    private static _rerolling: boolean = false;

    public static get rerolling(): boolean {
        return IoQuests._rerolling;
    }

    /** Whether today's free reroll is still there (the book says so). */
    public static get rerollFree(): boolean {
        return GLOBAL.INFERNO_ONLY && Boolean(IoQuests.book && IoQuests.book.daily && IoQuests.book.daily.reroll);
    }

    /**
     * Inferno-only (QoL #119, 15 October): swaps today's daily quest `id` (its id, without "daily:") for another, once a
     * day (POST quests/reroll: the server picks it and keeps that the day's reroll is used). onDone(the new one's id or
     * null, message).
     */
    public static reroll(id: string, onDone: Function = null): void {
        if (!IoQuests.on || IoQuests._rerolling) {
            return;
        }
        IoQuests._rerolling = true;
        new URLLoaderApi().load(GLOBAL.serverUrl + "quests/reroll", [["id", id]], (r: any): void => {
            IoQuests._rerolling = false;
            if (!r || r.error) {
                // (the server's reasons in the player's language, by their code)
                let code: string = r && r.code ? String(r.code) : "";
                if (onDone != null) {
                    onDone(null, /^[a-z]{1,12}$/.test(code) ? KEYS.Get("io_q2_reroll_" + code) : r && r.error ? String(r.error) : KEYS.Get("io_quest_err"));
                }
                return;
            }
            if (r.book && r.book.quests) {
                IoQuests.update(r.book);
            }
            if (onDone != null) {
                onDone(String(r.to || ""), "");
            }
        }, (e: IOErrorEvent): void => {
            IoQuests._rerolling = false;
            if (onDone != null) {
                onDone(null, KEYS.Get("io_quest_err"));
            }
        });
    }

    // ---- (QoL #118) the quests the dock tracks
    /** The most quests the player can choose for the dock (the ready ones show anyway). */
    public static readonly TRACK_MAX: int = 3;

    private static ioTrackKey(): string {
        return "ioQTrack" + LOGIN._playerID;
    }

    /**
     * Inferno-only (QoL #118, 15 October): the quests the player chose for the dock (IoQuestTracker), in the order
     * chosen, kept in this browser for each account.
     */
    public static tracked(): any[] {
        if (!GLOBAL.INFERNO_ONLY) {
            return [];
        }
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            let kept: any = so.data[IoQuests.ioTrackKey()];
            if (as3.is(kept, Array)) {
                return (as3.as(kept, Array)).slice(0, IoQuests.TRACK_MAX);
            }
        } catch (e) {
        }
        return [];
    }

    public static isTracked(id: string): boolean {
        return IoQuests.tracked().indexOf(id) >= 0;
    }

    private static ioSaveTracked(list: any[]): void {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            so.data[IoQuests.ioTrackKey()] = list;
            so.flush();
        } catch (e) {
        }
    }

    /** Tracks a quest in the dock (or stops); false when TRACK_MAX are tracked already. The dock redraws. */
    public static setTracked(id: string, on: boolean): boolean {
        if (!GLOBAL.INFERNO_ONLY || !id) {
            return false;
        }
        let list: any[] = IoQuests.tracked();
        let at: int = list.indexOf(id);
        if (on == (at >= 0)) {
            return true;
        }
        if (on) {
            if (list.length >= IoQuests.TRACK_MAX) {
                return false;
            }
            list.push(id);
        } else {
            list.splice(at, 1);
        }
        IoQuests.ioSaveTracked(list);
        IoQuests.version++;
        return true;
    }

    /** The tracked quests the book no longer has, or that are collected, are let go. */
    private static ioPruneTracked(): void {
        let list: any[] = IoQuests.tracked();
        if (!list.length) {
            return;
        }
        let keep: any[] = list.filter((id: any): boolean => {
            let q: any = IoQuests._byId[String(id)];
            return q != null && q.state != "claimed" && q.state != "classified";
        });
        if (keep.length != list.length) {
            IoQuests.ioSaveTracked(keep);
        }
    }

    // ---- text
    /** A quest's (or daily quest's) name. */
    public static title(q: any): string {
        // (Inferno-only, 14 October, QoL #4: a daily quest done yesterday but not collected stays for a day)
        if (q && q.yesterday) {
            return KEYS.Get("io_quest_yesterday", { "v1": IoQuests.say("io_qt_", q) });
        }
        return IoQuests.say("io_qt_", q);
    }

    /** What to do for it. */
    public static describe(q: any): string {
        return IoQuests.say("io_qd_", q);
    }

    private static say(prefix: string, q: any): string {
        let v: any = {};
        let vars: any[] = as3.as(q.vars, Array) || [];
        for (let i: int = 0; i < vars.length; i++) {
            let s: string = String(vars[i]);
            if (s.length > 2 && s.charAt(0) == "#" && s.charAt(s.length - 1) == "#") {
                s = KEYS.Get(s);
            }
            v["v" + (i + 1)] = s;
        }
        let go: string = String(q.go || "");
        if ((q.tmpl == "build" || q.tmpl == "level") && go.indexOf("build:") == 0) {
            let name: string = IoQuests.buildingName(Number(go.substr(6)) | 0);
            if (name) {
                v.v1 = name;
            }
        }
        return KEYS.Get(prefix + q.tmpl, v);
    }

    /** A building's name as the yard calls it (an Inferno yard's own names). */
    public static buildingName(type: int): string {
        try {
            let props: any = GLOBAL._buildingProps[type - 1];
            if (props && props.name) {
                let name: string = KEYS.Get(String(props.name));
                if (name && name.charAt(0) != "#") {
                    return name;
                }
            }
        } catch (e) {
        }
        return null;
    }

    /** "500K bone, coal and sulfur, 250K magma, 10 shiny" */
    public static rewardText(r: any): string {
        if (!r) {
            return "";
        }
        let parts: any[] = [];
        let r1: number = Number(r.r1 || 0);
        let r2: number = Number(r.r2 || 0);
        let r3: number = Number(r.r3 || 0);
        let r4: number = Number(r.r4 || 0);
        if (r1 > 0 && r1 == r2 && r2 == r3) {
            parts.push(KEYS.Get("io_quest_r_bcs", { "v1": IoQuests.short(r1) }));
        } else {
            if (r1 > 0) {
                parts.push(KEYS.Get("io_quest_r_1", { "v1": IoQuests.short(r1) }));
            }
            if (r2 > 0) {
                parts.push(KEYS.Get("io_quest_r_2", { "v1": IoQuests.short(r2) }));
            }
            if (r3 > 0) {
                parts.push(KEYS.Get("io_quest_r_3", { "v1": IoQuests.short(r3) }));
            }
        }
        if (r4 > 0) {
            parts.push(KEYS.Get("io_quest_r_4", { "v1": IoQuests.short(r4) }));
        }
        if ((r.shiny | 0) > 0) {
            parts.push(KEYS.Get("io_quest_r_shiny", { "v1": r.shiny | 0 }));
        }
        return parts.join(", ");
    }

    /** 1.5M, 250K, 900 */
    public static short(n: number): string {
        if (n >= 1000000) {
            let m: number = Math.round(n / 100000) / 10;
            return m + "M";
        }
        if (n >= 10000) {
            return Math.round(n / 1000) + "K";
        }
        return GLOBAL.FormatNumber(n);
    }

    // ---- "Go there"
    /** Takes the player to where a quest is done (the book is closed first). */
    public static go(target: string, q: any = null): void {
        let tab: int = 0;
        if (!target) {
            return;
        }
        // (Inferno-only, QoL #467: the window or yard it opens offers "◀ Quest Book" back)
        if (GLOBAL.INFERNO_ONLY) {
            IoWin.openFrom(KEYS.Get("io_win_back_questbook"), (): void => { IoQuestBook.Show(null, q ? (q.cat ? String(q.id) : "daily:" + q.id) : null); });
        }
        let parts: any[] = target.split(":");
        let what: string = as3.str(parts[0]);
        let arg: string = parts.length > 1 ? String(parts[1]) : "";
        try {
            switch (what) {
                case "build":
                    IoQuests.goBuilding(Number(arg) | 0, Boolean(q && q.tmpl == "level"));
                    break;
                case "map":
                    // (the map opens from a Map Room: without one, the build menu at it)
                    if (BASE.isMainYardOrInfernoMainYard && !GLOBAL._bMap) {
                        IoQuests.goBuilding(11, false);
                    } else if (q && q.key == "fling" && BASE.isMainYardOrInfernoMainYard && !GLOBAL._bFlinger) {
                        // (QoL #121: flinging needs a Flinger: the build menu at it)
                        IoQuests.goBuilding(5, false);
                    } else {
                        GLOBAL.ShowMap();
                    }
                    break;
                case "chat":
                    IoQuests.openChat(arg == "alliance" ? BYMChat.IO_ALLIANCE : BYMChat.IO_GLOBAL);
                    break;
                case "leaderboards":
                    IoLeaderboards.Show();
                    break;
                case "daily":
                    BASE.ioOpenDaily();
                    break;
                case "gauntlet":
                    IoGauntlet.Show();
                    break;
                case "pit":
                    CasinoWindow.Show();
                    break;
                case "outposts":
                    IoOutpostsPopup.Show();
                    break;
                case "invite":
                    UI_TOP.ioShowInvite();
                    break;
                case "planner":
                    PLANNER.Show();
                    break;
                case "attacklog":
                    IoAttackLogs.Show();
                    break;
                case "changelog":
                    IoChangelog.Show();
                    break;
                case "daily_quests":
                    IoQuestBook.Show(null, "daily");
                    break;
                case "arcade":
                    if (arg) {
                        ArcadeWindow.ShowGame(arg);
                    } else {
                        ArcadeWindow.Show();
                    }
                    break;
                // (QoL #120, 15 October: the quests that had nowhere to go; only the Inferno's book sends these)
                case "wart":
                    IoQuests.goWart();
                    break;
                case "tower":
                    IoQuests.goTower();
                    break;
                case "bank":
                    IoQuests.goBank();
                    break;
                case "mail":
                    if (GLOBAL._flags && GLOBAL._flags.messaging == 1) {
                        MAILBOX.Show();
                    } else {
                        GLOBAL.Message(KEYS.Get("disabled_mail"));
                    }
                    break;
                case "decorations":
                    BUILDINGS._buildingID = 0;
                    BUILDINGS._menuA = 4;
                    BUILDINGS._menuB = 0;
                    BUILDINGS._page = 0;
                    BUILDINGS.Show();
                    break;
                case "alliances":
                    ALLIANCEWINDOW.Show();
                    if (arg != "" && ALLIANCEWINDOW._mc) {
                        tab = Number(arg) | 0;
                        setTimeout((): void => {
                            if (ALLIANCEWINDOW._open && ALLIANCEWINDOW._mc) {
                                ALLIANCEWINDOW._mc.SelectTab(tab);
                            }
                        }, 50);
                    }
                    break;
            }
        } catch (e) {
            LOGGER.Log("log", "IoQuests.go " + target + ": " + e.message);
        }
    }

    /** The building, if the yard has it (its upgrade, for a level quest); otherwise the build menu at it. */
    private static goBuilding(type: int, upgrade: boolean): void {
        let found: BFOUNDATION = null;
        for (let b of as3.values(BASE._buildingsAll)) {
            if (b && b._type == type && (!found || b._lvl.Get() > found._lvl.Get())) {
                found = b;
            }
        }
        if (found) {
            if (found._mc) {
                MAP.FocusTo(found._mc.x | 0, found._mc.y | 0, 0.5);
            }
            if (upgrade) {
                BUILDINGOPTIONS.Show(found, "upgrade");
            } else {
                BASE.BuildingSelect(found);
            }
            return;
        }
        try {
            let props: any = GLOBAL._buildingProps[type - 1];
            if (props && props.group) {
                BUILDINGS._menuA = props.group | 0;
                // (16 October: a decoration's tab is the Inferno's own grouping: BUILDINGSPOPUP.ioDecoTabOf)
                BUILDINGS._menuB = (props.group | 0) == 4 && GLOBAL.INFERNO_ONLY ? Math.max(0, BUILDINGSPOPUP.ioDecoTabOf(type)) | 0 : props.subgroup != null ? props.subgroup | 0 : 1;
                BUILDINGS._page = 0;
            }
        } catch (e) {
        }
        BUILDINGS._buildingID = type;
        BUILDINGS.Show();
    }

    /** QoL #120: a wart in the yard (one not being picked), the view moved to it; none: says so. */
    private static goWart(): void {
        let found: BFOUNDATION = null;
        for (let b of (InstanceManager.getInstancesByClass(BMUSHROOM) ?? [])) {
            let w: BFOUNDATION = b as BFOUNDATION;
            if (!w || w instanceof IoHfoIce || w._picking || !w._mc) {
                continue;
            }
            found = w;
            break;
        }
        if (!found) {
            IoToast.Show(KEYS.Get("io_q2_go_nowart"), 4000);
            return;
        }
        MAP.FocusTo(found._mc.x | 0, found._mc.y | 0, 0.5);
    }

    /** The Inferno's towers (Sharpshooter, Quake, Blast, Magma, Cinder Coil, Obsidian Mortar). */
    private static readonly IO_TOWERS: any[] = [21, 129, 130, 132, 144, 145];

    /**
     * QoL #120: the highest tower that can still go up a level, its upgrade (none can: the highest, selected); no
     * tower: the build menu at the Sharpshooter.
     */
    private static goTower(): void {
        let found: BFOUNDATION = null;
        let foundCan: boolean = false;
        for (let b of as3.values(BASE._buildingsAll)) {
            if (!b || IoQuests.IO_TOWERS.indexOf(b._type | 0) < 0 || !b._lvl) {
                continue;
            }
            let top: int = 0;
            try {
                let props: any = GLOBAL._buildingProps[(b._type | 0) - 1];
                top = props && props.costs ? props.costs.length | 0 : 0;
            } catch (e) {
            }
            let can: boolean = top <= 0 || b._lvl.Get() < top;
            if (!found || (can && !foundCan) || (can == foundCan && b._lvl.Get() > found._lvl.Get())) {
                found = b;
                foundCan = can;
            }
        }
        if (!found) {
            IoQuests.goBuilding(21, false);
            return;
        }
        if (found._mc) {
            MAP.FocusTo(found._mc.x | 0, found._mc.y | 0, 0.5);
        }
        if (foundCan) {
            BUILDINGOPTIONS.Show(found, "upgrade");
        } else {
            BASE.BuildingSelect(found);
        }
    }

    /** QoL #120: the harvester holding the most, selected (its Bank button); none: the build menu at the Bone one. */
    private static goBank(): void {
        let found: BFOUNDATION = null;
        for (let b of (InstanceManager.getInstancesByClass(BRESOURCE) ?? [])) {
            let r: BFOUNDATION = b as BFOUNDATION;
            if (!r || r._class !== "resource" || !r._stored) {
                continue;
            }
            if (!found || r._stored.Get() > found._stored.Get()) {
                found = r;
            }
        }
        if (!found) {
            IoQuests.goBuilding(1, false);
            return;
        }
        if (found._mc) {
            MAP.FocusTo(found._mc.x | 0, found._mc.y | 0, 0.5);
        }
        BASE.BuildingSelect(found);
    }

    private static openChat(mode: string): void {
        if (!Chat._bymChat || !Chat._bymChat.chatBox) {
            return;
        }
        Chat._bymChat.chatBox.ioOpen();
        Chat._bymChat.ioSwitch(mode);
    }

    // ---- the toast: a quest is ready (no sound: the user's book isn't a slot machine)
    /** Shows the next toast when the yard is being built in (called by the dock as it updates). */
    public static tick(): void {
        if (!IoQuests.on) {
            return;
        }
        IoQuests.watch();
        if (IoQuests._toast && getTimer() > IoQuests._toastUntil) {
            IoQuests.hideToast();
        }
        if (IoQuests._toast || !IoQuests._toasts.length || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !GLOBAL._layerTop) {
            return;
        }
        let next: any[] = as3.cast(IoQuests._toasts.shift(), Array);
        if (IoQuests._toasts.length > 3) {
            IoQuests._toasts = IoQuests._toasts.slice(IoQuests._toasts.length - 3);
        }
        IoQuests.showToast(String(next[0]), String(next[1]), next.length > 2 ? String(next[2]) : "io_quest_toast_head", next.length > 3 ? String(next[3]) : "star");
    }

    private static showToast(text: string, id: string, headKey: string = "io_quest_toast_head", glyph: string = "star"): void {
        let t: Sprite = null;
        let fade: Function = null;
        let w: int = 300;
        // (QoL #116: one ready quest: its reward, and Collect right there)
        let q: any = id && glyph == "star" ? IoQuests.quest(id) : null;
        let reward: string = q && q.reward && String(q.state) == "ready" ? IoQuests.rewardText(q.reward) : "";
        let h: int = reward ? 66 : 50;
        if (reward) {
            w = 360;
        }
        t = new Sprite();
        t.name = "ioQuestToast";
        t.buttonMode = true;
        t.mouseChildren = reward != "";
        let bg: Sprite = as3.as(t.addChild(CasinoUI.panel(w, h, 0.95)), Sprite);
        bg.filters = [new GlowFilter(0xFFB040, 0.8, 12, 12, 2, 2)];
        let icon: Sprite = as3.as(t.addChild(IoQuestArt.glyph(glyph, 30)), Sprite);
        icon.x = 26;
        icon.y = 25;
        let head: TextField = as3.as(t.addChild(CasinoUI.label(KEYS.Get(headKey), 11, CasinoUI.EMBER, true, (w - 60) | 0, TextFormatAlign.LEFT)), TextField);
        head.x = 48;
        head.y = 6;
        let line: TextField = as3.as(t.addChild(CasinoUI.label(text, 13, CasinoUI.GOLD, true, (w - 60) | 0, TextFormatAlign.LEFT)), TextField);
        line.x = 48;
        line.y = 22;
        if (reward) {
            line.width = w - 150;
            let got: TextField = as3.as(t.addChild(CasinoUI.label(reward, 10, CasinoUI.ASH, false, (w - 150) | 0, TextFormatAlign.LEFT)), TextField);
            got.name = "ioQuestToastReward";
            got.mouseEnabled = false;
            got.x = 48;
            got.y = 42;
            head.mouseEnabled = false;
            line.mouseEnabled = false;
            icon.mouseEnabled = false;
            let collect: Sprite = as3.as(t.addChild(CasinoUI.button(KEYS.Get("io_quest_collect"), 86, 28, (e: MouseEvent): void => {
                e.stopPropagation();
                IoQuests.hideToast();
                IoQuests.claim(id, (paid: any, error: string): void => {
                    if (paid) {
                        SOUNDS.Play("chaching");
                        IoToast.Show(KEYS.Get("io_quest_got", { "v1": IoQuests.rewardText(paid) }) + (BASE.isMainYardOrInfernoMainYard ? "" : " " + KEYS.Get("io_quest_to_main")));
                    } else if (error) {
                        IoToast.Show(error);
                    }
                });
            }, !IoQuests.claiming, 12)), Sprite);
            collect.name = "ioQuestToastCollect";
            collect.x = w - 96;
            collect.y = ((h - 28) / 2) | 0;
        }
        t.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            IoQuests.hideToast();
            IoQuestBook.Show(null, id);
        });
        GLOBAL.RefreshScreen();
        t.x = (GLOBAL._SCREEN.x + (GLOBAL._SCREEN.width - w) / 2) | 0;
        t.y = (GLOBAL._SCREEN.y + 86) | 0;
        t.alpha = 0;
        fade = (e: Event): void => {
            if (IoQuests._toast != t) {
                t.removeEventListener(Event.ENTER_FRAME, fade);
                return;
            }
            // (by the clock, not by frames: the same quick fade on a slow machine as on a fast one)
            let now: int = getTimer();
            let shown: int = (now - (IoQuests._toastUntil - 4500)) | 0;
            t.alpha = Math.max(0, Math.min(1, shown / 150, (IoQuests._toastUntil - now) / 400));
            if (getTimer() > IoQuests._toastUntil) {
                t.removeEventListener(Event.ENTER_FRAME, fade);
                IoQuests.hideToast();
            }
        };
        t.addEventListener(Event.ENTER_FRAME, fade);
        GLOBAL._layerTop.addChild(t);
        IoQuests._toast = t;
        IoQuests._toastUntil = (getTimer() + 4500) | 0;
    }

    private static hideToast(): void {
        if (IoQuests._toast) {
            if (IoQuests._toast.parent) {
                IoQuests._toast.parent.removeChild(IoQuests._toast);
            }
            IoQuests._toast = null;
        }
    }
}

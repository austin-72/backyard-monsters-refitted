import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer, setTimeout } from "flash/utils";
import { ALLIANCEWINDOW, BASE, BFOUNDATION, BUILDINGOPTIONS, BUILDINGS, BYMChat, CASINO, CREATURES, CasinoUI, CasinoWindow, Chat, GLOBAL, IoGauntlet, IoLeaderboards, IoOutpostsPopup, IoQuestArt, IoQuestBook, KEYS, LOGGER, LOGIN, MAP, MapRoomCell, UI2, UI_TOP, URLLoaderApi } from "@game";

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
    private static readonly CHUNK: any = { "hatch": 100, "hatch_housing": 3000, "juice": 100, "juice_housing": 3000, "wart_pick": 3 };

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

    /** The book as the server said it is now; newly ready quests are told about (the toast). */
    public static update(r: any): void {
        let before: any = IoQuests.book ? IoQuests._byId : null;
        IoQuests.book = r;
        IoQuests._byId = {};
        IoQuests._fetchedAt = GLOBAL.Timestamp();
        let fresh: any[] = [];
        for (let q of as3.values(r.quests)) {
            IoQuests._byId[q.id] = q;
            if (before && q.state == "ready" && (!before[q.id] || before[q.id].state != "ready")) {
                fresh.push(q);
            }
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
        if (id == "IC9" || id == "IC10" || id == "IC24") {
            IoQuests.event("hatch_" + id, 1);
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
        if (!IoQuests.on || !won || IoGauntlet.inAttack() || GLOBAL.ioTestMode()) {
            return;
        }
        let wmattack: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.WMATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IWMATTACK;
        let attack: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.ATTACK || GLOBAL.mode == GLOBAL.e_BASE_MODE.IATTACK;
        if (!wmattack && !attack) {
            return;
        }
        IoQuests.event("attack_win", 1);
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
        for (type in IoQuests._pending) {
            let left: int = IoQuests._pending[type] | 0;
            let chunk: int = IoQuests.CHUNK[type] ? IoQuests.CHUNK[type] | 0 : 1;
            while (left > 0 && list.length < 20) {
                let n: int = Math.min(left, chunk) | 0;
                list.push({ "e": type, "n": n });
                left -= n;
            }
        }
        for (type in IoQuests._pendingBest) {
            if (list.length < 20) {
                list.push({ "e": type, "n": IoQuests._pendingBest[type] });
            }
        }
        IoQuests._pending = {};
        IoQuests._pendingBest = {};
        if (!list.length || !LOGIN.token) {
            return;
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "quests/event", [["events", JSON.stringify(list)]], (r: any): void => {
            if (r && !r.error && r.book && r.book.quests) {
                IoQuests.update(r.book);
            }
        }, (e: IOErrorEvent): void => {
        });
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

    // ---- text
    /** A quest's (or daily quest's) name. */
    public static title(q: any): string {
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
                BUILDINGS._menuB = props.subgroup != null ? props.subgroup | 0 : 1;
                BUILDINGS._page = 0;
            }
        } catch (e) {
        }
        BUILDINGS._buildingID = type;
        BUILDINGS.Show();
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
        IoQuests.showToast(String(next[0]), String(next[1]));
    }

    private static showToast(text: string, id: string): void {
        let t: Sprite = null;
        let fade: Function = null;
        let w: int = 300;
        t = new Sprite();
        t.name = "ioQuestToast";
        t.buttonMode = true;
        t.mouseChildren = false;
        let bg: Sprite = as3.as(t.addChild(CasinoUI.panel(w, 50, 0.95)), Sprite);
        bg.filters = [new GlowFilter(0xFFB040, 0.8, 12, 12, 2, 2)];
        let icon: Sprite = as3.as(t.addChild(IoQuestArt.glyph("star", 30)), Sprite);
        icon.x = 26;
        icon.y = 25;
        let head: TextField = as3.as(t.addChild(CasinoUI.label(KEYS.Get("io_quest_toast_head"), 11, CasinoUI.EMBER, true, (w - 60) | 0, TextFormatAlign.LEFT)), TextField);
        head.x = 48;
        head.y = 6;
        let line: TextField = as3.as(t.addChild(CasinoUI.label(text, 13, CasinoUI.GOLD, true, (w - 60) | 0, TextFormatAlign.LEFT)), TextField);
        line.x = 48;
        line.y = 22;
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
            if (getTimer() < IoQuests._toastUntil - 400) {
                t.alpha = Math.min(1, t.alpha + 0.12);
            } else {
                t.alpha = Math.max(0, t.alpha - 0.08);
            }
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

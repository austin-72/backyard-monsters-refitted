import * as as3 from "as3";
import { int } from "as3";
import { GradientType, MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import {
    BASE,
    BTOWER,
    BTRAP,
    CasinoUI,
    ChampionBase,
    CREEPS,
    GLOBAL,
    HOUSING,
    InstanceManager,
    IoDevilMark,
    IoDevilWindow,
    IoFmiWaves,
    IoHfoWaves,
    IoReplayPlayer,
    IoSynergy,
    IoTd,
    IoTd2,
    IoToast,
    KEYS,
    LOGIN,
    MonsterBase,
    POPUPS,
    QUEUE,
    STORE,
    Targeting,
    UI2,
    UI_WORKERS,
    URLLoaderApi,
    WORKERS,
} from "@game";

/**
 * Inferno-only (13 November, the user's): the Devil's Contract. At most once every 23 hours (the server's
 * InfernoOnlyConfig.devil.offerHours, from the last offer's answer) the player's main yard is offered three contracts
 * (IoDevilWindow): sign one, or refuse all three. Each has a boon and a price, both from signing, for their own hours.
 * The server (services/devil/devilContract.ts) picks the offer, so an offer never holds a contract that would stack
 * with one still in force, and keeps what was signed; every number is its config (the flag io_devil), so a server
 * restart retunes them.
 *
 * This is what a contract in force does in the game:
 *   production   harvesters' output, per resource (GLOBAL.ioHarvestMulFor: the yard's harvesters, the main yard's
 *                rates, the outposts' income)
 *   storage      the main yard's storage (BASE.CalcResources); Hoarder's Seal's burn when its boon ends (burnOver: the
 *                resources over that share of the normal storage are taken, once: devil/settle)
 *   costs        everything bought with resources (BASE.Charge; kits and takeovers in their own prices)
 *   speedups     Shiny to finish something early (STORE)
 *   workers      one more worker, who finishes his job after the boon (QUEUE.Spawn, as the Store's Apprentice)
 *   monsterDamage / monsterHurt / monsterSpeed / monsterHealth: the player's monsters when they attack (IoDevilMark),
 *                never a champion (the user's rule), not in a replay or the events' arenas
 *   housing, monsterCost  (HOUSING; CREATURES.GetProperty "cResource")
 *   towerDamage / towerRange, trapDamage: the towers and traps of whoever's yard it is (their owner's contracts: the
 *                yard's load, io_devil_yard), so they defend with them against anyone; trapRearm: re-arming (IoTrapRearm)
 *   kitCost      outpost kits (InfernoKits); kitNoProtection is the server's (applykit, takeovercell)
 */
export class IoDevil {
    private static _raw: string = null;
    private static _cfg: any = null;
    /** The player's own: { offer: [ids] | null, offerAt, active: [{ id, at, boonUntil, priceUntil, settled? }], next, now }. */
    public static _state: any = null;
    /** The loaded yard's owner's effects now (the server's, io_devil_yard), for a yard that isn't the player's. */
    private static _yard: any = null;
    private static _fx: any = null;
    private static _fxAt: int = -1;
    private static _sig: string = null;
    private static _lastSecond: int = 0;
    /** The offer already shown this session (its time), so a yard loaded again doesn't show it again at once. */
    private static _offerShown: number = 0;
    private static _offerWait: int = 0;
    private static _settling: any = {};
    private static _pill: Sprite = null;
    private static _battleSteps: int = 0;

    public static readonly NUMERALS: any = { furnace: "XV", hoarder: "IV", merchant: "IX", shift: "XIII", bloodlust: "VI", horde: "VII", ranks: "XII", bastion: "XVI", traps: "XX", kitbinder: "XI" };

    /** The server's settings (null when off). */
    public static get config(): any {
        let raw: string = GLOBAL.INFERNO_ONLY && GLOBAL._flags && GLOBAL._flags.io_devil ? String(GLOBAL._flags.io_devil) : "";
        if (raw === IoDevil._raw) {
            return IoDevil._cfg;
        }
        IoDevil._raw = raw;
        IoDevil._cfg = null;
        IoDevil._fxAt = -1;
        if (raw == "") {
            return null;
        }
        try {
            let c: any = JSON.parse(raw);
            if (c && c.enabled && c.contracts) {
                IoDevil._cfg = c;
            }
        } catch (e) {
        }
        return IoDevil._cfg;
    }

    public static def(id: string): any {
        let c: any = IoDevil.config;
        return c && c.contracts ? c.contracts[id] : null;
    }

    /** From a yard's load: the player's own state (only with their main yard; kept for their outposts) and the yard's owner's effects. */
    public static setData(own: any, yard: any): void {
        if (own && typeof own == "object") {
            IoDevil._state = own;
        }
        IoDevil._yard = yard && typeof yard == "object" ? yard : null;
        IoDevil._fxAt = -1;
        IoDevil._sig = null;
    }

    /** The player's contracts still holding anything. */
    public static entries(): any[] {
        let s: any = IoDevil._state;
        return s && as3.is(s.active, Array) ? s.active : [];
    }

    // ---- effects
    /** The player's own effects now: boons while they run, prices while they run (as the server's effectsOf). */
    public static effects(): any {
        let now: int = GLOBAL.Timestamp() | 0;
        if (IoDevil._fx && IoDevil._fxAt == now) {
            return IoDevil._fx;
        }
        let out: any = {};
        let c: any = IoDevil.config;
        if (c) {
            for (let e of IoDevil.entries()) {
                let d: any = c.contracts[e.id];
                if (!d) {
                    continue;
                }
                if (now < Number(e.boonUntil)) {
                    IoDevil.addFx(out, d.boon);
                }
                if (now < Number(e.priceUntil)) {
                    IoDevil.addFx(out, d.price);
                }
            }
        }
        IoDevil._fx = out;
        IoDevil._fxAt = now;
        return out;
    }

    private static addFx(out: any, fx: any): void {
        for (let k in fx ?? {}) {
            let v: any = fx[k];
            if (k == "hours" || k == "burnOver") {
                continue;
            }
            if (k == "production" && v && typeof v == "object") {
                if (!out.production) {
                    out.production = {};
                }
                for (let r in v) {
                    out.production[r] = (out.production[r] != null ? Number(out.production[r]) : 1) * Number(v[r]);
                }
            } else if (k == "workers" || k == "kitNoProtection") {
                out[k] = (Number(out[k]) || 0) + Number(v);
            } else {
                out[k] = (out[k] != null ? Number(out[k]) : 1) * Number(v);
            }
        }
    }

    /** One of the player's own multipliers (1 when none, or off). */
    public static mul(key: string): number {
        if (!GLOBAL.INFERNO_ONLY || !IoDevil.config) {
            return 1;
        }
        let v: any = IoDevil.effects()[key];
        return v != null && isFinite(Number(v)) ? Number(v) : 1;
    }

    /** What harvesters of resource `r` (1-4) make, times. */
    public static production(r: int): number {
        if (!GLOBAL.INFERNO_ONLY || !IoDevil.config) {
            return 1;
        }
        let p: any = IoDevil.effects().production;
        return p && p["r" + r] != null ? Math.max(0, Number(p["r" + r])) : 1;
    }

    /** Workers lent while the boon runs. */
    public static workers(): int {
        return GLOBAL.INFERNO_ONLY && IoDevil.config ? (Number(IoDevil.effects().workers) || 0) | 0 : 0;
    }

    /** Is the yard loaded the player's own (main or outpost)? */
    public static ownYard(): boolean {
        return String(BASE._userID) == String(LOGIN._playerID);
    }

    /** One of the loaded yard's owner's multipliers (towers, traps): the player's own in their yards, else the server's. */
    public static yardMul(key: string): number {
        if (!GLOBAL.INFERNO_ONLY || !IoDevil.config || GLOBAL.ioTdMode() || GLOBAL.ioDesignMode()) {
            return 1;
        }
        if (IoDevil.ownYard()) {
            return IoDevil.mul(key);
        }
        let v: any = IoDevil._yard ? IoDevil._yard[key] : null;
        return v != null && isFinite(Number(v)) ? Number(v) : 1;
    }

    /** The discount on resources spent (BASE.Charge), 1 for none. */
    public static costMul(): number {
        return IoDevil.mul("costs");
    }

    /** A kit's price, times (Merchant's Due and Kitbinder). */
    public static kitMul(): number {
        return IoDevil.mul("costs") * IoDevil.mul("kitCost");
    }

    // ---- the contracts' words
    private static pct(m: number): int {
        return Math.round(Math.abs(Number(m) - 1) * 100) | 0;
    }

    /** { name, short, boon, price, boonHours, priceHours, numeral } for contract `id`, its numbers the server's. */
    public static describe(id: string): any {
        let d: any = IoDevil.def(id) || { boon: {}, price: {} };
        let b: any = d.boon || {};
        let p: any = d.price || {};
        let v1: any = null;
        let v2: any = null;
        if (id == "furnace") {
            v1 = IoDevil.pct(b.production ? b.production.r1 : 1);
        } else if (id == "hoarder") {
            v1 = IoDevil.pct(b.storage);
            v2 = Math.round(Number(p.burnOver) * 100);
        } else if (id == "merchant") {
            v1 = IoDevil.pct(b.costs);
            v2 = IoDevil.pct(p.speedups);
        } else if (id == "bloodlust") {
            v1 = IoDevil.pct(b.monsterDamage);
            v2 = IoDevil.pct(p.monsterHurt);
        } else if (id == "horde") {
            v1 = IoDevil.pct(b.monsterSpeed);
            v2 = IoDevil.pct(p.monsterHealth);
        } else if (id == "ranks") {
            v1 = IoDevil.pct(b.housing);
            v2 = IoDevil.pct(p.monsterCost);
        } else if (id == "bastion") {
            v1 = IoDevil.pct(b.towerDamage);
            v2 = IoDevil.pct(p.towerRange);
        } else if (id == "traps") {
            v1 = IoDevil.pct(b.trapDamage);
            v2 = Math.round(Number(p.trapRearm));
        } else if (id == "kitbinder") {
            v1 = IoDevil.pct(b.kitCost);
        }
        return {
            "id": id,
            "name": KEYS.Get("io_dv_name_" + id),
            "short": KEYS.Get("io_dv_short_" + id, { "v1": v1 }),
            "boon": KEYS.Get("io_dv_boon_" + id, { "v1": v1 }),
            "price": KEYS.Get("io_dv_price_" + id, { "v1": v2 }),
            "boonHours": Number(b.hours) || 0,
            "priceHours": Number(p.hours) || 0,
            "numeral": IoDevil.NUMERALS[id] || "",
        };
    }

    // ---- every frame (GLOBAL), once a second
    public static Tick(): void {
        if (!GLOBAL.INFERNO_ONLY || !IoDevil.config || BASE._loading) {
            IoDevil.pill(false);
            return;
        }
        let now: int = GLOBAL.Timestamp() | 0;
        if (now == IoDevil._lastSecond) {
            return;
        }
        IoDevil._lastSecond = now;
        let sig: string = JSON.stringify(IoDevil.effects()) + "|" + (IoDevil._yard ? JSON.stringify(IoDevil._yard) : "");
        if (IoDevil._sig != null && sig != IoDevil._sig) {
            IoDevil.changed();
        }
        IoDevil._sig = sig;
        IoDevil.settleBurns(now);
        IoDevil.workerTick();
        IoDevil.offerTick();
        IoDevil.pill(true);
    }

    /** Something started or ended: what reads the effects only when it is set up, set up again. */
    private static changed(): void {
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && IoDevil.ownYard()) {
            try {
                BASE.CalcResources();
            } catch (e) {
            }
            try {
                HOUSING.HousingSpace();
            } catch (e) {
            }
        }
        IoDevil.refreshTowers();
    }

    /** The yard's towers' damage and range, and its traps' damage, worked out again (BTOWER.Props reads yardMul). */
    public static refreshTowers(): void {
        for (let b of as3.values(InstanceManager.getInstancesByClass(BTOWER) ?? [])) {
            try {
                let t: any = b;
                if (t._lvl && t._lvl.Get() > 0) {
                    t.Props();
                }
            } catch (e) {
            }
        }
        // and its traps' damage (Wrath Traps; BTRAP.SetProps does the same at the yard's load)
        for (let b of as3.values(InstanceManager.getInstancesByClass(BTRAP) ?? [])) {
            try {
                let t: any = b;
                if (t._buildingProps && t._buildingProps.damage && t.damageProperty) {
                    t.damageProperty.value = Number(t._buildingProps.damage[0]) * IoDevil.yardMul("trapDamage");
                }
            } catch (e) {
            }
        }
    }

    // ---- Hoarder's Seal: the burn when its boon ends
    private static settleBurns(now: int): void {
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYard || BASE.isOutpost || !IoDevil.ownYard() || !BASE._resources) {
            return;
        }
        for (let e of IoDevil.entries()) {
            let d: any = IoDevil.def(e.id);
            if (!d || !d.price || !d.price.burnOver || e.settled || now < Number(e.boonUntil) || IoDevil._settling[e.id + ":" + e.at]) {
                continue;
            }
            IoDevil._settling[e.id + ":" + e.at] = true;
            BASE.CalcResources();
            let share: number = Math.max(0, Math.min(1, Number(d.price.burnOver)));
            let burned: number = 0;
            for (let r: int = 1; r <= 4; r++) {
                let cap: number = Number(BASE._resources["r" + r + "max"]) || 0;
                let keep: number = Math.floor(cap * share);
                let have: number = BASE._resources["r" + r] ? Number(BASE._resources["r" + r].Get()) : 0;
                if (cap > 0 && have > keep) {
                    BASE._ioPlainCharge = true;
                    try {
                        BASE.Charge(r, have - keep);
                    } finally {
                        BASE._ioPlainCharge = false;
                    }
                    burned += have - keep;
                }
            }
            e.settled = now;
            BASE.Save();
            IoDevil.call("settle", [["id", e.id]], (error: string, devil: any): void => {
                if (devil) {
                    IoDevil._state = devil;
                    IoDevil._fxAt = -1;
                }
            });
            IoToast.Show(burned > 0 ? KEYS.Get("io_dv_burned", { "v1": GLOBAL.FormatNumber(burned) }) : KEYS.Get("io_dv_burned_none"), 6000);
        }
    }

    // ---- Second Shift: the lent worker (as the Store's Apprentice: he finishes the job he's on)
    /** How many lent workers come out when the main yard is built (QUEUE.Spawn): one while the boon runs, or while his job isn't done. */
    public static spawnCount(): int {
        if (!GLOBAL.INFERNO_ONLY || !IoDevil.config || !IoDevil.ownMainBuild()) {
            return 0;
        }
        if (IoDevil.workers() > 0) {
            return IoDevil.workers();
        }
        // his time up: still out if there are more jobs than the player's own workers (and the Apprentice) can hold
        let lent: boolean = false;
        let now: int = GLOBAL.Timestamp() | 0;
        for (let e of IoDevil.entries()) {
            let d: any = IoDevil.def(e.id);
            if (d && d.boon && Number(d.boon.workers) > 0 && now - Number(e.boonUntil) < 30 * 86400) {
                lent = true;
            }
        }
        if (!lent) {
            return 0;
        }
        let jobs: int = 0;
        for (let k in BASE._buildingData ?? {}) {
            let b: any = BASE._buildingData[k];
            if (b && ((b.cB | 0) > 0 || (b.cU | 0) > 0 || (b.cF | 0) > 0)) {
                jobs++;
            }
        }
        let own: int = (1 + (STORE._storeData && STORE._storeData.BEW ? STORE._storeData.BEW.q | 0 : 0)) | 0;
        return jobs > own ? 1 : 0;
    }

    private static ownMainBuild(): boolean {
        return GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && !BASE.isOutpost && IoDevil.ownYard() && !GLOBAL.ioDesignMode();
    }

    /** The lent workers in the queue. */
    private static lent(): any[] {
        let out: any[] = [];
        for (let q of as3.values(QUEUE._stack ?? [])) {
            if (q && q.ioDevil) {
                out.push(q);
            }
        }
        return out;
    }

    /** Puts one lent worker to work (the yard's load, or a contract just signed). */
    public static spawnWorker(): void {
        if (!IoDevil.ownMainBuild()) {
            return;
        }
        QUEUE.Spawn(1);
        let w: any = WORKERS._workers.length ? WORKERS._workers[WORKERS._workers.length - 1] : null;
        let q: any = QUEUE._stack.length ? QUEUE._stack[QUEUE._stack.length - 1] : null;
        if (w) {
            w.ioDevil = true;
        }
        if (q) {
            q.ioDevil = true;
        }
    }

    /** Is this worker lent by the Devil (never sacrificed: IoWorkerFun)? */
    public static isLent(mc: any): boolean {
        for (let q of IoDevil.lent()) {
            if (q.workermc == mc) {
                return true;
            }
        }
        return false;
    }

    private static workerTick(): void {
        if (!IoDevil.ownMainBuild()) {
            return;
        }
        let want: int = IoDevil.workers();
        let have: any[] = IoDevil.lent();
        if (have.length < want) {
            IoDevil.spawnWorker();
            return;
        }
        // his time up and no job: he goes home
        if (have.length > want) {
            for (let q of have) {
                if (q.active || have.length <= want) {
                    continue;
                }
                let mc: any = q.workermc;
                for (let i: int = 0; i < WORKERS._workers.length; i++) {
                    if (WORKERS._workers[i].mc == mc) {
                        WORKERS._workers.splice(i, 1);
                        break;
                    }
                }
                let at: int = QUEUE._stack.indexOf(q);
                if (at >= 0) {
                    QUEUE._stack.splice(at, 1);
                }
                QUEUE._workerCount = WORKERS._workers.length;
                if (mc) {
                    try {
                        mc.Clear();
                    } catch (e) {
                    }
                    if (mc.parent) {
                        mc.parent.removeChild(mc);
                    }
                }
                try {
                    UI_WORKERS.ioRefresh();
                } catch (e) {
                }
                IoToast.Show(KEYS.Get("io_dv_worker_gone"), 4000);
                have = IoDevil.lent();
            }
        }
    }

    // ---- the offer
    private static offerTick(): void {
        let s: any = IoDevil._state;
        if (!s || !as3.is(s.offer, Array) || !s.offer.length || !IoDevil.ownMainBuild() || IoDevilWindow.isOpen) {
            IoDevil._offerWait = 0;
            return;
        }
        if (Number(s.offerAt) == IoDevil._offerShown) {
            return;
        }
        // a few seconds after the yard is up, and not over another window
        if (++IoDevil._offerWait < 4 || POPUPS._open || (GLOBAL._blockerList && GLOBAL._blockerList.length > 0) || GLOBAL._newBuilding != null) {
            return;
        }
        IoDevil._offerShown = Number(s.offerAt);
        IoDevilWindow.Show();
    }

    /** The waiting offer's contracts (ids), or []. */
    public static offer(): string[] {
        let s: any = IoDevil._state;
        return s && as3.is(s.offer, Array) ? s.offer : [];
    }

    // ---- the server
    public static call(path: string, params: any[], onDone: Function): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "devil/" + path, params, (response: any): void => {
            if (!response) {
                onDone(KEYS.Get("io_t3t_srv_try"), null);
                return;
            }
            if (response.error !== 0 && response.error !== "0") {
                onDone(String(response.error || KEYS.Get("io_t3t_srv_try")), null);
                return;
            }
            onDone(null, response.devil);
        }, (e: IOErrorEvent): void => {
            onDone(KEYS.Get("io_t3t_srv_conn"), null);
        });
    }

    /** Signs contract `id` (IoDevilWindow): onDone(error). */
    public static sign(id: string, onDone: Function): void {
        IoDevil.call("sign", [["id", id]], (error: string, devil: any): void => {
            if (devil) {
                IoDevil._state = devil;
                IoDevil._offerShown = 0;
                IoDevil._fxAt = -1;
                IoDevil.changed();
            }
            onDone(error);
        });
    }

    /** Refuses the whole offer (IoDevilWindow): onDone(error). */
    public static refuse(onDone: Function): void {
        // (a parameter, so it goes as a POST: with none the loader sends a GET, which the route refuses)
        IoDevil.call("refuse", [["all", 1]], (error: string, devil: any): void => {
            if (devil) {
                IoDevil._state = devil;
                IoDevil._offerShown = 0;
            }
            onDone(error);
        });
    }

    // ---- the player's monsters on attack (Bloodlust, Swift Horde)
    /** Once a game step (beside IoSynergy.tick): the player's attacking monsters get their contracts' modifiers, once. */
    public static battleTick(): void {
        if (!GLOBAL.INFERNO_ONLY || !IoDevil.config) {
            return;
        }
        if (++IoDevil._battleSteps < 20) {
            return;
        }
        IoDevil._battleSteps = 0;
        let mode: string = GLOBAL.mode;
        let attacking: boolean = mode == GLOBAL.e_BASE_MODE.ATTACK || mode == GLOBAL.e_BASE_MODE.IATTACK || mode == GLOBAL.e_BASE_MODE.WMATTACK || mode == GLOBAL.e_BASE_MODE.IWMATTACK;
        if (!attacking || IoReplayPlayer.playing || IoHfoWaves.running || IoFmiWaves.running || IoTd.on || IoTd2.on || CREEPS._creepCount <= 0) {
            return;
        }
        let fx: any = IoDevil.effects();
        let dmg: number = fx.monsterDamage != null ? Number(fx.monsterDamage) : 1;
        let hurt: number = fx.monsterHurt != null ? Number(fx.monsterHurt) : 1;
        let speed: number = fx.monsterSpeed != null ? Number(fx.monsterSpeed) : 1;
        let health: number = fx.monsterHealth != null ? Number(fx.monsterHealth) : 1;
        if (dmg == 1 && hurt == 1 && speed == 1 && health == 1) {
            return;
        }
        let cells: any = Targeting._creepCells;
        for (let node in cells) {
            let cell: any = cells[node];
            for (let id in cell) {
                let m: MonsterBase = as3.as(cell[id], MonsterBase);
                if (!m || m._friendly || m["_ioDevil"] || m._ioPuppetOnly || m.dying || !(m.health > 0)) {
                    continue;
                }
                if (as3.is(m, ChampionBase) || IoSynergy.isChampionId(m._creatureID)) {
                    continue;
                }
                m["_ioDevil"] = true;
                m.addComponent(new IoDevilMark(dmg, hurt, speed, health), IoDevilMark.NAME);
            }
        }
    }

    // ---- the pill under the protection timer: the contracts in force, and a click for the ledger
    private static pill(on: boolean): void {
        let now: int = GLOBAL.Timestamp() | 0;
        let live: any[] = [];
        if (on && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && IoDevil.ownYard() && !GLOBAL.ioDesignMode()) {
            for (let e of IoDevil.entries()) {
                if (now < Number(e.boonUntil) || now < Number(e.priceUntil)) {
                    live.push(e);
                }
            }
        }
        let top: any = UI2._top;
        if (!live.length || !top) {
            if (IoDevil._pill && IoDevil._pill.parent) {
                IoDevil._pill.parent.removeChild(IoDevil._pill);
            }
            return;
        }
        if (!IoDevil._pill) {
            let p: MovieClip = new MovieClip();
            p.name = "ioDevilPill";
            p.buttonMode = true;
            p.mouseChildren = false;
            let t: TextField = CasinoUI.label("", 12, 0xFFF1D6, true, 210, TextFormatAlign.RIGHT, "Verdana");
            t.name = "t";
            t.height = 18;
            p.addChild(t);
            p.addEventListener(MouseEvent.CLICK, (ev: MouseEvent): void => {
                IoDevilWindow.ShowLedger();
            });
            IoDevil._pill = p;
        }
        if (IoDevil._pill.parent != top) {
            top.addChild(IoDevil._pill);
        }
        let ends: int = 0;
        for (let e of live) {
            let until: number = Math.max(Number(e.boonUntil), Number(e.priceUntil));
            if (!ends || until < ends) {
                ends = until | 0;
            }
        }
        let text: string = live.length == 1 ? KEYS.Get("io_dv_pill", { "v1": KEYS.Get("io_dv_name_" + live[0].id), "v2": GLOBAL.ioDuration(ends - now) }) : KEYS.Get("io_dv_pill_many", { "v1": live.length, "v2": GLOBAL.ioDuration(ends - now) });
        let t: TextField = as3.as(IoDevil._pill.getChildByName("t"), TextField);
        if (t.text != text) {
            t.text = text;
            let w: number = Math.min(210, t.textWidth + 34);
            let g: any = IoDevil._pill.graphics;
            g.clear();
            let m: Matrix = new Matrix();
            m.createGradientBox(w, 22, Math.PI / 2, -w, 0);
            g.lineStyle(1.5, 0x5E0D0D, 1);
            g.beginGradientFill(GradientType.LINEAR, [0xB3260F, 0x7A1208], [1, 1], [0, 255], m);
            g.drawRoundRect(-w, 0, w, 22, 22, 22);
            g.endFill();
            g.lineStyle(1.5, 0xF0C060, 1);
            g.beginFill(0x9E1B1B, 1);
            g.drawCircle(-w + 11, 11, 8);
            g.endFill();
            t.x = -210 - 6;
            t.y = 2;
            IoDevil._pill.filters = [new GlowFilter(0x000000, 0.5, 4, 4, 2, 1)];
        }
        let prot: any = top.mcProtected;
        IoDevil._pill.x = prot ? prot.x + (prot.width || 0) : 1260;
        IoDevil._pill.y = prot && prot.visible ? prot.y + 30 : (prot ? prot.y : 40);
    }
}

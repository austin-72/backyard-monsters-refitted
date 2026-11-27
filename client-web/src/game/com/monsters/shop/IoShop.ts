import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { getTimer } from "flash/utils";
import { BASE, BFOUNDATION, BRESOURCE, BUILDINGS, BUILDINGSPOPUP, CASINO, CREATURELOCKER, GAME, GLOBAL, INFERNOYARDPROPS, InstanceManager, IoChampionStatue, IoPet, IoPets, IoPetsPanel, IoShopPicker, IoToast, KEYS, LOGIN, PLEASEWAIT, POPUPS, QUEUE, SOUNDS, STORE, UI_WORKERS, URLLoaderApi, WORKERS, IoTerrainPopup } from "@game";

/**
 * Inferno-only (22 October, the user's picks from the Shiny store proposals): the Store's Extras. The server sells them
 * and keeps them (services/shop/ioShop.ts: prices, Shiny, tokens); this is the game's side:
 *
 *  - what the player has (the yard's load: io_shop; every answer: shop): timed items running until, tokens waiting,
 *    Raid Insurance, the champion their statues show
 *  - sold in the Store's own tabs (TAB_ITEMS; the Extras tab of 22 October is gone, 23 October), Buy asked first
 *    with Gift Wrap beside it (an alliance member picked: IoShopPicker)
 *  - what each does in the game:
 *      Harvest Drone        the main yard's harvesters bank themselves (Tick: every DRONE_EVERY ms, and on load)
 *      Training Manual      an unlock started in the Strongbox takes 20% less time (unlockTime; one under way when
 *                           bought too)
 *      Academy Scholarship  the same for Academy training (trainTime)
 *      Pet Treats           the yard's pets do tricks and the zoomies by themselves (IoPets.treats)
 *      Raid Insurance       the server pays it back; told here once (notices)
 *      Short Hop            from the map: the main yard and one of the player's outposts up to hopCells away
 *                           change places (hopAsk; 23 October: it was onto any wild yard)
 *      Outpost Guard        from the map: one of the player's outposts (guardAsk)
 *      Golden Coat, Name Tag  from a pet's menu (IoPets.menu: coatAsk, tagAsk)
 *      Champion Statue      building 171, placed from the build menu (Animated); its champion: chooseStatue
 *  - gifts from alliance members, and what Raid Insurance paid back, said once when the yard loads (afterLoad)
 *
 * (22 October, later: the user's picks #35, #47, #50 from Round 2 of the proposals, sold the same way:)
 *      Apprentice           one more worker in the main yard for 72 hours (QUEUE.Spawn: spawnApprentice); when they
 *                           are up it goes home, but only once it has no job (Tick); never sacrificed (IoWorkerFun)
 *      Repair Crew          for 7 days, the player's own yards' buildings repaired at once (repairRound: on load, and
 *                           every REPAIR_EVERY ms)
 *      Scout Report         from the map, on a player's yard: its towers, traps and last defences (scoutAsk)
 */
export class IoShop extends ASObject {
    /** The items: [id, kind (timed, insure, token)]. */
    public static readonly ITEMS: any[] = [["drone", "timed"], ["manual", "timed"], ["scholar", "timed"], ["insure", "insure"], ["hop", "token"], ["guard", "token"], ["coat", "token"], ["tag", "token"], ["treats", "timed"], ["statue", "token"]];

    /**
     * Where each is sold: the Store's tabs. 23 October (the user's: "make sure we have things in the correct
     * categories, for example the champion statue better fits in decorations"): the Extras tab is gone, each item in
     * its tab: Construction the Apprentice and Short Hop (your yard: more hands, a new place); Resources the Harvest
     * Drone; Speed-Ups the Repair Crew, the Training Manual and the Academy Scholarship (they make things go faster);
     * Combat the Scout Report, Raid Insurance and Outpost Guard; Looks the Champion Statue (beside the animated
     * decorations, where it is put down) and the pets' Golden Coat, Name Tag and Treats. In Looks, "@id": a look had
     * elsewhere (STORE.ioLookCard). 27 November (admintester's): Short Hop is had from the map only (a yard's window
     * there), not the Store; the Scout Report is gone from the game.
     */
    public static readonly TAB_ITEMS: any = { 1: ["apprentice"], 2: ["drone"], 3: ["repair", "manual", "scholar"], 4: ["insure", "guard"], 5: ["@decor", "statue", "@skins", "@emotes", "@crests", "coat", "tag", "treats"] };

    /** The Repair Crew's look at the yard, in ms. */
    public static readonly REPAIR_EVERY: int = 5000;

    private static _lastRepair: number = 0;

    /** Training Manual and Academy Scholarship: 25% faster, so a fifth less time. */
    public static readonly FASTER: number = 0.8;

    /** The Harvest Drone's round of the harvesters, in ms. */
    public static readonly DRONE_EVERY: int = 20000;

    /** The player's own Extras (the server's shopView), or null outside their main yard's game. */
    private static _data: any = null;

    /** When _data came (getTimer) and the server's clock then: a timed item's "until" is read against the server's time. */
    private static _dataAt: number = 0;

    private static _lastDrone: number = 0;

    private static _notices: any = null;

    private static _busy: boolean = false;

    public $ctor(): void {
        super.$ctor();
    }

    // ---- the player's Extras
    /** The yard's load (BASE): the player's own Extras (their main yard only) and, once, its notices. */
    public static setData(raw: any, notices: any): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (raw && typeof raw == "object") {
            IoShop.apply(raw);
        }
        IoShop._notices = notices && typeof notices == "object" ? notices : null;
    }

    private static apply(shop: any): void {
        IoShop._data = shop;
        IoShop._dataAt = getTimer();
    }

    /** The player's Extras as the server last said (tests). */
    public static get data(): any {
        return IoShop._data;
    }

    /** The server's time now (its clock when the Extras came, and the time since). */
    public static now(): number {
        if (!IoShop._data || !IoShop._data.now) {
            return GLOBAL.Timestamp();
        }
        return Number(IoShop._data.now) + (getTimer() - IoShop._dataAt) / 1000;
    }

    public static price(id: string): int {
        return IoShop._data && IoShop._data.prices ? IoShop._data.prices[id] | 0 : 0;
    }

    /** A timed item's seconds left (0: not running). */
    public static left(id: string): number {
        if (!IoShop._data || !IoShop._data.until || !IoShop._data.until[id]) {
            return 0;
        }
        return Math.max(0, Number(IoShop._data.until[id]) - IoShop.now());
    }

    public static active(id: string): boolean {
        return GLOBAL.INFERNO_ONLY && IoShop.left(id) > 0;
    }

    /** Tokens of an item waiting to be used. */
    public static tokens(id: string): int {
        return IoShop._data && IoShop._data.tokens ? IoShop._data.tokens[id] | 0 : 0;
    }

    /** Raid Insurance's seconds left (0: none, or it paid for a raid already). */
    public static insuredLeft(): number {
        return IoShop._data && IoShop._data.insured ? Math.max(0, Number(IoShop._data.insured) - IoShop.now()) : 0;
    }

    public static get hopCells(): int {
        return IoShop._data && IoShop._data.hopCells ? IoShop._data.hopCells | 0 : 10;
    }

    public static get tagColours(): any[] {
        return IoShop._data && as3.is(IoShop._data.tagColours, Array) ? IoShop._data.tagColours : ["d23a2a", "e8892a", "e8c22a", "4fae3a", "2a9ec8", "3a5ad2", "8a3ad2", "d23a9e", "f4f0e6", "2a2420"];
    }

    /** "Harvest Drone" (the player's language). */
    public static title(id: string): string {
        return KEYS.Get("io_shop_" + id);
    }

    // ---- what they do
    /** An unlock started now: its seconds, a fifth less with a Training Manual running (CREATURELOCKER). */
    public static unlockTime(seconds: number): number {
        return IoShop.active("manual") ? Math.ceil(seconds * IoShop.FASTER) : seconds;
    }

    /** Academy training started now: its seconds, a fifth less with an Academy Scholarship running (ACADEMY). */
    public static trainTime(seconds: number): number {
        return IoShop.active("scholar") ? Math.ceil(seconds * IoShop.FASTER) : seconds;
    }

    /** A Training Manual bought: the unlock under way now is a fifth shorter too (what is left of it). */
    private static speedLockerNow(): void {
        let id: string = CREATURELOCKER._unlocking;
        let d: any = id ? CREATURELOCKER._lockerData[id] : null;
        if (!d || d.t != 1 || !d.e) {
            return;
        }
        let now: number = GLOBAL.Timestamp();
        if (d.e > now) {
            d.e = Math.ceil(now + (d.e - now) * IoShop.FASTER);
            BASE.Save();
        }
    }

    /** An Academy Scholarship bought: the training under way now is a fifth shorter too. */
    private static speedAcademyNow(): void {
        let now: number = GLOBAL.Timestamp();
        let changed: boolean = false;
        let ups: any = GLOBAL.player ? GLOBAL.player.m_upgrades : null;
        for (let id in ups) {
            let up: any = ups[id];
            if (up && up.time && up.time.Get() > now) {
                up.time.Set(Math.ceil(now + (up.time.Get() - now) * IoShop.FASTER));
                changed = true;
            }
        }
        if (changed) {
            BASE.Save();
        }
    }

    /** The player's own main yard, being built. */
    private static ownYard(): boolean {
        return IoPets.ownYard();
    }

    /** Every frame (GLOBAL, with the pets): the Harvest Drone's rounds. */
    public static Tick(): void {
        if (!IoShop._data || BASE._loading) {
            return;
        }
        // (the Apprentice's time up: home once it has no job; the Repair Crew's look round)
        IoShop.apprenticeTick();
        if (getTimer() - IoShop._lastRepair >= IoShop.REPAIR_EVERY) {
            IoShop._lastRepair = getTimer();
            IoShop.repairRound(false);
        }
        if (!IoShop.active("drone") || !IoShop.ownYard()) {
            return;
        }
        let t: number = getTimer();
        if (t - IoShop._lastDrone < IoShop.DRONE_EVERY) {
            return;
        }
        IoShop._lastDrone = t;
        IoShop.droneRound();
    }

    /** The Harvest Drone banks every harvester that has something in it. How many. */
    public static droneRound(): int {
        if (!IoShop.active("drone") || !IoShop.ownYard()) {
            return 0;
        }
        return BRESOURCE.ioBankAll(0);
    }

    /** Once the yard is built (BASE, after the pets): the drone's first round, and what the player is to be told. */
    public static afterLoad(): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        IoShop._lastDrone = getTimer();
        if (IoShop.ownYard()) {
            IoShop.droneRound();
        }
        IoShop._lastRepair = getTimer();
        IoShop.repairRound(true);
        let n: any = IoShop._notices;
        IoShop._notices = null;
        if (!n || !IoShop.ownYard()) {
            return;
        }
        let lines: any[] = [];
        for (let g of as3.values(as3.is(n.gifts, Array) ? n.gifts : [])) {
            lines.push(KEYS.Get("io_shop_gift_got", { "v1": String(g.from), "v2": IoShop.title(String(g.item)) }));
        }
        if (n.insurance && typeof n.insurance == "object") {
            let parts: any[] = [];
            for (let r: int = 1; r <= 4; r++) {
                let v: number = Number(n.insurance["r" + r]) || 0;
                if (v > 0) {
                    parts.push(GLOBAL.FormatNumber(v) + " " + KEYS.Get(GLOBAL.iresourceNames[r - 1]));
                }
            }
            if (parts.length) {
                lines.push(KEYS.Get("io_shop_insure_paid", { "v1": parts.join(", ") }));
            }
        }
        if (lines.length) {
            SOUNDS.Play("purchasepopup");
            GLOBAL.Message(lines.join("<br><br>"));
        }
    }

    // ---- the server
    private static call(path: string, params: any[], onDone: Function = null): void {
        if (IoShop._busy) {
            return;
        }
        IoShop._busy = true;
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL.serverUrl + "shop/" + path, params, (response: any): void => {
            IoShop._busy = false;
            PLEASEWAIT.Hide();
            if (!response) {
                GLOBAL.Message(KEYS.Get("io_t3t_srv_try"));
                return;
            }
            if (response.error !== 0 && response.error !== "0") {
                GLOBAL.Message(String(response.error || KEYS.Get("io_shop_wrong")));
                return;
            }
            IoShop.answer(response);
            if (onDone != null) {
                onDone(response);
            }
        }, (e: IOErrorEvent): void => {
            IoShop._busy = false;
            PLEASEWAIT.Hide();
            GLOBAL.Message(KEYS.Get("io_t3t_srv_conn"));
        });
    }

    /** An answer: the player's Extras, the Shiny left, the pets. */
    private static answer(response: any): void {
        if (response.shop && typeof response.shop == "object") {
            IoShop.apply(response.shop);
        }
        if (response.credits != null) {
            CASINO.setCredits(response.credits | 0);
        }
        if (as3.is(response.pets, Array)) {
            IoPets.apply({ "pets": response.pets });
        }
        if (STORE._open) {
            STORE.ioExtrasRefresh();
        }
    }

    /** Enough Shiny for it, or say what it takes. */
    private static afford(id: string): boolean {
        let price: int = IoShop.price(id);
        if (BASE._credits && BASE._credits.Get() < price) {
            POPUPS.ioShinyNeed(price);
            return false;
        }
        return true;
    }

    // ---- buying
    /** Buy (for the player): what it does and costs, asked first. */
    public static buyAsk(id: string): void {
        if (!IoShop._data) {
            return;
        }
        let price: int = IoShop.price(id);
        let line: string = KEYS.Get("io_shop_" + id + "_desc");
        let after: string = IoShop.isToken(id) ? "<br><br>" + KEYS.Get("io_shop_" + id + "_use") : "";
        GLOBAL.Message("<b>" + IoShop.title(id) + "</b><br>" + line + after, KEYS.Get("io_shop_buy_for", { "v1": GLOBAL.FormatNumber(price) }), (): void => {
            if (IoShop.afford(id)) {
                IoShop.buy(id, 0);
            }
        }, null, KEYS.Get("io_powerup_not_now"), null);
    }

    /**
     * (22 October) Buy from a stock tab's card (the Apprentice, the Repair Crew): what it does and costs, asked first,
     * with Gift Wrap offered beside it.
     */
    public static tabBuyAsk(id: string): void {
        if (!IoShop._data) {
            return;
        }
        let price: int = IoShop.price(id);
        // (one kept to use later (the statue, Short Hop...): how it's used, as buyAsk says)
        let after: string = IoShop.isToken(id) ? "<br><br>" + KEYS.Get("io_shop_" + id + "_use") : "";
        GLOBAL.Message("<b>" + IoShop.title(id) + "</b><br>" + KEYS.Get("io_shop_" + id + "_desc") + after, KEYS.Get("io_shop_buy_for", { "v1": GLOBAL.FormatNumber(price) }), (): void => {
            if (IoShop.afford(id)) {
                IoShop.buy(id, 0);
            }
        }, null, KEYS.Get("io_shop_btn_gift"), (): void => {
            IoShop.giftAsk(id);
        });
    }

    public static isToken(id: string): boolean {
        for (let it of IoShop.ITEMS) {
            if (it[0] == id) {
                return it[1] == "token";
            }
        }
        return false;
    }

    /** Buys one (for an alliance member: their id). */
    public static buy(id: string, forId: int, forName: string = ""): void {
        IoShop.call("buy", [["item", id], ["for", forId]], (response: any): void => {
            SOUNDS.Play("purchasepopup");
            if (response.gift) {
                IoToast.Show(KEYS.Get("io_shop_gift_sent", { "v1": IoShop.title(id), "v2": String(response.gift) }), 4000);
                return;
            }
            if (id == "manual") {
                IoShop.speedLockerNow();
            } else if (id == "scholar") {
                IoShop.speedAcademyNow();
            } else if (id == "drone") {
                IoShop._lastDrone = getTimer();
                IoShop.droneRound();
            } else if (id == "treats") {
                IoPets.setTreats(Number(IoShop._data.until.treats) || 0);
            } else if (id == "apprentice") {
                IoShop.spawnApprentice();
            } else if (id == "repair") {
                IoShop.repairRound(true);
            }
            IoToast.Show(KEYS.Get(IoShop.isToken(id) ? "io_shop_bought_token" : "io_shop_bought", { "v1": IoShop.title(id) }), 4000);
        });
    }

    /** Gift Wrap: an alliance member picked, then asked, then bought for them. */
    public static giftAsk(id: string): void {
        IoShop.call("info", [], (response: any): void => {
            if (!response.alliance) {
                GLOBAL.Message(KEYS.Get("io_shop_gift_no_alliance"));
                return;
            }
            let members: any[] = as3.is(response.members, Array) ? response.members : [];
            if (!members.length) {
                GLOBAL.Message(KEYS.Get("io_shop_gift_nobody"));
                return;
            }
            let choices: any[] = [];
            for (let m of as3.values(members)) {
                let who: any = m;
                choices.push({ "label": String(who.name), "onPick": (): void => {
                    let price: int = IoShop.price(id);
                    GLOBAL.Message(KEYS.Get("io_shop_gift_ask", { "v1": IoShop.title(id), "v2": String(who.name), "v3": GLOBAL.FormatNumber(price) }), KEYS.Get("io_shop_gift_btn"), (): void => {
                        if (IoShop.afford(id)) {
                            IoShop.buy(id, who.id | 0, String(who.name));
                        }
                    }, null, KEYS.Get("io_powerup_not_now"), null);
                } });
            }
            IoShopPicker.Show(KEYS.Get("io_shop_gift_title"), KEYS.Get("io_shop_gift_pick", { "v1": IoShop.title(id) }), choices);
        });
    }

    // ---- used where they belong
    /** Pays with a token kept for it, or its price: the words for the button. */
    private static payWord(id: string): string {
        return IoShop.tokens(id) > 0 ? KEYS.Get("io_shop_use_token", { "v1": IoShop.tokens(id) }) : KEYS.Get("io_shop_buy_for", { "v1": GLOBAL.FormatNumber(IoShop.price(id)) });
    }

    private static canPay(id: string): boolean {
        return IoShop.tokens(id) > 0 || IoShop.afford(id);
    }

    /** A pet's Golden Coat (its menu): for good. */
    public static coatAsk(pet: IoPet): void {
        let who: string = pet.petName ? pet.petName : IoPetsPanel.monsterName(pet.monster);
        GLOBAL.Message(KEYS.Get("io_shop_coat_ask", { "v1": who }), IoShop.payWord("coat"), (): void => {
            if (IoShop.canPay("coat")) {
                IoShop.call("coat", [["pet", pet.petId]], (r: any): void => {
                    SOUNDS.Play("purchasepopup");
                });
            }
        }, null, KEYS.Get("io_powerup_not_now"), null);
    }

    /** A pet's Name Tag (its menu): a colour picked; the first tag costs, a new colour doesn't. */
    public static tagAsk(pet: IoPet): void {
        if (!pet.petName) {
            GLOBAL.Message(KEYS.Get("io_shop_tag_name_first"));
            return;
        }
        let row: any[] = IoPets.rowOf(pet.petId);
        let has: boolean = row != null && row.length > 7 && Boolean(row[7]);
        if (!has && !IoShop.canPay("tag")) {
            return;
        }
        let choices: any[] = [];
        for (let c of as3.values(IoShop.tagColours)) {
            let colour: string = String(c);
            choices.push({ "colour": colour, "onPick": (): void => {
                IoShop.call("tag", [["pet", pet.petId], ["colour", colour]], (r: any): void => {
                    SOUNDS.Play("purchasepopup");
                });
            } });
        }
        IoShopPicker.Show(IoShop.title("tag"), has ? KEYS.Get("io_shop_tag_recolour", { "v1": pet.petName }) : KEYS.Get("io_shop_tag_pick", { "v1": pet.petName, "v2": IoShop.payWord("tag") }), choices);
    }

    /** Pet Treats (a pet's menu): for the whole yard's pets, 24 hours. */
    public static treatsAsk(): void {
        IoShop.buyAsk("treats");
    }

    /**
     * Short Hop (the map, one of the player's outposts; 23 October: no longer a wild yard): asked, then the main yard
     * and the outpost change places and the game starts again there.
     */
    public static hopAsk(baseid: string, x: int, y: int): void {
        GLOBAL.Message(KEYS.Get("io_shop_hop_ask", { "v1": x, "v2": y }), IoShop.payWord("hop"), (): void => {
            if (!IoShop.canPay("hop")) {
                return;
            }
            IoShop.call("hop", [["baseid", baseid]], (r: any): void => {
                GLOBAL.Halt();
                GLOBAL.Message(KEYS.Get("io_shop_hop_done", { "v1": x, "v2": y }), KEYS.Get("btn_ok"), (): void => {
                    GAME.ioReload(true);
                });
            });
        }, null, KEYS.Get("io_powerup_not_now"), null);
    }

    /** Cells between two cells of the map (hex, odd columns down, across its wrapped edges: the server's hopRefusal). */
    public static hexDistance(x1: int, y1: int, x2: int, y2: int): int {
        let best: int = 1000000;
        for (let sx of [-400, 0, 400]) {
            for (let sy of [-400, 0, 400]) {
                let bx: int = (x2 + sx) | 0;
                let by: int = (y2 + sy) | 0;
                let q1: int = x1, r1: int = (y1 - (x1 - (x1 & 1)) / 2) | 0;
                let q2: int = bx, r2: int = (by - (bx - (bx & 1)) / 2) | 0;
                let dq: int = (q2 - q1) | 0, dr: int = (r2 - r1) | 0;
                best = Math.min(best, Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr))) | 0;
            }
        }
        return best;
    }

    /** Can the main yard hop to this cell (one of the player's outposts up to hopCells away; the server says the rest)? */
    public static canHopTo(x: int, y: int): boolean {
        if (!GLOBAL.INFERNO_ONLY || !IoShop._data || !GLOBAL._mapHome || x < 0 || y < 0 || x >= 400 || y >= 400) {
            return false;
        }
        let d: int = IoShop.hexDistance(Number(GLOBAL._mapHome.x) | 0, Number(GLOBAL._mapHome.y) | 0, x, y);
        return d >= 1 && d <= IoShop.hopCells;
    }

    /** Outpost Guard (the map, one of the player's outposts). */
    public static guardAsk(baseid: string, x: int, y: int): void {
        GLOBAL.Message(KEYS.Get("io_shop_guard_ask", { "v1": x, "v2": y, "v3": IoShop._data ? IoShop._data.guardHours | 0 : 12 }), IoShop.payWord("guard"), (): void => {
            if (!IoShop.canPay("guard")) {
                return;
            }
            IoShop.call("guard", [["baseid", baseid]], (r: any): void => {
                SOUNDS.Play("purchasepopup");
                IoToast.Show(KEYS.Get("io_shop_guard_done", { "v1": GLOBAL.ioDuration(Number(r.protectedUntil) - IoShop.now()) }), 4000);
            });
        }, null, KEYS.Get("io_powerup_not_now"), null);
    }

    // ---- the Champion Statue
    /** The champions the player has unlocked (the Strongbox), that a statue can show. */
    public static unlockedChampions(): any[] {
        let out: any[] = [];
        for (let id of IoChampionStatue.CHAMPIONS) {
            let d: any = CREATURELOCKER._lockerData ? CREATURELOCKER._lockerData[id] : null;
            if (d && d.t == 2) {
                out.push(id);
            }
        }
        return out;
    }

    /** A statue can be placed: a champion to show (unlocked), and Shiny or one kept for it. */
    public static canPlaceStatue(): boolean {
        if (!IoShop.unlockedChampions().length) {
            GLOBAL.Message(KEYS.Get("io_shop_statue_no_champion"));
            return false;
        }
        return true;
    }

    /** A statue was put down from the build menu: one kept for it, if any, is what the server takes (here too). */
    public static placedStatue(): void {
        if (IoShop._data && IoShop._data.tokens && (IoShop._data.tokens.statue | 0) > 0) {
            IoShop._data.tokens.statue = (IoShop._data.tokens.statue | 0) - 1;
        }
    }

    /** Which champion the player's statues show: picked from the ones unlocked (free). */
    public static chooseStatue(): void {
        let ids: any[] = IoShop.unlockedChampions();
        if (!ids.length) {
            GLOBAL.Message(KEYS.Get("io_shop_statue_no_champion"));
            return;
        }
        let choices: any[] = [];
        for (let id of as3.values(ids)) {
            let which: string = String(id);
            choices.push({ "label": IoChampionStatue.nameOf(which), "onPick": (): void => {
                // (23 October, the user's: "the level should be selectable so that it can show lvl 4 or 5 or 6 champs")
                let levels: any[] = IoChampionStatue.LEVELS[which];
                if (levels) {
                    IoShop.chooseStatueLevel(which);
                } else {
                    IoShop.setStatue(which, 0);
                }
            } });
        }
        IoShopPicker.Show(IoShop.title("statue"), KEYS.Get("io_shop_statue_pick"), choices);
    }

    /** 23 October: the level a champion's statues show (4, 5 or 6), after the champion is picked. */
    public static chooseStatueLevel(id: string): void {
        let choices: any[] = [];
        let now: int = IoChampionStatue.championOf(IoChampionStatue.yard) == id ? IoChampionStatue.levelOf(IoChampionStatue.yard) : 0;
        for (let l of as3.values(IoChampionStatue.LEVELS[id] || [])) {
            let lvl: int = l | 0;
            choices.push({ "label": KEYS.Get(lvl == now ? "io_shop_statue_level_now" : "io_shop_statue_level", { "v1": lvl }), "onPick": (): void => {
                IoShop.setStatue(id, lvl);
            } });
        }
        IoShopPicker.Show(IoShop.title("statue"), KEYS.Get("io_shop_statue_pick_level", { "v1": IoChampionStatue.nameOf(id) }), choices);
    }

    /** The statue's champion (and level, 0: none) kept on the server, and the yard's statues drawn again with it. */
    private static setStatue(id: string, level: int): void {
        let args: any[] = [["champion", id]];
        if (level > 0) {
            args.push(["level", level]);
        }
        IoShop.call("statue", args, (r: any): void => {
            IoChampionStatue.setYard(level > 0 ? id + "-" + level : id);
            IoChampionStatue.redraw();
            IoTerrainPopup.refreshDecor();
        });
    }

    /** The build menu's Animated decorations (where a statue is put down). */
    public static openAnimated(): void {
        BUILDINGS._buildingID = 0;
        BUILDINGS._menuA = 4;
        BUILDINGS._menuB = BUILDINGSPOPUP.IO_TAB_ANIMATED;
        BUILDINGS.Show();
        try {
            BUILDINGS._mc.SwitchB(4, BUILDINGSPOPUP.IO_TAB_ANIMATED, 0);
        } catch (err) {
        }
    }

    /** The line on an item's card: running, waiting, insured. */
    public static statusOf(id: string): string {
        if (id == "scout") {
            let n: int = IoShop._data && as3.is(IoShop._data.scouted, Array) ? IoShop._data.scouted.length : 0;
            return n > 0 ? KEYS.Get("io_shop_scout_today", { "v1": n }) : "";
        }
        if (id == "apprentice") {
            // (27 November: up to 5 at once: how many work, and when the next one's time is up)
            let ends: any[] = IoShop.apprenticeEnds().filter((u: number): boolean => u > IoShop.now()).sort((a: number, b: number): number => a - b);
            if (ends.length > 1) {
                return KEYS.Get("io_shop_apprentices_working", { "v1": ends.length, "v2": IoShop.apprenticesMost(), "v3": GLOBAL.ioDuration(ends[0] - IoShop.now()) });
            }
            if (!IoShop.active("apprentice")) {
                let next: number = IoShop._data ? Number(IoShop._data.apprenticeNext) || 0 : 0;
                return next > IoShop.now() ? KEYS.Get("io_shop_apprentice_next", { "v1": GLOBAL.ioDuration(next - IoShop.now()) }) : "";
            }
        }
        if (id == "insure") {
            let left: number = IoShop.insuredLeft();
            return left > 0 ? KEYS.Get("io_shop_insured_left", { "v1": GLOBAL.ioDuration(left) }) : "";
        }
        if (IoShop.isToken(id)) {
            let n: int = IoShop.tokens(id);
            return n > 0 ? KEYS.Get(n == 1 ? "io_shop_waiting_one" : "io_shop_waiting_n", { "v1": n }) : "";
        }
        let s: number = IoShop.left(id);
        return s > 0 ? KEYS.Get("io_shop_running_left", { "v1": GLOBAL.ioDuration(s) }) : "";
    }

    // ---- (22 October, later) the Apprentice, the Repair Crew, the Scout Report
    /** The player's own yard (main, or one of their outposts) being built. */
    private static ownBuildYard(): boolean {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || GLOBAL.ioDesignMode()) {
            return false;
        }
        return IoShop.ownYard() || (BASE.isOutpost && String(BASE._userID) == String(LOGIN._playerID));
    }

    /**
     * (27 November, admintester's: up to 5 Apprentices at once, each its own 3 days, no wait between them.) Each one's
     * end (the server's shopView: working, or ended in the last 30 days); before then, the one until.apprentice.
     */
    public static apprenticeEnds(): any[] {
        if (!IoShop._data) {
            return [];
        }
        if (as3.is(IoShop._data.apprentices, Array)) {
            return IoShop._data.apprentices.map((u: any): number => Number(u) || 0);
        }
        let one: number = IoShop._data.until ? Number(IoShop._data.until.apprentice) || 0 : 0;
        return one > 0 ? [one] : [];
    }

    /** How many Apprentices can work at once (5). */
    public static apprenticesMost(): int {
        return IoShop._data && (IoShop._data.apprenticesMost | 0) > 0 ? IoShop._data.apprenticesMost | 0 : 1;
    }

    /** How many Apprentices are hired now (their time not up). */
    public static apprenticesWorking(): int {
        let now: number = IoShop.now();
        return IoShop.apprenticeEnds().filter((u: number): boolean => u > now).length | 0;
    }

    /**
     * How many Apprentices come out when the main yard is built (QUEUE.Spawn): one for each hired; and one for each
     * whose time is up but whose job isn't done (more jobs in the yard than the player's own workers and the hired
     * Apprentices: it finishes that first, as a job without a worker would be called off when the yard loads).
     */
    public static apprenticeWorkers(): int {
        if (!GLOBAL.INFERNO_ONLY || !IoShop._data || !IoShop.ownYard()) {
            return 0;
        }
        let working: int = IoShop.apprenticesWorking();
        let ended: int = (IoShop.apprenticeEnds().length - working) | 0;
        if (ended <= 0) {
            return working;
        }
        let jobs: int = 0;
        for (let k in BASE._buildingData ?? {}) {
            let b: any = BASE._buildingData[k];
            if (b && ((b.cB | 0) > 0 || (b.cU | 0) > 0 || (b.cF | 0) > 0)) {
                jobs++;
            }
        }
        let own: int = (1 + (STORE._storeData && STORE._storeData.BEW ? STORE._storeData.BEW.q | 0 : 0)) | 0;
        return (working + Math.max(0, Math.min(ended, jobs - own - working))) | 0;
    }

    /** Can an Apprentice be hired now (fewer than 5 working, and its wait, if any, over)? */
    public static canHireApprentice(): boolean {
        if (!IoShop._data || IoShop.apprenticesWorking() >= IoShop.apprenticesMost()) {
            return false;
        }
        return (Number(IoShop._data.apprenticeNext) || 0) <= IoShop.now();
    }

    /** The Apprentices put to work in the yard (bought now, or the yard's load): as many as apprenticeWorkers, at least one. */
    public static spawnApprentice(): void {
        if (!IoShop.ownYard()) {
            return;
        }
        let want: int = Math.max(1, IoShop.apprenticeWorkers()) | 0;
        for (let n: int = IoShop.apprentices().length; n < want; n++) {
            QUEUE.Spawn(1);
            let w: any = WORKERS._workers.length ? WORKERS._workers[WORKERS._workers.length - 1] : null;
            let q: any = QUEUE._stack.length ? QUEUE._stack[QUEUE._stack.length - 1] : null;
            if (w) {
                w.ioApprentice = true;
            }
            if (q) {
                q.ioApprentice = true;
            }
        }
    }

    /** The Apprentices' entries in the queue. */
    public static apprentices(): any[] {
        let out: any[] = [];
        for (let q of as3.values(QUEUE._stack ?? [])) {
            if (q && q.ioApprentice) {
                out.push(q);
            }
        }
        return out;
    }

    /** The first Apprentice's entry in the queue, or null. */
    public static apprentice(): any {
        let all: any[] = IoShop.apprentices();
        return all.length ? all[0] : null;
    }

    /** Is this worker an Apprentice (never sacrificed: IoWorkerFun)? */
    public static isApprentice(mc: any): boolean {
        for (let q of IoShop.apprentices()) {
            if (q.workermc == mc) {
                return true;
            }
        }
        return false;
    }

    /** One whose time is up and has no job goes home (from the yard and the queue): more out than are hired. */
    private static apprenticeTick(): void {
        let all: any[] = IoShop.apprentices();
        let working: int = IoShop.apprenticesWorking();
        if (all.length <= working) {
            return;
        }
        let q: any = null;
        for (let a of all) {
            if (!a.active) {
                q = a;
                break;
            }
        }
        if (!q) {
            return;
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
            mc.Clear();
            if (mc.parent) {
                mc.parent.removeChild(mc);
            }
        }
        try {
            UI_WORKERS.ioRefresh();
        } catch (e) {
        }
        IoToast.Show(KEYS.Get("io_shop_apprentice_gone"), 4000);
    }

    /** The Repair Crew: every damaged building in the player's own yard repaired at once. How many. */
    public static repairRound(say: boolean): int {
        if (!IoShop.active("repair") || !IoShop.ownBuildYard()) {
            return 0;
        }
        let n: int = 0;
        for (let b of as3.values(InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let f: any = b;
            if (f && f.health < f.maxHealth) {
                f.setHealth(f.maxHealth);
                f.Repaired();
                n++;
            }
        }
        if (n > 0) {
            BASE.Save();
            if (say) {
                IoToast.Show(KEYS.Get("io_shop_repair_done", { "v1": n }), 4000);
            }
        }
        return n;
    }

    /** A building's name (the Inferno's own table first). */
    private static buildingName(type: int): string {
        let props: any = INFERNOYARDPROPS._infernoYardProps ? INFERNOYARDPROPS._infernoYardProps[type - 1] : null;
        if (!props || props.id != type) {
            props = GLOBAL._buildingProps ? GLOBAL._buildingProps[type - 1] : null;
        }
        return props && props.name ? KEYS.Get(props.name) : "#" + type;
    }

    /** Was this yard Scout-Reported today (free again)? */
    public static scoutedToday(baseid: string): boolean {
        return IoShop._data != null && as3.is(IoShop._data.scouted, Array) && IoShop._data.scouted.indexOf(String(baseid)) >= 0;
    }

    /** A Scout Report of a player's yard (the map): asked first unless it's free again today, then shown. */
    public static scoutAsk(baseid: string, name: string): void {
        let go = (): void => {
            IoShop.call("scout", [["baseid", baseid]], (response: any): void => {
                IoShop.showScout(response.report);
            });
        };
        if (IoShop.scoutedToday(baseid)) {
            go();
            return;
        }
        let price: int = IoShop.price("scout");
        GLOBAL.Message(KEYS.Get("io_shop_scout_ask", { "v1": name, "v2": GLOBAL.FormatNumber(price) }), KEYS.Get("io_shop_buy_for", { "v1": GLOBAL.FormatNumber(price) }), (): void => {
            if (IoShop.afford("scout")) {
                go();
            }
        }, null, KEYS.Get("io_powerup_not_now"), null);
    }

    private static showScout(r: any): void {
        if (!r) {
            return;
        }
        let lines: any[] = ["<b>" + KEYS.Get(r.outpost ? "io_shop_scout_title_outpost" : "io_shop_scout_title", { "v1": String(r.name) }) + "</b>"];
        let towers: any[] = [];
        for (let t of as3.values(as3.is(r.towers, Array) ? r.towers : [])) {
            towers.push(KEYS.Get("io_shop_scout_tower", { "v1": IoShop.buildingName(t[0] | 0), "v2": t[1] | 0, "v3": t[2] | 0 }));
        }
        lines.push("<b>" + KEYS.Get("io_shop_scout_towers") + "</b> " + (towers.length ? towers.join(", ") : KEYS.Get("io_shop_scout_none")));
        let traps: any[] = [];
        for (let t of as3.values(as3.is(r.traps, Array) ? r.traps : [])) {
            traps.push(KEYS.Get("io_shop_scout_trap", { "v1": IoShop.buildingName(t[0] | 0), "v2": t[1] | 0 }));
        }
        lines.push("<b>" + KEYS.Get("io_shop_scout_traps") + "</b> " + (traps.length ? traps.join(", ") : KEYS.Get("io_shop_scout_none")));
        let defs: any[] = [];
        for (let d of as3.values(as3.is(r.defences, Array) ? r.defences : [])) {
            defs.push(KEYS.Get("io_shop_scout_defence", { "v1": GLOBAL.ioDuration(Math.max(60, IoShop.now() - Number(d.at))), "v2": d.damage | 0 }));
        }
        lines.push("<b>" + KEYS.Get("io_shop_scout_defences") + "</b> " + (defs.length ? defs.join("; ") : KEYS.Get("io_shop_scout_never")));
        GLOBAL.Message(lines.join("<br><br>"));
    }
}

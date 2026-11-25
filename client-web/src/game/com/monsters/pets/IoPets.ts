import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { Point } from "flash/geom";
import { getTimer } from "flash/utils";
import { BASE, CASINO, GLOBAL, GRID, IoCritterMenu, IoPet, IoPetsPanel, IoShop, IoYardFx, KEYS, MAP, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only: pets (server: config/PetsConfig.ts, services/pets/pets.ts). Half-size copies of the Inferno's
 * monsters wandering a main yard (IoPet), just for looks: bought with Shiny in the Buildings menu
 * (Decorations, the Pets tab: IoPetsPanel), at most five out in the yard at once, the rest in storage, and at
 * most five of one monster. Hell Freezes Over's monsters only for a player who has won the event (the server's
 * list). A pet can have a name (pets/name), shown over it. Never in an outpost. An attacker or a visitor sees
 * the yard's pets too; nothing fights them.
 *
 * The yard's pets come with its load (io_pets: [[id, monster, out, name], ...], all of them for the owner, the ones
 * out for anyone else); BASE gives them here (setData) and, once the yard is built, Setup puts the ones that
 * are out in it. Buying, bringing out and putting away go to the server (pets/buy, pets/place), whose answer
 * is the pets as they are now: the yard is brought up to date with it (apply).
 *
 * Clicked in the player's own yard (IoYardPick), a pet opens a menu of things to do with it (menu: follow the
 * pointer, fetch, a trick, petting, the zoomies, a nap) and, once, Feed: growCost Magma for full size, for good
 * (pets/grow; the server takes the Magma from the save).
 *
 * (QoL #503) A pet can be given back (pets/release): within returnSeconds of buying it and never fed, all its Shiny
 * (Return); else releasePercent of it (Release). The server decides, in one transaction; the game says what it
 * expects, and nothing happens if the pet is worth less by then.
 */
export class IoPets extends ASObject {
    /** Shiny for one pet, and how many can be out (the server's petsConfig; sent again with each answer). */
    public static price: int = 500;

    public static maxOut: int = 5;

    /** How many of one monster a player can have, and how long a pet's name can be. */
    public static perKind: int = 5;

    public static nameLength: int = 16;

    /** Magma to grow a pet to full size (pets/grow; the server's petsConfig.growCost). */
    public static growCost: int = 1000000;

    /**
     * The monsters this player can have as pets (every Inferno monster but the champions; Hell Freezes Over's
     * once the event is won): the server's list, with the yard's load (io_petinfo) and every answer.
     */
    public static monsters: any[] = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC12", "IC14", "IC15", "IC20"];

    /** (QoL #503) Seconds after buying in which a pet never fed can be returned for all its Shiny (the server's). */
    public static returnSeconds: int = 600;

    /** (QoL #503) The share of its Shiny a pet released after that gives back, in percent (the server's). */
    public static releasePercent: int = 50;

    /**
     * The loaded yard's pets: [[id, monster, out, name, full size, seconds since bought], ...], or null (not a main
     * yard, or none sent).
     */
    private static _data: any[] = null;

    /** (QoL #503) When the pets came (getTimer): a pet's age is its seconds then and the time since. */
    private static _dataAt: number = 0;

    /** The pets walking about the yard now. */
    private static _walking: any[] = [];

    /** Where a pet that was just grown stood ({ id, x, y }), so it is made again there. */
    private static _grownAt: any = null;

    /** (22 October) Until when the yard's pets have Pet Treats (IoShop): they do tricks and the zoomies by themselves. */
    private static _treatsUntil: number = 0;

    public $ctor(): void {
        super.$ctor();
    }

    /** (22 October) Pet Treats until (the yard's load's io_pet_treats, or a purchase), 0 for none. */
    public static setTreats(until: number): void {
        IoPets._treatsUntil = Number(until) || 0;
    }

    /** The yard's pets have their treats now. */
    public static get treats(): boolean {
        return GLOBAL.INFERNO_ONLY && IoPets._treatsUntil > GLOBAL.Timestamp();
    }

    /** The yard's pets, from its load (BASE). */
    public static setData(raw: any): void {
        IoPets._data = as3.is(raw, Array) ? (as3.as(raw, Array)).concat() : null;
        IoPets._dataAt = getTimer();
    }

    /** The player's pets, for the Pets tab: [[id, monster, out], ...] (empty outside their main yard). */
    public static get pets(): any[] {
        return IoPets.ownYard() && IoPets._data ? IoPets._data : [];
    }

    public static outCount(): int {
        let n: int = 0;
        for (let p of as3.values(IoPets.pets)) {
            if (p[2] | 0) {
                n++;
            }
        }
        return n;
    }

    /** The player's own main yard, built (where pets can be bought, brought out and put away). */
    public static ownYard(): boolean {
        return GLOBAL.INFERNO_ONLY && BASE.isMainYard && !BASE.isOutpost && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID);
    }

    /** Once the yard is built (BASE, after the warts): the pets that are out come out into it. */
    public static Setup(): void {
        IoPets.Clear();
        if (!GLOBAL.INFERNO_ONLY || !IoPets._data || BASE.isOutpost || GLOBAL.ioDesignMode()) {
            return;
        }
        IoPets.sync();
    }

    /** Puts in the yard the pets that are out and takes away those that aren't. */
    private static sync(): void {
        if (!MAP._BUILDINGTOPS) {
            return;
        }
        let want: any = {};
        let names: any = {};
        let bigs: any = {};
        let golds: any = {};
        let tags: any = {};
        let p: any[] = null;
        for (p of as3.values(IoPets._data || [])) {
            if (p[2] | 0) {
                want[p[0] | 0] = String(p[1]);
                names[p[0] | 0] = p.length > 3 && p[3] ? String(p[3]) : "";
                bigs[p[0] | 0] = p.length > 4 && (p[4] | 0) == 1;
                // (22 October: a Golden Coat, a Name Tag's colour: IoShop)
                golds[p[0] | 0] = p.length > 6 && (p[6] | 0) == 1;
                tags[p[0] | 0] = p.length > 7 && p[7] ? String(p[7]) : "";
            }
        }
        let keep: any[] = [];
        for (let pet of as3.values(IoPets._walking)) {
            // (one grown since: made again, at its full size, where it is)
            if (want[pet.petId] == pet.monster && Boolean(bigs[pet.petId]) == pet.big) {
                pet.setLook(Boolean(golds[pet.petId]), as3.str(tags[pet.petId]));
                pet.setName(as3.str(names[pet.petId]));
                keep.push(pet);
                delete want[pet.petId];
            } else {
                pet.clear();
            }
        }
        IoPets._walking = keep;
        for (let id in want) {
            let at: Point = IoPets.freeSpot();
            if (IoPets._grownAt && (IoPets._grownAt.id | 0) == (Number(id) | 0)) {
                at = new Point(IoPets._grownAt.x, IoPets._grownAt.y);
                IoPets._grownAt = null;
            }
            if (!at) {
                continue;
            }
            let made: IoPet = new IoPet(Number(id) | 0, String(want[id]), at, as3.str(names[id]), Boolean(bigs[id]), Boolean(golds[id]), as3.str(tags[id]));
            MAP._BUILDINGTOPS.addChild(made);
            IoPets._walking.push(made);
        }
    }

    /** Every game step (GLOBAL, with the workers). */
    public static Tick(): void {
        IoYardFx.Tick();
        if (!IoPets._walking.length) {
            return;
        }
        // (22 October: Pet Treats: now and then, by itself, a pet just wandering does a trick, the zoomies or a hop)
        let treats: boolean = IoPets.treats;
        for (let pet of as3.values(IoPets._walking)) {
            if (treats && !pet.mode && Math.random() < 1 / 700) {
                let r: number = Math.random();
                if (r < 0.45) {
                    pet.playTrick();
                } else if (r < 0.8) {
                    pet.playZoomies();
                } else {
                    pet.playPat();
                }
            }
            pet.tick();
        }
    }

    /** The yard is going (BASE.Cleanup). */
    public static Clear(): void {
        IoCritterMenu.Hide();
        IoYardFx.Clear();
        for (let pet of as3.values(IoPets._walking)) {
            pet.clear();
        }
        IoPets._walking = [];
    }

    /** The pets walking about now (tests). */
    public static get walking(): any[] {
        return IoPets._walking;
    }

    // ---- where they can go
    /** A point of the yard (its own units) that a pet may stand on: inside the edge, on no building. */
    public static free(x: number, y: number): boolean {
        let halfW: number = GLOBAL._mapWidth * 0.5 - 15;
        let halfH: number = GLOBAL._mapHeight * 0.5 - 15;
        if (x < -halfW || x > halfW || y < -halfH || y > halfH) {
            return false;
        }
        return GRID.Blocked(new Point(x, y), true) == 0;
    }

    /** A straight walk from one point to another that crosses no building and stays in the yard. */
    public static clearLine(x0: number, y0: number, x1: number, y1: number): boolean {
        let dx: number = x1 - x0;
        let dy: number = y1 - y0;
        let steps: int = Math.max(1, (Math.sqrt(dx * dx + dy * dy) / 8) | 0) | 0;
        for (let i: int = 1; i <= steps; i++) {
            if (!IoPets.free(x0 + dx * i / steps, y0 + dy * i / steps)) {
                return false;
            }
        }
        return true;
    }

    /** Somewhere free to put a pet down, or null. */
    public static freeSpot(): Point {
        for (let tries: int = 0; tries < 400; tries++) {
            let x: number = (Math.random() - 0.5) * (GLOBAL._mapWidth - 60);
            let y: number = (Math.random() - 0.5) * (GLOBAL._mapHeight - 60);
            if (IoPets.free(x, y) && IoPets.free(x + 10, y) && IoPets.free(x, y + 10)) {
                return new Point(x, y);
            }
        }
        return null;
    }

    // ---- played with (IoYardPick: a click on a pet in the player's own yard)
    /** A pet's menu: things to do with it, and Feed for full size. */
    public static menu(pet: IoPet): void {
        let kind: string = IoPetsPanel.monsterName(pet.monster);
        let title: string = pet.petName ? pet.petName : kind;
        // (QoL #235: in the player's language)
        let line: string = pet.petName ? kind : KEYS.Get("io_t3t_pet_yours");
        if (pet.big) {
            line = KEYS.Get("io_t3t_pet_full", { "v1": line });
        }
        let items: any[] = [];
        if (pet.mode == "follow") {
            items.push({ "label": KEYS.Get("io_t3t_pet_stop"), "onClick": (): void => {
                pet.stopPlay();
            } });
        } else {
            items.push({ "label": KEYS.Get("io_t3t_pet_follow"), "onClick": (): void => {
                pet.playFollow();
            } });
        }
        items.push({ "label": KEYS.Get("io_t3t_pet_fetch"), "onClick": (): void => {
            pet.playFetch();
        } });
        items.push({ "label": KEYS.Get("io_t3t_pet_trick"), "onClick": (): void => {
            pet.playTrick();
        } });
        items.push({ "label": pet.petName ? KEYS.Get("io_t3t_pet_pat", { "v1": pet.petName }) : KEYS.Get("io_t3t_pet_pat_it"), "onClick": (): void => {
            pet.playPat();
        } });
        items.push({ "label": KEYS.Get("io_t3t_pet_zoomies"), "onClick": (): void => {
            pet.playZoomies();
        } });
        items.push({ "label": KEYS.Get("io_t3t_pet_nap"), "onClick": (): void => {
            pet.playNap();
        } });
        if (!pet.big) {
            items.push({ "label": KEYS.Get("io_t3t_pet_feed", { "v1": GLOBAL.FormatNumber(IoPets.growCost) }), "style": "gold", "onClick": (): void => {
                IoPets.askGrow(pet);
            } });
        }
        // (22 October: the Store's Extras for it: a Golden Coat, a Name Tag (or its colour), treats for the yard's pets)
        if (GLOBAL.INFERNO_ONLY && IoShop.data) {
            if (!pet.gold) {
                items.push({ "label": KEYS.Get("io_shop_menu_coat", { "v1": IoShop.tokens("coat") > 0 ? KEYS.Get("io_shop_kept") : GLOBAL.FormatNumber(IoShop.price("coat")) }), "style": "gold", "onClick": (): void => {
                    IoShop.coatAsk(pet);
                } });
            }
            items.push({ "label": pet.tag ? KEYS.Get("io_shop_menu_tag_colour") : KEYS.Get("io_shop_menu_tag", { "v1": IoShop.tokens("tag") > 0 ? KEYS.Get("io_shop_kept") : GLOBAL.FormatNumber(IoShop.price("tag")) }), "onClick": (): void => {
                IoShop.tagAsk(pet);
            } });
            if (!IoPets.treats) {
                items.push({ "label": KEYS.Get("io_shop_menu_treats", { "v1": GLOBAL.FormatNumber(IoShop.price("treats")) }), "onClick": (): void => {
                    IoShop.treatsAsk();
                } });
            }
        }
        // (QoL #503: Return within the first 10 minutes if never fed, else Release, for some of its Shiny back)
        let row: any[] = GLOBAL.INFERNO_ONLY ? IoPets.rowOf(pet.petId) : null;
        if (row) {
            items.push({ "label": IoPets.releaseLabel(row), "style": "red", "onClick": (): void => {
                IoPets.askRelease(row, null);
            } });
        }
        IoCritterMenu.Show(title, line, items);
    }

    // ---- QoL #503: given back
    /** The player's pet with this id ([id, monster, out, name, big, age]), or null. */
    public static rowOf(id: int): any[] {
        for (let p of as3.values(IoPets.pets)) {
            if ((p[0] | 0) == id) {
                return p;
            }
        }
        return null;
    }

    /** A pet's age in seconds now: what the server said, and the time since. */
    public static ageOf(p: any[]): number {
        let then: number = p && p.length > 5 ? Number(p[5]) || 0 : 1.0e9;
        return then + (getTimer() - IoPets._dataAt) / 1000;
    }

    /** Can it still be returned for all its Shiny (never fed, bought under returnSeconds ago; 5 s spare for the way there)? */
    public static returnable(p: any[]): boolean {
        return p != null && !(p.length > 4 && (p[4] | 0) == 1) && IoPets.ageOf(p) < IoPets.returnSeconds - 5;
    }

    /** The Shiny it gives back now (as the server will count it). */
    public static refundOf(p: any[]): int {
        return (IoPets.returnable(p) ? IoPets.price : Math.floor(IoPets.price * IoPets.releasePercent / 100)) | 0;
    }

    /** "Return (+500 Shiny)" or "Release (+250 Shiny)"; `short`: "Return +500" (a small button). */
    public static releaseLabel(p: any[], short: boolean = false): string {
        return KEYS.Get((IoPets.returnable(p) ? "io_club2_pet_return" : "io_club2_pet_release") + (short ? "_short" : ""), { "v1": GLOBAL.FormatNumber(IoPets.refundOf(p)) });
    }

    /** Asks first (what comes back, that it's for good), then gives it back; onDone(error or null) after, if given. */
    public static askRelease(p: any[], onDone: Function): void {
        let who: string = p.length > 3 && p[3] ? String(p[3]) : IoPetsPanel.monsterName(String(p[1]));
        let back: int = IoPets.refundOf(p);
        let ret: boolean = IoPets.returnable(p);
        // (the confirmation for what can't be taken back: Keep, and the verb in red: QoL #486)
        // (22 October: a Golden Coat goes with it: said)
        let coat: string = p.length > 6 && (p[6] | 0) == 1 ? "<br><br>" + KEYS.Get("io_shop_release_coat") : "";
        GLOBAL.ioDanger(KEYS.Get(ret ? "io_club2_pet_return_ask" : "io_club2_pet_release_ask", { "v1": who, "v2": GLOBAL.FormatNumber(back), "v3": IoPets.releasePercent }) + coat, KEYS.Get(ret ? "io_club2_pet_return_btn" : "io_club2_pet_release_btn"), (): void => {
            IoPets.release(p[0] | 0, back, (error: string): void => {
                if (error) {
                    GLOBAL.Message(error);
                } else {
                    SOUNDS.Play("purchasepopup");
                }
                if (onDone != null) {
                    onDone(error);
                }
            });
        });
    }

    /** Gives a pet back (pets/release) for `expect` Shiny or more. onDone(error or null). */
    public static release(id: int, expect: int, onDone: Function): void {
        IoPets.call("release", [["id", id], ["expect", expect]], onDone);
    }

    /** Feed: says what it costs and that it lasts, then asks the server. */
    private static askGrow(pet: IoPet): void {
        let who: string = pet.petName ? pet.petName : KEYS.Get("io_t3t_pet_your_pet");
        let magma: number = BASE._resources && BASE._resources.r4 ? Number(BASE._resources.r4.Get()) : 0;
        if (magma < IoPets.growCost) {
            GLOBAL.Message(KEYS.Get("io_t3t_pet_no_magma", { "v1": GLOBAL.FormatNumber(IoPets.growCost), "v2": GLOBAL.FormatNumber(magma) }));
            return;
        }
        GLOBAL.Message(KEYS.Get("io_t3t_pet_feed_ask", { "v1": who, "v2": GLOBAL.FormatNumber(IoPets.growCost) }), KEYS.Get("io_t3t_pet_feed_btn"), (): void => {
            IoPets.grow(pet);
        });
    }

    /** Asks the server to grow a pet (after any save on its way, so the Magma the server sees is the yard's). */
    private static grow(pet: IoPet): void {
        let tries: int = 0;
        let go: Function = null;
        go = (): void => {
            if (BASE._saving && tries++ < 40) {
                setTimeout(go, 250);
                return;
            }
            IoPets.call("grow", [["id", pet.petId]], (error: string): void => {
                if (error) {
                    GLOBAL.Message(error);
                }
            }, (response: any): void => {
                // what the server took: off the yard's Magma here too, without sending it as spending
                IoPets.takeMagma(IoPets.growCost);
                IoPets._grownAt = { "id": pet.petId, "x": pet.gx, "y": pet.gy };
            });
        };
        if (!BASE._saving) {
            BASE.Save();
        }
        setTimeout(go, 400);
    }

    /** The server took this much Magma from the save: the yard shows it gone, and does not send it again. */
    private static takeMagma(amount: number): void {
        if (BASE.Charge(4, amount) > 0) {
            if (BASE._deltaResources && BASE._deltaResources.r4) {
                BASE._deltaResources.r4.Add(amount);
            }
            if (BASE._hpDeltaResources && BASE._hpDeltaResources.r4 != null) {
                BASE._hpDeltaResources.r4 += amount;
            }
        }
    }

    // ---- the server
    /** Buys a pet of a monster. onDone(error or null). */
    public static buy(monster: string, onDone: Function): void {
        IoPets.call("buy", [["monster", monster]], onDone);
    }

    /** Brings a pet out into the yard (out true) or puts it in storage. onDone(error or null). */
    public static place(id: int, out: boolean, onDone: Function): void {
        IoPets.call("place", [["id", id], ["out", out ? 1 : 0]], onDone);
    }

    /** Names a pet (an empty name takes its name away). onDone(error or null). */
    public static name(id: int, name: string, onDone: Function): void {
        IoPets.call("name", [["id", id], ["name", name]], onDone);
    }

    private static call(path: string, params: any[], onDone: Function, beforeApply: Function = null): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "pets/" + path, params, (response: any): void => {
            if (!response) {
                onDone(KEYS.Get("io_t3t_srv_try"));
                return;
            }
            if (response.error !== 0 && response.error !== "0") {
                onDone(String(response.error || KEYS.Get("io_t3t_pet_wrong")));
                return;
            }
            if (beforeApply != null) {
                beforeApply(response);
            }
            IoPets.apply(response);
            onDone(null);
        }, (e: IOErrorEvent): void => {
            onDone(KEYS.Get("io_t3t_srv_conn"));
        });
    }

    /** An answer from the server: the pets as they are now (and the Shiny left after a purchase). */
    public static apply(response: any): void {
        if (response.price) {
            IoPets.price = response.price | 0;
        }
        if (response.maxOut) {
            IoPets.maxOut = response.maxOut | 0;
        }
        if (response.perKind) {
            IoPets.perKind = response.perKind | 0;
        }
        if (response.nameLength) {
            IoPets.nameLength = response.nameLength | 0;
        }
        if (response.growCost) {
            IoPets.growCost = response.growCost | 0;
        }
        if (response.returnSeconds) {
            IoPets.returnSeconds = response.returnSeconds | 0;
        }
        if (response.releasePercent) {
            IoPets.releasePercent = response.releasePercent | 0;
        }
        if (as3.is(response.monsters, Array)) {
            IoPets.monsters = as3.as(response.monsters, Array);
        }
        if (response.credits != null) {
            CASINO.setCredits(response.credits | 0);
        }
        if (as3.is(response.pets, Array)) {
            IoPets._data = (as3.as(response.pets, Array)).concat();
            IoPets._dataAt = getTimer();
            if (IoPets.ownYard()) {
                IoPets.sync();
            }
        }
    }
}

import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, CASINO, GLOBAL, GRID, IoPet, MAP, URLLoaderApi } from "@game";

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
 */
export class IoPets extends ASObject {
    /** Shiny for one pet, and how many can be out (the server's petsConfig; sent again with each answer). */
    public static price: int = 500;

    public static maxOut: int = 5;

    /** How many of one monster a player can have, and how long a pet's name can be. */
    public static perKind: int = 5;

    public static nameLength: int = 16;

    /**
     * The monsters this player can have as pets (every Inferno monster but the champions; Hell Freezes Over's
     * once the event is won): the server's list, with the yard's load (io_petinfo) and every answer.
     */
    public static monsters: any[] = ["IC1", "IC2", "IC3", "IC4", "IC5", "IC6", "IC7", "IC8", "IC12", "IC14", "IC15", "IC20"];

    /** The loaded yard's pets: [[id, monster, out], ...], or null (not a main yard, or none sent). */
    private static _data: any[] = null;

    /** The pets walking about the yard now. */
    private static _walking: any[] = [];

    public $ctor(): void {
        super.$ctor();
    }

    /** The yard's pets, from its load (BASE). */
    public static setData(raw: any): void {
        IoPets._data = as3.is(raw, Array) ? (as3.as(raw, Array)).concat() : null;
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
        let p: any[] = null;
        for (p of as3.values(IoPets._data || [])) {
            if (p[2] | 0) {
                want[p[0] | 0] = String(p[1]);
                names[p[0] | 0] = p.length > 3 && p[3] ? String(p[3]) : "";
            }
        }
        let keep: any[] = [];
        for (let pet of as3.values(IoPets._walking)) {
            if (want[pet.petId] == pet.monster) {
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
            if (!at) {
                continue;
            }
            let made: IoPet = new IoPet(Number(id) | 0, String(want[id]), at, as3.str(names[id]));
            MAP._BUILDINGTOPS.addChild(made);
            IoPets._walking.push(made);
        }
    }

    /** Every game step (GLOBAL, with the workers). */
    public static Tick(): void {
        if (!IoPets._walking.length) {
            return;
        }
        for (let pet of as3.values(IoPets._walking)) {
            pet.tick();
        }
    }

    /** The yard is going (BASE.Cleanup). */
    public static Clear(): void {
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

    private static call(path: string, params: any[], onDone: Function): void {
        new URLLoaderApi().load(GLOBAL.serverUrl + "pets/" + path, params, (response: any): void => {
            if (!response) {
                onDone("The server did not answer. Try again.");
                return;
            }
            if (response.error !== 0 && response.error !== "0") {
                onDone(String(response.error || "Something went wrong with your pets."));
                return;
            }
            IoPets.apply(response);
            onDone(null);
        }, (e: IOErrorEvent): void => {
            onDone("The server did not answer. Check your connection and try again.");
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
        if (as3.is(response.monsters, Array)) {
            IoPets.monsters = as3.as(response.monsters, Array);
        }
        if (response.credits != null) {
            CASINO.setCredits(response.credits | 0);
        }
        if (as3.is(response.pets, Array)) {
            IoPets._data = (as3.as(response.pets, Array)).concat();
            if (IoPets.ownYard()) {
                IoPets.sync();
            }
        }
    }
}

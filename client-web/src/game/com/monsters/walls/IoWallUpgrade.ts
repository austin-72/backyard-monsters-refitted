import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BASE, BFOUNDATION, BWALL, GLOBAL, InstanceManager, KEYS } from "@game";

/**
 * Inferno-only (3 October): "Upgrade all walls" for resources, next to the shiny one (the wall's info
 * panel, BUILDINGINFO "io_btn_wallsres"). It offers each level the walls can go to (in the Inferno: 2,
 * stone; 3, iron), with the exact cost: for every wall below that level, the sum of the upgrade steps it
 * still has to take (its props' costs[level .. target - 1], bone, coal, sulfur and magma). Paid, every
 * wall is upgraded at once, as the shiny one does (STORE.BuyB "BLK"). A level whose Under Hall
 * requirement isn't met yet, or whose cost the yard can't pay, is said so and not offered.
 *
 * Walls being built or upgraded are finished first (they are paid for already), then go on from there.
 */
export class IoWallUpgrade extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    /** The walls in the yard (the wall types: props type "wall", with upgrade steps). */
    private static walls(): any[] {
        let out: any[] = [];
        for (let b of (InstanceManager.getInstancesByClass(BWALL) ?? [])) {
            if (b && b._buildingProps && b._buildingProps.type == "wall" && as3.is(b._buildingProps.costs, Array) && b._buildingProps.costs.length > 1) {
                out.push(b);
            }
        }
        return out;
    }

    /** The level a wall stands at once what it has paid for is done. */
    private static paidLevel(b: BFOUNDATION): int {
        let l: int = b._lvl.Get() | 0;
        if (b._countdownBuild.Get() > 0) {
            l = Math.max(l, 1) | 0;
        }
        if (b._countdownUpgrade.Get() > 0) {
            l++;
        }
        return l;
    }

    /** What taking every wall to `target` costs: {n: walls, r: [r1, r2, r3, r4], ok: requirements met}. */
    public static cost(target: int): any {
        let r: any[] = [0, 0, 0, 0];
        let n: int = 0;
        let ok: boolean = true;
        for (let b of as3.values(IoWallUpgrade.walls())) {
            let costs: any[] = as3.cast(b._buildingProps.costs, Array);
            if (target > costs.length) {
                continue;
            }
            let l: int = IoWallUpgrade.paidLevel(b);
            if (l >= target) {
                continue;
            }
            n++;
            for (let step: int = l; step < target; step++) {
                let c: any = costs[step];
                if (!c) {
                    continue;
                }
                if (!BASE.HasRequirements(c)) {
                    ok = false;
                }
                for (let i: int = 1; i <= 4; i++) {
                    if (c["r" + i]) {
                        r[i - 1] += Number(c["r" + i].Get());
                    }
                }
            }
        }
        return { "n": n, "r": r, "ok": ok };
    }

    private static affordable(r: any[]): boolean {
        for (let i: int = 1; i <= 4; i++) {
            if (r[i - 1] > BASE._resources["r" + i].Get()) {
                return false;
            }
        }
        return true;
    }

    private static costText(r: any[]): string {
        let parts: any[] = [];
        let names: any[] = BASE.isInfernoMainYardOrOutpost ? GLOBAL.iresourceNames : GLOBAL._resourceNames;
        for (let i: int = 0; i < 4; i++) {
            if (r[i] > 0) {
                parts.push(GLOBAL.FormatNumber(Number(r[i])) + " " + KEYS.Get(as3.str(names[i])));
            }
        }
        return parts.length ? parts.join(", ") : KEYS.Get("io_walls_free");
    }

    /** The highest level any wall type here goes to. */
    private static topLevel(): int {
        let top: int = 1;
        for (let b of as3.values(IoWallUpgrade.walls())) {
            top = Math.max(top, Number(b._buildingProps.costs.length)) | 0;
        }
        return top;
    }

    private static levelName(level: int): string {
        let key: string = "io_walls_level" + level;
        let name: string = KEYS.Get(key);
        return name == key ? KEYS.Get("io_walls_leveln", { "v1": level }) : name;
    }

    /** Opens the choice: each level the walls can still go to, with its exact cost. */
    public static Show(): void {
        let lines: any[] = [];
        let offers: any[] = [];
        for (let target: int = 2; target <= IoWallUpgrade.topLevel(); target++) {
            let c: any = IoWallUpgrade.cost(target);
            if (c.n == 0) {
                continue;
            }
            let line: string = "<b>" + IoWallUpgrade.levelName(target) + "</b> (" + KEYS.Get("io_walls_count", { "v1": c.n }) + "): " + IoWallUpgrade.costText(as3.cast(c.r, Array));
            if (!c.ok) {
                line += " <font color=\"#B02000\">" + KEYS.Get("io_walls_needhall") + "</font>";
            } else if (!IoWallUpgrade.affordable(as3.cast(c.r, Array))) {
                line += " <font color=\"#B02000\">" + KEYS.Get("io_walls_notenough") + "</font>";
            } else {
                offers.push(target);
            }
            lines.push(line);
        }
        if (!lines.length) {
            GLOBAL.Message(KEYS.Get("io_walls_alldone"));
            return;
        }
        let text: string = "<b>" + KEYS.Get("io_walls_title") + "</b><br><br>" + lines.join("<br>");
        // (two choices at most: MESSAGE has two buttons; the Inferno's walls have two steps)
        offers = offers.slice(-2);
        if (!offers.length) {
            GLOBAL.Message(text);
        } else if (offers.length == 1) {
            GLOBAL.Message(text, IoWallUpgrade.levelName(offers[0] | 0), IoWallUpgrade.Buy, [offers[0]]);
        } else {
            // (the message's first button is drawn on the right: the higher level there, the lower on its left)
            GLOBAL.Message(text, IoWallUpgrade.levelName(offers[1] | 0), IoWallUpgrade.Buy, [offers[1]], IoWallUpgrade.levelName(offers[0] | 0), IoWallUpgrade.Buy, [offers[0]]);
        }
    }

    /** Pays and upgrades every wall below `target` to it, at once. */
    public static Buy(target: int): void {
        let c: any = IoWallUpgrade.cost(target);
        if (c.n == 0) {
            return;
        }
        if (!c.ok) {
            GLOBAL.Message(KEYS.Get("io_walls_needhall"));
            return;
        }
        if (!IoWallUpgrade.affordable(as3.cast(c.r, Array))) {
            GLOBAL.Message(KEYS.Get("io_walls_notenough"));
            return;
        }
        for (let i: int = 1; i <= 4; i++) {
            if (c.r[i - 1] > 0) {
                BASE.Charge(i, Number(c.r[i - 1]));
            }
        }
        for (let b of as3.values(IoWallUpgrade.walls())) {
            if (target > b._buildingProps.costs.length) {
                continue;
            }
            if (b._countdownBuild.Get() > 0) {
                b.Constructed();
            }
            if (b._countdownUpgrade.Get() > 0) {
                b.Upgraded();
            }
            while (b._lvl.Get() < target) {
                b.Upgraded();
            }
        }
        BASE.Save();
        GLOBAL.Message(KEYS.Get("io_walls_done", { "v1": c.n, "v2": IoWallUpgrade.levelName(target), "v3": IoWallUpgrade.costText(as3.cast(c.r, Array)) }));
    }
}

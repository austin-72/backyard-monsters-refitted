import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Sprite } from "flash/display";
import { TextField, TextFormat } from "flash/text";
import { BASE, BFOUNDATION, BWALL, CasinoUI, GLOBAL, InstanceManager, IoWin, KEYS } from "@game";

/**
 * Inferno-only (3 October): "Upgrade all walls" for resources, next to the shiny one (the wall's info
 * panel, BUILDINGINFO "io_btn_wallsres"). It offers each level the walls can go to (in the Inferno: 2,
 * stone; 3, iron), with the exact cost: for every wall below that level, the sum of the upgrade steps it
 * still has to take (its props' costs[level .. target - 1], bone, coal, sulfur and magma). Paid, every
 * wall is upgraded at once, as the shiny one does (STORE.BuyB "BLK"). A level whose Under Hall
 * requirement isn't met yet, or whose cost the yard can't pay, is said so and its button is off.
 * (22 November: its own window, a row and a button for each level, 2 to 5.)
 *
 * Walls being built or upgraded are finished first (they are paid for already), then go on from there.
 */
export class IoWallUpgrade extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    /** The walls in the yard (the wall types: props type "wall", with upgrade steps). */
    public static walls(): any[] {
        let out: any[] = [];
        for (let b of (InstanceManager.getInstancesByClass(BWALL) ?? [])) {
            if (b && b._buildingProps && b._buildingProps.type == "wall" && as3.is(b._buildingProps.costs, Array) && b._buildingProps.costs.length > 1) {
                out.push(b);
            }
        }
        return out;
    }

    /** The level a wall stands at once what it has paid for is done. */
    public static paidLevel(b: BFOUNDATION): int {
        let l: int = b._lvl.Get() | 0;
        if (b._countdownBuild.Get() > 0) {
            l = Math.max(l, 1) | 0;
        }
        if (b._countdownUpgrade.Get() > 0) {
            l++;
        }
        return l;
    }

    /**
     * (22 November) The Shiny for one wall's step up to `level` (the Store's "BLK" items): to 2 and 3 the server's
     * prices (wall_stone, wall_iron); to 4 twice the step to 3, to 5 twice the step to 4 (the user's), each the server's
     * when it sends one (wall_studded, wall_fireblack).
     */
    public static shinyStep(level: int): number {
        let stone: number = GLOBAL.ioPrice("wall_stone", 3);
        let iron: number = GLOBAL.ioPrice("wall_iron", 6);
        let studded: number = GLOBAL.ioPrice("wall_studded", 2 * iron);
        let fireblack: number = GLOBAL.ioPrice("wall_fireblack", 2 * studded);
        return [0, 0, stone, iron, studded, fireblack][level] || 0;
    }

    /**
     * (22 November) The Store's "upgrade every wall to `target`" (BLK{target}I): {n: walls, c: Shiny, saved: the
     * resources their steps would cost}, for every wall below that level that can go there, from the level it has paid
     * for (as cost()).
     */
    public static shinyCost(target: int): any {
        let n: int = 0;
        let c: number = 0;
        let saved: number = 0;
        for (let b of as3.values(IoWallUpgrade.walls())) {
            let costs: any[] = as3.cast(b._buildingProps.costs, Array);
            if (target > costs.length) {
                continue;
            }
            let l: int = Math.max(1, IoWallUpgrade.paidLevel(b)) | 0;
            if (l >= target) {
                continue;
            }
            n++;
            for (let step: int = l; step < target; step++) {
                c += IoWallUpgrade.shinyStep((step + 1) | 0);
                let k: any = costs[step];
                if (k) {
                    for (let i: int = 1; i <= 4; i++) {
                        saved += k["r" + i] ? Number(k["r" + i].Get()) : 0;
                    }
                }
            }
        }
        return { "n": n, "c": c, "saved": saved };
    }

    /**
     * (22 November) Every wall that can go to `target` taken there, at once (paid already: the Store's BLK items, Buy
     * here); walls being built or upgraded finished first. Other wall kinds, with fewer levels, are left as they are.
     */
    public static raiseAll(target: int): int {
        let n: int = 0;
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
            if (b._lvl.Get() < target) {
                n++;
            }
            while (b._lvl.Get() < target) {
                b.Upgraded();
            }
        }
        return n;
    }

    /** QoL #478: how many walls can still go up a level (the build menu's "Upgrade all walls (N)", BUILDINGSPOPUP). */
    public static ioCount(): int {
        let n: int = 0;
        for (let b of as3.values(IoWallUpgrade.walls())) {
            if (IoWallUpgrade.paidLevel(b) < Number(b._buildingProps.costs.length)) {
                n++;
            }
        }
        return n;
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

    /** The choice's window (tests). */
    public static _win: any = null;

    /**
     * Opens the choice: each level the walls can still go to, with its exact cost and its own button.
     * (22 November, the user's: it was a message, which has two buttons, so only the two highest levels could be
     * picked once walls went to 5; now a window with a row for every level.)
     */
    public static Show(): void {
        let rows: any[] = [];
        for (let target: int = 2; target <= IoWallUpgrade.topLevel(); target++) {
            let c: any = IoWallUpgrade.cost(target);
            if (c.n == 0) {
                continue;
            }
            let why: string = !c.ok ? KEYS.Get("io_walls_needhall") : !IoWallUpgrade.affordable(as3.cast(c.r, Array)) ? KEYS.Get("io_walls_notenough") : "";
            rows.push({ "target": target, "c": c, "why": why });
        }
        if (!rows.length) {
            GLOBAL.Message(KEYS.Get("io_walls_alldone"));
            return;
        }
        if (IoWallUpgrade._win && !IoWallUpgrade._win.closed) {
            IoWallUpgrade._win.close();
        }
        let W: int = 640;
        let ROW: int = 58;
        let H: int = (118 + rows.length * ROW) | 0;
        let win: any = IoWin.openPanel("ioWallsRes", W, H, KEYS.Get("io_btn_wallsres"));
        IoWallUpgrade._win = win;
        let mc: Sprite = win.mc;
        let lead: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_walls_title"), 12, 0xD9C6A8, false, W - 40)), TextField);
        lead.x = win.left + 20;
        lead.y = win.top + 56;
        let y: number = win.top + 84;
        for (let row of rows) {
            let target: int = row.target | 0;
            let bg: Sprite = as3.as(mc.addChild(CasinoUI.panel(W - 40, ROW - 6, 0.6)), Sprite);
            bg.x = win.left + 20;
            bg.y = y;
            let t: TextField = new TextField();
            t.selectable = false;
            t.mouseEnabled = false;
            t.multiline = true;
            t.wordWrap = true;
            t.width = W - 220;
            t.height = ROW - 10;
            t.defaultTextFormat = new TextFormat("Verdana", 11, 0xF4E6D0);
            t.htmlText = "<font size=\"13\" color=\"#FFD27A\"><b>" + IoWallUpgrade.levelName(target) + "</b></font>  " + KEYS.Get("io_walls_count", { "v1": row.c.n }) + "<br>" + IoWallUpgrade.costText(as3.cast(row.c.r, Array)) + (row.why ? "  <font color=\"#FF7A5A\">" + row.why + "</font>" : "");
            t.name = "ioWallsResText:" + target;
            t.x = win.left + 32;
            t.y = y + 6;
            mc.addChild(t);
            let b: Sprite = as3.as(mc.addChild(CasinoUI.button(IoWallUpgrade.levelName(target), 150, 36, (e: any): void => {
                win.close();
                IoWallUpgrade.Buy(target);
            }, !row.why, 14)), Sprite);
            b.name = "ioWallsResBuy:" + target;
            b.x = win.left + W - 182;
            b.y = y + 5;
            y += ROW;
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
        IoWallUpgrade.raiseAll(target);
        BASE.Save();
        GLOBAL.Message(KEYS.Get("io_walls_done", { "v1": c.n, "v2": IoWallUpgrade.levelName(target), "v3": IoWallUpgrade.costText(as3.cast(c.r, Array)) }));
    }
}

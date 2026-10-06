import * as as3 from "as3";
import { ASObject, int } from "as3";
import { BASE, BTRAP, GLOBAL, InstanceManager, KEYS } from "@game";

/**
 * Inferno-only (3 October): traps that went off stay in the yard, disarmed (BTRAP.ioDisarmed). One click
 * re-arms every one of them at once (a trap's info panel, BUILDINGINFO "io_btn_rearm"), for what building
 * them all again costs: each trap's build cost (its props' costs[0]), added up.
 */
export class IoTrapRearm extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    public static disarmed(): any[] {
        let out: any[] = [];
        for (let t of (InstanceManager.getInstancesByClass(BTRAP) ?? [])) {
            if (t && t.ioDisarmed) {
                out.push(t);
            }
        }
        return out;
    }

    public static cost(traps: any[] = null): any[] {
        let r: any[] = [0, 0, 0, 0];
        for (let t of as3.values(traps || IoTrapRearm.disarmed())) {
            let c: any = t._buildingProps.costs ? t._buildingProps.costs[0] : null;
            for (let i: int = 1; c && i <= 4; i++) {
                if (c["r" + i]) {
                    r[i - 1] += Number(c["r" + i].Get());
                }
            }
        }
        return r;
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

    private static affordable(r: any[]): boolean {
        for (let i: int = 1; i <= 4; i++) {
            if (r[i - 1] > BASE._resources["r" + i].Get()) {
                return false;
            }
        }
        return true;
    }

    public static Show(): void {
        let traps: any[] = IoTrapRearm.disarmed();
        if (!traps.length) {
            GLOBAL.Message(KEYS.Get("io_traps_allarmed"));
            return;
        }
        let r: any[] = IoTrapRearm.cost(traps);
        let text: string = KEYS.Get("io_traps_rearm_body", { "v1": traps.length, "v2": IoTrapRearm.costText(r) });
        if (!IoTrapRearm.affordable(r)) {
            GLOBAL.Message(text + "<br><br><font color=\"#B02000\">" + KEYS.Get("io_walls_notenough") + "</font>");
            return;
        }
        GLOBAL.Message(text, KEYS.Get("io_btn_rearm"), IoTrapRearm.Rearm);
    }

    public static Rearm(): void {
        let traps: any[] = IoTrapRearm.disarmed();
        if (!traps.length) {
            return;
        }
        let r: any[] = IoTrapRearm.cost(traps);
        if (!IoTrapRearm.affordable(r)) {
            GLOBAL.Message(KEYS.Get("io_walls_notenough"));
            return;
        }
        for (let i: int = 1; i <= 4; i++) {
            if (r[i - 1] > 0) {
                BASE.Charge(i, Number(r[i - 1]));
            }
        }
        for (let t of as3.values(traps)) {
            t.ioRearm();
        }
        BASE.Save();
        GLOBAL.Message(KEYS.Get("io_traps_rearmed", { "v1": traps.length }));
    }
}

import * as as3 from "as3";
import { ASObject } from "as3";
import { MouseEvent } from "flash/events";
import { BASE, GLOBAL, IoPets, IoWorkerFun, MAP } from "@game";

/**
 * Inferno-only (10 October): clicking a pet or a worker in the yard. Pets and workers are pictures the yard's
 * renderer draws (they take no mouse events of their own), so a press on the yard's ground (MAP.Click) looks for
 * one under the pointer; if the button comes up again without the yard being dragged and the
 * same one is still under it, its menu opens (IoPets.menu, IoWorkerFun.menu). A press that becomes a drag only
 * drags, as before.
 *
 * Only in the player's own yard, built and not being built in: pets in the main yard, workers in the main yard
 * (an outpost's workers are not clicked). Never while a building is in the hand.
 */
export class IoYardPick extends ASObject {
    /** What was under the pointer when the button went down: { kind: "pet" | "worker", it }. */
    private static _down: any = null;

    public $ctor(): void {
        super.$ctor();
    }

    /** Can anything be clicked now? */
    private static allowed(): boolean {
        return GLOBAL.INFERNO_ONLY && GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && BASE.isMainYard && !BASE.isOutpost && !GLOBAL._newBuilding && !GLOBAL.ioDesignMode() && String(BASE._loadedBaseID) == String(GLOBAL._homeBaseID) && MAP._BUILDINGTOPS != null;
    }

    /** The pet or worker under the pointer, or null. */
    public static under(): any {
        if (!IoYardPick.allowed()) {
            return null;
        }
        let mx: number = MAP._BUILDINGTOPS.mouseX;
        let my: number = MAP._BUILDINGTOPS.mouseY;
        // the nearest one whose picture is under the pointer (a little bigger than the picture: they are small)
        let best: any = null;
        let bestD: number = 1e9;
        for (let pet of as3.values(IoPets.walking)) {
            let b: any = pet.box;
            if (mx >= b.x - 4 && mx <= b.x + b.w + 4 && my >= b.y - 4 && my <= b.y + b.h + 4) {
                let d: number = Math.abs(mx - (b.x + b.w / 2)) + Math.abs(my - (b.y + b.h / 2));
                if (d < bestD) {
                    bestD = d;
                    best = { "kind": "pet", "it": pet };
                }
            }
        }
        for (let w of as3.values(IoWorkerFun.workers())) {
            let b: any = IoWorkerFun.box(w);
            if (b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                let d: number = Math.abs(mx - (b.x + b.w / 2)) + Math.abs(my - (b.y + b.h / 2));
                if (d < bestD) {
                    bestD = d;
                    best = { "kind": "worker", "it": w };
                }
            }
        }
        return best;
    }

    /** The button went down on the yard's ground (MAP.Click, first). */
    public static down(): void {
        IoYardPick._down = IoYardPick.under();
        if (IoYardPick._down && MAP.stage) {
            // (added before MAP's own mouse-up, which forgets whether the yard was dragged)
            MAP.stage.removeEventListener(MouseEvent.MOUSE_UP, IoYardPick.up);
            MAP.stage.addEventListener(MouseEvent.MOUSE_UP, IoYardPick.up);
        }
    }

    /** The button came up: a click (not a drag) on the same one opens its menu. */
    private static up(e: MouseEvent): void {
        if (MAP.stage) {
            MAP.stage.removeEventListener(MouseEvent.MOUSE_UP, IoYardPick.up);
        }
        let was: any = IoYardPick._down;
        IoYardPick._down = null;
        if (!was || MAP._dragged) {
            return;
        }
        let now: any = IoYardPick.under();
        if (!now || now.it != was.it) {
            return;
        }
        if (was.kind == "pet") {
            IoPets.menu(was.it);
        } else {
            IoWorkerFun.menu(was.it);
        }
    }
}

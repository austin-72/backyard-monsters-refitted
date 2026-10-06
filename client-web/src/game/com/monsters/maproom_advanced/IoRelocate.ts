import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { GAME, GLOBAL, KEYS, PLEASEWAIT, URLLoaderApi } from "@game";

/**
 * Inferno-only: Relocate, from the map room's sidebar (MapRoomPopup). Warns first: the main yard is
 * placed somewhere new the way a new player is, bone, coal, sulfur and magma go to 0, and every outpost
 * goes back to the wild tribes. The server does it (POST base/relocate, relocateAnywhere.ts); the game
 * then starts again from the new place (reloaded), so the map, outposts and resources are all fresh.
 */
export class IoRelocate extends ASObject {
    private static _busy: boolean = false;

    public static Ask(): void {
        if (IoRelocate._busy) {
            return;
        }
        let outposts: int = GLOBAL._mapOutpost ? GLOBAL._mapOutpost.length | 0 : 0;
        let lost: string = outposts == 0 ? "" : (outposts == 1 ? "your outpost returns" : "all " + outposts + " of your outposts return") + " to the wild tribes";
        GLOBAL.Message("<b>Relocate your yard?</b><br><br>" + "Your main yard will be moved to a new place on the map, the way a new player is placed.<br><br>" + "<b>Everything you have out there is lost:</b> your Bone, Coal, Sulfur and Magma go to 0" + (lost ? ", and " + lost : "") + ".<br><br>This can't be undone.", "Relocate", IoRelocate.Go);
    }

    private static Go(): void {
        if (IoRelocate._busy) {
            return;
        }
        IoRelocate._busy = true;
        PLEASEWAIT.Show(KEYS.Get("wait_relocating"));
        new URLLoaderApi().load(GLOBAL._baseURL + "relocate", [["confirm", "1"]], IoRelocate.Done, IoRelocate.Failed);
    }

    private static Done(data: any): void {
        PLEASEWAIT.Hide();
        if (data.error != 0) {
            IoRelocate._busy = false;
            GLOBAL.Message(String(data.error));
            return;
        }
        let where: string = data.coords && data.coords.length == 2 ? " to " + (data.coords[0] | 0) + ", " + (data.coords[1] | 0) : "";
        // Stopped until it starts again from the new place: nothing more is saved from the old one.
        GLOBAL.Halt();
        GLOBAL.Message("<b>Your yard has been relocated" + where + ".</b><br><br>The game starts again from there now.", "OK", IoRelocate.Reload);
    }

    private static Reload(): void {
        GAME.ioReload(true);
    }

    private static Failed(e: IOErrorEvent): void {
        IoRelocate._busy = false;
        PLEASEWAIT.Hide();
        GLOBAL.Message("The relocation could not be sent. Please try again.");
    }
}

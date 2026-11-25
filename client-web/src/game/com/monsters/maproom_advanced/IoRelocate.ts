import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { GAME, GLOBAL, IoTextPrompt, KEYS, PLEASEWAIT, URLLoaderApi } from "@game";

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
        // (QoL #493, 14 October: the monsters housed in the outposts are named too, from the server's count, and
        // the player types RELOCATE to confirm)
        IoRelocate._busy = true;
        PLEASEWAIT.Show(KEYS.Get("msg_loading"));
        new URLLoaderApi().load(GLOBAL._mapURL + "myoutposts", [], (response: any): void => {
            PLEASEWAIT.Hide();
            IoRelocate._busy = false;
            let list: any[] = response && !response.error ? as3.as(response.outposts, Array) || [] : null;
            IoRelocate.AskWith(list);
        }, (e: IOErrorEvent): void => {
            PLEASEWAIT.Hide();
            IoRelocate._busy = false;
            IoRelocate.AskWith(null);
        });
    }

    private static AskWith(list: any[]): void {
        let outposts: int = list ? list.length | 0 : GLOBAL._mapOutpost ? GLOBAL._mapOutpost.length | 0 : 0;
        let housed: int = 0;
        for (let o of as3.values(list || [])) {
            housed += o.monsters | 0;
        }
        let lost: string = outposts == 0 ? "" : KEYS.Get(outposts == 1 ? "io_t3m_rl_lost_one" : "io_t3m_rl_lost_n", { "v1": outposts }) + (housed > 0 ? KEYS.Get("io_t3m_rl_housed_" + (housed == 1 ? "one" : "n") + (outposts == 1 ? "_it" : "_them"), { "v1": GLOBAL.FormatNumber(housed) }) : "");
        GLOBAL.ioDanger(KEYS.Get("io_t3m_rl_body", { "v1": lost ? KEYS.Get("io_t3m_rl_and", { "v1": lost }) : "" }), KEYS.Get("io_t3m_rl_btn"), (): void => {
            IoTextPrompt.Show(KEYS.Get("io_t3m_rl_title"), KEYS.Get("io_t3m_rl_type"), "", 12, KEYS.Get("io_t3m_rl_btn"), (typed: string): void => {
                if (String(typed).replace(/^\s+|\s+$/g, "").toUpperCase() != "RELOCATE") {
                    GLOBAL.Message(KEYS.Get("io_t3m_rl_not_moved"));
                    return;
                }
                IoRelocate.Go();
            });
        }, null, KEYS.Get("io_danger_stay"));
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
        let where: string = data.coords && data.coords.length == 2 ? KEYS.Get("io_t3m_rl_to", { "v1": data.coords[0] | 0, "v2": data.coords[1] | 0 }) : "";
        // Stopped until it starts again from the new place: nothing more is saved from the old one.
        GLOBAL.Halt();
        GLOBAL.Message(KEYS.Get("io_t3m_rl_done", { "v1": where }), KEYS.Get("btn_ok"), IoRelocate.Reload);
    }

    private static Reload(): void {
        GAME.ioReload(true);
    }

    /**
     * No answer (QoL #449): the server may well have moved the yard before the line dropped, so "try again" invited
     * a second relocation, and the old yard kept saving over the new one meanwhile. The game stops and reloads to see.
     */
    private static Failed(e: IOErrorEvent): void {
        PLEASEWAIT.Hide();
        GLOBAL.Halt();
        GLOBAL.Message(KEYS.Get("io_t3m_rl_no_answer"), KEYS.Get("io_t3m_rl_reload"), IoRelocate.Reload);
    }
}

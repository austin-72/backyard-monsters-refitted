import { ASObject, int } from "as3";
import { Event, TimerEvent } from "flash/events";
import { Timer } from "flash/utils";
import { GLOBAL, KEYS, URLLoaderApi } from "@game";

/**
 * Inferno-only: the Devil's Arcade's calls to the server (server/src/controllers/arcade, POST arcade). Scores
 * and leaderboards; the live games go through the arcade's socket (ArcadeNet).
 */
export class ARCADE extends ASObject {
    /** The last status answer: {games, records, day, waiting, playing, ...}. */
    public static state: any = null;

    /**
     * Sends an action; onDone gets the answer, or {error: "..."}. (QoL #235: the arcade's own messages in the
     * player's language; one with no answer also says `lost: true`, which ArcadeWindow's SEND AGAIN looks at.)
     */
    public static call(action: string, vars: any[], onDone: Function): void {
        let answered: boolean = false;
        let timeout: Timer = null;
        answered = false;
        timeout = new Timer(30000, 1);
        timeout.addEventListener(TimerEvent.TIMER_COMPLETE, (e: TimerEvent): void => {
            if (!answered) {
                answered = true;
                onDone({ "error": KEYS.Get("io_t3a_no_answer"), "lost": true });
            }
        });
        timeout.start();
        new URLLoaderApi().load(GLOBAL.serverUrl + "arcade", [["action", action]].concat(vars), (r: any): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            if (r && (r.error === 0 || r.error === "0")) {
                onDone(r);
            } else {
                onDone(r && r.error ? { "error": String(r.error) } : { "error": KEYS.Get("io_t3a_no_answer"), "lost": true });
            }
        }, (e: Event): void => {
            if (answered) {
                return;
            }
            answered = true;
            timeout.stop();
            onDone({ "error": KEYS.Get("io_t3a_unreachable") });
        });
    }

    public static status(onDone: Function): void {
        ARCADE.call("status", [], (r: any): void => {
            if (!r.error) {
                ARCADE.state = r;
            }
            onDone(r);
        });
    }

    /** A player's record in a game: {best, best2, runs, wins, losses} or null. */
    public static record(game: string, mode: string): any {
        if (!ARCADE.state || !ARCADE.state.records || !ARCADE.state.records[game]) {
            return null;
        }
        return ARCADE.state.records[game][mode];
    }

    public static board(game: string, mode: string, period: string, onDone: Function): void {
        ARCADE.call("board", [["game", game], ["mode", mode], ["period", period]], onDone);
    }

    /** Inferno-only (QoL #371): the player's place and record on a board: {place, wins, losses, runs, best} (place 0: not on it). */
    public static rank(game: string, mode: string, period: string, onDone: Function): void {
        ARCADE.call("rank", [["game", game], ["mode", mode], ["period", period]], onDone);
    }

    /** A solo run: {run, seed}. */
    public static start(game: string, mode: string, onDone: Function): void {
        ARCADE.call("start", [["game", game], ["mode", mode]], onDone);
    }

    /** A solo run's score (and Flight's path): {score, best, newBest, records} (and, QoL #371, place and placeBefore on its board). */
    public static submit(run: string, score: int, score2: int, ghost: string, onDone: Function): void {
        ARCADE.call("submit", [["run", run], ["score", score], ["score2", score2], ["ghost", ghost ? ghost : ""]], (r: any): void => {
            if (!r.error && ARCADE.state && r.records) {
                ARCADE.state.records = r.records;
            }
            onDone(r);
        });
    }

    public static ghosts(onDone: Function): void {
        ARCADE.call("ghosts", [], onDone);
    }

    public static ticket(onDone: Function): void {
        ARCADE.call("ticket", [], onDone);
    }
}

import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { BASE, CasinoWindow, GLOBAL, SecNum, UI2, URLLoaderApi } from "@game";

/**
 * Inferno-only: the Brimstone Pit's calls to the server (server/src/controllers/casino). The server
 * decides every outcome; the game only shows what comes back. Every bet carries its own request id,
 * so a bet sent twice (a lost answer, a retry) is only played once. Every answer carries the player's
 * Shiny, which the game takes as it is.
 */
export class CASINO extends ASObject {
    /** The last casino/state answer (rules, level, seeds), or null before the first. */
    public static state: any = null;

    private static _counter: int = 0;

    public static readonly MONSTER_NAMES: any = { "spurtz": "Spurtz", "zagnoid": "Zagnoid", "valgos": "Valgos", "malphus": "Malphus", "balthazar": "Balthazar", "grokus": "Grokus", "sabnox": "Sabnox", "wormzer": "King Wormzer" };

    private static url(path: string): string {
        return GLOBAL.serverUrl + "casino/" + path;
    }

    /** A request id no other bet of this player will have. */
    public static newRequestId(): string {
        let chars: string = "0123456789abcdef";
        let s: string = "";
        let i: int = 0;
        while (i < 16) {
            s += chars.charAt((Math.random() * 16) | 0);
            i++;
        }
        ++CASINO._counter;
        return s + "-" + new Date().getTime().toString(36) + "-" + CASINO._counter.toString(36);
    }

    /**
     * Sends a request; onDone gets the answer, or an object with an error message when there was none
     * (a lost connection) or the server refused ({ error: "..." }). Shiny in the answer is taken, except
     * a bet's (takeCredits false: the game shows it when the result is shown).
     */
    private static call(path: string, params: any[], onDone: Function, takeCredits: boolean = true): void {
        new URLLoaderApi().load(CASINO.url(path), params, (response: any): void => {
            if (response == null) {
                onDone({ "error": "The Pit did not answer. Try again." });
                return;
            }
            // (a bet's answer is not shown at once: the game shows the Shiny as its ball lands or its
            // card is scratched, so the top bar does not tell the result first)
            if (response.credits != null && (takeCredits || response.error)) {
                CASINO.setCredits(response.credits | 0);
            }
            if (response.error === 0 || response.error === "0") {
                onDone(response);
            } else {
                onDone({ "error": response.error ? String(response.error) : "Something went wrong in the Pit." });
            }
        }, (e: IOErrorEvent): void => {
            onDone({ "error": "The Pit did not answer. Check your connection and try again." });
        });
    }

    /** The player's Shiny, as the server says, shown at once in the top bar. */
    public static setCredits(credits: int): void {
        if (BASE._credits) {
            BASE._credits.Set(credits);
        } else {
            BASE._credits = new SecNum(credits);
        }
        BASE._hpCredits = credits;
        if (GLOBAL._credits) {
            GLOBAL._credits.Set(credits);
        } else {
            GLOBAL._credits = new SecNum(credits);
        }
        try {
            UI2.Update();
        } catch (e) {
        }
    }

    /** True while a game in the Pit is showing a result: the yard's own updates leave the Shiny to it. */
    public static holdsCredits(): boolean {
        return CasinoWindow.showingResult;
    }

    public static credits(): int {
        return (BASE._credits ? BASE._credits.Get() : 0) | 0;
    }

    public static getState(onDone: Function): void {
        CASINO.call("state", [["t", 1]], (r: any): void => {
            if (!r.error) {
                CASINO.state = r;
                if (r.live) {
                    // the server's clock against ours (the lobby's live lines)
                    CASINO.state.live_offset = Number(r.live.server_ts) - new Date().getTime();
                }
            }
            onDone(r);
        });
    }

    public static history(onDone: Function): void {
        CASINO.call("history", [["limit", 50]], onDone);
    }

    public static rotateSeed(clientSeed: string, onDone: Function): void {
        CASINO.call("seed/rotate", [["client_seed", clientSeed]], (r: any): void => {
            if (!r.error && CASINO.state && CASINO.state.seed) {
                CASINO.state.seed.server_seed_hash = r.server_seed_hash;
                CASINO.state.seed.client_seed = r.client_seed;
                CASINO.state.seed.nonce = r.nonce;
            }
            onDone(r);
        });
    }

    /** One nonce more used on the current seeds (after a bet). */
    private static used(): void {
        if (CASINO.state && CASINO.state.seed) {
            CASINO.state.seed.nonce = (CASINO.state.seed.nonce | 0) + 1;
        }
    }

    public static magmaDrop(bet: int, risk: string, onDone: Function): void {
        CASINO.call("magmadrop/play", [["request_id", CASINO.newRequestId()], ["bet", bet], ["risk", risk]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
            }
            onDone(r);
        }, false);
    }

    /** A Roulette slip: [{on: "spurtz" | "lava" | "ash" | "wormzer" | ..., amount: 5}, ...]. */
    public static roulette(bets: any[], onDone: Function): void {
        CASINO.call("roulette/spin", [["request_id", CASINO.newRequestId()], ["bets", JSON.stringify(bets)]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
            }
            onDone(r);
        }, false);
    }

    public static slots(bet: int, onDone: Function): void {
        CASINO.call("slots/spin", [["request_id", CASINO.newRequestId()], ["bet", bet]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
                if (CASINO.state && r.pool != null) {
                    CASINO.state.jackpot = r.pool;
                }
            }
            onDone(r);
        }, false);
    }

    /** Korath's Fortune: one pull, five lines (the same jackpot pool as the Magma Slots). */
    public static fortune(bet: int, onDone: Function): void {
        CASINO.call("fortune/spin", [["request_id", CASINO.newRequestId()], ["bet", bet]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
                if (CASINO.state && r.pool != null) {
                    CASINO.state.jackpot = r.pool;
                }
            }
            onDone(r);
        }, false);
    }

    /** Moloch's Favor: today's free Magma Slots spin (the answer is a Slots spin). */
    public static favor(onDone: Function): void {
        CASINO.call("favor/spin", [["request_id", CASINO.newRequestId()]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
                if (CASINO.state) {
                    if (r.pool != null) {
                        CASINO.state.jackpot = r.pool;
                    }
                    if (CASINO.state.favor) {
                        CASINO.state.favor.ready = false;
                    }
                }
            }
            onDone(r);
        }, false);
    }

    /** The Live tab: everyone's latest bets, the day's biggest wins, the last jackpots. */
    public static live(onDone: Function): void {
        CASINO.call("live", [["limit", 30]], (r: any): void => {
            if (!r.error && CASINO.state && r.jackpot != null) {
                CASINO.state.jackpot = r.jackpot;
            }
            onDone(r);
        }, false);
    }

    /** Bone Pile: a game started (the bet taken at once). The answer is the game (casino/state's bonepile). */
    public static bonePileStart(bet: int, sabnox: int, onDone: Function): void {
        CASINO.call("bonepile/start", [["request_id", CASINO.newRequestId()], ["bet", bet], ["sabnox", sabnox]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
                if (CASINO.state) {
                    CASINO.state.bonepile = r;
                }
            }
            onDone(r);
        });
    }

    /** Bone Pile: a pile opened (safe, a Sabnox, or every safe pile: paid). */
    public static bonePileReveal(sessionId: int, tile: int, onDone: Function): void {
        CASINO.call("bonepile/reveal", [["session_id", sessionId], ["tile", tile]], (r: any): void => {
            if (!r.error && CASINO.state) {
                CASINO.state.bonepile = r.status == "open" ? r : null;
            }
            onDone(r);
        }, false);
    }

    public static bonePileCashout(sessionId: int, onDone: Function): void {
        CASINO.call("bonepile/cashout", [["session_id", sessionId]], (r: any): void => {
            if (!r.error && CASINO.state) {
                CASINO.state.bonepile = null;
            }
            onDone(r);
        }, false);
    }

    /** Balthazar's Ascent: the round everyone is on (the answer's Shiny is taken: payouts come from the server). */
    public static ascentState(onDone: Function): void {
        CASINO.call("ascent/state", [["t", 1]], onDone);
    }

    /** A bet on the round open for bets; auto 0 for none. */
    public static ascentBet(roundId: int, bet: int, auto: number, onDone: Function): void {
        CASINO.call("ascent/bet", [["request_id", CASINO.newRequestId()], ["round_id", roundId], ["bet", bet], ["auto_cashout", auto > 0 ? auto.toFixed(2) : ""]], onDone);
    }

    public static ascentCashout(roundId: int, onDone: Function): void {
        CASINO.call("ascent/cashout", [["round_id", roundId]], onDone);
    }

    /** Magma Derby: the race everyone is on. */
    public static derbyState(onDone: Function): void {
        CASINO.call("derby/state", [["t", 1]], onDone);
    }

    /** A slip on the race open for bets: [{on: runner id, amount}]. */
    public static derbyBet(roundId: int, bets: any[], onDone: Function): void {
        CASINO.call("derby/bet", [["request_id", CASINO.newRequestId()], ["round_id", roundId], ["bets", JSON.stringify(bets)]], onDone);
    }

    /** A monster's portrait, its white background taken out (casino/monsters/<id>.png). */
    public static monsterKey(id: string): string {
        return "casino/monsters/" + id + ".png";
    }

    public static scratch(tier: string, onDone: Function): void {
        CASINO.call("scratch/buy", [["request_id", CASINO.newRequestId()], ["tier", tier]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
            }
            onDone(r);
        }, false);
    }
}

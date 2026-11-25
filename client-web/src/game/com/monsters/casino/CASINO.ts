import { setTimeout } from "flash/utils";
import { SharedObject } from "flash/net";
import { ASObject, int } from "as3";
import { IOErrorEvent } from "flash/events";
import { BASE, CasinoWindow, GLOBAL, IoShinyLock, KEYS, LOGIN, MESSAGE, SecNum, UI2, URLLoaderApi } from "@game";

// (QoL #235: the Pit's texts in the player's language: keys io_t3c_*, the games' names left as they are)
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
    /**
     * Inferno-only (QoL #383): the Pit remembers each game's settings in this browser, per player: "bet:<game>",
     * "risk" (Magma Drop), "auto:ascent" (cash out at), "auto:dice" (bank after). "" when nothing is kept.
     */
    public static ioRecall(key: string): string {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            let kept: any = so.data["ioPit" + LOGIN._playerID];
            return kept && kept[key] != null ? String(kept[key]) : "";
        } catch (e) {
        }
        return "";
    }

    public static ioRemember(key: string, value: string): void {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            let name: string = "ioPit" + LOGIN._playerID;
            let kept: any = so.data[name] || {};
            if (kept[key] === value) {
                return;
            }
            kept[key] = value;
            so.data[name] = kept;
            so.flush();
        } catch (e) {
        }
    }

    /** QoL #385: the games whose big bet was answered Yes this session (not asked again), by game id. */
    private static _ioBigOk: any = {};

    /** QoL #385: the question showing, while it is up (a second press of Space asks nothing more). */
    private static _ioBigAsk: MESSAGE = null;

    /**
     * Inferno-only (QoL #385): a bet of more than half the player's Shiny, and of 100 or more, is asked about first
     * ("Bet N of your M Shiny?"). After a Yes the bet is placed (`go`: the game's own button again) and that game does
     * not ask again this session. True when it asked: the game stops there and places nothing. The games call it
     * once a bet has passed their "enough Shiny" check, before anything is taken off.
     */
    public static ioAskBig(game: string, bet: int, go: Function): boolean {
        // (Inferno-only, QoL #197: the account's Shiny lock first: a bet over its amount waits for the password, then
        // goes on as the game's own button would send it, asked about as big below if it is)
        if (GLOBAL.INFERNO_ONLY && IoShinyLock.ask(bet, go)) {
            return true;
        }
        if (!GLOBAL.INFERNO_ONLY || CASINO._ioBigOk[game]) {
            return false;
        }
        if (CASINO._ioBigAsk && CASINO._ioBigAsk.parent) {
            return true;
        }
        let have: int = CASINO.credits();
        if (bet < 100 || bet * 2 <= have) {
            return false;
        }
        CASINO._ioBigAsk = GLOBAL.Message(KEYS.Get("io_pit_bigbet_ask", { "v1": GLOBAL.FormatNumber(bet), "v2": GLOBAL.FormatNumber(have) }), KEYS.Get("btn_yes"), (): void => {
            CASINO._ioBigAsk = null;
            CASINO._ioBigOk[game] = true;
            go();
        }, null, KEYS.Get("btn_no"), (): void => {
            CASINO._ioBigAsk = null;
        });
        return true;
    }

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
    private static call(path: string, params: any[], onDone: Function, takeCredits: boolean = true, tries: int = 0): void {
        new URLLoaderApi().load(CASINO.url(path), params, (response: any): void => {
            if (response == null) {
                onDone({ "error": KEYS.Get("io_t3c_no_answer") });
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
                onDone({ "error": response.error ? String(response.error) : KEYS.Get("io_t3c_went_wrong") });
            }
        }, (e: IOErrorEvent): void => {
            // Inferno-only (14 October, QoL #429): a bet whose answer was lost may still have been played. Each
            // bet has its own request_id, which the server answers the same way a second time without playing
            // again, so it is asked again (twice, after 1 s and 2.5 s) before the game gives the bet back on screen.
            let hasId: boolean = params.some((p: any[]): boolean => p && p[0] == "request_id");
            if (hasId && tries < 2) {
                setTimeout((): void => {
                    CASINO.call(path, params, onDone, takeCredits, tries + 1);
                }, tries == 0 ? 1000 : 2500);
                return;
            }
            onDone({ "error": KEYS.Get("io_t3c_no_answer2") });
        });
    }

    /** The player's Shiny, as the server says, shown at once in the top bar. */
    /**
     * An answer that came after its game was closed (9 October): the game no longer shows it, but its Shiny is
     * the server's latest, so the bar is put right (the game had taken the bet off and was to show the rest).
     */
    public static late(r: any): void {
        if (r && !r.error && r.credits != null) {
            CASINO.setCredits(r.credits | 0);
        } else if (r && r.error) {
            // (refused, the game gone: the bet it took off the bar comes back with the server's balance; 9 October)
            CASINO.getState((s: any): void => {
                if (!s.error && s.credits != null) {
                    CASINO.setCredits(s.credits | 0);
                }
            });
        }
    }

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

    /** The player's last 50 bets; Inferno-only (QoL #392): `before`, a bet's id: the 50 before it (the History tab's Older). */
    public static history(onDone: Function, before: number = 0): void {
        let params: any[] = [["limit", 50]];
        if (GLOBAL.INFERNO_ONLY && before > 0) {
            params.push(["before", String(before)]);
        }
        CASINO.call("history", params, onDone);
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

    /** Cinderjack: a hand dealt (the bet taken). The answer is the game (casino/state's blackjack). */
    public static blackjackStart(bet: int, onDone: Function): void {
        CASINO.call("blackjack/start", [["request_id", CASINO.newRequestId()], ["bet", bet]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
                if (CASINO.state) {
                    CASINO.state.blackjack = r.status == "open" ? r : null;
                }
            }
            onDone(r);
        }, false);
    }

    /** Cinderjack: hit, stand, double or split (a double or split takes its stake at once). */
    public static blackjackAct(sessionId: int, action: string, onDone: Function): void {
        CASINO.call("blackjack/act", [["session_id", sessionId], ["action", action]], (r: any): void => {
            if (!r.error && CASINO.state) {
                CASINO.state.blackjack = r.status == "open" ? r : null;
            }
            onDone(r);
        }, false);
    }

    /** Higher or Lower: a game started, its first card shown (the bet taken). */
    public static hiloStart(bet: int, onDone: Function): void {
        CASINO.call("hilo/start", [["request_id", CASINO.newRequestId()], ["bet", bet]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
                if (CASINO.state) {
                    CASINO.state.hilo = r;
                }
            }
            onDone(r);
        }, false);
    }

    /** Higher or Lower: "hi", "lo" or "skip"; the next card. */
    public static hiloGuess(sessionId: int, guess: string, onDone: Function): void {
        CASINO.call("hilo/guess", [["session_id", sessionId], ["guess", guess]], (r: any): void => {
            if (!r.error && CASINO.state) {
                CASINO.state.hilo = r.status == "open" ? r : null;
            }
            onDone(r);
        }, false);
    }

    public static hiloCashout(sessionId: int, onDone: Function): void {
        CASINO.call("hilo/cashout", [["session_id", sessionId]], (r: any): void => {
            if (!r.error && CASINO.state) {
                CASINO.state.hilo = null;
            }
            onDone(r);
        }, false);
    }

    /** The Undertaker's Offer: a game started with the coffin kept (0-11). */
    public static dealStart(bet: int, coffin: int, onDone: Function): void {
        CASINO.call("deal/start", [["request_id", CASINO.newRequestId()], ["bet", bet], ["coffin", coffin]], (r: any): void => {
            if (!r.error) {
                CASINO.used();
                if (CASINO.state) {
                    CASINO.state.deal = r;
                }
            }
            onDone(r);
        }, false);
    }

    /** The Undertaker's Offer: a coffin opened; the round's last brings the Undertaker's offer. */
    public static dealOpen(sessionId: int, coffin: int, onDone: Function): void {
        CASINO.call("deal/open", [["session_id", sessionId], ["coffin", coffin]], (r: any): void => {
            if (!r.error && CASINO.state) {
                CASINO.state.deal = r.status == "open" ? r : null;
            }
            onDone(r);
        }, false);
    }

    /** The Undertaker's Offer: "deal" or "nodeal" to an offer; "keep" or "swap" at the end. */
    public static dealDecide(sessionId: int, choice: string, onDone: Function): void {
        CASINO.call("deal/decide", [["session_id", sessionId], ["choice", choice]], (r: any): void => {
            if (!r.error && CASINO.state) {
                CASINO.state.deal = r.status == "open" ? r : null;
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

    /**
     * Inferno-only (QoL #504): the player's bet on a round that hasn't started taken back ("ascent", "derby" or "dice";
     * on the Derby every slip): {refunded: the Shiny paid back}. The answer's Shiny is taken.
     */
    public static ioTakeBack(game: string, roundId: int, onDone: Function): void {
        CASINO.call(game + "/takeback", [["round_id", roundId]], onDone);
    }

    /** Magma Derby: the race everyone is on. */
    public static derbyState(onDone: Function): void {
        CASINO.call("derby/state", [["t", 1]], onDone);
    }

    /** A slip on the race open for bets: [{on: runner id, amount}]. */
    public static derbyBet(roundId: int, bets: any[], onDone: Function): void {
        CASINO.call("derby/bet", [["request_id", CASINO.newRequestId()], ["round_id", roundId], ["bets", JSON.stringify(bets)]], onDone);
    }

    /** Devil's Dice: a seat at a table (the one asked for if it has room; 0: any). {table} */
    public static diceSit(table: int, onDone: Function): void {
        CASINO.call("dice/sit", [["table", table > 0 ? String(table) : ""]], onDone);
    }

    public static diceLeave(onDone: Function): void {
        CASINO.call("dice/leave", [["t", 1]], onDone);
    }

    /** The table and its round (keeps the seat). */
    public static diceState(table: int, onDone: Function): void {
        CASINO.call("dice/state", [["table", table]], onDone);
    }

    /** A bet on the table's round, banked by hand (auto 0) or after `auto` safe throws. */
    public static diceBet(roundId: int, bet: int, auto: int, onDone: Function): void {
        CASINO.call("dice/bet", [["request_id", CASINO.newRequestId()], ["round_id", roundId], ["bet", bet], ["auto", auto > 0 ? String(auto) : ""]], onDone);
    }

    /** Banks now (the server's clock decides how many throws are done). */
    public static diceBank(roundId: int, onDone: Function): void {
        CASINO.call("dice/bank", [["round_id", roundId]], onDone);
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

package com.monsters.casino {
    import com.cc.utils.SecNum;
    import flash.events.IOErrorEvent;

    /**
     * Inferno-only: the Brimstone Pit's calls to the server (server/src/controllers/casino). The server
     * decides every outcome; the game only shows what comes back. Every bet carries its own request id,
     * so a bet sent twice (a lost answer, a retry) is only played once. Every answer carries the player's
     * Shiny, which the game takes as it is.
     */
    public class CASINO {

        /** The last casino/state answer (rules, level, seeds), or null before the first. */
        public static var state:Object = null;

        private static var _counter:int = 0;

        private static function url(path:String):String {
            return GLOBAL.serverUrl + "casino/" + path;
        }

        /** A request id no other bet of this player will have. */
        public static function newRequestId():String {
            var chars:String = "0123456789abcdef";
            var s:String = "";
            var i:int = 0;
            while (i < 16) {
                s += chars.charAt(int(Math.random() * 16));
                i++;
            }
            ++_counter;
            return s + "-" + new Date().getTime().toString(36) + "-" + _counter.toString(36);
        }

        /**
         * Sends a request; onDone gets the answer, or an object with an error message when there was none
         * (a lost connection) or the server refused ({ error: "..." }). Shiny in the answer is taken, except
         * a bet's (takeCredits false: the game shows it when the result is shown).
         */
        private static function call(path:String, params:Array, onDone:Function, takeCredits:Boolean = true):void {
            new URLLoaderApi().load(url(path), params, function(response:Object):void {
                    if (response == null) {
                        onDone({"error": "The Pit did not answer. Try again."});
                        return;
                    }
                    // (a bet's answer is not shown at once: the game shows the Shiny as its ball lands or its
                    // card is scratched, so the top bar does not tell the result first)
                    if (response.credits != null && (takeCredits || response.error)) {
                        setCredits(int(response.credits));
                    }
                    if (response.error === 0 || response.error === "0") {
                        onDone(response);
                    }
                    else {
                        onDone({"error": response.error ? String(response.error) : "Something went wrong in the Pit."});
                    }
                }, function(e:IOErrorEvent):void {
                    onDone({"error": "The Pit did not answer. Check your connection and try again."});
                });
        }

        /** The player's Shiny, as the server says, shown at once in the top bar. */
        public static function setCredits(credits:int):void {
            if (BASE._credits) {
                BASE._credits.Set(credits);
            }
            else {
                BASE._credits = new SecNum(credits);
            }
            BASE._hpCredits = credits;
            if (GLOBAL._credits) {
                GLOBAL._credits.Set(credits);
            }
            else {
                GLOBAL._credits = new SecNum(credits);
            }
            try {
                UI2.Update();
            }
            catch (e:Error) {
            }
        }

        /** True while a game in the Pit is showing a result: the yard's own updates leave the Shiny to it. */
        public static function holdsCredits():Boolean {
            return CasinoWindow.showingResult;
        }

        public static function credits():int {
            return BASE._credits ? BASE._credits.Get() : 0;
        }

        public static function getState(onDone:Function):void {
            call("state", [["t", 1]], function(r:Object):void {
                    if (!r.error) {
                        state = r;
                        if (r.live) {
                            // the server's clock against ours (the lobby's live lines)
                            state.live_offset = Number(r.live.server_ts) - new Date().getTime();
                        }
                    }
                    onDone(r);
                });
        }

        public static function history(onDone:Function):void {
            call("history", [["limit", 50]], onDone);
        }

        public static function rotateSeed(clientSeed:String, onDone:Function):void {
            call("seed/rotate", [["client_seed", clientSeed]], function(r:Object):void {
                    if (!r.error && state && state.seed) {
                        state.seed.server_seed_hash = r.server_seed_hash;
                        state.seed.client_seed = r.client_seed;
                        state.seed.nonce = r.nonce;
                    }
                    onDone(r);
                });
        }

        /** One nonce more used on the current seeds (after a bet). */
        private static function used():void {
            if (state && state.seed) {
                state.seed.nonce = int(state.seed.nonce) + 1;
            }
        }

        public static function magmaDrop(bet:int, risk:String, onDone:Function):void {
            call("magmadrop/play", [["request_id", newRequestId()], ["bet", bet], ["risk", risk]], function(r:Object):void {
                    if (!r.error) {
                        used();
                    }
                    onDone(r);
                }, false);
        }

        /** A Roulette slip: [{on: "spurtz" | "lava" | "ash" | "wormzer" | ..., amount: 5}, ...]. */
        public static function roulette(bets:Array, onDone:Function):void {
            call("roulette/spin", [["request_id", newRequestId()], ["bets", JSON.stringify(bets)]], function(r:Object):void {
                    if (!r.error) {
                        used();
                    }
                    onDone(r);
                }, false);
        }

        public static function slots(bet:int, onDone:Function):void {
            call("slots/spin", [["request_id", newRequestId()], ["bet", bet]], function(r:Object):void {
                    if (!r.error) {
                        used();
                        if (state && r.pool != null) {
                            state.jackpot = r.pool;
                        }
                    }
                    onDone(r);
                }, false);
        }

        /** Korath's Fortune: one pull, five lines (the same jackpot pool as the Magma Slots). */
        public static function fortune(bet:int, onDone:Function):void {
            call("fortune/spin", [["request_id", newRequestId()], ["bet", bet]], function(r:Object):void {
                    if (!r.error) {
                        used();
                        if (state && r.pool != null) {
                            state.jackpot = r.pool;
                        }
                    }
                    onDone(r);
                }, false);
        }

        /** Moloch's Favor: today's free Magma Slots spin (the answer is a Slots spin). */
        public static function favor(onDone:Function):void {
            call("favor/spin", [["request_id", newRequestId()]], function(r:Object):void {
                    if (!r.error) {
                        used();
                        if (state) {
                            if (r.pool != null) {
                                state.jackpot = r.pool;
                            }
                            if (state.favor) {
                                state.favor.ready = false;
                            }
                        }
                    }
                    onDone(r);
                }, false);
        }

        /** The Live tab: everyone's latest bets, the day's biggest wins, the last jackpots. */
        public static function live(onDone:Function):void {
            call("live", [["limit", 30]], function(r:Object):void {
                    if (!r.error && state && r.jackpot != null) {
                        state.jackpot = r.jackpot;
                    }
                    onDone(r);
                }, false);
        }

        /** Bone Pile: a game started (the bet taken at once). The answer is the game (casino/state's bonepile). */
        public static function bonePileStart(bet:int, sabnox:int, onDone:Function):void {
            call("bonepile/start", [["request_id", newRequestId()], ["bet", bet], ["sabnox", sabnox]], function(r:Object):void {
                    if (!r.error) {
                        used();
                        if (state) {
                            state.bonepile = r;
                        }
                    }
                    onDone(r);
                });
        }

        /** Bone Pile: a pile opened (safe, a Sabnox, or every safe pile: paid). */
        public static function bonePileReveal(sessionId:int, tile:int, onDone:Function):void {
            call("bonepile/reveal", [["session_id", sessionId], ["tile", tile]], function(r:Object):void {
                    if (!r.error && state) {
                        state.bonepile = r.status == "open" ? r : null;
                    }
                    onDone(r);
                }, false);
        }

        public static function bonePileCashout(sessionId:int, onDone:Function):void {
            call("bonepile/cashout", [["session_id", sessionId]], function(r:Object):void {
                    if (!r.error && state) {
                        state.bonepile = null;
                    }
                    onDone(r);
                }, false);
        }

        /** Balthazar's Ascent: the round everyone is on (the answer's Shiny is taken: payouts come from the server). */
        public static function ascentState(onDone:Function):void {
            call("ascent/state", [["t", 1]], onDone);
        }

        /** A bet on the round open for bets; auto 0 for none. */
        public static function ascentBet(roundId:int, bet:int, auto:Number, onDone:Function):void {
            call("ascent/bet", [["request_id", newRequestId()], ["round_id", roundId], ["bet", bet], ["auto_cashout", auto > 0 ? auto.toFixed(2) : ""]], onDone);
        }

        public static function ascentCashout(roundId:int, onDone:Function):void {
            call("ascent/cashout", [["round_id", roundId]], onDone);
        }

        /** Magma Derby: the race everyone is on. */
        public static function derbyState(onDone:Function):void {
            call("derby/state", [["t", 1]], onDone);
        }

        /** A slip on the race open for bets: [{on: runner id, amount}]. */
        public static function derbyBet(roundId:int, bets:Array, onDone:Function):void {
            call("derby/bet", [["request_id", newRequestId()], ["round_id", roundId], ["bets", JSON.stringify(bets)]], onDone);
        }

        /** A monster's portrait, its white background taken out (casino/monsters/<id>.png). */
        public static function monsterKey(id:String):String {
            return "casino/monsters/" + id + ".png";
        }

        public static const MONSTER_NAMES:Object = {"spurtz": "Spurtz", "zagnoid": "Zagnoid", "valgos": "Valgos", "malphus": "Malphus", "balthazar": "Balthazar", "grokus": "Grokus", "sabnox": "Sabnox", "wormzer": "King Wormzer"};

        public static function scratch(tier:String, onDone:Function):void {
            call("scratch/buy", [["request_id", newRequestId()], ["tier", tier]], function(r:Object):void {
                    if (!r.error) {
                        used();
                    }
                    onDone(r);
                }, false);
        }
    }
}

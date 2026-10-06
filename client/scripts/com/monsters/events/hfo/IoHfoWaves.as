package com.monsters.events.hfo {
    import com.monsters.managers.InstanceManager;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.pathing.PATHING;
    import flash.events.Event;
    import flash.geom.Point;
    import flash.geom.Rectangle;

    /**
     * Hell Freezes Over: the 13 waves of ice cretins, fought in the player's main yard like a wild monster attack
     * (WMATTACK runs the fight: the warning bar, the panic music, the yard's own defences and monsters).
     *
     *  - The server counts the tries (3 a wave, counted when a wave starts: hfo/wavestart) and pays the shiny
     *    (hfo/waveend). A skipped wave can be replayed any time, for no tries and no pay.
     *  - Won: every ice cretin gone (the Hulks' Shivlings too). Lost: 99% or more of the yard destroyed, or the
     *    Surrender button. Wild attacks wait while a wave is on (it is the yard's attack).
     *  - Nothing is repaired for free: damaged buildings start their usual repair afterwards, and monsters lost
     *    defending stay lost.
     *  - The Compound is frozen solid while a wave is on (the user's call, 1 October): an ice block over it, and
     *    none of its monsters comes out to fight (HOUSINGBUNKER asks compoundFrozen). It thaws when the wave ends.
     *    The monsters pacing inside are frozen too (MonsterBase.tick: no moving, no animation) and the ice is drawn
     *    over them (4 October).
     *  - The heat comes back for the stragglers: MELT_AFTER seconds of fighting after the last surge, the ice
     *    cretins still standing start melting (MELT_PER_SECOND of their health a second). A Sleetwing pecking at
     *    a tower out of every anti-air tower's reach kept a wave going for over ten minutes (the balance runs,
     *    1 October); now no wave outlasts its last surge by more than about three minutes.
     *
     * The waves are set for an Inferno Under Hall of level 6 (the user's call, 1 October), not scaled. Each comes
     * in surges a few seconds apart; waves 1-4 come from one side, 5-9 from two and 10-13 from all four.
     */
    public class IoHfoWaves {

        public static const S:String = "IC26"; // Shivling

        public static const G:String = "IC27"; // Slushgut

        public static const R:String = "IC28"; // Rimeclaw

        public static const W:String = "IC29"; // Sleetwing

        public static const H:String = "IC30"; // Hailspitter

        public static const P:String = "IC31"; // Permafrost Hulk

        /**
         * Each wave: its surges [seconds after the start, [[monster, how many, side], ...]]. Sides 0-3 are a
         * quarter turn apart, from a direction picked at random for each attempt.
         * (Every count doubled on 1 October, the user's call after the balance runs: a maxed Under Hall 6 yard lost
         * at most 12% of itself to the first table.)
         */
        public static const WAVES:Array = [
                // 1: the swarm
                [[0, [[S, 32, 0]]]],
                // 2: the tanks arrive
                [[0, [[S, 32, 0], [G, 6, 0]]]],
                // 3: the tower hunters
                [[0, [[S, 24, 0], [R, 16, 0]]]],
                // 4
                [[0, [[G, 8, 0], [R, 20, 0]]]],
                // 5: over the walls, from two sides
                [[0, [[S, 40, 0], [W, 16, 2]]]],
                // 6: the hail
                [[0, [[G, 12, 0], [H, 20, 2]]]],
                // 7
                [[0, [[R, 24, 0], [W, 20, 2]]], [20, [[H, 16, 0]]]],
                // 8: the first Hulk
                [[0, [[S, 30, 0], [S, 30, 2]]], [15, [[P, 2, 0]]]],
                // 9
                [[0, [[G, 16, 0], [H, 24, 2]]], [20, [[W, 24, 0]]]],
                // 10: from every side
                [[0, [[R, 14, 0], [R, 14, 2], [H, 20, 1]]], [20, [[P, 2, 1], [P, 2, 3]]]],
                // 11
                [[0, [[S, 40, 0], [S, 40, 2], [W, 32, 1]]], [20, [[G, 8, 1], [G, 8, 3]]]],
                // 12
                [[0, [[R, 16, 0], [R, 16, 2], [H, 28, 1]]], [20, [[W, 24, 3], [P, 2, 0]]], [40, [[P, 4, 2]]]],
                // 13: The Deep Freeze
                [[0, [[S, 50, 0], [S, 50, 2], [R, 16, 1], [R, 16, 3]]], [25, [[G, 10, 0], [G, 10, 2], [H, 16, 1], [H, 16, 3], [W, 16, 0], [W, 16, 2]]], [55, [[P, 4, 1], [P, 4, 3]]]]
            ];

        /** Every group's count is multiplied by this (1: the table as it is; the balance runs try more). */
        public static var countScale:Number = 1;

        /** Seconds of fighting after the last surge before the stragglers start to melt. */
        public static const MELT_AFTER:int = 120;

        /** How much of its health a melting ice cretin loses each second (all of it in 50 seconds). */
        public static const MELT_PER_SECOND:Number = 0.02;

        /** Lost at this much of the yard destroyed. */
        public static const LOSE_PERCENT:int = 99;

        private static var _fight:Object = null;

        private static var _surges:Array = [];

        /** The wave's fighting time, in simulation steps (GLOBAL's fast tickables). */
        private static var _clock:IoHfoStepClock = null;

        private static var _dir:Number = 0;

        private static var _ending:Boolean = false;

        private static var _checks:int = 0;

        /** The ice blocks over the Compounds (IoHfoArt.towerIceOn handles). */
        private static var _compoundIce:Array = [];

        /** When the last surge came (fighting seconds), or NaN while surges are still to come. */
        private static var _lastSurgeAt:Number = NaN;

        /** Seconds of melting dealt so far. */
        private static var _melted:int = 0;

        public static function get running():Boolean {
            return _fight != null;
        }

        /** The Compound is sealed in ice: its monsters stay in (from the wave's start until it is over). */
        public static function get compoundFrozen():Boolean {
            return _fight != null;
        }

        private static function freezeCompounds():void {
            thawCompounds(false);
            for each (var o:Object in InstanceManager.getInstancesByClass(HOUSINGBUNKER)) {
                var b:HOUSINGBUNKER = o as HOUSINGBUNKER;
                if (!b || b.health <= 0) {
                    continue;
                }
                var fp:Rectangle = b._footprint && b._footprint.length ? b._footprint[0] as Rectangle : null;
                // (the big block is made for a 120-wide bunker: the Compound is 160)
                // (over the monsters pacing inside it too: they are down to 120 below its top, HOUSING.PointInHouse)
                var handle:Object = IoHfoArt.towerIceOn(b, fp ? Math.max(1, fp.width / 120) : 1, 135);
                if (handle) {
                    _compoundIce.push(handle);
                }
            }
        }

        private static function thawCompounds(shatter:Boolean):void {
            for each (var handle:Object in _compoundIce) {
                IoHfoArt.towerIceOff(handle, shatter);
            }
            _compoundIce = [];
            // and any tower an ice monster left iced: its wait only runs down while there are monsters about, so
            // with the wave over it would stay iced
            for each (var o:Object in InstanceManager.getInstancesByClass(BTOWER)) {
                var t:BTOWER = o as BTOWER;
                if (t && t.ioIced) {
                    t.ioIceBreak(shatter);
                }
            }
        }

        /** Fights `wave` (the current one, or a skipped one again). */
        public static function Start(wave:int):void {
            if (_fight || _ending) {
                return;
            }
            if (!IoHfo.inYard()) {
                return;
            }
            if (WMATTACK._inProgress || BASE.ioAttackRunning()) {
                GLOBAL.Message(KEYS.Get("hfo_err_attack"));
                return;
            }
            PLEASEWAIT.Show(KEYS.Get("msg_loading"));
            IoHfo.call("wavestart", [["wave", wave]], function(r:Object):void {
                    PLEASEWAIT.Hide();
                    if (!IoHfo.inYard() || WMATTACK._inProgress) {
                        return;
                    }
                    begin(r.fight);
                }, function():void {
                    PLEASEWAIT.Hide();
                });
        }

        private static function begin(fight:Object):void {
            _fight = fight;
            _ending = false;
            _checks = 0;
            _lastSurgeAt = NaN;
            _melted = 0;
            _surges = (WAVES[Math.max(0, Math.min(WAVES.length, int(fight.wave)) - 1)] as Array).concat();
            if (_clock) {
                GLOBAL.removeFastTickable(_clock);
            }
            _clock = new IoHfoStepClock();
            GLOBAL.addFastTickable(_clock);
            _dir = Math.random() * 360;
            IoHfoUi.CloseWindow();
            WMATTACK.HideWarning();
            if (UI2._wildMonsterBar) {
                UI2.Hide("wmbar");
            }
            PATHING.ResetCosts();
            WMATTACK._isAI = false;
            WMATTACK.AttackB();
            WMATTACK.AttackC();
            SOUNDS.PlayMusic("musicipanic");
            UI2._warning.Update("<font size=\"28\">" + KEYS.Get("hfo_hud_wave", {"v1": int(fight.wave)}) + "</font>");
            UI2.Show("surrender");
            if (UI2._scareAway) {
                UI2._scareAway.addEventListener("scareAway", surrender);
            }
            WMATTACK.setEnd(allGone);
            WMATTACK._inProgress = true;
            freezeCompounds();
            BASE._blockSave = false;
            surgeDue(true);
        }

        /** Each frame from IoHfo: surges as they come, and the yard's state. */
        public static function Tick():void {
            if (!_fight || _ending) {
                return;
            }
            surgeDue(false);
            melt();
            if (++_checks % 20 == 0) {
                // (watching a wave is playing: the "Anyone home?" stop after 10 minutes without a touch would
                // throw the wave away, and the invite popup at 6 would land on the battle)
                GLOBAL.UpdateAFKTimer();
                if (destroyedPercent() >= LOSE_PERCENT) {
                    finish(false);
                }
            }
        }

        private static function surgeDue(first:Boolean):void {
            var seconds:Number = _clock ? _clock.seconds : 0;
            while (_surges.length && (first || Number(_surges[0][0]) <= seconds)) {
                spawn(_surges.shift()[1] as Array);
                first = false;
                if (!_surges.length) {
                    _lastSurgeAt = seconds;
                }
            }
        }

        /** The stragglers melt: MELT_AFTER seconds after the last surge, a bite of their health each second. */
        private static function melt():void {
            if (isNaN(_lastSurgeAt) || !_clock) {
                return;
            }
            var due:int = int(_clock.seconds - _lastSurgeAt - MELT_AFTER);
            if (due <= _melted) {
                return;
            }
            if (_melted == 0) {
                UI2._warning.Update("<font size=\"22\">" + KEYS.Get("hfo_hud_melting") + "</font>");
            }
            while (_melted < due) {
                _melted++;
                for each (var c:Object in CREEPS._creeps) {
                    var m:MonsterBase = c as MonsterBase;
                    if (m && m.health > 0 && CREATURELOCKER.HFO_CRETINS.indexOf(m._creatureID) != -1) {
                        m.modifyHealth(-Math.max(1, Math.ceil(m.maxHealth * MELT_PER_SECOND)));
                    }
                }
            }
        }

        private static function spawn(groups:Array):void {
            var focus:Boolean = true;
            for each (var g:Array in groups) {
                var angle:Number = (_dir + int(g[2]) * 90) * 0.0174532925;
                var dist:Number = 800 + 125;
                var at:Point = GRID.ToISO(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
                var made:Array = WMATTACK.SpawnCreep(at, 250, String(g[0]), Math.max(1, Math.round(int(g[1]) * countScale)), "bounce", 1);
                if (focus && made.length) {
                    focus = false;
                    MAP.FocusTo(MonsterBase(made[0]).x, MonsterBase(made[0]).y, 1);
                }
            }
        }

        /** WMATTACK: no attacker left. The next surge comes now, or the wave is won. */
        private static function allGone():void {
            if (!_fight || _ending) {
                WMATTACK.CleanUpLite();
                return;
            }
            if (_surges.length) {
                // (all gone before the next surge was due: it comes now, and the ones after keep their gaps)
                var surge:Array = _surges.shift() as Array;
                spawn(surge[1] as Array);
                if (_clock) {
                    _clock.steps = int(Number(surge[0]) * IoHfoStepClock.STEPS_A_SECOND);
                    if (!_surges.length) {
                        _lastSurgeAt = _clock.seconds;
                    }
                }
                return;
            }
            finish(true);
        }

        private static function surrender(e:Event = null):void {
            if (UI2._scareAway) {
                UI2._scareAway.removeEventListener("scareAway", surrender);
            }
            finish(false);
        }

        /** How much of the yard is destroyed (walls and traps aside), as a percent. */
        public static function destroyedPercent():int {
            var health:Number = 0;
            var max:Number = 0;
            for each (var o:Object in InstanceManager.getInstancesByClass(BFOUNDATION)) {
                var b:BFOUNDATION = o as BFOUNDATION;
                if (!b || b is BMUSHROOM || b._class == "wall" || b._class == "trap" || b._class == "decoration" || b._class == "enemy" || b._class == "immovable") {
                    continue;
                }
                health += Math.max(0, b.health);
                max += b.maxHealth;
            }
            return max > 0 ? int(100 - 100 * health / max) : 0;
        }

        private static function finish(won:Boolean):void {
            if (!_fight || _ending) {
                return;
            }
            _ending = true;
            stopClock();
            thawCompounds(true);
            var fight:Object = _fight;
            if (!won) {
                // the ice cretins go back to the frozen wastes
                for each (var c:Object in CREEPS._creeps) {
                    try {
                        MonsterBase(c).changeModeRetreat();
                    }
                    catch (e:Error) {
                    }
                }
            }
            WMATTACK.setEnd();
            WMATTACK.CleanUpLite();
            UI2.Hide("surrender");
            IoHfo.call("waveend", [["wave", int(fight.wave)], ["id", int(fight.id)], ["won", won ? "1" : "0"]], function(r:Object):void {
                    _fight = null;
                    _ending = false;
                    if (r.credits != null && Number(r.paid) > 0) {
                        BASE._credits.Set(int(r.credits));
                        BASE._hpCredits = int(r.credits);
                        GLOBAL._credits.Set(int(r.credits));
                    }
                    IoHfo.TombUpdate();
                    IoHfoUi.Hud();
                    IoHfoUi.WaveResult(r);
                }, function():void {
                    _fight = null;
                    _ending = false;
                });
        }

        private static function stopClock():void {
            if (_clock) {
                GLOBAL.removeFastTickable(_clock);
                _clock = null;
            }
        }

        /** How long the wave has been fought, in seconds of game time (the simulation's 80 steps a second). */
        public static function get fightSeconds():Number {
            return _clock ? _clock.seconds : 0;
        }

        /** The yard is leaving in the middle of a wave (it counts as lost: the server settles it). */
        public static function Abandon():void {
            stopClock();
            thawCompounds(false);
            _fight = null;
            _ending = false;
            _surges = [];
        }
    }
}

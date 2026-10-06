package com.monsters.replays {
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.champions.ChampionBase;
    import flash.events.IOErrorEvent;
    import flash.filters.GlowFilter;
    import flash.utils.Dictionary;

    /**
     * Inferno-only: records a player-versus-player attack for its replay (server: services/replays/replays.ts).
     *
     * The attack's load says to (io_replay: {key, rec}); from then on, four times a second of game time (every
     * STEPS steps of the 80-a-second simulation), it notes every monster on the field (the attacker's, the yard's,
     * the champions) and every building: only what changed since the last note, to keep it small. The notes go to
     * the server in parts every 30 seconds and when the attack is over (the yard is left), the last part saying
     * so. The yard itself (its buildings as they were) the server took when the attack began.
     *
     * A sample: [t, monsters, buildings, damage% (null: unchanged), extras]; extras (4 October, only when there are
     * any): {e: [the catapult's shots], g: [[uid, glows or 0], ...] (a monster's glows when they change: [[colour,
     * alpha %, blur, strength], ...], from its filters)}. A shot: ["b", x, y, radius, particles, resource, group]
     * (a bomb), ["j", x, y, radius, seconds] (Candy Jars), ["d", x, y, radius, fuse] (Marilyn). A monster: [uid, x,
     * y, hp%] where it is now on the map, with
     * its height ([.., alt]) if it flies and a 1 last ([.., alt, 1]) when it had been standing still until the
     * sample before (so the replay doesn't slide it there slowly); [uid] when it is gone. A building: [id, hp%].
     * A monster is described once, when first seen: [uid, monster, side (1: the yard's), kind (0: drawn by its own
     * class, 1: a champion drawn from its sprite: then sprite, x and y offsets), level].
     */
    public class IoReplayRecorder {

        /** Game steps between samples (80 a second: 4 samples a second). */
        public static const STEPS:int = 20;

        public static const RATE:int = 4;

        /** Samples per part sent (30 seconds). */
        private static const PART:int = 120;

        /** At most this many samples in all (20 minutes): an attack left open isn't recorded for ever. */
        private static const MAX_SAMPLES:int = 4800;

        private static var _key:String = null;

        private static var _steps:int = 0;

        private static var _t:int = 0;

        private static var _seq:int = 0;

        private static var _uids:Dictionary = new Dictionary(true);

        private static var _nextUid:int = 1;

        /** uid -> [x, y, hp, alt, t last noted, t last changed]. */
        private static var _last:Object = {};

        private static var _buildings:Object = {};

        private static var _damage:int = -1;

        private static var _defs:Array = [];

        private static var _samples:Array = [];

        /** The catapult's shots since the last sample. */
        private static var _shots:Array = [];

        /** uid -> its glows as last noted (JSON). */
        private static var _glows:Object = {};

        public function IoReplayRecorder() {
            super();
        }

        public static function get recording():Boolean {
            return _key != null;
        }

        public static function get key():String {
            return _key;
        }

        /** The attack's yard is built (BASE): its replay starts. */
        public static function begin(key:String):void {
            stop(false);
            if (!GLOBAL.INFERNO_ONLY || !key) {
                return;
            }
            _key = key;
            _steps = 0;
            _t = 0;
            _seq = 0;
            _uids = new Dictionary(true);
            _nextUid = 1;
            _last = {};
            _buildings = {};
            _damage = -1;
            _defs = [];
            _samples = [];
            _shots = [];
            _glows = {};
            sample();
        }

        /**
         * The catapult fired (ResourceBombs.BombDrop): noted with the next sample, so the replay throws it too (only
         * its picture: what it did to the yard is in the buildings' and monsters' health).
         */
        public static function shot(bomb:Object, x:Number, y:Number):void {
            if (!_key || !bomb) {
                return;
            }
            if (bomb.kind == "decoy") {
                _shots.push(["d", int(x), int(y), int(bomb.radius) || 0, Number(bomb.fuse) || 0]);
            }
            else if (bomb.kind == "jars") {
                _shots.push(["j", int(x), int(y), int(bomb.radius) || 0, Number(bomb.seconds) || 0]);
            }
            else {
                _shots.push(["b", int(x), int(y), int(bomb.radius) || 0, int(bomb.particles) || 1, int(bomb.resource) || 1, int(bomb.group)]);
            }
        }

        /** A monster's glows (its GlowFilters, on its picture or on itself): [[colour, alpha %, blur, strength], ...]. */
        private static function glowsOf(m:MonsterBase):Array {
            var out:Array = [];
            var lists:Array = [];
            try {
                if (m._graphicMC && m._graphicMC.filters) {
                    lists.push(m._graphicMC.filters);
                }
                if (m.graphic && m.graphic.filters) {
                    lists.push(m.graphic.filters);
                }
            }
            catch (e:Error) {
            }
            for each (var list:Array in lists) {
                for each (var f:* in list) {
                    if (f is GlowFilter) {
                        var g:GlowFilter = GlowFilter(f);
                        out.push([g.color, Math.round(g.alpha * 100), Math.round(g.blurX), Math.round(g.strength * 10) / 10]);
                    }
                }
            }
            return out;
        }

        /** Every game step (GLOBAL): a sample every STEPS steps. */
        public static function step():void {
            if (!_key) {
                return;
            }
            if (++_steps < STEPS) {
                return;
            }
            _steps = 0;
            if (_t >= MAX_SAMPLES) {
                stop(true);
                return;
            }
            sample();
            if (_samples.length >= PART) {
                send(false);
            }
        }

        /** The attack is over or its yard is going (BASE.Cleanup): what is left is sent, the last part. */
        public static function stop(final:Boolean = true):void {
            if (!_key) {
                return;
            }
            if (final) {
                sample(); // (how it was at the end)
                send(true);
            }
            _key = null;
        }

        private static function uidOf(m:Object):int {
            var uid:* = _uids[m];
            if (uid == null) {
                uid = _nextUid++;
                _uids[m] = uid;
                var creature:MonsterBase = m as MonsterBase;
                var side:int = creature._friendly ? 1 : 0;
                if (m is ChampionBase) {
                    var champion:ChampionBase = ChampionBase(m);
                    _defs.push([uid, String(champion._creatureID), side, 1, String(champion._spriteID), champion._graphicMC ? int(champion._graphicMC.x) : -26, champion._graphicMC ? int(champion._graphicMC.y) : -36]);
                }
                else {
                    _defs.push([uid, String(creature._creatureID), side, 0, levelOf(creature)]);
                }
            }
            return int(uid);
        }

        /** The level a monster was made at: its health is one level's of its table (as the classes work it out). */
        private static function levelOf(m:MonsterBase):int {
            var c:Object = CREATURELOCKER._creatures[m._creatureID];
            var table:Array = c && c.props ? c.props.health as Array : null;
            var i:int = table ? table.indexOf(m.maxHealth) : -1;
            return i >= 0 ? i + 1 : 1;
        }

        private static function monsters():Array {
            var out:Array = [];
            var seen:Dictionary = new Dictionary(true);
            var m:Object = null;
            for each (m in CREEPS._creeps) {
                if (m && !seen[m]) {
                    seen[m] = true;
                    out.push(m);
                }
            }
            for each (m in CREATURES._creatures) {
                if (m && !seen[m]) {
                    seen[m] = true;
                    out.push(m);
                }
            }
            for each (m in CREEPS._guardianList) {
                if (m && !seen[m]) {
                    seen[m] = true;
                    out.push(m);
                }
            }
            for each (m in CREATURES._guardianList) {
                if (m && !seen[m]) {
                    seen[m] = true;
                    out.push(m);
                }
            }
            return out;
        }

        private static function sample():void {
            var changed:Array = [];
            var glowChanges:Array = [];
            var here:Object = {};
            for each (var o:Object in monsters()) {
                var m:MonsterBase = o as MonsterBase;
                if (!m || !m._tmpPoint || m.health <= 0) {
                    continue;
                }
                var uid:int = uidOf(m);
                here[uid] = true;
                var glows:Array = glowsOf(m);
                var glowKey:String = glows.length ? JSON.stringify(glows) : "";
                if ((_glows[uid] || "") != glowKey) {
                    _glows[uid] = glowKey;
                    glowChanges.push([uid, glows.length ? glows : 0]);
                }
                var x:int = int(m._tmpPoint.x);
                var y:int = int(m._tmpPoint.y);
                var hp:int = Math.max(1, Math.round(100 * m.health / Math.max(1, m.maxHealth)));
                var alt:int = int(m._altitude);
                var last:Array = _last[uid] as Array;
                if (last && last[0] == x && last[1] == y && last[2] == hp && last[3] == alt) {
                    continue;
                }
                // (still since an earlier sample: the replay holds it there until the one before this)
                var hold:int = last && int(last[5]) < _t - 1 ? 1 : 0;
                changed.push(hold ? [uid, x, y, hp, alt, 1] : (alt ? [uid, x, y, hp, alt] : [uid, x, y, hp]));
                _last[uid] = [x, y, hp, alt, _t, _t];
            }
            for (var id:String in _last) {
                if (!here[id]) {
                    changed.push([int(id)]);
                    delete _last[id];
                }
            }
            var walls:Array = [];
            for each (var b:BFOUNDATION in BASE._buildingsAll) {
                if (!b || b.maxHealth <= 0) {
                    continue;
                }
                var bhp:int = b.health <= 0 ? 0 : Math.max(1, Math.round(100 * b.health / b.maxHealth));
                if (_buildings[b._id] !== bhp) {
                    if (_buildings[b._id] != null || bhp < 100) {
                        walls.push([b._id, bhp]);
                    }
                    _buildings[b._id] = bhp;
                }
            }
            var damage:int = int(BASE._percentDamaged);
            var entry:Array = [_t, changed, walls];
            var extras:Object = null;
            if (_shots.length || glowChanges.length) {
                extras = {};
                if (_shots.length) {
                    extras.e = _shots;
                    _shots = [];
                }
                if (glowChanges.length) {
                    extras.g = glowChanges;
                }
            }
            if (damage != _damage || extras) {
                entry.push(damage != _damage ? damage : null);
                _damage = damage;
            }
            if (extras) {
                entry.push(extras);
            }
            _samples.push(entry);
            ++_t;
        }

        private static function send(final:Boolean):void {
            var key:String = _key;
            var part:Object = {"seq": _seq, "rate": RATE, "d": _defs, "s": _samples};
            var params:Array = [["key", key], ["seq", _seq], ["data", JSON.stringify(part)], ["final", final ? 1 : 0], ["duration", int(_t / RATE)], ["damage", _damage < 0 ? 0 : _damage]];
            ++_seq;
            _defs = [];
            _samples = [];
            new URLLoaderApi().load(GLOBAL.serverUrl + "replays/chunk", params, function(response:Object):void {
                    // (nothing to do: a part lost is a gap in the replay)
                }, function(e:IOErrorEvent):void {
                });
        }
    }
}

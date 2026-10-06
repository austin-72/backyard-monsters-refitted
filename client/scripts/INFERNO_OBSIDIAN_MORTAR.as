package {
    import com.monsters.interfaces.IAttackable;
    import com.monsters.monsters.MonsterBase;
    import com.monsters.pathing.PATHING;
    import flash.display.Shape;
    import flash.geom.Point;
    import flash.geom.Rectangle;
    import gs.TweenLite;

    /**
     * Inferno-only: the Obsidian Mortar (building 145, newtowers.md). Lobs a slow shell high over walls at
     * where its target stands when it fires (it does not follow it); the flight is a real lob (ObsidianShell:
     * about 0.6 to 1 second, a little longer the further it goes, slower at the lower levels, trailing embers);
     * where it lands it shatters,
     * hitting every surface monster within `splash` for full damage at the middle down to half at the
     * edge. It cannot fire at anything closer than `ext.minRange`. Shells fly on the attack's own ticks
     * (they still land if the tower falls while they are in the air).
     */
    public class INFERNO_OBSIDIAN_MORTAR extends BTOWER {

        public static const ID:int = 145;

        /** The muzzle: this far above the footprint's middle, and this far (grid) toward the aim. */
        private static const MUZZLE_UP:int = 38;

        private static const MUZZLE_OUT:int = 14;

        private var _shells:Array = [];

        private var _splashFlags:int;

        public function INFERNO_OBSIDIAN_MORTAR() {
            super();
            _type = ID;
            _frameNumber = 0;
            _top = 35 - MUZZLE_UP;
            _footprint = [new Rectangle(0, 0, 70, 70)];
            _gridCost = [[new Rectangle(0, 0, 70, 70), 10], [new Rectangle(10, 10, 50, 50), 200]];
            this._splashFlags = Targeting.getOldStyleTargets(1);
            SetProps();
        }

        private function minRange():Number {
            var lvl:int = Math.max(1, Math.min(_lvl.Get(), _buildingProps.stats.length));
            var ext:Object = _buildingProps.stats[lvl - 1].ext;
            return ext && ext.minRange ? Number(ext.minRange) : 100;
        }

        override public function TickAttack():void {
            this.tickShells();
            super.TickAttack();
            Rotate();
        }

        override public function AnimFrame(param1:Boolean = true):void {
            super.AnimFrame(false);
        }

        /** Like every tower's, but nothing inside the dead zone: the closest monster between it and the range. */
        override public function FindTargets(param1:int, param2:int):void {
            _hasTargets = false;
            if (_position == null || !_footprint || _footprint.length == 0) {
                return;
            }
            var all:Array = Targeting.getCreepsInRange(_range, _position.add(new Point(0, _footprint[0].height / 2)), Targeting.getOldStyleTargets(1));
            var dead:Number = this.minRange();
            var ok:Array = [];
            for each (var c:Object in all) {
                if (c.dist >= dead && !MonsterBase(c.creep).invisible) {
                    ok.push(c);
                }
            }
            if (!ok.length) {
                return;
            }
            ok.sortOn(["dist"], Array.NUMERIC);
            _targetCreeps = [];
            var i:int = 0;
            while (i < ok.length && i < param1) {
                _targetCreeps.push({
                            "creep": ok[i].creep,
                            "dist": ok[i].dist,
                            "position": ok[i].pos
                        });
                i++;
            }
            _hasTargets = true;
        }

        /** The target is still worth a shell: alive, in range and outside the dead zone. */
        override public function targetInRange():Boolean {
            if (!_targetCreeps || !_targetCreeps.length || _position == null) {
                return false;
            }
            var m:MonsterBase = _targetCreeps[0].creep;
            if (!m || m.health <= 0 || !m._tmpPoint) {
                return false;
            }
            var me:Point = PATHING.FromISO(_position.add(new Point(0, _footprint[0].height / 2)));
            var it:Point = PATHING.FromISO(m._tmpPoint);
            if (!me || !it) {
                return false;
            }
            var d:Number = Point.distance(me, it);
            return d < _range && d >= this.minRange();
        }

        override public function Fire(param1:IAttackable):void {
            super.Fire(param1);
            if (health <= 0) {
                return;
            }
            var overdrive:Number = Boolean(GLOBAL._towerOverdrive) && GLOBAL._towerOverdrive.Get() >= GLOBAL.Timestamp() ? 1.25 : 1;
            var dmg:Number = damage * (0.5 + 0.5 / maxHealth * health) * overdrive;
            SOUNDS.Play("icannon", !isJard ? 0.8 : 0.4);
            if (isJard) {
                _jarHealth.Add(-int(dmg));
                ATTACK.Damage(_mc.x, _mc.y + _top, dmg);
                if (_jarHealth.Get() <= 0) {
                    KillJar();
                }
                return;
            }
            // the muzzle, turned with the barrel (frame k aims at grid angle k x 11.25 degrees)
            var a:Number = _animTick * 11.25 * Math.PI / 180;
            var gx:Number = Math.cos(a) * MUZZLE_OUT;
            var gy:Number = Math.sin(a) * MUZZLE_OUT;
            var from:Point = new Point(_mc.x + gx - gy, _mc.y + _top + (gx + gy) / 2);
            // where the target stands now (on the ground, also under a flyer)
            var to:Point = new Point(param1.x, param1.y);
            this._shells.push(new ObsidianShell(from, to, Math.max(1, _speed), int(dmg), _splash));
        }

        private function tickShells():void {
            var i:int = this._shells.length - 1;
            var s:ObsidianShell = null;
            while (i >= 0) {
                s = this._shells[i];
                if (s.tick()) {
                    this.land(s);
                    this._shells.splice(i, 1);
                }
                i--;
            }
        }

        /** The shell shatters: full damage at the middle, half at the edge of the splash. */
        private function land(s:ObsidianShell):void {
            var hits:Array = Targeting.getCreepsInRange(s.splash, s.to, this._splashFlags);
            var total:int = 0;
            var m:MonsterBase = null;
            var d:int = 0;
            for each (var c:Object in hits) {
                m = c.creep as MonsterBase;
                if (!m || m.health <= 0) {
                    continue;
                }
                d = int(s.damage * (1 - 0.5 * Math.min(1, Number(c.dist) / Math.max(1, s.splash))) * m._damageMult);
                m.modifyHealth(-d);
                total += d;
            }
            if (total > 0) {
                ATTACK.Damage(s.to.x, s.to.y, total);
            }
            SOUNDS.Play("trap", 0.5);
            if (GLOBAL._render && !GLOBAL._catchup) {
                ObsidianShell.shatter(s.to, s.splash);
            }
        }

        override public function Setup(param1:Object):void {
            param1.t = _type;
            super.Setup(param1);
            Props();
        }

        override public function RecycleC():void {
            this.clearShells();
            super.RecycleC();
        }

        override public function Cancel():void {
            this.clearShells();
            super.Cancel();
        }

        private function clearShells():void {
            for each (var s:ObsidianShell in this._shells) {
                s.remove();
            }
            this._shells = [];
        }
    }
}

import flash.display.Shape;
import flash.geom.Point;
import gs.TweenLite;

/** A shell in flight: a chunk of obsidian on a high arc, its shadow sliding along the ground below. */
class ObsidianShell {

    public var to:Point;

    public var damage:int;

    public var splash:Number;

    private var _from:Point;

    public var _ticks:int;

    private var _t:int = 0;

    private var _height:Number;

    private var _rock:Shape;

    private var _shadow:Shape;

    /** Game steps of flight for this distance (80 a second) at the tower's shell speed (6 to 8). */
    public static function flightSteps(param1:Number, param2:Number):int {
        return Math.max(40, Math.round((40 + param1 * 0.1) * 7 / Math.max(1, param2)));
    }

    public function ObsidianShell(param1:Point, param2:Point, param3:Number, param4:int, param5:Number) {
        super();
        this._from = param1;
        this.to = param2;
        this.damage = param4;
        this.splash = param5;
        var dist:Number = Point.distance(param1, param2);
        // A lob, not a dart (the user's, 28 September): it used to fly distance / speed steps (0.3 to 0.6 s up
        // an arc of up to 200), which looked like a thrown stone. Now about 0.6 s close in to 1 s at full
        // range, over an arc 40 + 30% of the distance high; across the ground it moves evenly and up and down
        // it rises and falls as a thrown thing does (a parabola), turning over once on the way.
        this._ticks = flightSteps(dist, param3);
        this._height = 40 + dist * 0.3;
        if (!GLOBAL._catchup && MAP._PROJECTILES) {
            this._shadow = new Shape();
            this._shadow.graphics.beginFill(0x000000, 0.28);
            this._shadow.graphics.drawEllipse(-6, -3, 12, 6);
            this._shadow.graphics.endFill();
            this._rock = new Shape();
            // a jagged black-violet chunk with a glint and a lava-orange edge
            this._rock.graphics.lineStyle(1, 0xFF7A20, 0.9);
            this._rock.graphics.beginFill(0x1A1024, 1);
            this._rock.graphics.moveTo(-6, -2);
            this._rock.graphics.lineTo(-2, -7);
            this._rock.graphics.lineTo(5, -5);
            this._rock.graphics.lineTo(7, 1);
            this._rock.graphics.lineTo(2, 6);
            this._rock.graphics.lineTo(-5, 4);
            this._rock.graphics.lineTo(-6, -2);
            this._rock.graphics.endFill();
            this._rock.graphics.lineStyle();
            this._rock.graphics.beginFill(0x8A5CC8, 0.9);
            this._rock.graphics.moveTo(-2, -5);
            this._rock.graphics.lineTo(3, -4);
            this._rock.graphics.lineTo(0, -1);
            this._rock.graphics.endFill();
            MAP._PROJECTILES.addChild(this._shadow);
            MAP._PROJECTILES.addChild(this._rock);
            this.place(0);
        }
    }

    /** One attack tick; true when it lands. */
    public function tick():Boolean {
        ++this._t;
        if (this._t >= this._ticks) {
            this.remove();
            return true;
        }
        // placed on every step, drawn or not (skipping steps made it jump)
        this.place(this._t / this._ticks);
        if (GLOBAL._render && !GLOBAL._catchup && this._t % 4 == 0) {
            this.ember();
        }
        return false;
    }

    /** A fading ember left behind in the air, so the flight reads as one smooth line. */
    private function ember():void {
        if (!this._rock || !MAP._PROJECTILES) {
            return;
        }
        var e:Shape = new Shape();
        e.graphics.beginFill(0xFF7A20, 0.8);
        e.graphics.drawCircle(0, 0, 2);
        e.graphics.endFill();
        e.x = this._rock.x;
        e.y = this._rock.y;
        MAP._PROJECTILES.addChildAt(e, Math.max(0, MAP._PROJECTILES.getChildIndex(this._rock)));
        TweenLite.to(e, 0.35, {
                    "alpha": 0,
                    "scaleX": 0.3,
                    "scaleY": 0.3,
                    "y": e.y + 4,
                    "onComplete": ObsidianShell.drop,
                    "onCompleteParams": [e]
                });
    }

    private function place(param1:Number):void {
        if (!this._rock) {
            return;
        }
        var gx:Number = this._from.x + (this.to.x - this._from.x) * param1;
        var gy:Number = this._from.y + (this.to.y - this._from.y) * param1;
        var up:Number = 4 * param1 * (1 - param1);
        // the shadow slides from the tower's foot (38 below the muzzle) to where the shell lands, smaller
        // and fainter the higher the shell is
        this._shadow.x = gx;
        this._shadow.y = this._from.y + 38 + (this.to.y - this._from.y - 38) * param1;
        this._shadow.scaleX = this._shadow.scaleY = 1 - 0.45 * up;
        this._shadow.alpha = 1 - 0.5 * up;
        this._rock.x = gx;
        this._rock.y = gy - this._height * up;
        this._rock.rotation = param1 * 360;
        // a touch bigger at the top of the arc, nearer the eye
        this._rock.scaleX = this._rock.scaleY = 1 + 0.25 * up;
    }

    public function remove():void {
        if (this._rock && this._rock.parent) {
            this._rock.parent.removeChild(this._rock);
        }
        if (this._shadow && this._shadow.parent) {
            this._shadow.parent.removeChild(this._shadow);
        }
        this._rock = null;
        this._shadow = null;
    }

    /** Razor shards thrown out from where it landed, and a ring of dust the size of the splash. */
    public static function shatter(param1:Point, param2:Number):void {
        if (!MAP._PROJECTILES) {
            return;
        }
        var ring:Shape = new Shape();
        ring.graphics.lineStyle(2, 0xB58CFF, 0.7);
        ring.graphics.drawEllipse(-param2, -param2 / 2, param2 * 2, param2);
        ring.graphics.lineStyle(5, 0xFF7A20, 0.25);
        ring.graphics.drawEllipse(-param2 * 0.6, -param2 * 0.3, param2 * 1.2, param2 * 0.6);
        ring.x = param1.x;
        ring.y = param1.y;
        ring.scaleX = ring.scaleY = 0.3;
        MAP._PROJECTILES.addChild(ring);
        TweenLite.to(ring, 0.45, {
                    "scaleX": 1,
                    "scaleY": 1,
                    "alpha": 0,
                    "onComplete": ObsidianShell.drop,
                    "onCompleteParams": [ring]
                });
        var i:int = 0;
        var shard:Shape = null;
        var a:Number = NaN;
        var r:Number = NaN;
        while (i < 9) {
            shard = new Shape();
            shard.graphics.beginFill(i % 3 == 0 ? 0x8A5CC8 : 0x140C1C, 1);
            shard.graphics.moveTo(0, -4);
            shard.graphics.lineTo(2, 2);
            shard.graphics.lineTo(-2, 2);
            shard.graphics.lineTo(0, -4);
            shard.graphics.endFill();
            shard.x = param1.x;
            shard.y = param1.y - 4;
            shard.rotation = Math.random() * 360;
            MAP._PROJECTILES.addChild(shard);
            a = i / 9 * Math.PI * 2 + Math.random() * 0.4;
            r = param2 * (0.5 + Math.random() * 0.5);
            TweenLite.to(shard, 0.5, {
                        "x": param1.x + Math.cos(a) * r,
                        "y": param1.y + Math.sin(a) * r * 0.5,
                        "rotation": shard.rotation + 360,
                        "alpha": 0,
                        "onComplete": ObsidianShell.drop,
                        "onCompleteParams": [shard]
                    });
            i++;
        }
    }

    public static function drop(param1:Shape):void {
        if (param1 && param1.parent) {
            param1.parent.removeChild(param1);
        }
    }
}

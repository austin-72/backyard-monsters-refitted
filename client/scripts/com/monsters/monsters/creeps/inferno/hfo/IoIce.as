package com.monsters.monsters.creeps.inferno.hfo {
    import com.monsters.events.hfo.IoHfoArt;
    import com.monsters.monsters.MonsterBase;
    import flash.events.Event;
    import flash.geom.Point;

    /**
     * Hell Freezes Over: the two ice powers of the ice cretins (IC26-IC31) and Rimegrave (IC25). Ranged hits (the
     * Hailspitter's hailstones) count when they land, the same as a strike.
     *  - A tower hit is iced over (BTOWER.ioIceHit): its next shot takes one more reload to come, and breaks the
     *    ice when it does. More hits while it is iced do nothing more.
     *  - A monster hit is frozen for one second (IoFreezeEffect): no moving, no attacking.
     * Every hit shows the frost burst (effects/frosthit.png).
     */
    public class IoIce {

        public function IoIce() {
            super();
        }

        /** An ice monster's hit landed on `target` (a building or a monster). */
        public static function hit(source:MonsterBase, target:*):void {
            if (!GLOBAL.INFERNO_ONLY || !target) {
                return;
            }
            try {
                if (target is BTOWER) {
                    var tower:BTOWER = BTOWER(target);
                    if (tower._class == "tower" && tower.health > 0) {
                        tower.ioIceHit();
                        burst(tower._mc.x, tower._mc.y + (tower._footprint && tower._footprint.length ? tower._footprint[0].height * 0.5 : 20), tower);
                    }
                }
                else if (target is MonsterBase) {
                    var monster:MonsterBase = MonsterBase(target);
                    if (monster.health > 0 && !monster.dead) {
                        IoFreezeEffect.freeze(monster);
                        burst(monster._tmpPoint.x, monster._tmpPoint.y - monster._altitude, null);
                    }
                }
            }
            catch (e:Error) {
                LOGGER.Log("err", "IoIce.hit: " + e.message);
            }
        }

        /**
         * After a strike (CreepBase.attacked): a melee hit has landed already; a projectile counts when it lands
         * (FIREBALL.COLLIDED).
         */
        public static function attacked(source:MonsterBase, target:*, projectile:* = null):void {
            if (projectile is FIREBALL) {
                var ball:FIREBALL = FIREBALL(projectile);
                var onLanded:Function = function(e:Event):void {
                    ball.removeEventListener(FIREBALL.COLLIDED, onLanded);
                    hit(source, target);
                };
                ball.addEventListener(FIREBALL.COLLIDED, onLanded);
                return;
            }
            hit(source, target);
        }

        /**
         * An ice orb from `source` to `target` (a building or a monster), for a strike that has already been dealt:
         * the orb is only its picture (Rimegrave's reach, the Sleetwing's blow from the air), and the strike's ice
         * power lands with it. Returns the orb (null if none could be thrown).
         */
        public static function orb(source:MonsterBase, target:*):FIREBALL {
            var ball:FIREBALL = null;
            if (!GLOBAL.INFERNO_ONLY || !source || !target || !GLOBAL._render) {
                return null;
            }
            try {
                SPRITES.SetupSprite(FIREBALL.ICEORB_GRAPHIC_NAME);
                var from:Point = new Point(source._tmpPoint.x, source._tmpPoint.y - source._altitude - 18);
                if (target is BFOUNDATION) {
                    ball = FIREBALLS.Spawn(from, BFOUNDATION(target)._position, BFOUNDATION(target), 10, 0, 0, 0, FIREBALL.TYPE_ICEORB, source);
                }
                else if (target is MonsterBase) {
                    ball = FIREBALLS.Spawn2(from, MonsterBase(target)._tmpPoint, MonsterBase(target), 10, 0, 0, FIREBALL.TYPE_ICEORB, 1, source);
                }
                if (ball) {
                    ball.ioNoDamage = true;
                }
            }
            catch (e:Error) {
                LOGGER.Log("err", "IoIce.orb: " + e.message);
                ball = null;
            }
            return ball;
        }

        /** The frost burst at map point (x, y): a frame strip of 12, one of its 3 rows at random. */
        public static function burst(x:Number, y:Number, building:BFOUNDATION):void {
            // (effects.json: 80 x 85 cells, 12 frames, 3 rows; the impact point is at 40, 62)
            IoHfoArt.playRow("@effects/frosthit.png", 80, 85, 12, int(Math.random() * 3), x - 40, y - 62, building ? IoHfoArt.depthOf(building) + 60 : Math.max(MAP.DEPTH_SHADOW + 1, IoHfoArt.mapDepth(x, y + 10)), 2, null, 3);
        }
    }
}

import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event } from "flash/events";
import { Point } from "flash/geom";
import { BFOUNDATION, BTOWER, FIREBALL, FIREBALLS, GLOBAL, IoFreezeEffect, IoHfoArt, LOGGER, MAP, MonsterBase, SPRITES } from "@game";

/**
 * Hell Freezes Over: the two ice powers of the ice cretins (IC26-IC31) and Rimegrave (IC25). Ranged hits (the
 * Hailspitter's hailstones) count when they land, the same as a strike.
 *  - A tower hit is iced over (BTOWER.ioIceHit): its next shot takes one more reload to come, and breaks the
 *    ice when it does. More hits while it is iced do nothing more.
 *  - A monster hit is frozen for one second (IoFreezeEffect): no moving, no attacking.
 * Every hit shows the frost burst (effects/frosthit.png).
 */
export class IoIce extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    /** An ice monster's hit landed on `target` (a building or a monster). */
    public static hit(source: MonsterBase, target: any): void {
        if (!GLOBAL.INFERNO_ONLY || !target) {
            return;
        }
        try {
            if (target instanceof BTOWER) {
                let tower: BTOWER = as3.cast(target, BTOWER);
                if (tower._class == "tower" && tower.health > 0) {
                    tower.ioIceHit();
                    IoIce.burst(tower._mc.x, Number(tower._mc.y + (tower._footprint && tower._footprint.length ? tower._footprint[0].height * 0.5 : 20)), tower);
                }
            } else if (target instanceof MonsterBase) {
                let monster: MonsterBase = as3.cast(target, MonsterBase);
                if (monster.health > 0 && !monster.dead) {
                    IoFreezeEffect.freeze(monster);
                    IoIce.burst(monster._tmpPoint.x, monster._tmpPoint.y - monster._altitude, null);
                }
            }
        } catch (e) {
            LOGGER.Log("err", "IoIce.hit: " + e.message);
        }
    }

    /**
     * After a strike (CreepBase.attacked): a melee hit has landed already; a projectile counts when it lands
     * (FIREBALL.COLLIDED).
     */
    public static attacked(source: MonsterBase, target: any, projectile: any = null): void {
        let ball: FIREBALL = null;
        let onLanded: Function = null;
        if (projectile instanceof FIREBALL) {
            ball = as3.cast(projectile, FIREBALL);
            onLanded = (e: Event): void => {
                ball.removeEventListener(FIREBALL.COLLIDED, onLanded);
                IoIce.hit(source, target);
            };
            ball.addEventListener(FIREBALL.COLLIDED, onLanded);
            return;
        }
        IoIce.hit(source, target);
    }

    /**
     * An ice orb from `source` to `target` (a building or a monster), for a strike that has already been dealt:
     * the orb is only its picture (Rimegrave's reach, the Sleetwing's blow from the air), and the strike's ice
     * power lands with it. Returns the orb (null if none could be thrown).
     */
    public static orb(source: MonsterBase, target: any): FIREBALL {
        let ball: FIREBALL = null;
        if (!GLOBAL.INFERNO_ONLY || !source || !target || !GLOBAL._render) {
            return null;
        }
        try {
            SPRITES.SetupSprite(FIREBALL.ICEORB_GRAPHIC_NAME);
            let from: Point = new Point(source._tmpPoint.x, source._tmpPoint.y - source._altitude - 18);
            if (target instanceof BFOUNDATION) {
                ball = FIREBALLS.Spawn(from, as3.cast(target, BFOUNDATION)._position, as3.cast(target, BFOUNDATION), 10, 0, 0, 0, FIREBALL.TYPE_ICEORB, source);
            } else if (target instanceof MonsterBase) {
                ball = FIREBALLS.Spawn2(from, as3.cast(target, MonsterBase)._tmpPoint, as3.cast(target, MonsterBase), 10, 0, 0, FIREBALL.TYPE_ICEORB, 1, source);
            }
            if (ball) {
                ball.ioNoDamage = true;
            }
        } catch (e) {
            LOGGER.Log("err", "IoIce.orb: " + e.message);
            ball = null;
        }
        return ball;
    }

    /** The frost burst at map point (x, y): a frame strip of 12, one of its 3 rows at random. */
    public static burst(x: number, y: number, building: BFOUNDATION): void {
        // (effects.json: 80 x 85 cells, 12 frames, 3 rows; the impact point is at 40, 62)
        IoHfoArt.playRow("@effects/frosthit.png", 80, 85, 12, (Math.random() * 3) | 0, x - 40, y - 62, building ? IoHfoArt.depthOf(building) + 60 : Math.max(MAP.DEPTH_SHADOW + 1, IoHfoArt.mapDepth(x, y + 10)), 2, null, 3);
    }
}

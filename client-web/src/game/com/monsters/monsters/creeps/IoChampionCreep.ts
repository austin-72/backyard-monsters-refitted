import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Shape, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { BFOUNDATION, BYMConfig, CHAMPIONCAGE, CREATURELOCKER, CREATURES, CreepBase, FIREBALL, FIREBALLS, FlameEffect, GLOBAL, IAttackable, ITargetable, MAP, MonsterBase, PATHING, ProjectileEvent, RasterData, SOUNDS, SPRITES, Targeting, TweenLite } from "@game";

/**
 * Inferno-only: Korath (IC9) and Drull (IC10) as ordinary monsters, hatched, housed, flung and
 * trained like any other. Their stats per level are in CREATURELOCKER, and they are drawn with the
 * champions' art (sprites G4_n / G2_n, CHAMPIONCAGE offsets): levels 1-2 with the champion's level 4
 * art, 3-4 with its level 5, 5-6 with its level 6 (ART_LEVEL).
 *
 * Korath keeps his champion abilities, unlocked by level the way his powers were:
 *   every hit on a monster sets it on fire (a damage-over-time burn, 10% of his damage);
 *   from level 4, a flying enemy near him is hit by a magma fireball (a quarter of his damage, and burns);
 *   from level 5, every third attack is a ground stomp that hits everything around him.
 * Drull is a plain heavy hitter, as his champion was.
 */
export class IoChampionCreep extends CreepBase {
    static {
        as3.fields(this, { m_spriteID: null, m_level: 1, m_artLevel: 4, m_attackNum: 0 });
    }

    public static readonly KORATH_ID: string = "IC9";

    public static readonly DRULL_ID: string = "IC10";

    /** The champion art each level is drawn with (the user's choice, 28 September): 1-2 the champion's
     * level 4 art, 3-4 its level 5, 5-6 its level 6. */
    public static readonly ART_LEVEL: any[] = [4, 4, 5, 5, 6, 6];
    private m_spriteID: string;
    private m_level: int;
    private m_artLevel: int;
    private m_attackNum: int;

    public $ctor(param1?: string, param2?: string, param3?: Point, param4?: number, param5: int = 0, param6: int = 2147483647, param7: Point = null, param8: boolean = false, param9: BFOUNDATION = null, param10: number = 1, param11: boolean = false, param12: MonsterBase = null): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12);
        this.m_level = IoChampionCreep.levelOf(this._creatureID, param5, this._friendly);
        let champion: string = this._creatureID == IoChampionCreep.KORATH_ID ? "G4" : "G2";
        this.m_artLevel = IoChampionCreep.ART_LEVEL[Math.max(1, Math.min(6, this.m_level)) - 1] | 0;
        this.m_spriteID = champion + "_" + this.m_artLevel;
        if (this._creatureID == IoChampionCreep.KORATH_ID) {
            this.attackDelayProperty.value = this.m_level >= 3 ? 80 : 72;
        }
        this.useChampionGraphic(champion);
    }

    /**
     * Their range is the champions' melee reach (35-90), not a shooting range: anything with a range
     * above 1 would otherwise fire projectiles. It still sets how close they get and the stomp's size.
     */
    public override get isRanged(): boolean {
        return false;
    }

    /** The level this monster was made at: its health is unique to one level of the table. */
    private static levelOf(id: string, requested: int, friendly: boolean): int {
        let health: number = CREATURES.GetProperty(id, "health", requested, friendly);
        let table: any[] = as3.as(CREATURELOCKER._creatures[id].props.health, Array);
        let index: int = table ? table.indexOf(health) : -1;
        return (index >= 0 ? index + 1 : 1) | 0;
    }

    /** CreepBase made a 52 x 50 monster bitmap; the champions' frames are larger and offset. */
    private useChampionGraphic(champion: string): void {
        SPRITES.SetupSprite(this.m_spriteID);
        let descriptor: any = SPRITES.GetSpriteDescriptor(this.m_spriteID);
        if (!descriptor) {
            return;
        }
        if (BYMConfig.instance.RENDERER_ON) {
            if (this._rasterData) {
                this._rasterData.clear();
            }
        } else if (Boolean(this._graphicMC) && Boolean(this._graphicMC.parent)) {
            this._graphicMC.parent.removeChild(this._graphicMC);
        }
        this._graphic = new BitmapData(descriptor.width, descriptor.height, true, 0);
        this._graphicMC = BYMConfig.instance.RENDERER_ON ? new Bitmap(this._graphic) : as3.as(this.graphic.addChild(new Bitmap(this._graphic)), Bitmap);
        this._graphicMC.x = Number(CHAMPIONCAGE.GetGuardianProperty(champion, this.m_artLevel, "offset_x"));
        this._graphicMC.y = Number(CHAMPIONCAGE.GetGuardianProperty(champion, this.m_artLevel, "offset_y"));
        if (BYMConfig.instance.RENDERER_ON) {
            this._rasterData = new RasterData(as3.cast(this._graphic, IBitmapDrawable), this._rasterPt, int.MAX_VALUE);
        }
    }

    protected override getNextSprite(): void {
        // CreepBase's constructor draws a first frame before this class's constructor has chosen the
        // champion art; skip that one, the next tick draws with the right sprite.
        if (!this.m_spriteID) {
            return;
        }
        if (this._attacking) {
            SPRITES.GetSprite(this._graphic, this.m_spriteID, GLOBAL.e_BASE_MODE.ATTACK, (this.m_rotation - 45) | 0, this._frameNumber);
        } else if (this._atTarget || this.ioStandingStill()) {
            // (standing, also when held still, e.g. rooted: not walking on the spot)
            SPRITES.GetSprite(this._graphic, this.m_spriteID, "idle", (this.m_rotation - 45) | 0);
        } else {
            SPRITES.GetSprite(this._graphic, this.m_spriteID, "walking", (this.m_rotation - 45) | 0, this._frameNumber);
        }
    }

    protected override attacked(param1: IAttackable, param2: number, param3: ITargetable = null): void {
        super.attacked(param1, param2, param3);
        if (this._creatureID != IoChampionCreep.KORATH_ID || this.health <= 0) {
            return;
        }
        if (param1 instanceof MonsterBase) {
            this.burn(as3.cast(param1, MonsterBase));
        }
        if (this.m_level >= 4) {
            this.fireballAtFlyer();
        }
        if (this.m_level >= 5 && ++this.m_attackNum >= 3) {
            this.m_attackNum = 0;
            this.stomp();
        }
    }

    private burn(param1: MonsterBase): void {
        if (param1 && param1.health > 0) {
            param1.addStatusEffect(new FlameEffect(param1, this.damage * 0.1));
        }
    }

    /** Korath's champion answer to flyers: a magma fireball at the nearest flying enemy close by. */
    private fireballAtFlyer(): void {
        let flags: int = Targeting.getEnemyFlag(this) | Targeting.k_TARGETS_FLYING;
        let found: any[] = Targeting.getCreepsInRange(this.m_range * 3, PATHING.FromISO(this._tmpPoint), flags, this);
        let entry: any = null;
        let target: MonsterBase = null;
        let nearest: number = Number.MAX_VALUE;
        for (entry of as3.values(found)) {
            if (entry.creep && entry.creep._movement == "fly" && entry.dist < nearest) {
                nearest = Number(entry.dist);
                target = as3.as(entry.creep, MonsterBase);
            }
        }
        if (!target) {
            return;
        }
        let start: Point = Point.interpolate(this._tmpPoint.add(new Point(0, -50)), target._tmpPoint, 0.8);
        let fireball: FIREBALL = FIREBALLS.Spawn2(start, target._tmpPoint, target, 8, (this.damage / 4) | 0, 0, FIREBALLS.TYPE_MAGMA, 1, this);
        if (fireball) {
            fireball.addEventListener(FIREBALL.COLLIDED, as3.bind(this, this.onFireballHit), false, 0, true);
        }
    }

    private onFireballHit(param1: ProjectileEvent): void {
        (as3.as(param1.target, FIREBALL)).removeEventListener(FIREBALL.COLLIDED, as3.bind(this, this.onFireballHit));
        if (param1.m_targetCreep instanceof MonsterBase) {
            this.burn(as3.cast(param1.m_targetCreep, MonsterBase));
        }
    }

    /** The champion's stomp: damage falling off with distance, out to 2.5 times his reach. */
    private stomp(): void {
        let centre: Point = new Point(this._mc.x, this._mc.y);
        let flags: int = Targeting.getEnemyFlag(this) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_INVISIBLE;
        if (!this._friendly) {
            flags |= Targeting.k_TARGETS_BUILDINGS;
        }
        let targets: any[] = Targeting.getTargetsInRange(this.m_range * 2.5, centre, flags);
        if (targets && targets.length > 0) {
            Targeting.DealLinearAEDamage(centre, this.m_range * 2.5, this.damage, targets, this.m_range * 1.5);
        }
        SOUNDS.Play("quake", 0.4);
        let ring: IoStompRing = new IoStompRing(20, (this.m_range * 2.5) >>> 0, BYMConfig.instance.RENDERER_ON ? new Point(this._rasterPt.x, this._rasterPt.y + this._graphic.height * 0.6) : null);
        if (!BYMConfig.instance.RENDERER_ON) {
            this._mc.addChildAt(ring.graphic, Math.max(this.graphic.getChildIndex(this._graphicMC) - 1, 0) | 0);
        }
    }
}

/** The spreading orange rings of Korath's stomp (the champion's G4QuakeGraphic). */
class IoStompRing extends ASObject {
    static {
        as3.fields(this, { graphic: null, m_rasterData: null });
    }

    public graphic: Shape;
    private m_rasterData: RasterData;

    public $ctor(param1?: uint, param2?: uint, param3: Point = null): void {
        let holder: Sprite = null;
        super.$ctor();
        this.graphic = new Shape();
        this.graphic.graphics.lineStyle(0.3, 15893760, 0.5);
        this.graphic.graphics.drawEllipse(-param1, -param1 / 2, param1 * 2, param1);
        this.graphic.graphics.drawEllipse(-param1 * 0.8, -param1 / 2.5, param1 * 1.6, param1 * 0.8);
        this.graphic.graphics.drawEllipse(-param1 * 0.6, -param1 / 3.333333, param1 * 1.2, param1 * 0.6);
        this.graphic.filters = [new GlowFilter(16737792, 1, 20, 20, 5 + Math.random() * 5, 1, false, false)];
        TweenLite.to(this.graphic, 1, { "width": param2 * 2, "height": param2, "alpha": 0, "onComplete": as3.bind(this, this.onComplete) });
        if (BYMConfig.instance.RENDERER_ON && Boolean(param3)) {
            holder = new Sprite();
            holder.addChild(this.graphic);
            this.m_rasterData = new RasterData(as3.cast(holder, IBitmapDrawable), new Point(param3.x + holder.width, param3.y + holder.height), MAP.DEPTH_SHADOW + 1);
        }
    }

    private onComplete(): void {
        if (this.graphic.parent) {
            this.graphic.parent.removeChild(this.graphic);
        }
        this.graphic.filters = [];
        if (this.m_rasterData) {
            this.m_rasterData.clear();
        }
        this.m_rasterData = null;
    }
}

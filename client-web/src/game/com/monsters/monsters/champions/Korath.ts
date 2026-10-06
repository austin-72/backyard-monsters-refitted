import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { IBitmapDrawable, Shape, Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { Point } from "flash/geom";
import { ATTACK, BFOUNDATION, BYMConfig, ChampionBase, FIREBALL, FIREBALLS, FlameEffect, GLOBAL, MAP, MonsterBase, PATHING, ProjectileEvent, RasterData, SOUNDS, SPRITES, Targeting, TweenLite } from "@game";

export class Korath extends ChampionBase {
    static {
        as3.fields(this, { _attackNum: 0, _quaking: false });
    }

    public static readonly KORATH_POWER_NORMAL: int = 1;

    public static readonly KORATH_POWER_FIREBALL: int = 2;

    public static readonly KORATH_POWER_STOMP: int = 3;
    public _attackNum: int;
    public _quaking: boolean;

    public $ctor(param1?: string, param2?: Point, param3?: number, param4: Point = null, param5: boolean = false, param6: BFOUNDATION = null, param7: int = 1, param8: int = 0, param9: int = 0, param10: int = 1, param11: int = 20000, param12: int = 0, param13: int = 1): void {
        super.$ctor(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10, param11, param12, param13);
        this._attackNum = 0;
        this._quaking = false;
        switch (param7) {
            case 1:
                this.attackDelayProperty.value = 72;
                break;
            case 2:
                this.attackDelayProperty.value = 72;
                break;
            case 3:
                this.attackDelayProperty.value = 80;
                break;
            case 4:
                this.attackDelayProperty.value = 80;
                break;
            case 5:
                this.attackDelayProperty.value = 80;
                break;
            case 6:
                this.attackDelayProperty.value = 80;
                break;
            default:
                this.attackDelayProperty.value = 72;
        }
    }

    protected override changeMode(): void {
        super.changeMode();
        this._quaking = false;
    }

    protected override tickBAttack(): void {
        if (this.health > 0 && this.doQuakeCheck()) {
            return;
        }
        super.tickBAttack();
    }

    protected override tickBDefend(): void {
        if (this.health > 0) {
            if (this.doQuakeCheck()) {
                return;
            }
        }
        super.tickBDefend();
    }

    protected override doAttackDamage(): void {
        let _loc1_: number = 1;
        if (this._targetCreep && this._targetCreep._movement == "fly" && this._powerLevel.Get() >= Korath.KORATH_POWER_FIREBALL && this._level.Get() > 3) {
            if (this._targetCreep.health > 0) {
                this.shootFireball(this._targetCreep);
            }
        } else {
            ++this._attackNum;
            if (Boolean(this._targetBuilding) && this._targetBuilding._fortification.Get() > 0) {
                ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, (this.damage * _loc1_ * (100 - (this._targetBuilding._fortification.Get() * 10 + 10)) / 100) | 0, this._mc.visible);
            } else {
                ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, (this.damage * _loc1_) | 0, this._mc.visible);
            }
            if (this._targetCreep) {
                this._targetCreep.modifyHealth(-(this.damage * _loc1_));
                this.addFlameDOT(this._targetCreep);
            } else if (this._targetBuilding) {
                this._targetBuilding.modifyHealth(this.damage * _loc1_, this);
            } else {
                this.findTarget();
            }
        }
    }

    protected override doDefenseDamage(): void {
        if (this._powerLevel.Get() >= Korath.KORATH_POWER_FIREBALL && this._level.Get() > 3 && this._targetCreep._movement == "fly") {
            this.shootFireball(this._targetCreep);
        } else {
            ++this._attackNum;
            ATTACK.Damage(this._tmpPoint.x, this._tmpPoint.y - 5, this.damage | 0, this._mc.visible);
            this._targetCreep.modifyHealth(-this.damage);
            this.addFlameDOT(this._targetCreep);
        }
    }

    private shootFireball(param1: MonsterBase): void {
        let _loc2_: int = 50;
        let _loc3_: Point = Point.interpolate(this._tmpPoint.add(new Point(0, -_loc2_)), this._targetCreep._tmpPoint, 0.8);
        let _loc4_: FIREBALL = null;
        (_loc4_ = FIREBALLS.Spawn2(_loc3_, this._targetCreep._tmpPoint, this._targetCreep, 8, (this.damage / 4) | 0, 0, FIREBALLS.TYPE_MAGMA, 1, this)).addEventListener(FIREBALL.COLLIDED, as3.bind(this, this.addFlameDOTEvent), false, 0, true);
    }

    protected override getTargetCreeps(): void {
        if (this._powerLevel.Get() >= Korath.KORATH_POWER_FIREBALL && this._level.Get() > 3) {
            this._targetCreeps = Targeting.getCreepsInRange(800, this._tmpPoint, Targeting.getOldStyleTargets(1));
        } else {
            this._targetCreeps = Targeting.getCreepsInRange(800, this._tmpPoint, Targeting.getOldStyleTargets(0));
        }
    }

    public override canShootCreep(): boolean {
        if (this._targetCreep == null) {
            return false;
        }
        if (this._targetCreep._movement == "fly") {
            if (this._powerLevel.Get() < Korath.KORATH_POWER_FIREBALL || this._level.Get() < 4) {
                return false;
            }
        }
        let _loc1_: number = GLOBAL.QuickDistance(this._targetCreep._tmpPoint, this._tmpPoint);
        if (_loc1_ > this.m_range) {
            return false;
        }
        if (PATHING.LineOfSight(this._tmpPoint.x | 0, this._tmpPoint.y | 0, this._targetCreep._tmpPoint.x | 0, this._targetCreep._tmpPoint.y | 0)) {
            return true;
        }
        return false;
    }

    protected override getNextSprite(): void {
        super.getNextSprite();
        if (this._quaking) {
            SPRITES.GetSprite(this._graphic, this._spriteID, "stomp", (this.m_rotation - 45) | 0, this._frameNumber);
        }
    }

    private drawFrame(): void {
    }

    private addFlameDOTEvent(param1: ProjectileEvent): void {
        (as3.as(param1.target, FIREBALL)).removeEventListener(FIREBALL.COLLIDED, as3.bind(this, this.addFlameDOTEvent));
        if (param1.m_targetCreep instanceof MonsterBase) {
            this.addFlameDOT(as3.cast(param1.m_targetCreep, MonsterBase));
        }
    }

    private addFlameDOT(param1: MonsterBase): boolean {
        param1.addStatusEffect(new FlameEffect(param1, this.damage * 0.1));
        return true;
    }

    private doQuakeCheck(): boolean {
        let _loc1_: number = NaN;
        if (this._creatureID != "G4") {
            return false;
        }
        if (this._quaking) {
            if (this._frameNumber / 8 % 10 + 20 == 26) {
                _loc1_ = 1;
                this._attackNum = 0;
                SOUNDS.Play("quake", 0.4);
                this.quake((this.damage * _loc1_) | 0);
            } else if (this._frameNumber / 8 % 10 + 20 == 29) {
                this._quaking = false;
            }
        } else if (this.attackCooldown <= 0) {
            if (this._powerLevel.Get() >= Korath.KORATH_POWER_STOMP && this._level.Get() > 4 && this._attackNum >= 3) {
                this._quaking = true;
                this._frameNumber = 0;
            }
        }
        return this._quaking;
    }

    private quake(param1: int): void {
        let _loc3_: any[] = null;
        let _loc2_: Point = new Point(this._mc.x, this._mc.y);
        let _loc4_: int = 0;
        let _loc5_: any = Targeting.getEnemyFlag(this) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_INVISIBLE;
        if (!this._friendly) {
            _loc5_ |= Targeting.k_TARGETS_BUILDINGS;
        }
        _loc3_ = Targeting.getTargetsInRange(this.m_range * 2.5, new Point(this._mc.x, this._mc.y), _loc5_ | 0);
        if (_loc3_) {
            Targeting.DealLinearAEDamage(_loc2_, this.m_range * 2.5, this.damage, _loc3_, this.m_range * 1.5);
        }
        let _loc6_: G4QuakeGraphic = null;
        (_loc6_ = new G4QuakeGraphic(20, (this.m_range * 2.5) >>> 0, BYMConfig.instance.RENDERER_ON ? new Point(this._rasterPt.x, this._rasterPt.y + this._graphic.height * 0.6) : null)).graphic.y = _loc6_.graphic.y + _loc4_;
        if (!BYMConfig.instance.RENDERER_ON) {
            this._mc.addChildAt(_loc6_.graphic, Math.max(this.graphic.getChildIndex(this._graphicMC) - 1, 0) | 0);
        }
    }
}

class G4QuakeGraphic extends ASObject {
    static {
        as3.fields(this, { graphic: null, m_rasterData: null, m_rasterPt: null });
    }

    public graphic: Shape;
    protected m_rasterData: RasterData;
    protected m_rasterPt: Point;

    public $ctor(param1?: uint, param2?: uint, param3: Point = null): void {
        let _loc5_: Sprite = null;
        super.$ctor();
        this.graphic = new Shape();
        this.graphic.graphics.lineStyle(0.3, 15893760, 0.5);
        this.graphic.graphics.drawEllipse(-param1, -param1 / 2, param1 * 2, param1);
        this.graphic.graphics.drawEllipse(-param1 * 0.8, -param1 / 2.5, param1 * 1.6, param1 * 0.8);
        this.graphic.graphics.drawEllipse(-param1 * 0.6, -param1 / 3.333333, param1 * 1.2, param1 * 0.6);
        let _loc4_: GlowFilter = new GlowFilter(16737792, 1, 20, 20, 5 + Math.random() * 5, 1, false, false);
        this.graphic.filters = [_loc4_];
        TweenLite.to(this.graphic, 1, { "width": param2 * 2, "height": param2, "alpha": 0, "onComplete": as3.bind(this, this.onComplete) });
        if (BYMConfig.instance.RENDERER_ON && Boolean(param3)) {
            (_loc5_ = new Sprite()).addChild(this.graphic);
            this.m_rasterPt = new Point(param3.x + _loc5_.width, param3.y + _loc5_.height);
            this.m_rasterData = new RasterData(as3.cast(_loc5_, IBitmapDrawable), this.m_rasterPt, MAP.DEPTH_SHADOW + 1);
        }
    }

    private onComplete(): void {
        this.graphic.parent.removeChild(this.graphic);
        this.graphic.filters = [];
        this.graphic = null;
        if (this.m_rasterData) {
            this.m_rasterData.clear();
        }
        this.m_rasterData = null;
        this.m_rasterPt = null;
    }
}

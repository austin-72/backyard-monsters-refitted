import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Shape } from "flash/display";
import { Event } from "flash/events";
import { Point } from "flash/geom";
import { AcidStatusEffect, Component, GLOBAL, IAttackable, IComponentOwner, ITargetable, ITickable, MAP, MonsterBase, Targeting } from "@game";

export class AcidOnDeath extends Component {
    static {
        as3.fields(this, { m_radius: 0, m_damage: NaN, m_duration: 0, m_acidPool: null });
    }

    private m_radius: uint;
    private m_damage: number;
    private m_duration: uint;
    private m_acidPool: AcidPool;

    public $ctor(param1?: uint, param2?: number, param3?: uint): void {
        super.$ctor();
        this.m_radius = param1;
        this.m_damage = param2;
        this.m_duration = param3;
    }

    public set damage(param1: number) {
        this.m_damage = param1;
        if (this.m_acidPool) {
            this.m_acidPool.damage = param1;
        }
    }

    protected override onRegister(): void {
        this.owner.addEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.onDeath));
    }

    protected override onUnregister(): void {
        this.owner.removeEventListener(MonsterBase.k_DEATH_EVENT, as3.bind(this, this.onDeath));
    }

    protected onDeath(param1: Event = null): void {
        this.addAcidPool();
    }

    private addAcidPool(): void {
        this.m_acidPool = new AcidPool(this.owner.x, this.owner.y, this.m_damage, this.m_radius);
        this.m_acidPool.timeActivated = GLOBAL.Timestamp() >>> 0;
        MAP._CREEPSMC.addChild(this.m_acidPool.graphic);
        GLOBAL.addTickable(this);
    }

    private removeAcidPool(): void {
        MAP._CREEPSMC.removeChild(this.m_acidPool.graphic);
        this.m_acidPool = null;
        GLOBAL.removeTickable(this);
    }

    public override tick(param1: int = 1): void {
        if (this.m_acidPool) {
            this.m_acidPool.tick(param1);
            if (GLOBAL.Timestamp() - this.m_acidPool.timeActivated >= this.m_duration) {
                this.removeAcidPool();
            }
        }
    }
}

class AcidPool extends ASObject implements ITickable, ITargetable {
    static {
        as3.implement(this, [ITickable, ITargetable]);
        as3.fields(this, { timeActivated: 0, m_radius: 0, m_damage: NaN, m_y: NaN, m_x: NaN, m_graphic: null });
    }

    public timeActivated: uint;
    private m_radius: uint;
    private m_damage: number;
    private m_y: number;
    private m_x: number;
    private m_graphic: Shape;

    public $ctor(param1?: number, param2?: number, param3?: number, param4?: uint): void {
        super.$ctor();
        this.m_radius = param4;
        this.m_damage = param3;
        this.m_y = param2;
        this.m_x = param1;
        this.m_graphic = new Shape();
        this.m_graphic.x = this.m_x;
        this.m_graphic.y = this.m_y;
        this.m_graphic.graphics.beginFill(65280, 0.5);
        this.m_graphic.graphics.drawCircle(0, 0, this.m_radius);
        this.m_graphic.graphics.endFill();
    }

    public tick(param1: int = 1): void {
        let _loc4_: IAttackable = null;
        let _loc5_: IComponentOwner = null;
        let _loc2_: any[] = Targeting.getAllBUTTargetsInRange(this.m_radius, new Point(this.m_x, this.m_y), Targeting.k_TARGETS_FLYING);
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            (_loc4_ = as3.cast(_loc2_[_loc3_].creep, IAttackable)).modifyHealth(this.m_damage, this);
            if (as3.is(_loc4_, IComponentOwner)) {
                if (!(_loc5_ = as3.as(_loc4_, IComponentOwner)).getComponentByType(AcidStatusEffect)) {
                    _loc5_.addComponent(new AcidStatusEffect(as3.as(_loc4_, MonsterBase), this.m_damage));
                }
            }
            _loc3_++;
        }
    }

    public get defenseFlags(): int {
        return 0;
    }

    public get graphic(): Shape {
        return this.m_graphic;
    }

    public get x(): number {
        return this.m_x;
    }

    public get y(): number {
        return this.m_y;
    }

    public set damage(param1: number) {
        this.m_damage = param1;
    }
}

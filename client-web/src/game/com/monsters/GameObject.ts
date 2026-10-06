import * as as3 from "as3";
import { ASObject, Vector, int } from "as3";
import { DisplayObject, IBitmapDrawable, Sprite } from "flash/display";
import { EventDispatcher, IEventDispatcher } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BYMConfig, CModifiableProperty, IAttackable, ITargetable, MAP, MaxHealthProperty, RasterData, SecNum, SpriteSheetAnimation } from "@game";

export class GameObject extends EventDispatcher implements IAttackable, IEventDispatcher {
    static {
        as3.implement(this, [IAttackable, IEventDispatcher]);
        as3.fields(this, { _middle: 0, _health: null, _size: 0, _mc: null, targetableStatus: 0, maxHealthProperty: null, moveSpeedProperty: null, armorProperty: null, m_children: null, m_baseDepth: NaN, m_isCleared: false, m_attackFlags: 0, m_defenseFlags: 0, m_attackPriorityFlags: null });
    }

    protected static readonly k_DOES_PRINT_DETAILED_LOGGING: boolean = true;
    public _middle: int;
    private _health: SecNum;
    public _size: int;
    public _mc: Sprite;
    public targetableStatus: int;
    public maxHealthProperty: MaxHealthProperty;
    public moveSpeedProperty: CModifiableProperty;
    public armorProperty: CModifiableProperty;
    protected m_children: Vector<RasterDataContainer>;
    protected m_baseDepth: number;
    protected m_isCleared: boolean;
    private m_attackFlags: int;
    private m_defenseFlags: int;
    protected m_attackPriorityFlags: Vector<int>;

    public $ctor(): void {
        super.$ctor();
        this._mc = new Sprite();
        this._health = new SecNum(0);
        this.moveSpeedProperty = new CModifiableProperty(Number.MAX_VALUE, 0, 1);
        this.armorProperty = new CModifiableProperty(1, 0, 0);
        this.maxHealthProperty = new MaxHealthProperty(this, Number.MAX_VALUE, 0);
        if (BYMConfig.instance.RENDERER_ON) {
            this.m_children = new Vector<RasterDataContainer>(0, false, RasterDataContainer);
        }
        this.m_baseDepth = 0;
        this.m_isCleared = false;
        this.m_attackFlags = this.m_defenseFlags = 0;
        this.m_attackPriorityFlags = new Vector<int>(0, false, int);
    }

    public getRandomPointOnGraphic(): Point {
        let _loc1_: number = NaN;
        let _loc2_: number = NaN;
        _loc1_ = this.width * 0.25;
        _loc2_ = this.height * 0.25;
        let _loc3_: number = Math.random() * (_loc1_ * 2) - _loc1_;
        let _loc4_: number = Math.random() * (_loc2_ * 2) - _loc2_;
        return new Point(_loc3_, _loc4_);
    }

    public get isImmobile(): boolean {
        return this.moveSpeed <= 0;
    }

    public get isCleared(): boolean {
        return this.m_isCleared;
    }

    public get armor(): number {
        if (!this.armorProperty) {
            return 1;
        }

        return this.armorProperty.value;
    }

    public get moveSpeed(): number {
        if (!this.moveSpeedProperty) {
            return 0;
        }

        return this.moveSpeedProperty.value;
    }

    public get isTargetable(): boolean {
        return this.targetableStatus == 0;
    }

    public get defenseFlags(): int {
        return this.m_defenseFlags;
    }

    public get attackFlags(): int {
        return this.m_attackFlags;
    }

    public get attackPriorityFlags(): Vector<int> {
        return this.m_attackPriorityFlags;
    }

    public set attackFlags(param1: int) {
        this.m_attackFlags = param1;
    }

    public set defenseFlags(param1: int) {
        this.m_defenseFlags = param1;
    }

    public get graphic(): Sprite {
        return as3.as(this._mc, Sprite);
    }

    public get x(): number {
        return this._mc.x;
    }

    public get y(): number {
        return this._mc.y;
    }

    public get width(): number {
        return this._mc.width;
    }

    public get height(): number {
        return this._mc.height;
    }

    public get numChildren(): int {
        return !BYMConfig.instance.RENDERER_ON ? this.graphic.numChildren : this.m_children.length | 0;
    }

    public get maxHealth(): number {
        if (!this.maxHealthProperty) {
            return 0;
        }

        return this.maxHealthProperty.value;
    }

    public get health(): number {
        return this._health.Get();
    }

    public setHealth(param1: number): void {
        this._health.Set(param1);
    }

    public modifyHealth(param1: number, param2: ITargetable = null): number {
        return 0;
    }

    public addChild(param1: DisplayObject): DisplayObject {
        let _loc2_: Point = null;
        let _loc3_: Point = null;
        let _loc4_: IBitmapDrawable = null;
        if (!BYMConfig.instance.RENDERER_ON) {
            return this.graphic.addChild(param1);
        }
        if (as3.is(param1, IBitmapDrawable) === false && param1 instanceof SpriteSheetAnimation === false) {
            return param1;
        }
        _loc2_ = MAP.instance.offset;
        _loc3_ = new Point(this._mc.x + param1.x - _loc2_.x, this._mc.y + param1.y - _loc2_.y);
        _loc4_ = as3.cast(param1 instanceof SpriteSheetAnimation ? (as3.as(param1, SpriteSheetAnimation)).bitmapData : as3.as(param1, IBitmapDrawable), IBitmapDrawable);
        this.m_children.push(new RasterDataContainer(param1, new RasterData(_loc4_, _loc3_, int.MAX_VALUE), _loc3_, 0));
        return param1;
    }

    public removeChild(param1: DisplayObject): DisplayObject {
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        if (!BYMConfig.instance.RENDERER_ON) {
            return this.graphic.removeChild(param1);
        }
        _loc2_ = this.m_children.length | 0;
        while (_loc3_ < _loc2_) {
            if (as3.vget(this.m_children, _loc3_).m_source === param1) {
                as3.vget(this.m_children, _loc3_).clear();
                this.m_children.splice(_loc3_, 1);
                break;
            }
            _loc3_++;
        }
        return param1;
    }

    public getChildAt(param1: int): any {
        if (!BYMConfig.instance.RENDERER_ON) {
            return this.graphic.getChildAt(param1);
        }
        return as3.vget(this.m_children, param1).m_source;
    }

    public setChildIndex(param1: DisplayObject, param2: int): void {
        let _loc3_: Vector<RasterDataContainer> = null;
        let _loc4_: RasterDataContainer = null;
        if (!BYMConfig.instance.RENDERER_ON) {
            this.graphic.setChildIndex(param1, param2);
        } else {
            _loc3_ = this.m_children;
            for (_loc4_ of (_loc3_ ?? [])) {
                if (_loc4_.m_source === param1) {
                    _loc4_.m_depth = param2;
                    return;
                }
            }
        }
    }

    protected updateRasterData(): void {
        let _loc5_: RasterDataContainer = null;
        let _loc6_: RasterData = null;
        let _loc7_: Point = null;
        let _loc8_: number = NaN;
        let _loc9_: number = NaN;
        let _loc10_: number = NaN;
        let _loc11_: boolean = false;
        let _loc12_: int = 0;
        if (!BYMConfig.instance.RENDERER_ON) {
            return;
        }
        let _loc1_: Point = MAP.instance.offset;
        let _loc2_: Function = as3.bind(MAP.instance.viewRect, MAP.instance.viewRect.intersects);
        let _loc3_: Rectangle = new Rectangle();
        let _loc4_: int = this.m_children.length | 0;
        if (Boolean(this._mc) && Boolean(_loc4_)) {
            _loc9_ = this._mc.height * 0.5;
            if (this._middle) {
                _loc9_ = this._middle;
            }
            _loc10_ = this.m_baseDepth + (this._mc.y - _loc1_.y + _loc9_) * 1000 + (this._mc.x - _loc1_.x);
            while (_loc12_ < _loc4_) {
                _loc6_ = (_loc5_ = as3.vget(this.m_children, _loc12_)).m_rasterData;
                _loc7_ = _loc5_.m_rasterPt;
                _loc8_ = _loc5_.m_depth;
                if (Boolean(_loc6_) && Boolean(_loc7_)) {
                    _loc6_.depth = !(!_loc8_) ? _loc10_ + _loc8_ : _loc10_ + _loc12_ + 1;
                    _loc7_.x = this._mc.x + _loc5_.m_source.x - _loc1_.x;
                    _loc7_.y = this._mc.y + _loc5_.m_source.y - _loc1_.y;
                    _loc3_.x = _loc7_.x;
                    _loc3_.y = _loc7_.y;
                    _loc3_.width = _loc6_.rect.width;
                    _loc3_.height = _loc6_.rect.height;
                    _loc6_.visible = Boolean(_loc2_(_loc3_) && this._mc.visible);
                    _loc6_.alpha = this._mc.alpha;
                }
                _loc12_++;
            }
        }
    }

    public clear(): void {
        let _loc1_: RasterDataContainer = null;
        for (_loc1_ of (this.m_children ?? [])) {
            _loc1_.clear();
        }
        this.maxHealthProperty = null;
        this.moveSpeedProperty = null;
        this.armorProperty = null;
        this.m_children = null;
        this.m_isCleared = true;
    }
}

class RasterDataContainer extends ASObject {
    static {
        as3.fields(this, { m_source: null, m_rasterData: null, m_rasterPt: null, m_depth: NaN });
    }

    public m_source: DisplayObject;
    public m_rasterData: RasterData;
    public m_rasterPt: Point;
    public m_depth: number;

    public $ctor(param1?: DisplayObject, param2?: RasterData, param3?: Point, param4?: number): void {
        super.$ctor();
        this.m_source = param1;
        this.m_rasterData = param2;
        this.m_rasterPt = param3;
        this.m_depth = param4;
    }

    public clear(): void {
        if (this.m_rasterData) {
            this.m_rasterData.clear();
        }
        this.m_source = null;
        this.m_rasterData = null;
        this.m_rasterPt = null;
    }
}

import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { EventDispatcher, IEventDispatcher } from "flash/events";
import { Point } from "flash/geom";
import { IAttackable, ITargetable } from "@game";

export class ProjectileBase extends EventDispatcher implements ITargetable {
    static {
        as3.implement(this, [ITargetable]);
        as3.fields(this, { _startPoint: null, _targetPoint: null, _speed: NaN, _yd: NaN, _xd: NaN, _newX: 0, _newY: 0, _damage: NaN, _splash: NaN, _maxSpeed: NaN, _graphic: null, _rotation: NaN, _targetRotation: NaN, _rotationDifference: NaN, _rotationChange: NaN, _rotationEasing: NaN, _startDistance: 0, _distance: 0, _targetType: 0, _tmpX: NaN, _tmpY: NaN, _xChange: NaN, _yChange: NaN, _id: 0, _frameNumber: 4, _glaves: 0, _source: null });
    }

    public _startPoint: Point;
    public _targetPoint: Point;
    public _speed: number;
    public _yd: number;
    public _xd: number;
    public _newX: int;
    public _newY: int;
    public _damage: number;
    public _splash: number;
    public _maxSpeed: number;
    public _graphic: MovieClip;
    public _rotation: number;
    public _targetRotation: number;
    public _rotationDifference: number;
    public _rotationChange: number;
    public _rotationEasing: number;
    public _startDistance: int;
    public _distance: int;
    public _targetType: int;
    public _tmpX: number;
    public _tmpY: number;
    public _xChange: number;
    public _yChange: number;
    public _id: int;
    public _frameNumber: int;
    public _glaves: int;
    public _source: IAttackable;

    public $ctor(param1: IEventDispatcher = null): void {
        super.$ctor(param1);
    }

    public get x(): number {
        return this._graphic.x;
    }

    public get y(): number {
        return this._graphic.y;
    }

    public get defenseFlags(): int {
        return 0;
    }
}

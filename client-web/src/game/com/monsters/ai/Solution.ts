import * as as3 from "as3";
import { ASObject } from "as3";
import { Point } from "flash/geom";

export class Solution extends ASObject {
    static {
        as3.fields(this, { degrees: NaN, entryPoint: null, wayPoints: null, composition: null, targetBuilding: undefined, defensiveBuilding: undefined, resourcesGained: NaN, damageTaken: NaN, attack: null, targetHP: NaN, looters: null, tanks: null, dps: null, anything: null, distanceToTarget: NaN, nearestTower: null, attackTime: NaN, distances: null, towersInPath: null });
    }

    public degrees: number;
    public entryPoint: Point;
    public wayPoints: any[];
    public composition: any[];
    public targetBuilding: any;
    public defensiveBuilding: any;
    public resourcesGained: number;
    public damageTaken: number;
    public attack: any;
    public targetHP: number;
    public looters: any;
    public tanks: any;
    public dps: any;
    public anything: any;
    public distanceToTarget: number;
    public nearestTower: Point;
    public attackTime: number;
    public distances: any;
    public towersInPath: any[];

    public $ctor(param1?: number, param2?: number, param3?: number): void {
        super.$ctor();
        let _loc4_: number = 0.0174532925;
        this.degrees = param1;
        this.entryPoint = new Point(param2 * Math.cos(param1 * _loc4_), param3 * Math.sin(param1 * _loc4_));
        this.wayPoints = [];
        this.resourcesGained = 0;
        this.damageTaken = 0;
        this.targetHP = 0;
        this.towersInPath = [].concat();
    }

    public toString(): string {
        return "Solution";
    }
}

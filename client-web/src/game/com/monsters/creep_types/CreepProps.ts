import * as as3 from "as3";
import { uint } from "as3";
import { ExposedStructure } from "@game";

export class CreepProps extends ExposedStructure {
    static {
        as3.fields(this, { m_Speed: NaN, m_Health: 0, m_Damage: 0, m_BuildTime: 0, m_GooCost: 0, m_StorageCost: 0, m_Bucket: 0, m_TargetGroup: 0 });
    }

    private m_Speed: number;
    private m_Health: uint;
    private m_Damage: uint;
    private m_BuildTime: uint;
    private m_GooCost: uint;
    private m_StorageCost: uint;
    private m_Bucket: uint;
    private m_TargetGroup: uint;

    public $ctor(): void {
        super.$ctor();
    }

    public get speed(): number {
        return this.m_Speed;
    }

    public set speed(param1: number) {
        this.m_Speed = param1;
    }

    public get health(): uint {
        return this.m_Health;
    }

    public set health(param1: uint) {
        this.m_Health = param1;
    }

    public get damage(): uint {
        return this.m_Damage;
    }

    public set damage(param1: uint) {
        this.m_Damage = param1;
    }

    public get buildTime(): uint {
        return this.m_BuildTime;
    }

    public set buildTime(param1: uint) {
        this.m_BuildTime = param1;
    }

    public get gooCost(): uint {
        return this.m_GooCost;
    }

    public set gooCost(param1: uint) {
        this.m_GooCost = param1;
    }

    public get storageCost(): uint {
        return this.m_StorageCost;
    }

    public set storageCost(param1: uint) {
        this.m_StorageCost = param1;
    }

    public get bucket(): uint {
        return this.m_Bucket;
    }

    public set bucket(param1: uint) {
        this.m_Bucket = param1;
    }

    public get targetGroup(): uint {
        return this.m_TargetGroup;
    }

    public set targetGroup(param1: uint) {
        this.m_TargetGroup = param1;
    }

    protected override _Init(): void {
        super._Init();
    }

    protected override _Destroy(): void {
        super._Destroy();
    }
}

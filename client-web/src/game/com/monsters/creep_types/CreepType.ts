import * as as3 from "as3";
import { Vector, uint } from "as3";
import { CreepProps, CreepTypeManager, CreepUpgrade, ExposedObject } from "@game";

export class CreepType extends ExposedObject {
    static {
        as3.fields(this, { m_Id$CreepType: null, m_Name: null, m_Description: null, m_Index: 0, m_Page: 0, m_Order: 0, m_Resource: 0, m_Time: 0, m_Level: 0, m_Stream: null, m_BaseProps: null, m_Upgrades: null, trainingCosts: null, props: null, dependent: "", type: "", movement: "", pathing: "", blocked: false, classType: null });
    }

    private m_Id$CreepType: string;
    private m_Name: string;
    private m_Description: string;
    private m_Index: uint;
    private m_Page: uint;
    private m_Order: uint;
    private m_Resource: uint;
    private m_Time: uint;
    private m_Level: uint;
    private m_Stream: Vector<string>;
    private m_BaseProps: CreepProps;
    private m_Upgrades: Vector<CreepUpgrade>;
    public trainingCosts: any[];
    public props: any;
    public dependent: string;
    public type: string;
    public movement: string;
    public pathing: string;
    public blocked: boolean;
    public classType: any;

    public $ctor(): void {
        this.m_Stream = new Vector<string>(0, false, String);
        this.m_BaseProps = new CreepProps();
        this.m_Upgrades = new Vector<CreepUpgrade>(0, false, CreepUpgrade);
        this.trainingCosts = new Array();
        this.props = new Object();
        super.$ctor();
    }

    public get id(): string {
        return this.m_Id$CreepType;
    }

    public set id(param1: string) {
        this.m_Id$CreepType = param1;
    }

    public get name(): string {
        return this.m_Name;
    }

    public set name(param1: string) {
        this.m_Name = param1;
    }

    public get description(): string {
        return this.m_Description;
    }

    public set description(param1: string) {
        this.m_Description = param1;
    }

    public get index(): uint {
        return this.m_Index;
    }

    public set index(param1: uint) {
        this.m_Index = param1;
    }

    public get page(): uint {
        return this.m_Page;
    }

    public set page(param1: uint) {
        this.m_Page = param1;
    }

    public get order(): uint {
        return this.m_Order;
    }

    public set order(param1: uint) {
        this.m_Order = param1;
    }

    public get resource(): uint {
        return this.m_Resource;
    }

    public set resource(param1: uint) {
        this.m_Resource = param1;
    }

    public get time(): uint {
        return this.m_Time;
    }

    public set time(param1: uint) {
        this.m_Time = param1;
    }

    public get level(): uint {
        return this.m_Level;
    }

    public set level(param1: uint) {
        this.m_Level = param1;
    }

    public get baseProps(): CreepProps {
        return this.m_BaseProps;
    }

    public set baseProps(param1: CreepProps) {
        this.m_BaseProps = param1;
    }

    public get upgrades(): Vector<CreepUpgrade> {
        return this.m_Upgrades;
    }

    public set upgrades(param1: Vector<CreepUpgrade>) {
        this.m_Upgrades = param1;
    }

    public get stream(): Vector<string> {
        return this.m_Stream;
    }

    public set stream(param1: Vector<string>) {
        this.m_Stream = param1;
    }

    protected override _Init(): void {
        let _loc3_: CreepUpgrade = null;
        super._Init();
        CreepTypeManager.instance.RegisterCreepType(this);
        this.props.speed = [this.m_BaseProps.speed];
        this.props.health = [this.m_BaseProps.health];
        this.props.damage = [this.m_BaseProps.damage];
        this.props.cTime = [this.m_BaseProps.buildTime];
        this.props.cResource = [this.m_BaseProps.gooCost];
        this.props.cStorage = [this.m_BaseProps.storageCost];
        this.props.bucket = [this.m_BaseProps.bucket];
        this.props.targetGroup = [this.m_BaseProps.targetGroup];
        let _loc1_: uint = this.m_Upgrades.length >>> 0;
        let _loc2_: uint = 0;
        while (_loc2_ < _loc1_) {
            _loc3_ = as3.vget(this.m_Upgrades, _loc2_);
            this.trainingCosts.push([_loc3_.upgradePuttyCost, _loc3_.upgradeTime]);
            this.props.speed.push(_loc3_.upgradeProps.speed);
            this.props.health.push(_loc3_.upgradeProps.health);
            this.props.damage.push(_loc3_.upgradeProps.damage);
            this.props.cTime.push(_loc3_.upgradeProps.buildTime);
            this.props.cResource.push(_loc3_.upgradeProps.gooCost);
            this.props.cStorage.push(_loc3_.upgradeProps.storageCost);
            this.props.bucket.push(_loc3_.upgradeProps.bucket);
            this.props.targetGroup.push(_loc3_.upgradeProps.targetGroup);
            _loc2_++;
        }
    }

    protected override _Destroy(): void {
        CreepTypeManager.instance.DeregisterCreepType(this);
        this.trainingCosts.length = 0;
        this.trainingCosts = null;
        this.props = null;
        super._Destroy();
    }
}

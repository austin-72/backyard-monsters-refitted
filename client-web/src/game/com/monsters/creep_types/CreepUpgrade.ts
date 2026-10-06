import * as as3 from "as3";
import { uint } from "as3";
import { CreepProps, ExposedStructure } from "@game";

export class CreepUpgrade extends ExposedStructure {
    static {
        as3.fields(this, { m_UpgradePuttyCost: 0, m_UpgradeTime: 0, m_UpgradeProps: null });
    }

    private m_UpgradePuttyCost: uint;
    private m_UpgradeTime: uint;
    private m_UpgradeProps: CreepProps;

    public $ctor(): void {
        this.m_UpgradeProps = new CreepProps();
        super.$ctor();
    }

    public get upgradePuttyCost(): uint {
        return this.m_UpgradePuttyCost;
    }

    public set upgradePuttyCost(param1: uint) {
        this.m_UpgradePuttyCost = param1;
    }

    public get upgradeTime(): uint {
        return this.m_UpgradeTime;
    }

    public set upgradeTime(param1: uint) {
        this.m_UpgradeTime = param1;
    }

    public get upgradeProps(): CreepProps {
        return this.m_UpgradeProps;
    }

    public set upgradeProps(param1: CreepProps) {
        this.m_UpgradeProps = param1;
    }

    protected override _Init(): void {
        super._Init();
    }

    protected override _Destroy(): void {
        super._Destroy();
    }
}

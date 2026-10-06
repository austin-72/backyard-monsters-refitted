import * as as3 from "as3";
import { BitmapFilter, GlowFilter } from "flash/filters";
import { ArmorPropertyModifier, Component, DivisionModifier, IPropertyModifier, MultiplicationPropertyModifier, SPECIALEVENT } from "@game";

export class Enrage extends Component {
    static {
        as3.fields(this, { m_moveSpeedModifier: null, m_attackSpeedModifier: null, m_armorModifier: null, m_filter: null, m_sourceCreatureID: null });
    }

    private m_moveSpeedModifier: IPropertyModifier;
    private m_attackSpeedModifier: IPropertyModifier;
    private m_armorModifier: IPropertyModifier;
    private m_filter: BitmapFilter;
    private m_sourceCreatureID: string;

    public $ctor(param1?: number, param2?: number, param3: string = null): void {
        super.$ctor();
        this.m_moveSpeedModifier = new MultiplicationPropertyModifier(param1);
        this.m_attackSpeedModifier = new DivisionModifier(param1);
        this.m_armorModifier = new ArmorPropertyModifier(param2);
        this.m_sourceCreatureID = param3;

        let activeEvent: any = SPECIALEVENT.getActiveSpecialEvent();
        if (activeEvent.active && this.m_sourceCreatureID != "G3") {
            this.m_filter = new GlowFilter(13582340, 1, 3, 3, 5, 1);
            return;
        }
        this.m_filter = new GlowFilter(16724735, 0.6, 8, 8, 4, 3);
        if (param3 == "IO_SULFUR") {
            // Inferno Catapult: the Sulfur Bomb's rage glows sulfur yellow, not putty pink.
            this.m_filter = new GlowFilter(16766720, 0.7, 8, 8, 4, 3);
        }
    }

    protected override onUnregister(): void {
        if (!this.owner || !this.owner.moveSpeedProperty || !this.owner.attackDelayProperty || !this.owner.armorProperty) {
            return;
        }
        this.owner.moveSpeedProperty.removeModifier(this.m_moveSpeedModifier);
        this.owner.attackDelayProperty.removeModifier(this.m_attackSpeedModifier);
        this.owner.armorProperty.removeModifier(this.m_armorModifier);
        this.owner.removeFilter(this.m_filter);
    }

    protected override onRegister(): void {
        if (!this.owner || !this.owner.moveSpeedProperty || !this.owner.attackDelayProperty || !this.owner.armorProperty) {
            return;
        }

        this.owner.moveSpeedProperty.addModifier(this.m_moveSpeedModifier);
        this.owner.attackDelayProperty.addModifier(this.m_attackSpeedModifier);
        this.owner.armorProperty.addModifier(this.m_armorModifier);
        this.owner.addFilter(this.m_filter);
    }
}

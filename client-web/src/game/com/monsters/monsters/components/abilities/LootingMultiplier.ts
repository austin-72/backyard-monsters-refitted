import * as as3 from "as3";
import { BitmapFilter, GlowFilter } from "flash/filters";
import { AdditionPropertyModifier, CModifiableProperty, Component, MonsterBase } from "@game";

export class LootingMultiplier extends Component {
    static {
        as3.fields(this, { m_multiplier: NaN, m_modifier: null, m_lootingProperty: null, m_filter: null });
    }

    protected m_multiplier: number;
    protected m_modifier: LootingModifier;
    protected m_lootingProperty: CModifiableProperty;
    private m_filter: BitmapFilter;

    public $ctor(param1?: number): void {
        super.$ctor();
        this.m_multiplier = param1;
    }

    protected override onRegister(): void {
        this.m_lootingProperty = as3.as(this.owner.getComponentByName(MonsterBase.k_LOOT_PROPERTY), CModifiableProperty);
        if (this.m_lootingProperty) {
            this.m_modifier = new LootingModifier(this.m_multiplier);
            this.m_lootingProperty.addModifier(this.m_modifier);
            if (!this.m_filter) {
                this.m_filter = new GlowFilter(5635873, 0.6, 8, 8, 4, 3);
                this.owner.addFilter(this.m_filter);
            }
        }
    }

    protected override onUnregister(): void {
        if (Boolean(this.m_lootingProperty) && Boolean(this.m_modifier)) {
            this.m_lootingProperty.removeModifier(this.m_modifier);
        }
        if (this.m_filter) {
            this.owner.removeFilter(this.m_filter);
        }
    }
}

class LootingModifier extends AdditionPropertyModifier {
    public $ctor(param1?: number): void {
        super.$ctor(param1);
    }
}

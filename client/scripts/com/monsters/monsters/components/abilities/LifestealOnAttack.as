package com.monsters.monsters.components.abilities {
    import com.monsters.interfaces.IAttackable;
    import com.monsters.interfaces.ITargetable;
    import com.monsters.monsters.components.Component;
    import com.monsters.monsters.components.IAttackingComponent;

    /**
     * Inferno-only: heals the owner for a share of every hit it lands (the Emberghoul's Stoke). The share is of
     * the damage the hit actually did (after armour; a building or monster already down gives nothing), and the
     * heal never goes above the owner's maximum health.
     */
    public class LifestealOnAttack extends Component implements IAttackingComponent {

        private var m_ratio:Number;

        /** Health given back so far (for tests). */
        public var healed:Number = 0;

        public function LifestealOnAttack(ratio:Number) {
            super();
            this.m_ratio = ratio;
        }

        public function get ratio():Number {
            return this.m_ratio;
        }

        public function onAttack(param1:IAttackable, param2:Number, param3:ITargetable = null):Number {
            if (!owner || owner.health <= 0 || owner.health >= owner.maxHealth) {
                return 0;
            }
            var heal:Number = Math.min(Math.abs(param2) * this.m_ratio, owner.maxHealth - owner.health);
            if (heal > 0) {
                owner.modifyHealth(heal);
                this.healed += heal;
            }
            return 0;
        }
    }
}

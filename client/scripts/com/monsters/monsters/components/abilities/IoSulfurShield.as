package com.monsters.monsters.components.abilities {
    import com.monsters.interfaces.IAttackable;
    import com.monsters.interfaces.IPropertyModifier;
    import com.monsters.interfaces.ITargetable;
    import com.monsters.monsters.components.Component;
    import com.monsters.monsters.components.IDefendingComponent;
    import com.monsters.monsters.components.modifiers.DivisionModifier;
    import com.monsters.monsters.components.modifiers.MultiplicationPropertyModifier;
    import flash.filters.GlowFilter;
    import flash.utils.getTimer;

    /**
     * Inferno Catapult: the Sulfur Bomb's effect on your monsters.
     *
     * Speed (move and attack) for the whole time. Armour (the share of damage removed): 100% (invulnerable)
     * for `invuln` seconds, then it fades evenly from `armor`% to 0 by the end of `total` seconds, when the
     * component removes itself. The glow shows the armour: red at 100%, orange from 99% to 45%, yellow
     * from 44% to 1%.
     */
    public class IoSulfurShield extends Component implements IDefendingComponent {

        private static const RED:uint = 0xFF2020;

        private static const ORANGE:uint = 0xFF8C00;

        private static const YELLOW:uint = 0xFFE000;

        private var m_moveSpeedModifier:IPropertyModifier;

        private var m_attackSpeedModifier:IPropertyModifier;

        private var m_invulnMs:Number;

        private var m_armor:Number;

        private var m_totalMs:Number;

        private var m_start:int;

        private var m_filter:GlowFilter;

        private var m_band:int = -1;

        public function IoSulfurShield(speed:Number, invulnSeconds:Number, totalSeconds:Number, armor:Number = 99) {
            super();
            this.m_moveSpeedModifier = new MultiplicationPropertyModifier(speed);
            this.m_attackSpeedModifier = new DivisionModifier(speed);
            this.m_invulnMs = Math.max(0, invulnSeconds) * 1000;
            this.m_armor = Math.max(0, Math.min(99, armor));
            this.m_totalMs = Math.max(this.m_invulnMs + 1000, totalSeconds * 1000);
            this.m_start = getTimer();
        }

        /** Armour now, as a percentage: 100 while invulnerable, then `armor` down to 0. */
        public function get armorPercent():int {
            var t:Number = getTimer() - this.m_start;
            if (t < this.m_invulnMs) {
                return 100;
            }
            if (t >= this.m_totalMs) {
                return 0;
            }
            return Math.ceil(this.m_armor * (1 - (t - this.m_invulnMs) / (this.m_totalMs - this.m_invulnMs)));
        }

        public function onDefend(target:IAttackable, amount:Number, source:ITargetable = null):Number {
            if (amount >= 0) {
                return amount;
            }
            return amount * (1 - this.armorPercent / 100);
        }

        override protected function onRegister():void {
            if (!owner || !owner.moveSpeedProperty || !owner.attackDelayProperty) {
                return;
            }
            owner.moveSpeedProperty.addModifier(this.m_moveSpeedModifier);
            owner.attackDelayProperty.addModifier(this.m_attackSpeedModifier);
            this.updateGlow();
        }

        override protected function onUnregister():void {
            if (!owner || !owner.moveSpeedProperty || !owner.attackDelayProperty) {
                return;
            }
            owner.moveSpeedProperty.removeModifier(this.m_moveSpeedModifier);
            owner.attackDelayProperty.removeModifier(this.m_attackSpeedModifier);
            if (this.m_filter) {
                owner.removeFilter(this.m_filter);
                this.m_filter = null;
            }
        }

        override public function tick(ticks:int = 1):void {
            if (!owner) {
                return;
            }
            if (getTimer() - this.m_start >= this.m_totalMs) {
                owner.removeComponent(this);
                return;
            }
            this.updateGlow();
        }

        private function updateGlow():void {
            var armor:int = this.armorPercent;
            var band:int = armor >= 100 ? 0 : (armor >= 45 ? 1 : 2);
            if (band == this.m_band) {
                return;
            }
            this.m_band = band;
            if (this.m_filter) {
                owner.removeFilter(this.m_filter);
            }
            this.m_filter = new GlowFilter(band == 0 ? RED : (band == 1 ? ORANGE : YELLOW), 0.8, 8, 8, 4, 3);
            owner.addFilter(this.m_filter);
        }
    }
}

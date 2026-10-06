package com.monsters.monsters.components.abilities {
    import com.monsters.monsters.components.Component;
    import com.monsters.monsters.components.modifiers.MultiplicationPropertyModifier;
    import flash.filters.GlowFilter;

    /**
     * Inferno-only: rooted by an Ashkarr's war-cry (WarCry). The game has no stun, so this holds the monster's
     * movement speed at almost nothing for a while; its attack speed is untouched, so it still attacks whatever
     * it can reach. While rooted it has a faint white glow (GLOW). One per monster: another roar makes it last
     * longer, never deeper.
     */
    public class StunEffect extends Component {

        public static const HOLD:Number = 0.001;

        private var m_left:int;

        private var m_modifier:MultiplicationPropertyModifier = new MultiplicationPropertyModifier(HOLD);

        public static const GLOW_COLOR:uint = 0xFFFFFF;

        private var m_glow:GlowFilter = new GlowFilter(GLOW_COLOR, 0.4, 6, 6, 2, 2);

        public function get glow():GlowFilter {
            return this.m_glow;
        }

        public function StunEffect(ticks:int) {
            super();
            this.m_left = ticks;
        }

        /** Game steps left. */
        public function get left():int {
            return this.m_left;
        }

        public function renew(ticks:int):void {
            this.m_left = Math.max(this.m_left, ticks);
        }

        override protected function onRegister():void {
            if (owner && owner.moveSpeedProperty) {
                owner.moveSpeedProperty.addModifier(this.m_modifier);
            }
            if (owner) {
                owner.addFilter(this.m_glow);
            }
        }

        override protected function onUnregister():void {
            if (owner && owner.moveSpeedProperty) {
                owner.moveSpeedProperty.removeModifier(this.m_modifier);
            }
            if (owner) {
                owner.removeFilter(this.m_glow);
            }
        }

        override public function tick(param1:int = 1):void {
            this.m_left -= param1;
            if (this.m_left <= 0 && owner) {
                owner.removeComponent(this);
            }
        }
    }
}

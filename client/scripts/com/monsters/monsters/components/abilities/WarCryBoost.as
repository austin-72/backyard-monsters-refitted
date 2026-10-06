package com.monsters.monsters.components.abilities {
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.components.Component;
    import com.monsters.monsters.components.modifiers.MultiplicationPropertyModifier;
    import flash.filters.GlowFilter;

    /**
     * Inferno-only: the speed an Ashkarr's war-cry gives a monster of her side (WarCry). Movement speed only: no
     * armour or attack speed. While it lasts the monster glows pink (GLOW). A monster has at most one, however
     * many Ashkarrs roar at it: each Ashkarr's roar is remembered for its own time, and the boost is the
     * strongest of those still running, never their sum. When the strongest runs out, a weaker one still
     * running takes over; when none is left the boost goes.
     * It is a modifier of its own, so it multiplies with a rage bomb's Enrage rather than replacing it.
     */
    public class WarCryBoost extends Component {

        /** One entry per Ashkarr: {source, mult, left (game steps)}. */
        private var m_roars:Array = [];

        private var m_modifier:MultiplicationPropertyModifier = null;

        /** Pink, the rage bomb's colour (Enrage), a little softer. */
        public static const GLOW_COLOR:uint = 0xFF33FF;

        private var m_glow:GlowFilter = new GlowFilter(GLOW_COLOR, 0.55, 8, 8, 3, 2);

        public function WarCryBoost(source:MonsterBase, multiplier:Number, ticks:int) {
            super();
            this.m_roars.push({"source": source, "mult": multiplier, "left": ticks});
        }

        /** The multiplier in force now (1 when none). */
        public function get multiplier():Number {
            return this.m_modifier ? this.m_modifier.multiple : 1;
        }

        /** How many Ashkarrs' roars are running on this monster (not what it gets: that is the strongest). */
        public function get roars():int {
            return this.m_roars.length;
        }

        /** Another roar reaches the monster: that Ashkarr's boost starts again. */
        public function renew(source:MonsterBase, multiplier:Number, ticks:int):void {
            var roar:Object = null;
            for each (roar in this.m_roars) {
                if (roar.source == source) {
                    roar.mult = multiplier;
                    roar.left = ticks;
                    this.apply();
                    return;
                }
            }
            this.m_roars.push({"source": source, "mult": multiplier, "left": ticks});
            this.apply();
        }

        /** Puts the strongest running boost on the monster's speed (and only that one). */
        private function apply():void {
            var best:Number = 1;
            var roar:Object = null;
            for each (roar in this.m_roars) {
                best = Math.max(best, Number(roar.mult));
            }
            if (!owner || !owner.moveSpeedProperty) {
                return;
            }
            if (this.m_modifier && this.m_modifier.multiple == best) {
                return;
            }
            if (this.m_modifier) {
                owner.moveSpeedProperty.removeModifier(this.m_modifier);
                this.m_modifier = null;
            }
            if (best > 1) {
                this.m_modifier = new MultiplicationPropertyModifier(best);
                owner.moveSpeedProperty.addModifier(this.m_modifier);
            }
        }

        public function get glow():GlowFilter {
            return this.m_glow;
        }

        override protected function onRegister():void {
            this.apply();
            if (owner) {
                owner.addFilter(this.m_glow);
            }
        }

        override protected function onUnregister():void {
            if (owner && owner.moveSpeedProperty && this.m_modifier) {
                owner.moveSpeedProperty.removeModifier(this.m_modifier);
            }
            if (owner) {
                owner.removeFilter(this.m_glow);
            }
            this.m_modifier = null;
        }

        override public function tick(param1:int = 1):void {
            var i:int = this.m_roars.length - 1;
            while (i >= 0) {
                this.m_roars[i].left -= param1;
                if (this.m_roars[i].left <= 0) {
                    this.m_roars.splice(i, 1);
                }
                i--;
            }
            if (this.m_roars.length == 0) {
                if (owner) {
                    owner.removeComponent(this);
                }
                return;
            }
            this.apply();
        }
    }
}

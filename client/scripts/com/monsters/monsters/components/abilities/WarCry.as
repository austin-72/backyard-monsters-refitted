package com.monsters.monsters.components.abilities {
    import com.monsters.monsters.MonsterBase;
    import com.monsters.monsters.components.Component;
    import com.monsters.monsters.creeps.inferno.Ashkarr;
    import flash.geom.Point;

    /**
     * Inferno-only: Ashkarr's war-cry (her ASHKARR.md). While she is in battle she roars every `cooldown` game
     * steps (the first as soon as she is), and at each roar:
     *  - every monster of her side within `radius` (not herself) moves faster for `boostTicks` and glows pink
     *    (WarCryBoost: one per monster whichever Ashkarr roared, so two or more never add up; the strongest
     *    counts);
     *  - every monster of the other side within `radius` is rooted for `rootTicks` with a faint white glow
     *    (StunEffect: it can't move, and still attacks what it can reach).
     * The boost lasts longer than the wait between roars (11 seconds against 10), so a monster still in range
     * at the next roar keeps it without a break; one that left runs out. Timed in game steps (80 a second), so
     * a faster game or a replay keeps the same rhythm.
     */
    public class WarCry extends Component {

        public static const BOOST_NAME:String = "warCryBoost";

        public static const ROOT_NAME:String = "warCryRoot";

        private var m_herald:Ashkarr;

        private var m_radius:Number;

        private var m_cooldown:int;

        private var m_speed:Number;

        private var m_boostTicks:int;

        private var m_rootTicks:int;

        /** Steps until she may roar again; 0 = at once. */
        private var m_wait:int = 0;

        public function WarCry(herald:Ashkarr, radius:Number, cooldownTicks:int, speedMultiplier:Number, boostTicks:int, rootTicks:int) {
            super();
            this.m_herald = herald;
            this.m_radius = radius;
            this.m_cooldown = cooldownTicks;
            this.m_speed = speedMultiplier;
            this.m_boostTicks = boostTicks;
            this.m_rootTicks = rootTicks;
        }

        public function get speedMultiplier():Number {
            return this.m_speed;
        }

        override public function tick(param1:int = 1):void {
            if (this.m_wait > 0) {
                this.m_wait -= param1;
            }
            if (!owner || owner.health <= 0 || !owner.inBattleState || this.m_wait > 0) {
                return;
            }
            this.m_wait = this.m_cooldown;
            this.cry();
        }

        /** One roar: boosts her side, roots the other. */
        public function cry():void {
            var here:Point = new Point(owner.x, owner.y);
            var entry:Object = null;
            var monster:MonsterBase = null;
            if (this.m_herald) {
                this.m_herald.roar();
            }
            var friends:int = Targeting.getFriendlyFlag(owner) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_INVISIBLE;
            for each (entry in Targeting.getTargetsInRange(this.m_radius, here, friends)) {
                monster = entry.creep as MonsterBase;
                if (!monster || monster == owner || monster.health <= 0 || !monster.moveSpeedProperty) {
                    continue;
                }
                var boost:WarCryBoost = monster.getComponentByName(BOOST_NAME) as WarCryBoost;
                if (boost) {
                    boost.renew(owner, this.m_speed, this.m_boostTicks);
                }
                else {
                    monster.addComponent(new WarCryBoost(owner, this.m_speed, this.m_boostTicks), BOOST_NAME);
                }
            }
            var foes:int = Targeting.getEnemyFlag(owner) | Targeting.k_TARGETS_GROUND | Targeting.k_TARGETS_FLYING | Targeting.k_TARGETS_INVISIBLE;
            for each (entry in Targeting.getTargetsInRange(this.m_radius, here, foes)) {
                monster = entry.creep as MonsterBase;
                if (!monster || monster.health <= 0 || !monster.moveSpeedProperty) {
                    continue;
                }
                var root:StunEffect = monster.getComponentByName(ROOT_NAME) as StunEffect;
                if (root) {
                    root.renew(this.m_rootTicks);
                }
                else {
                    monster.addComponent(new StunEffect(this.m_rootTicks), ROOT_NAME);
                }
            }
        }
    }
}

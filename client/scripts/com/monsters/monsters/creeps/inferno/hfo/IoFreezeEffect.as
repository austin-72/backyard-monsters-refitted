package com.monsters.monsters.creeps.inferno.hfo {
    import com.monsters.display.SpriteData;
    import com.monsters.display.SpriteSheetAnimation;
    import com.monsters.monsters.components.Component;
    import com.monsters.monsters.components.modifiers.MultiplicationPropertyModifier;
    import flash.filters.ColorMatrixFilter;
    import flash.filters.GlowFilter;

    /**
     * Hell Freezes Over: a monster frozen by an ice monster's hit (IoIce): for one second it can't move or
     * attack. It glows blue, wears an icy shell (effects/monsterfreeze.png, 8 frames looping) and the frost icon.
     * Hit again while frozen, the second starts again; it never adds up. One per monster (NAME).
     */
    public class IoFreezeEffect extends Component {

        public static const NAME:String = "ioFreeze";

        /** One second of game steps (80 a second). */
        public static const TICKS:int = 80;

        public static const HOLD:Number = 0.001;

        private var m_left:int = TICKS;

        private var m_hold:MultiplicationPropertyModifier = new MultiplicationPropertyModifier(HOLD);

        private var m_glow:GlowFilter = new GlowFilter(0x7FD8FF, 0.9, 10, 10, 3, 2);

        private var m_tint:ColorMatrixFilter = new ColorMatrixFilter([
                    0.45, 0.1, 0.1, 0, 0,
                    0.1, 0.6, 0.15, 0, 20,
                    0.1, 0.2, 0.9, 0, 70,
                    0, 0, 0, 1, 0
                ]);

        private var m_shell:SpriteSheetAnimation;

        private var m_icon:SpriteSheetAnimation;

        private var m_step:int = 0;

        public function IoFreezeEffect() {
            super();
        }

        /** Freezes `monster` for a second (or starts its second again). */
        public static function freeze(monster:*):void {
            if (!monster || monster.health <= 0 || monster.dead) {
                return;
            }
            var had:IoFreezeEffect = monster.getComponentByName(NAME) as IoFreezeEffect;
            if (had) {
                had.renew();
                return;
            }
            monster.addComponent(new IoFreezeEffect(), NAME);
        }

        public function renew():void {
            this.m_left = TICKS;
        }

        public function get left():int {
            return this.m_left;
        }

        override protected function onRegister():void {
            if (!owner) {
                return;
            }
            if (owner.moveSpeedProperty) {
                owner.moveSpeedProperty.addModifier(this.m_hold);
            }
            owner.addFilter(this.m_tint);
            owner.addFilter(this.m_glow);
            owner.attackCooldown = Math.max(owner.attackCooldown, 2);
            SPRITES.SetupSprite("monsterfreeze");
            SPRITES.SetupSprite("frost");
            var shellData:SpriteData = SPRITES.GetSpriteDescriptor("monsterfreeze") as SpriteData;
            var iconData:SpriteData = SPRITES.GetSpriteDescriptor("frost") as SpriteData;
            if (shellData) {
                this.m_shell = new SpriteSheetAnimation(shellData, 8);
                this.m_shell.doesRepeat = true;
                this.m_shell.play();
                this.m_shell.render();
                this.m_shell.x = -32;
                this.m_shell.y = -46 - owner._altitude;
                owner.addChild(this.m_shell);
            }
            if (iconData) {
                this.m_icon = new SpriteSheetAnimation(iconData, 1);
                this.m_icon.render();
                this.m_icon.x = -8;
                this.m_icon.y = -66 - owner._altitude;
                owner.addChild(this.m_icon);
            }
        }

        override protected function onUnregister():void {
            if (!owner) {
                return;
            }
            if (owner.moveSpeedProperty) {
                owner.moveSpeedProperty.removeModifier(this.m_hold);
            }
            owner.removeFilter(this.m_tint);
            owner.removeFilter(this.m_glow);
            if (this.m_shell) {
                owner.removeChild(this.m_shell);
            }
            if (this.m_icon) {
                owner.removeChild(this.m_icon);
            }
            this.m_shell = null;
            this.m_icon = null;
        }

        override public function tick(param1:int = 1):void {
            this.m_left -= param1;
            if (owner) {
                // (it can't strike: its next attack never comes while it is frozen)
                owner.attackCooldown = Math.max(owner.attackCooldown, 2);
                if (this.m_shell && ++this.m_step % 6 == 0) {
                    this.m_shell.update();
                }
                if (this.m_left <= 0 || owner.health <= 0) {
                    owner.removeComponent(this);
                }
            }
        }
    }
}

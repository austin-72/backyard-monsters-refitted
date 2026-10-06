import * as as3 from "as3";
import { int } from "as3";
import { ColorMatrixFilter, GlowFilter } from "flash/filters";
import { Component, MultiplicationPropertyModifier, SPRITES, SpriteData, SpriteSheetAnimation } from "@game";

/**
 * Hell Freezes Over: a monster frozen by an ice monster's hit (IoIce): for one second it can't move or
 * attack. It glows blue, wears an icy shell (effects/monsterfreeze.png, 8 frames looping) and the frost icon.
 * Hit again while frozen, the second starts again; it never adds up. One per monster (NAME).
 */
export class IoFreezeEffect extends Component {
    static {
        as3.fields(this, { m_left: 0, m_hold: null, m_glow: null, m_tint: null, m_shell: null, m_icon: null, m_step: 0 });
    }

    public static readonly NAME: string = "ioFreeze";

    /** One second of game steps (80 a second). */
    public static readonly TICKS: int = 80;

    public static readonly HOLD: number = 0.001;
    private m_left: int;
    private m_hold: MultiplicationPropertyModifier;
    private m_glow: GlowFilter;
    private m_tint: ColorMatrixFilter;
    private m_shell: SpriteSheetAnimation;
    private m_icon: SpriteSheetAnimation;
    private m_step: int;

    public $ctor(): void {
        this.m_left = IoFreezeEffect.TICKS;
        this.m_hold = new MultiplicationPropertyModifier(IoFreezeEffect.HOLD);
        this.m_glow = new GlowFilter(0x7FD8FF, 0.9, 10, 10, 3, 2);
        this.m_tint = new ColorMatrixFilter([0.45, 0.1, 0.1, 0, 0, 0.1, 0.6, 0.15, 0, 20, 0.1, 0.2, 0.9, 0, 70, 0, 0, 0, 1, 0]);
        super.$ctor();
    }

    /** Freezes `monster` for a second (or starts its second again). */
    public static freeze(monster: any): void {
        if (!monster || monster.health <= 0 || monster.dead) {
            return;
        }
        let had: IoFreezeEffect = as3.as(monster.getComponentByName(IoFreezeEffect.NAME), IoFreezeEffect);
        if (had) {
            had.renew();
            return;
        }
        monster.addComponent(new IoFreezeEffect(), IoFreezeEffect.NAME);
    }

    public renew(): void {
        this.m_left = IoFreezeEffect.TICKS;
    }

    public get left(): int {
        return this.m_left;
    }

    protected override onRegister(): void {
        if (!this.owner) {
            return;
        }
        if (this.owner.moveSpeedProperty) {
            this.owner.moveSpeedProperty.addModifier(this.m_hold);
        }
        this.owner.addFilter(this.m_tint);
        this.owner.addFilter(this.m_glow);
        this.owner.attackCooldown = Math.max(this.owner.attackCooldown, 2) | 0;
        SPRITES.SetupSprite("monsterfreeze");
        SPRITES.SetupSprite("frost");
        let shellData: SpriteData = as3.as(SPRITES.GetSpriteDescriptor("monsterfreeze"), SpriteData);
        let iconData: SpriteData = as3.as(SPRITES.GetSpriteDescriptor("frost"), SpriteData);
        if (shellData) {
            this.m_shell = new SpriteSheetAnimation(shellData, 8);
            this.m_shell.doesRepeat = true;
            this.m_shell.play();
            this.m_shell.render();
            this.m_shell.x = -32;
            this.m_shell.y = -46 - this.owner._altitude;
            this.owner.addChild(this.m_shell);
        }
        if (iconData) {
            this.m_icon = new SpriteSheetAnimation(iconData, 1);
            this.m_icon.render();
            this.m_icon.x = -8;
            this.m_icon.y = -66 - this.owner._altitude;
            this.owner.addChild(this.m_icon);
        }
    }

    protected override onUnregister(): void {
        if (!this.owner) {
            return;
        }
        if (this.owner.moveSpeedProperty) {
            this.owner.moveSpeedProperty.removeModifier(this.m_hold);
        }
        this.owner.removeFilter(this.m_tint);
        this.owner.removeFilter(this.m_glow);
        if (this.m_shell) {
            this.owner.removeChild(this.m_shell);
        }
        if (this.m_icon) {
            this.owner.removeChild(this.m_icon);
        }
        this.m_shell = null;
        this.m_icon = null;
    }

    public override tick(param1: int = 1): void {
        this.m_left -= param1;
        if (this.owner) {
            // (it can't strike: its next attack never comes while it is frozen)
            this.owner.attackCooldown = Math.max(this.owner.attackCooldown, 2) | 0;
            if (this.m_shell && ++this.m_step % 6 == 0) {
                this.m_shell.update();
            }
            if (this.m_left <= 0 || this.owner.health <= 0) {
                this.owner.removeComponent(this);
            }
        }
    }
}

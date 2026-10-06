import * as as3 from "as3";
import { int } from "as3";
import { Component, GLOBAL } from "@game";

export class Invisibility extends Component {
    static {
        as3.fields(this, { m_timeInvisiblityExpires: 0, m_cooldownDuration: 0, m_isInvisible: false, m_oldAggroRange: NaN });
    }

    private m_timeInvisiblityExpires: int;
    private m_cooldownDuration: int;
    private m_isInvisible: boolean;
    private m_oldAggroRange: number;

    public $ctor(param1?: number): void {
        super.$ctor();
        this.m_cooldownDuration = param1 | 0;
    }

    public override tick(param1: int = 1): void {
        if (this.m_isInvisible) {
            if (this.owner._atTarget) {
                if (this.m_timeInvisiblityExpires) {
                    if (GLOBAL.Timestamp() >= this.m_timeInvisiblityExpires) {
                        this.stopInvisibility();
                    }
                } else {
                    this.m_timeInvisiblityExpires = (this.m_cooldownDuration + GLOBAL.Timestamp()) | 0;
                }
            } else {
                this.m_timeInvisiblityExpires = 0;
            }
        } else if (this.owner._hasTarget && !this.owner._atTarget) {
            this.startInvisibility();
        }
    }

    private startInvisibility(): void {
        this.owner.spriteAction = "invisible";
        this.m_isInvisible = this.owner.invisible = true;
        this.m_oldAggroRange = this.owner.aggroRange;
        this.owner.aggroRange = 1;
    }

    private stopInvisibility(): void {
        this.owner.spriteAction = "walking";
        this.m_isInvisible = this.owner.invisible = false;
        this.owner.aggroRange = this.m_oldAggroRange;
        this.m_timeInvisiblityExpires = 0;
    }
}

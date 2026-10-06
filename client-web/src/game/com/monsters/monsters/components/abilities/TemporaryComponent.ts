import * as as3 from "as3";
import { int } from "as3";
import { Component, Console, GLOBAL } from "@game";

export class TemporaryComponent extends Component {
    static {
        as3.fields(this, { m_temporaryComponent: null, m_durationInSeconds: NaN, m_timeToRemove: NaN });
    }

    private static s_cachedTimestamp: number = 0;

    private static s_lastCacheFrame: int = -1;
    private m_temporaryComponent: Component;
    private m_durationInSeconds: number;
    private m_timeToRemove: number;

    public $ctor(param1?: Component, param2?: number): void {
        super.$ctor();
        this.m_temporaryComponent = param1;
        this.m_durationInSeconds = param2;
        this.m_timeToRemove = GLOBAL.Timestamp() + param2;
        if (this.m_durationInSeconds <= 1) {
            Console.warning("You tried to add a component(" + param1 + ") that will be instatly removed... why would you do that?");
        }
    }

    protected override onUnregister(): void {
        this.owner.removeComponent(this.m_temporaryComponent);
    }

    protected override onRegister(): void {
        this.owner.addComponent(this.m_temporaryComponent);
    }

    public override tick(param1: int = 1): void {
        // Cache timestamp to avoid repeated GLOBAL.Timestamp() calls
        // Only update cache once per frame, reuse for all TemporaryComponent instances
        if (TemporaryComponent.s_lastCacheFrame != GLOBAL._frameNumber) {
            TemporaryComponent.s_cachedTimestamp = GLOBAL.Timestamp();
            TemporaryComponent.s_lastCacheFrame = GLOBAL._frameNumber;
        }

        if (TemporaryComponent.s_cachedTimestamp >= this.m_timeToRemove) {
            this.owner.removeComponent(this);
        }
    }
}

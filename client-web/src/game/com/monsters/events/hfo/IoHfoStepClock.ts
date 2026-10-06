import * as as3 from "as3";
import { ASObject, int } from "as3";
import { ITickable } from "@game";

/**
 * Hell Freezes Over: counts the game's simulation steps (80 a second) while a wave is on, so its surges come
 * after so much fighting, not so much time on the clock: a busy phone that falls behind (the battle in slow
 * motion: GLOBAL.TickFast) doesn't get the next surge any sooner in the fight.
 */
export class IoHfoStepClock extends ASObject implements ITickable {
    static {
        as3.implement(this, [ITickable]);
        as3.fields(this, { steps: 0 });
    }

    public static readonly STEPS_A_SECOND: int = 80;
    public steps: int;

    public $ctor(): void {
        super.$ctor();
    }

    public tick(param1: int = 1): void {
        this.steps += param1;
    }

    public get seconds(): number {
        return this.steps / IoHfoStepClock.STEPS_A_SECOND;
    }
}

package com.monsters.events.hfo {
    import com.monsters.interfaces.ITickable;

    /**
     * Hell Freezes Over: counts the game's simulation steps (80 a second) while a wave is on, so its surges come
     * after so much fighting, not so much time on the clock: a busy phone that falls behind (the battle in slow
     * motion: GLOBAL.TickFast) doesn't get the next surge any sooner in the fight.
     */
    public class IoHfoStepClock implements ITickable {

        public static const STEPS_A_SECOND:int = 80;

        public var steps:int = 0;

        public function IoHfoStepClock() {
            super();
        }

        public function tick(param1:int = 1):void {
            this.steps += param1;
        }

        public function get seconds():Number {
            return this.steps / STEPS_A_SECOND;
        }
    }
}

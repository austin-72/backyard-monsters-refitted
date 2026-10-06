import * as as3 from "as3";
import { ASObject, int } from "as3";
import { TimerEvent } from "flash/events";
import { Timer, getTimer } from "flash/utils";
import { GLOBAL, LOGGER } from "@game";

export class Timekeeper extends ASObject {
    static {
        as3.fields(this, { time: NaN, isTicking: false, tickFrequency: 1000, tickDuration: 1000, regulator: null, regulatorAcc: 0, regulatorCache: 0 });
    }

    private static _instance: Timekeeper = null;
    protected time: number;
    protected isTicking: boolean;
    protected tickFrequency: int;
    protected tickDuration: number;
    private regulator: Timer;
    private regulatorAcc: int;
    private regulatorCache: int;

    public $ctor(): void {
        if (Timekeeper._instance == null) {
            super.$ctor();
            this.init();
            Timekeeper._instance = this;
        } else {
            LOGGER.Log("err", "Timekeeper dupe");
        }
    }

    public destroy(): void {
        this.regulator.removeEventListener(TimerEvent.TIMER, as3.bind(this, this.onTimerEvent));
    }

    public setRealTimeValue(): void {
        this.time = getTimer();
    }

    public setRealTimeTick(): void {
        this.setTickDuration(1000);
        this.setTickFrequency(1000);
    }

    public getValue(): number {
        return this.time;
    }

    public setValue(param1: number): void {
        if (this.time != param1) {
            this.time = param1;
            GLOBAL.Tick();
        }
    }

    public getTickDuration(): number {
        return this.tickDuration;
    }

    public setTickDuration(param1: number): void {
        this.tickDuration = param1;
    }

    public getTickFrequency(): int {
        return this.tickFrequency;
    }

    public setTickFrequency(param1: int): void {
        this.tickFrequency = param1;
    }

    public stopTicking(): void {
        this.isTicking = false;
    }

    public startTicking(): void {
        this.isTicking = true;
    }

    private init(): void {
        this.regulatorAcc = 0;
        this.regulatorCache = getTimer();
        this.regulator = new Timer(50);
        this.regulator.addEventListener(TimerEvent.TIMER, as3.bind(this, this.onTimerEvent));
        this.regulator.start();
    }

    private onTimerEvent(param1: TimerEvent): void {
        let _loc2_: int = getTimer();
        let _loc3_: int = (_loc2_ - this.regulatorCache) | 0;
        this.regulatorAcc += _loc3_;
        if (this.regulatorAcc > this.tickFrequency) {
            if (this.isTicking == true) {
                this.setValue(this.time + this.tickDuration);
            }
            this.regulatorAcc -= this.tickFrequency;
        }
        this.regulatorCache = _loc2_;
    }
}

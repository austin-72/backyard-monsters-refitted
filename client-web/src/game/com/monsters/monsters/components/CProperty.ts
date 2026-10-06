import * as as3 from "as3";
import { Event, EventDispatcher } from "flash/events";
import { Component } from "@game";

export class CProperty extends Component {
    static {
        as3.fields(this, { doesDispatchEvents: false, _maximum: 1.7976931348623157e+308, _value: NaN, _minimum: NaN, _previousValue: NaN, _eventDispatcher: null });
    }

    public static readonly MODIFIED: string = "valueModified";

    public static readonly DECREASED: string = "valueDecreased";

    public static readonly INCREASED: string = "valueIncreased";

    public static readonly MINIMIZED: string = "valueMinimized";

    public static readonly MAXIMIZED: string = "valueMaximized";
    public doesDispatchEvents: boolean;
    protected _maximum: number;
    protected _value: number;
    protected _minimum: number;
    private _previousValue: number;
    private _eventDispatcher: EventDispatcher;

    public $ctor(param1: number = 1.7976931348623157e+308, param2: number = 0, param3: number = -1): void {
        this._minimum = -Infinity;
        this._value = this._maximum;
        super.$ctor();
        this._eventDispatcher = new EventDispatcher();
        this._maximum = param1;
        this._minimum = param2;
        if (param3 == -1) {
            param3 = this._maximum;
        }
        this._value = param3;
    }

    public get previousValue(): number {
        return this._previousValue;
    }

    public get eventDispatcher(): EventDispatcher {
        return this._eventDispatcher;
    }

    public set value(param1: number) {
        param1 = Math.max(this._minimum, param1);
        param1 = Math.min(this._maximum, param1);
        if (param1 == this._value) {
            return;
        }
        this._previousValue = this._value;
        this._value = param1;
        this.dispatchEvent(CProperty.MODIFIED);
        if (this._value - this._previousValue >= 0) {
            this.dispatchEvent(CProperty.INCREASED);
            if (this._value == this._maximum) {
                this.dispatchEvent(CProperty.MAXIMIZED);
            }
        } else {
            this.dispatchEvent(CProperty.DECREASED);
            if (this._value == this._minimum) {
                this.dispatchEvent(CProperty.MINIMIZED);
            }
        }
    }

    public get value(): number {
        return this._value;
    }

    public get maxmimum(): number {
        return this._maximum;
    }

    public get minimum(): number {
        return this._minimum;
    }

    public modify(param1: number, param2: any = null): number {
        this.value += param1;
        return this.value;
    }

    public set(param1: number, param2: any = null): number {
        this.value = param1;
        return this.value;
    }

    public minimize(param1: any = null): number {
        return this.set(this._minimum, param1);
    }

    public maximize(param1: any = null): number {
        return this.set(this._maximum, param1);
    }

    public getValuePercentage(): number {
        return 1 - (this._maximum - this._value) / (this._maximum - this._minimum);
    }

    public setValuePercentage(param1: number): void {
        this.value = param1 * (this._maximum - this._minimum) + this._minimum;
    }

    private dispatchEvent(param1: string): void {
        if (!this.doesDispatchEvents) {
            return;
        }
        this._eventDispatcher.dispatchEvent(new Event(param1));
    }
}

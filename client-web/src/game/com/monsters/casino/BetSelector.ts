import * as as3 from "as3";
import { int } from "as3";
import { Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { TextField } from "flash/text";
import { CASINO, CasinoUI } from "@game";

/**
 * Choosing a bet: bone chips (1 to 500), a field to type any amount, half and double. The smallest
 * bet and the largest (0: none) come from the server (casino/state limits).
 */
export class BetSelector extends Sprite {
    static {
        as3.fields(this, { _field: null, _chips: null });
    }

    public static readonly CHIPS: any[] = [1, 5, 10, 25, 50, 100, 250, 500];
    private _field: TextField;
    private _chips: any[];

    public $ctor(width: int = 190): void {
        this._chips = [];
        super.$ctor();
        let i: int = 0;
        while (i < BetSelector.CHIPS.length) {
            let c: Sprite = CasinoUI.chip(BetSelector.CHIPS[i] | 0, this.chipClick(BetSelector.CHIPS[i] | 0));
            c.x = 22 + (i % 4) * 46;
            c.y = 20 + ((i / 4) | 0) * 42;
            this.addChild(c);
            this._chips.push(c);
            i++;
        }
        let half: Sprite = CasinoUI.toggle("½", 34, 26, (e: MouseEvent): void => {
            this.setValue(Math.max(this.minBet(), (this.value / 2) | 0) | 0);
        });
        half.y = 92;
        this.addChild(half);
        this._field = CasinoUI.input((width - 84) | 0, 26, "10");
        this._field.name = "casinoBetField";
        this._field.x = 40;
        this._field.y = 92;
        this._field.addEventListener(Event.CHANGE, (e: Event): void => {
            this.highlight();
        });
        this.addChild(this._field);
        let dbl: Sprite = CasinoUI.toggle("x2", 34, 26, (e: MouseEvent): void => {
            this.setValue((this.value * 2) | 0);
        });
        dbl.x = width - 38;
        dbl.y = 92;
        this.addChild(dbl);
        this.highlight();
    }

    private chipClick(v: int): Function {
        return (e: MouseEvent): void => {
            this.setValue(v);
        };
    }

    private minBet(): int {
        return (CASINO.state && CASINO.state.limits ? Math.max(1, CASINO.state.limits.min_bet | 0) : 1) | 0;
    }

    private maxBet(): int {
        return CASINO.state && CASINO.state.limits ? CASINO.state.limits.max_bet | 0 : 0;
    }

    /** The bet chosen (at least the smallest allowed). */
    public get value(): int {
        let v: int = Number(this._field.text) | 0;
        return Math.max(this.minBet(), v) | 0;
    }

    public setValue(v: int): void {
        v = Math.max(this.minBet(), v) | 0;
        if (this.maxBet() > 0) {
            v = Math.min(this.maxBet(), v) | 0;
        }
        v = Math.min(v, 999999999) | 0;
        this._field.text = String(v);
        this.highlight();
    }

    private highlight(): void {
        let v: int = Number(this._field.text) | 0;
        let i: int = 0;
        while (i < this._chips.length) {
            CasinoUI.choose(as3.cast(this._chips[i], Sprite), BetSelector.CHIPS[i] == v);
            i++;
        }
    }
}

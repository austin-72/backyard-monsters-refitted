import * as as3 from "as3";
import { int } from "as3";
import { Sprite } from "flash/display";
import { Event, FocusEvent, MouseEvent } from "flash/events";
import { TextField } from "flash/text";
import { CASINO, CasinoUI, GLOBAL, KEYS } from "@game";

/**
 * Choosing a bet: bone chips (1 to 500), a field to type any amount, half and double. The smallest
 * bet and the largest (0: none) come from the server (casino/state limits).
 */
export class BetSelector extends Sprite {
    static {
        as3.fields(this, { _field: null, _chips: null, _ioKey: "", ioAfford: null, _ioShown: -1, _ioFocused: false });
    }

    public static readonly CHIPS: any[] = [1, 5, 10, 25, 50, 100, 250, 500];
    private _field: TextField;
    private _chips: any[];
    /** Inferno-only (QoL #383): the game being opened (CasinoWindow.openGame), whose last bet a new selector starts at. */
    public static ioGame: string = "";
    /** "bet:<game>" once the selector is made (the bet is remembered under it from then on), "" before. */
    private _ioKey: string;
    /**
     * Inferno-only (QoL #384): the most the player can put on now (null: their Shiny). Roulette and the Derby
     * take off what is already on the slip.
     */
    public ioAfford: Function;
    /** QoL #384: the Shiny the chips were last dimmed for (-1: not yet). */
    private _ioShown: int;
    /** QoL #581: the field is being typed in (it shows the bare digits then; 1,250 when it is left). */
    private _ioFocused: boolean;

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
        // (QoL #384: room for MAX between the field and x2: the half and double 4 px narrower, the field shorter)
        let io: boolean = GLOBAL.INFERNO_ONLY;
        let half: Sprite = CasinoUI.toggle("½", io ? 30 : 34, 26, (e: MouseEvent): void => {
            this.setValue(Math.max(this.minBet(), (this.value / 2) | 0) | 0);
        });
        half.y = 92;
        this.addChild(half);
        this._field = CasinoUI.input((io ? width - 112 : width - 84) | 0, 26, "10");
        this._field.name = "casinoBetField";
        this._field.x = io ? 34 : 40;
        this._field.y = 92;
        this._field.addEventListener(Event.CHANGE, (e: Event): void => {
            this.highlight();
        });
        // (typed: put right when the field is left, to what will be bet; 9 October: it could read 10 with 25 bet,
        // or more than the most allowed)
        this._field.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
            this._ioFocused = false;
            this.setValue(this.value);
        });
        if (io) {
            // (QoL #581: the bet reads 1,250 in the field, and 1250 while it is typed in)
            this._field.addEventListener(FocusEvent.FOCUS_IN, (e: FocusEvent): void => {
                this._ioFocused = true;
                this._field.text = String(this.ioTyped());
            });
        }
        this.addChild(this._field);
        // (QoL #581: ×2, the Pit's one way of writing a multiplier)
        let dbl: Sprite = CasinoUI.toggle(io ? CasinoUI.times() + "2" : "x2", io ? 30 : 34, 26, (e: MouseEvent): void => {
            this.setValue((this.value * 2) | 0);
        });
        // (its name as it was, which tests look for)
        dbl.name = "casinoToggle:x2";
        dbl.x = io ? width - 34 : width - 38;
        dbl.y = 92;
        this.addChild(dbl);
        if (io) {
            // (QoL #384: MAX, the most the player can afford, held to the game's largest bet by setValue)
            let most: Sprite = CasinoUI.toggle(KEYS.Get("io_pit_max"), 36, 26, (e: MouseEvent): void => {
                this.setValue(this.ioAffordable());
            });
            most.name = "ioPitMax";
            most.x = width - 74;
            most.y = 92;
            this.addChild(most);
            // (QoL #384: the chips the player can't afford dimmed, kept up to date while the selector is showing)
            this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.ioOnStage));
        }
        this.setValue(this.value);
        if (GLOBAL.INFERNO_ONLY && BetSelector.ioGame) {
            let kept: int = Number(CASINO.ioRecall("bet:" + BetSelector.ioGame)) | 0;
            if (kept > 0) {
                this.setValue(kept);
            }
            this._ioKey = "bet:" + BetSelector.ioGame;
        }
    }

    /** QoL #384: what the player can put on now. */
    private ioAffordable(): int {
        return (this.ioAfford != null ? this.ioAfford() : CASINO.credits()) | 0;
    }

    private ioOnStage(e: Event): void {
        this._ioShown = -1;
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioFrame));
    }

    /** QoL #384: the chips over what the player can afford at 40%, the others whole (only when that changes). */
    private ioFrame(e: Event): void {
        // (off the stage: the game was closed; the listener goes with it, and comes back if it is shown again)
        if (!this.stage) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.ioFrame));
            return;
        }
        let have: int = this.ioAffordable();
        if (have == this._ioShown) {
            return;
        }
        this._ioShown = have;
        let i: int = 0;
        while (i < this._chips.length) {
            as3.cast(this._chips[i], Sprite).alpha = (BetSelector.CHIPS[i] | 0) > have ? 0.4 : 1;
            i++;
        }
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

    /** QoL #581: the number in the field, its thousands' commas left out (0: none). */
    private ioTyped(): int {
        return Number(GLOBAL.INFERNO_ONLY ? this._field.text.replace(/[^0-9]/g, "") : this._field.text) | 0;
    }

    /** The bet chosen (at least the smallest allowed). */
    public get value(): int {
        let v: int = Math.max(this.minBet(), this.ioTyped()) | 0;
        return (this.maxBet() > 0 ? Math.min(this.maxBet(), v) : v) | 0;
    }

    public setValue(v: int): void {
        v = Math.max(this.minBet(), v) | 0;
        if (this.maxBet() > 0) {
            v = Math.min(this.maxBet(), v) | 0;
        }
        v = Math.min(v, 999999999) | 0;
        // (QoL #581: with its thousands' commas, but not while it is typed in)
        this._field.text = GLOBAL.INFERNO_ONLY && !this._ioFocused ? CasinoUI.number(v) : String(v);
        this.highlight();
        if (this._ioKey) {
            CASINO.ioRemember(this._ioKey, String(v));
        }
    }

    private highlight(): void {
        let v: int = this.ioTyped();
        let i: int = 0;
        while (i < this._chips.length) {
            CasinoUI.choose(as3.cast(this._chips[i], Sprite), BetSelector.CHIPS[i] == v);
            i++;
        }
    }
}

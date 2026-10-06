import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { CheckBox_CLIP } from "@game";

export class Checkbox extends CheckBox_CLIP {
    static {
        as3.fields(this, { checked: false, _enabled: true, _over: false, _down: false });
    }

    private static readonly FRAME_SELECT: int = 2;

    private static readonly FRAME_DESELECT: int = 1;

    public static readonly CHECK_EVENT: string = "cb_checked";
    private checked: boolean;
    private _enabled: boolean;
    private _over: boolean;
    private _down: boolean;

    public $ctor(): void {
        super.$ctor();
        this.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.onOver));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.onOut));
        this.stop();
    }

    public static Replace(param1: MovieClip): Checkbox {
        let _loc2_: Checkbox = null;
        let _loc3_: int = 0;
        let _loc4_: any = undefined;
        _loc2_ = new Checkbox();
        _loc2_.x = param1.x;
        _loc2_.y = param1.y;
        _loc2_.scaleX = param1.scaleX;
        _loc2_.scaleY = param1.scaleY;
        _loc2_.gotoAndStop(param1.currentFrame);
        _loc2_.name = param1.name;
        if (param1.parent) {
            _loc3_ = param1.parent.getChildIndex(param1);
            (_loc4_ = param1.parent).removeChild(param1);
            _loc4_.addChildAt(_loc2_, _loc3_ - 1);
        }
        return _loc2_;
    }

    public onDown(param1: MouseEvent): void {
        this._down = true;
        this.Update();
    }

    public onUp(param1: MouseEvent): void {
        this._down = false;
        if (this._enabled) {
            this.Checked = !this.checked;
            this.dispatchEvent(new Event(Checkbox.CHECK_EVENT));
        }
        this.Update();
    }

    public onClick(param1: MouseEvent): void {
        if (this._enabled) {
            this.Checked = !this.checked;
            this.dispatchEvent(new Event(Checkbox.CHECK_EVENT));
        }
    }

    public onOver(param1: MouseEvent): void {
        this._over = true;
        this.Update();
    }

    public onOut(param1: MouseEvent): void {
        this._over = false;
        this.Update();
    }

    public Update(): void {
        if (this._enabled) {
            if (this._over) {
                this.gotoAndStop(this.checked ? 4 : 3);
            } else {
                this.gotoAndStop(this.checked ? 2 : 1);
            }
            if (this._down) {
                this.gotoAndStop(this.checked ? 8 : 7);
            }
        } else {
            this.gotoAndStop(this.checked ? 6 : 5);
        }
    }

    public set Checked(param1: boolean) {
        this.checked = param1;
        this.Update();
    }

    public get Checked(): boolean {
        return this.checked;
    }

    public set Enabled(param1: boolean) {
        this._enabled = param1;
        this.Update();
    }

    public get Enabled(): boolean {
        return this._enabled;
    }

    public select(): void {
        this.checked = true;
    }

    public deselect(): void {
        this.checked = false;
    }

    public get selected(): boolean {
        return this.checked;
    }

    public toggle(): void {
        if (this.selected) {
            this.deselect();
        } else {
            this.select();
        }
        this.dispatchEvent(new Event(Checkbox.CHECK_EVENT));
    }

    public fromInt(param1: int): void {
        if (param1) {
            this.select();
        } else {
            this.deselect();
        }
    }

    public toInt(): int {
        return this.selected ? 1 : 0;
    }

    public Remove(): void {
        this.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onDown));
        this.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.onUp));
        this.removeEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.onOver));
        this.removeEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.onOut));
    }
}

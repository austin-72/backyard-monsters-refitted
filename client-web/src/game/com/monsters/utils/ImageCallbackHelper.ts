import * as as3 from "as3";
import { ASObject, int } from "as3";

export class ImageCallbackHelper extends ASObject {
    static {
        as3.fields(this, { _ref: null, _state: null, _level: 0, _imageDataA: null, _imageDataB: null });
    }

    private _ref: Function;
    private _state: string;
    private _level: int;
    private _imageDataA: any;
    private _imageDataB: any;

    public $ctor(ref?: Function, state?: string, level?: int, imageDataA?: any, imageDataB?: any): void {
        super.$ctor();
        this._ref = ref;
        this._state = state;
        this._level = level;
        this._imageDataA = imageDataA;
        this._imageDataB = imageDataB;
    }

    public get ref(): Function {
        return this._ref;
    }

    public get state(): string {
        return this._state;
    }

    public get level(): int {
        return this._level;
    }

    public get imageDataA(): any {
        return this._imageDataA;
    }

    public get imageDataB(): any {
        return this._imageDataB;
    }

    public clear(): void {
        this._ref = null;
        this._state = null;
        this._imageDataA = null;
        this._imageDataB = null;
    }
}

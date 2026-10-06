import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { BitmapData } from "flash/display";

export class Rndm extends ASObject {
    static {
        as3.fields(this, { _seed: 0, _pointer: 0, bmpd: null, seedInvalid: true });
    }

    protected static _instance: Rndm = null;
    protected _seed: uint;
    protected _pointer: uint;
    protected bmpd: BitmapData;
    protected seedInvalid: boolean;

    public $ctor(param1: uint = 0): void {
        super.$ctor();
        this._seed = param1;
        this.bmpd = new BitmapData(1000, 200);
    }

    public static get instance(): Rndm {
        if (Rndm._instance == null) {
            Rndm._instance = new Rndm();
        }
        return Rndm._instance;
    }

    public static get seed(): uint {
        return Rndm.instance._seed;
    }

    public static set seed(param1: uint) {
        Rndm.instance._seed = param1;
    }

    public static get pointer(): uint {
        return Rndm.instance._pointer;
    }

    public static set pointer(param1: uint) {
        Rndm.instance._pointer = param1;
    }

    public static random(): number {
        return Rndm.instance.random();
    }

    public static float(param1: number, param2: number = NaN): number {
        return Rndm.instance.float(param1, param2);
    }

    public static boolean(param1: number = 0.5): boolean {
        return Rndm.instance.boolean(param1);
    }

    public static sign(param1: number = 0.5): int {
        return Rndm.instance.sign(param1);
    }

    public static bit(param1: number = 0.5): int {
        return Rndm.instance.bit(param1);
    }

    public static integer(param1: number, param2: number = NaN): int {
        return Rndm.instance.integer(param1, param2);
    }

    public static reset(): void {
        Rndm.instance.reset();
    }

    public get seed(): uint {
        return this._seed;
    }

    // Comment: Two functions with the namespace - this one seems to be redundant
    // public function set seed(param1:uint) : void
    // {
    // if(param1 != this._seed)
    // {
    // this.seedInvalid = true;
    // this._pointer = 0;
    // }
    // this._seed = param1;
    // }
    public get pointer(): uint {
        return this._pointer;
    }

    // Comment: Two functions with the namespace - this one seems to be redundant
    // public function set pointer(param1:uint) : void
    // {
    // this._pointer = param1;
    // }
    public random(): number {
        if (this.seedInvalid) {
            this.bmpd.noise(this._seed, 0, 255, (1 | 2 | 4 | 8) >>> 0);
            this.seedInvalid = false;
        }
        this._pointer = ((this._pointer + 1) % 200000) >>> 0;
        return (this.bmpd.getPixel32((this._pointer % 1000) | 0, this._pointer / 1000 >> 0) * 0.999999999999998 + 1e-15) / 4294967295;
    }

    public float(param1: number, param2: number = NaN): number {
        if (isNaN(param2)) {
            param2 = param1;
            param1 = 0;
        }
        return this.random() * (param2 - param1) + param1;
    }

    public boolean(param1: number = 0.5): boolean {
        return this.random() < param1;
    }

    public sign(param1: number = 0.5): int {
        return this.random() < param1 ? 1 : -1;
    }

    public bit(param1: number = 0.5): int {
        return this.random() < param1 ? 1 : 0;
    }

    public integer(param1: number, param2: number = NaN): int {
        if (isNaN(param2)) {
            param2 = param1;
            param1 = 0;
        }
        return Math.floor(this.float(param1, param2)) | 0;
    }

    public reset(): void {
        this._pointer = 0;
    }
}

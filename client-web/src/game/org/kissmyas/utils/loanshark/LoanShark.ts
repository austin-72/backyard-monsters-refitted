import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Event, EventDispatcher } from "flash/events";

export class LoanShark extends ASObject {
    static {
        as3.fields(this, { _ObjectClass: null, _size: 0, _bufferSize: 0, _pool: null, _objectsInUse: null, _maxBuffer: 0, _initObject: null, _resetMethod: null, _disposeMethod: null, _dispatcher: null, _idealArrayInitialSize: 500, _strictMode: false });
    }

    public static readonly EVENT_CLEANED: string = "cleaned";

    public static readonly EVENT_FLUSHED: string = "flushed";

    public static readonly EVENT_DISPOSED: string = "disposed";

    public static readonly ERROR_RECYCLE_UNUSED: int = 1;

    public static readonly ERROR_NULL_CHECK_IN: int = 2;

    public static readonly ERROR_CHECK_IN_TYPE: int = 3;

    public static readonly ERROR_MULTI_CHECK_IN: int = 4;
    private _ObjectClass: any;
    private _size: int;
    private _bufferSize: int;
    private _pool: any[];
    private _objectsInUse: any[];
    private _maxBuffer: uint;
    private _initObject: any;
    private _resetMethod: string;
    private _disposeMethod: string;
    private _dispatcher: EventDispatcher;
    private _idealArrayInitialSize: uint;
    private _strictMode: boolean;

    public $ctor(param1?: any, param2: boolean = false, param3: uint = 0, param4: uint = 0, param5: any = null, param6: string = "", param7: string = ""): void {
        super.$ctor();
        this._dispatcher = new EventDispatcher();
        this._ObjectClass = param1;
        this._strictMode = param2;
        if (param3 > this._idealArrayInitialSize) {
            this._idealArrayInitialSize = param3;
        }
        this.flush();
        this._maxBuffer = param4;
        this._initObject = param5;
        this._resetMethod = param6;
        this._disposeMethod = param7;
        let _loc8_: uint = param3;
        while (_loc8_--) {
            this.createAndAddObject();
        }
    }

    public borrowObject(): any {
        let _loc1_: any = undefined;
        if (this._bufferSize == 0) {
            _loc1_ = this.createObject();
        } else {
            _loc1_ = this._pool[--this._bufferSize];
        }
        if (this._strictMode) {
            this._objectsInUse.push(_loc1_);
        }
        return _loc1_;
    }

    public returnObject(param1: any): void {
        let _loc4_: int = 0;
        let _loc2_: any = as3.is(param1, this._ObjectClass);
        let _loc3_: boolean = false;
        if (this._strictMode) {
            if ((_loc4_ = this._objectsInUse.indexOf(param1)) == -1) {
                _loc3_ = true;
            } else {
                this._objectsInUse.splice(_loc4_, 1);
            }
        }
        if (param1 && _loc2_ && this.used > 0 && !_loc3_) {
            this.addToPool(param1, true);
        } else if (this._strictMode) {
            if (!this.used) {
                throw new Error("You cannot return an object to a pool with no checked-out items. The specified object did not appear to come from this pool.", LoanShark.ERROR_RECYCLE_UNUSED);
            }
            if (param1 == null) {
                throw new Error("You cannot return a null object reference to the pool.", LoanShark.ERROR_NULL_CHECK_IN);
            }
            if (!_loc2_) {
                throw new Error("You cannot return an object of the wrong type " + param1 + " a pool of type " + this._ObjectClass + ".", LoanShark.ERROR_CHECK_IN_TYPE);
            }
            if (_loc3_) {
                throw new Error("You cannot return an object to the pool when it\'s already checked-in.", LoanShark.ERROR_MULTI_CHECK_IN);
            }
        }
        if (Boolean(this._maxBuffer) && this._bufferSize > this._maxBuffer) {
            this.clean();
        }
    }

    public get size(): int {
        return this._size;
    }

    public get unused(): int {
        return this._bufferSize;
    }

    public get used(): int {
        return (this._size - this._bufferSize) | 0;
    }

    public get ObjectClass(): any {
        return this._ObjectClass;
    }

    public clean(): void {
        let _loc2_: uint = 0;
        let _loc1_: uint = this._bufferSize >>> 0;
        if (_loc1_ > 0) {
            _loc2_ = Math.min(this._size, _loc1_) >>> 0;
            this.disposeObjects();
            this.createList();
            this._bufferSize = 0;
            this._size -= _loc2_;
        }
        this.dispatch(LoanShark.EVENT_CLEANED);
    }

    public flush(param1: boolean = false, param2: boolean = false): void {
        if (this.used > 0 && !param1) {
            return;
        }
        if (param2) {
            this.disposeObjects();
        }
        this._size = this._bufferSize = 0;
        this.createList();
        this.dispatch(LoanShark.EVENT_FLUSHED);
    }

    public dispose(): void {
        this.flush(true, true);
        this._ObjectClass = null;
        this._initObject = null;
        this._pool = null;
        this._objectsInUse = null;
        this._resetMethod = null;
        this._disposeMethod = null;
        this.dispatch(LoanShark.EVENT_DISPOSED);
        this._dispatcher = null;
    }

    public addEventListener(param1: string, param2: Function, param3: boolean = false, param4: int = 0, param5: boolean = false): void {
        this._dispatcher.addEventListener(param1, param2, param3, param4, param5);
    }

    public removeEventListener(param1: string, param2: Function, param3: boolean = false): void {
        this._dispatcher.removeEventListener(param1, param2, param3);
    }

    private createList(): void {
        this._pool = new Array(this._idealArrayInitialSize);
        this._objectsInUse = new Array();
    }

    private disposeObjects(): void {
        let _loc1_: any = null;
        if (this._disposeMethod == "") {
            return;
        }
        let _loc2_: int = 0;
        while (_loc2_ < this._bufferSize) {
            _loc1_ = this._pool[_loc2_];
            if (_loc1_) {
                _loc1_[this._disposeMethod]();
            }
            _loc2_++;
        }
    }

    private createAndAddObject(): void {
        this.addToPool(this.createObject());
    }

    private addToPool(param1: any, param2: boolean = false): void {
        if (param2 && this._resetMethod != "") {
            param1[this._resetMethod]();
        }
        let _loc3_: any = this._bufferSize++;
        this._pool[_loc3_] = param1;
    }

    private createObject(): any {
        ++this._size;
        return this._initObject == null ? new this._ObjectClass() : new this._ObjectClass(this._initObject);
    }

    private dispatch(param1: string): void {
        this._dispatcher.dispatchEvent(new Event(param1));
    }
}

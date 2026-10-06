import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObject, Sprite } from "flash/display";
import { Event, TimerEvent } from "flash/events";
import { Dictionary, Timer, getTimer } from "flash/utils";
import { AutoAlphaPlugin, EndArrayPlugin, FramePlugin, RemoveTintPlugin, TintPlugin, TransformAroundCenterPlugin, TransformAroundPointPlugin, TweenInfo, TweenPlugin, VisiblePlugin, VolumePlugin } from "@game";

export class TweenLite extends ASObject {
    static {
        as3.fields(this, { duration: NaN, vars: null, delay: NaN, startTime: NaN, initTime: NaN, tweens: null, target: null, active: false, ease: null, initted: false, combinedTimeScale: NaN, gc: false, started: false, exposedVars: null, _hasPlugins: false, _hasUpdate: false });
    }

    public static version: number; // const

    public static plugins: any;

    public static killDelayedCallsTo: Function;

    public static defaultEase: Function;

    public static overwriteManager: any;

    public static currentTime: uint;

    public static masterList: Dictionary;

    public static timingSprite: Sprite;

    private static _tlInitted: boolean;

    private static _timer: Timer;

    protected static _reservedProps: any;

    static {
        as3.lazyStatics(this, { version: NaN, plugins: null, killDelayedCallsTo: null, defaultEase: null, overwriteManager: null, currentTime: 0, masterList: null, timingSprite: null, _tlInitted: false, _timer: null, _reservedProps: null }, () => {
            TweenLite.version = 10.092;
            TweenLite.plugins = {};
            TweenLite.killDelayedCallsTo = TweenLite.killTweensOf;
            TweenLite.defaultEase = TweenLite.easeOut;
            TweenLite.masterList = new Dictionary(false);
            TweenLite.timingSprite = new Sprite();
            TweenLite._timer = new Timer(2000);
            TweenLite._reservedProps = { "ease": 1, "delay": 1, "overwrite": 1, "onComplete": 1, "onCompleteParams": 1, "runBackwards": 1, "startAt": 1, "onUpdate": 1, "onUpdateParams": 1, "roundProps": 1, "onStart": 1, "onStartParams": 1, "persist": 1, "renderOnStart": 1, "proxiedEase": 1, "easeParams": 1, "yoyo": 1, "loop": 1, "onCompleteListener": 1, "onUpdateListener": 1, "onStartListener": 1, "orientToBezier": 1, "timeScale": 1 };
        });
    }
    public duration: number;
    public vars: any;
    public delay: number;
    public startTime: number;
    public initTime: number;
    public tweens: any[];
    public target: any;
    public active: boolean;
    public ease: Function;
    public initted: boolean;
    public combinedTimeScale: number;
    public gc: boolean;
    public started: boolean;
    public exposedVars: any;
    protected _hasPlugins: boolean;
    protected _hasUpdate: boolean;

    public $ctor(param1?: any, param2?: number, param3?: any): void {
        super.$ctor();
        if (param1 == null) {
            return;
        }
        if (!TweenLite._tlInitted) {
            TweenPlugin.activate([TintPlugin, RemoveTintPlugin, FramePlugin, AutoAlphaPlugin, VisiblePlugin, VolumePlugin, EndArrayPlugin, TransformAroundPointPlugin, TransformAroundCenterPlugin]);
            TweenLite.currentTime = getTimer() >>> 0;
            TweenLite.timingSprite.addEventListener(Event.ENTER_FRAME, TweenLite.updateAll, false, 0, true);
            if (TweenLite.overwriteManager == null) {
                TweenLite.overwriteManager = { "mode": 1, "enabled": false };
            }
            TweenLite._timer.addEventListener("timer", TweenLite.killGarbage, false, 0, true);
            TweenLite._timer.start();
            TweenLite._tlInitted = true;
        }
        this.vars = param3;
        this.duration = param2 || 0.001;
        this.delay = Number(Number(param3.delay) || 0);
        this.combinedTimeScale = Number(Number(param3.timeScale) || 1);
        this.active = Boolean(param2 == 0 && this.delay == 0);
        this.target = param1;
        if (typeof this.vars.ease != "function") {
            this.vars.ease = TweenLite.defaultEase;
        }
        if (this.vars.easeParams != null) {
            this.vars.proxiedEase = this.vars.ease;
            this.vars.ease = as3.bind(this, this.easeProxy);
        }
        this.ease = this.vars.ease;
        this.exposedVars = this.vars.isTV == true ? this.vars.exposedVars : this.vars;
        this.tweens = [];
        this.initTime = TweenLite.currentTime;
        this.startTime = this.initTime + this.delay * 1000;
        let _loc4_: int = param3.overwrite == undefined || !TweenLite.overwriteManager.enabled && param3.overwrite > 1 ? TweenLite.overwriteManager.mode | 0 : param3.overwrite | 0;
        if (!(TweenLite.masterList.has(param1)) || _loc4_ == 1) {
            TweenLite.masterList.set(param1, [this]);
        } else {
            TweenLite.masterList.get(param1).push(this);
        }
        if (this.vars.runBackwards == true && this.vars.renderOnStart != true || this.active) {
            this.initTweenVals();
            if (this.active) {
                this.render((this.startTime + 1) >>> 0);
            } else {
                this.render(this.startTime >>> 0);
            }
            if (this.exposedVars.visible != null && this.vars.runBackwards == true && this.target instanceof DisplayObject) {
                this.target.visible = this.exposedVars.visible;
            }
        }
    }

    public static to(param1: any, param2: number, param3: any): TweenLite {
        return new TweenLite(param1, param2, param3);
    }

    public static from(param1: any, param2: number, param3: any): TweenLite {
        param3.runBackwards = true;
        return new TweenLite(param1, param2, param3);
    }

    public static delayedCall(param1: number, param2: Function, param3: any[] = null): TweenLite {
        return new TweenLite(param2, 0, { "delay": param1, "onComplete": param2, "onCompleteParams": param3, "overwrite": 0 });
    }

    public static updateAll(param1: Event = null): void {
        let _loc4_: any[] = null;
        let _loc5_: int = 0;
        let _loc6_: TweenLite = null;
        let _loc2_: uint = TweenLite.currentTime = getTimer() >>> 0;
        let _loc3_: Dictionary = TweenLite.masterList;
        for (_loc4_ of (_loc3_?.values() ?? [])) {
            _loc5_ = (_loc4_.length - 1) | 0;
            while (_loc5_ > -1) {
                if ((_loc6_ = as3.cast(_loc4_[_loc5_], TweenLite)).active) {
                    _loc6_.render(_loc2_);
                } else if (_loc6_.gc) {
                    _loc4_.splice(_loc5_, 1);
                } else if (_loc2_ >= _loc6_.startTime) {
                    _loc6_.activate();
                    _loc6_.render(_loc2_);
                }
                _loc5_--;
            }
        }
    }

    public static removeTween(param1: TweenLite, param2: boolean = true): void {
        if (param1 != null) {
            if (param2) {
                param1.clear();
            }
            param1.enabled = false;
        }
    }

    public static killTweensOf(param1: any = null, param2: boolean = false): void {
        let _loc3_: any[] = null;
        let _loc4_: int = 0;
        let _loc5_: TweenLite = null;
        if (param1 != null && TweenLite.masterList.has(param1)) {
            _loc3_ = as3.cast(TweenLite.masterList.get(param1), Array);
            _loc4_ = (_loc3_.length - 1) | 0;
            while (_loc4_ > -1) {
                _loc5_ = as3.cast(_loc3_[_loc4_], TweenLite);
                if (param2 && !_loc5_.gc) {
                    _loc5_.complete(false);
                }
                _loc5_.clear();
                _loc4_--;
            }
            TweenLite.masterList.delete(param1);
        }
    }

    protected static killGarbage(param1: TimerEvent): void {
        let _loc3_: any = null;
        let _loc2_: Dictionary = TweenLite.masterList;
        for (_loc3_ of (_loc2_?.keys() ?? [])) {
            if (_loc2_.get(_loc3_).length == 0) {
                _loc2_.delete(_loc3_);
            }
        }
    }

    public static easeOut(param1: number, param2: number, param3: number, param4: number): number {
        return -param3 * (param1 = param1 / param4) * (param1 - 2) + param2;
    }

    public initTweenVals(): void {
        let _loc1_: string = null;
        let _loc2_: int = 0;
        let _loc3_: any = undefined;
        let _loc4_: TweenInfo = null;
        if (this.exposedVars.timeScale != undefined && this.target.hasOwnProperty("timeScale")) {
            this.tweens[this.tweens.length] = new TweenInfo(this.target, "timeScale", Number(this.target.timeScale), this.exposedVars.timeScale - this.target.timeScale, "timeScale", false);
        }
        for (_loc1_ in this.exposedVars) {
            if (!(_loc1_ in TweenLite._reservedProps)) {
                if (_loc1_ in TweenLite.plugins) {
                    _loc3_ = new TweenLite.plugins[_loc1_]();
                    if (_loc3_.onInitTween(this.target, this.exposedVars[_loc1_], this) == false) {
                        this.tweens[this.tweens.length] = new TweenInfo(this.target, _loc1_, Number(this.target[_loc1_]), typeof this.exposedVars[_loc1_] == "number" ? this.exposedVars[_loc1_] - this.target[_loc1_] : Number(this.exposedVars[_loc1_]), _loc1_, false);
                    } else {
                        this.tweens[this.tweens.length] = new TweenInfo(_loc3_, "changeFactor", 0, 1, _loc3_.overwriteProps.length == 1 ? String(_loc3_.overwriteProps[0]) : "_MULTIPLE_", true);
                        this._hasPlugins = true;
                    }
                } else {
                    this.tweens[this.tweens.length] = new TweenInfo(this.target, _loc1_, Number(this.target[_loc1_]), typeof this.exposedVars[_loc1_] == "number" ? this.exposedVars[_loc1_] - this.target[_loc1_] : Number(this.exposedVars[_loc1_]), _loc1_, false);
                }
            }
        }
        if (this.vars.runBackwards == true) {
            _loc2_ = (this.tweens.length - 1) | 0;
            while (_loc2_ > -1) {
                _loc4_ = as3.cast(this.tweens[_loc2_], TweenInfo);
                _loc4_.start += _loc4_.change;
                _loc4_.change = -_loc4_.change;
                _loc2_--;
            }
        }
        if (this.vars.onUpdate != null) {
            this._hasUpdate = true;
        }
        if (Boolean(TweenLite.overwriteManager.enabled) && TweenLite.masterList.has(this.target)) {
            TweenLite.overwriteManager.manageOverwrites(this, TweenLite.masterList.get(this.target));
        }
        this.initted = true;
    }

    public activate(): void {
        this.started = this.active = true;
        if (!this.initted) {
            this.initTweenVals();
        }
        if (this.vars.onStart != null) {
            this.vars.onStart.apply(null, this.vars.onStartParams);
        }
        if (this.duration == 0.001) {
            --this.startTime;
        }
    }

    public render(param1: uint): void {
        let _loc3_: number = NaN;
        let _loc4_: TweenInfo = null;
        let _loc5_: int = 0;
        let _loc2_: number = (param1 - this.startTime) * 0.001;
        if (_loc2_ >= this.duration) {
            _loc2_ = this.duration;
            _loc3_ = this.ease == this.vars.ease || this.duration == 0.001 ? 1 : 0;
        } else {
            _loc3_ = Number(this.ease(_loc2_, 0, 1, this.duration));
        }
        _loc5_ = (this.tweens.length - 1) | 0;
        while (_loc5_ > -1) {
            (_loc4_ = as3.cast(this.tweens[_loc5_], TweenInfo)).target[_loc4_.property] = _loc4_.start + _loc3_ * _loc4_.change;
            _loc5_--;
        }
        if (this._hasUpdate) {
            this.vars.onUpdate.apply(null, this.vars.onUpdateParams);
        }
        if (_loc2_ == this.duration) {
            this.complete(true);
        }
    }

    public complete(param1: boolean = false): void {
        let _loc2_: int = 0;
        if (!param1) {
            if (!this.initted) {
                this.initTweenVals();
            }
            this.startTime = TweenLite.currentTime - this.duration * 1000 / this.combinedTimeScale;
            this.render(TweenLite.currentTime);
            return;
        }
        if (this._hasPlugins) {
            _loc2_ = (this.tweens.length - 1) | 0;
            while (_loc2_ > -1) {
                if (Boolean(this.tweens[_loc2_].isPlugin) && this.tweens[_loc2_].target.onComplete != null) {
                    this.tweens[_loc2_].target.onComplete();
                }
                _loc2_--;
            }
        }
        if (this.vars.persist != true) {
            this.enabled = false;
        }
        if (this.vars.onComplete != null) {
            this.vars.onComplete.apply(null, this.vars.onCompleteParams);
        }
    }

    public clear(): void {
        this.tweens = [];
        this.vars = this.exposedVars = { "ease": this.vars.ease };
        this._hasUpdate = false;
    }

    public killVars(param1: any): void {
        if (TweenLite.overwriteManager.enabled) {
            TweenLite.overwriteManager.killVars(param1, this.exposedVars, this.tweens);
        }
    }

    protected easeProxy(param1: number, param2: number, param3: number, param4: number): number {
        return Number(this.vars.proxiedEase.apply(null, arguments.concat(this.vars.easeParams)));
    }

    public get enabled(): boolean {
        return this.gc ? false : true;
    }

    public set enabled(param1: boolean) {
        let _loc2_: any[] = null;
        let _loc3_: boolean = false;
        let _loc4_: int = 0;
        if (param1) {
            if (!(TweenLite.masterList.has(this.target))) {
                TweenLite.masterList.set(this.target, [this]);
            } else {
                _loc2_ = as3.cast(TweenLite.masterList.get(this.target), Array);
                _loc4_ = (_loc2_.length - 1) | 0;
                while (_loc4_ > -1) {
                    if (_loc2_[_loc4_] == this) {
                        _loc3_ = true;
                        break;
                    }
                    _loc4_--;
                }
                if (!_loc3_) {
                    _loc2_[_loc2_.length] = this;
                }
            }
        }
        this.gc = param1 ? false : true;
        if (this.gc) {
            this.active = false;
        } else {
            this.active = this.started;
        }
    }
}

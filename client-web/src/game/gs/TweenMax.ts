import * as as3 from "as3";
import { int, uint } from "as3";
import { Event, EventDispatcher, IEventDispatcher } from "flash/events";
import { Dictionary } from "flash/utils";
import { AutoAlphaPlugin, BevelFilterPlugin, BezierPlugin, BezierThroughPlugin, BlurFilterPlugin, ColorMatrixFilterPlugin, DropShadowFilterPlugin, EndArrayPlugin, FramePlugin, GlowFilterPlugin, HexColorsPlugin, OverwriteManager, RemoveTintPlugin, RoundPropsPlugin, ShortRotationPlugin, TintPlugin, TweenEvent, TweenInfo, TweenLite, TweenPlugin, VisiblePlugin, VolumePlugin } from "@game";

export class TweenMax extends TweenLite implements IEventDispatcher {
    static {
        as3.implement(this, [IEventDispatcher]);
        as3.fields(this, { _dispatcher: null, _callbacks: null, _repeatCount: NaN, _timeScale: NaN, pauseTime: NaN });
    }

    public static version: number; // const

    private static _activatedPlugins: boolean;

    private static _overwriteMode: int;

    public static killTweensOf: Function;

    public static killDelayedCallsTo: Function;

    public static removeTween: Function;

    protected static _pausedTweens: Dictionary;

    protected static _globalTimeScale: number;

    static {
        as3.lazyStatics(this, { version: NaN, _activatedPlugins: false, _overwriteMode: 0, killTweensOf: null, killDelayedCallsTo: null, removeTween: null, _pausedTweens: null, _globalTimeScale: NaN }, () => {
            TweenMax.version = 10.12;
            TweenMax._activatedPlugins = TweenPlugin.activate([TintPlugin, RemoveTintPlugin, FramePlugin, AutoAlphaPlugin, VisiblePlugin, VolumePlugin, EndArrayPlugin, HexColorsPlugin, BlurFilterPlugin, ColorMatrixFilterPlugin, BevelFilterPlugin, DropShadowFilterPlugin, GlowFilterPlugin, RoundPropsPlugin, BezierPlugin, BezierThroughPlugin, ShortRotationPlugin]);
            TweenMax._overwriteMode = OverwriteManager.enabled ? OverwriteManager.mode : OverwriteManager.init();
            TweenMax.killTweensOf = TweenLite.killTweensOf;
            TweenMax.killDelayedCallsTo = TweenLite.killTweensOf;
            TweenMax.removeTween = TweenLite.removeTween;
            TweenMax._pausedTweens = new Dictionary(false);
            TweenMax._globalTimeScale = 1;
        });
    }
    protected _dispatcher: EventDispatcher;
    protected _callbacks: any;
    protected _repeatCount: number;
    protected _timeScale: number;
    public pauseTime: number;

    public $ctor(param1?: any, param2?: number, param3?: any): void {
        super.$ctor(param1, param2, param3);
        if (TweenLite.version < 10.092) {
        }
        if (this.combinedTimeScale != 1 && this.target instanceof TweenMax) {
            this._timeScale = 1;
            this.combinedTimeScale = TweenMax._globalTimeScale;
        } else {
            this._timeScale = this.combinedTimeScale;
            this.combinedTimeScale *= TweenMax._globalTimeScale;
        }
        if (this.combinedTimeScale != 1 && this.delay != 0) {
            this.startTime = this.initTime + this.delay * (1000 / this.combinedTimeScale);
        }
        if (this.vars.onCompleteListener != null || this.vars.onUpdateListener != null || this.vars.onStartListener != null) {
            this.initDispatcher();
            if (param2 == 0 && this.delay == 0) {
                this.onUpdateDispatcher();
                this.onCompleteDispatcher();
            }
        }
        this._repeatCount = 0;
        if (!isNaN(Number(this.vars.yoyo)) || !isNaN(Number(this.vars.loop))) {
            this.vars.persist = true;
        }
        if (this.delay == 0 && this.vars.startAt != null) {
            this.vars.startAt.overwrite = 0;
            new TweenMax(this.target, 0, this.vars.startAt);
        }
    }

    public static to(param1: any, param2: number, param3: any): TweenMax {
        return new TweenMax(param1, param2, param3);
    }

    public static from(param1: any, param2: number, param3: any): TweenMax {
        param3.runBackwards = true;
        return new TweenMax(param1, param2, param3);
    }

    public static delayedCall(param1: number, param2: Function, param3: any[] = null, param4: boolean = false): TweenMax {
        return new TweenMax(param2, 0, { "delay": param1, "onComplete": param2, "onCompleteParams": param3, "persist": param4, "overwrite": 0 });
    }

    public static setGlobalTimeScale(param1: number): void {
        let _loc3_: int = 0;
        let _loc4_: any[] = null;
        if (param1 < 0.00001) {
            param1 = 0.00001;
        }
        let _loc2_: Dictionary = TweenLite.masterList;
        TweenMax._globalTimeScale = param1;
        for (_loc4_ of (_loc2_?.values() ?? [])) {
            _loc3_ = (_loc4_.length - 1) | 0;
            while (_loc3_ > -1) {
                if (_loc4_[_loc3_] instanceof TweenMax) {
                    _loc4_[_loc3_].timeScale *= 1;
                }
                _loc3_--;
            }
        }
    }

    public static getTweensOf(param1: any): any[] {
        let _loc4_: TweenLite = null;
        let _loc5_: int = 0;
        let _loc2_: any[] = as3.cast(TweenLite.masterList.get(param1), Array);
        let _loc3_: any[] = [];
        if (_loc2_ != null) {
            _loc5_ = (_loc2_.length - 1) | 0;
            while (_loc5_ > -1) {
                if (!_loc2_[_loc5_].gc) {
                    _loc3_[_loc3_.length] = _loc2_[_loc5_];
                }
                _loc5_--;
            }
        }
        for (_loc4_ of (TweenMax._pausedTweens?.values() ?? [])) {
            if (_loc4_.target == param1) {
                _loc3_[_loc3_.length] = _loc4_;
            }
        }
        return _loc3_;
    }

    public static isTweening(param1: any): boolean {
        let _loc2_: any[] = TweenMax.getTweensOf(param1);
        let _loc3_: int = (_loc2_.length - 1) | 0;
        while (_loc3_ > -1) {
            if ((_loc2_[_loc3_].active || _loc2_[_loc3_].startTime == TweenLite.currentTime) && !_loc2_[_loc3_].gc) {
                return true;
            }
            _loc3_--;
        }
        return false;
    }

    public static getAllTweens(): any[] {
        let _loc3_: any[] = null;
        let _loc4_: int = 0;
        let _loc5_: TweenLite = null;
        let _loc1_: Dictionary = TweenLite.masterList;
        let _loc2_: any[] = [];
        for (_loc3_ of (_loc1_?.values() ?? [])) {
            _loc4_ = (_loc3_.length - 1) | 0;
            while (_loc4_ > -1) {
                if (!_loc3_[_loc4_].gc) {
                    _loc2_[_loc2_.length] = _loc3_[_loc4_];
                }
                _loc4_--;
            }
        }
        for (_loc5_ of (TweenMax._pausedTweens?.values() ?? [])) {
            _loc2_[_loc2_.length] = _loc5_;
        }
        return _loc2_;
    }

    public static killAllTweens(param1: boolean = false): void {
        TweenMax.killAll(param1, true, false);
    }

    public static killAllDelayedCalls(param1: boolean = false): void {
        TweenMax.killAll(param1, false, true);
    }

    public static killAll(param1: boolean = false, param2: boolean = true, param3: boolean = true): void {
        let _loc5_: any = false;
        let _loc6_: int = 0;
        let _loc4_: any[] = null;
        _loc6_ = ((_loc4_ = TweenMax.getAllTweens()).length - 1) | 0;
        while (_loc6_ > -1) {
            if ((_loc5_ = _loc4_[_loc6_].target == _loc4_[_loc6_].vars.onComplete) == param3 || _loc5_ != param2) {
                if (param1) {
                    _loc4_[_loc6_].complete(false);
                    _loc4_[_loc6_].clear();
                } else {
                    TweenLite.removeTween(as3.cast(_loc4_[_loc6_], TweenLite), true);
                }
            }
            _loc6_--;
        }
    }

    public static pauseAll(param1: boolean = true, param2: boolean = false): void {
        TweenMax.changePause(true, param1, param2);
    }

    public static resumeAll(param1: boolean = true, param2: boolean = false): void {
        TweenMax.changePause(false, param1, param2);
    }

    public static changePause(param1: boolean, param2: boolean = true, param3: boolean = false): void {
        let _loc5_: any = false;
        let _loc4_: any[] = null;
        let _loc6_: int = ((_loc4_ = TweenMax.getAllTweens()).length - 1) | 0;
        while (_loc6_ > -1) {
            _loc5_ = _loc4_[_loc6_].target == _loc4_[_loc6_].vars.onComplete;
            if (_loc4_[_loc6_] instanceof TweenMax && (_loc5_ == param3 || _loc5_ != param2)) {
                _loc4_[_loc6_].paused = param1;
            }
            _loc6_--;
        }
    }

    public static set globalTimeScale(param1: number) {
        TweenMax.setGlobalTimeScale(param1);
    }

    public static get globalTimeScale(): number {
        return TweenMax._globalTimeScale;
    }

    public override initTweenVals(): void {
        let _loc1_: int = 0;
        let _loc2_: int = 0;
        let _loc3_: string = null;
        let _loc4_: any = null;
        let _loc5_: any[] = null;
        let _loc6_: any = null;
        let _loc7_: TweenInfo = null;
        if (this.vars.startAt != null && this.delay != 0) {
            this.vars.startAt.overwrite = 0;
            new TweenMax(this.target, 0, this.vars.startAt);
        }
        super.initTweenVals();
        if (as3.is(this.exposedVars.roundProps, Array) && TweenLite.plugins.roundProps != null) {
            _loc1_ = ((_loc5_ = as3.cast(this.exposedVars.roundProps, Array)).length - 1) | 0;
            while (_loc1_ > -1) {
                _loc3_ = String(_loc5_[_loc1_]);
                _loc2_ = (this.tweens.length - 1) | 0;
                while (_loc2_ > -1) {
                    if ((_loc7_ = as3.cast(this.tweens[_loc2_], TweenInfo)).name == _loc3_) {
                        if (_loc7_.isPlugin) {
                            _loc7_.target.round = true;
                        } else if (_loc6_ == null) {
                            // Comment: This could not be found
                            // (_loc6_ = new TweenLite.plugins.roundProps()).add(_loc7_.target,_loc3_,_loc7_.start,_loc7_.change);
                            this._hasPlugins = true;
                            this.tweens[_loc2_] = new TweenInfo(_loc6_, "changeFactor", 0, 1, _loc3_, true);
                        } else {
                            _loc6_.add(_loc7_.target, _loc3_, _loc7_.start, _loc7_.change);
                            this.tweens.splice(_loc2_, 1);
                        }
                    } else if (_loc7_.isPlugin && _loc7_.name == "_MULTIPLE_" && !_loc7_.target.round) {
                        if ((_loc4_ = " " + _loc7_.target.overwriteProps.join(" ") + " ").indexOf(" " + _loc3_ + " ") != -1) {
                            _loc7_.target.round = true;
                        }
                    }
                    _loc2_--;
                }
                _loc1_--;
            }
        }
    }

    public pause(): void {
        if (isNaN(this.pauseTime)) {
            this.pauseTime = TweenLite.currentTime;
            this.startTime = 999999999999999;
            this.enabled = false;
            TweenMax._pausedTweens.set(this, this);
        }
    }

    public resume(): void {
        this.enabled = true;
        if (!isNaN(this.pauseTime)) {
            this.initTime += TweenLite.currentTime - this.pauseTime;
            this.startTime = this.initTime + this.delay * (1000 / this.combinedTimeScale);
            this.pauseTime = NaN;
            if (!this.started && TweenLite.currentTime >= this.startTime) {
                this.activate();
            } else {
                this.active = this.started;
            }
            TweenMax._pausedTweens.set(this, null);
            TweenMax._pausedTweens.delete(this);
        }
    }

    public restart(param1: boolean = false): void {
        if (param1) {
            this.initTime = TweenLite.currentTime;
            this.startTime = TweenLite.currentTime + this.delay * (1000 / this.combinedTimeScale);
        } else {
            this.startTime = TweenLite.currentTime;
            this.initTime = TweenLite.currentTime - this.delay * (1000 / this.combinedTimeScale);
        }
        this._repeatCount = 0;
        if (this.target != this.vars.onComplete) {
            this.render(this.startTime >>> 0);
        }
        this.pauseTime = NaN;
        TweenMax._pausedTweens.set(this, null);
        TweenMax._pausedTweens.delete(this);
        this.enabled = true;
    }

    public reverse(param1: boolean = true, param2: boolean = true): void {
        this.ease = this.vars.ease == this.ease ? as3.bind(this, this.reverseEase) : this.vars.ease;
        let _loc3_: number = this.progress;
        if (param1 && _loc3_ > 0) {
            this.startTime = TweenLite.currentTime - (1 - _loc3_) * this.duration * 1000 / this.combinedTimeScale;
            this.initTime = this.startTime - this.delay * (1000 / this.combinedTimeScale);
        }
        if (param2 != false) {
            if (_loc3_ < 1) {
                this.resume();
            } else {
                this.restart();
            }
        }
    }

    public reverseEase(param1: number, param2: number, param3: number, param4: number): number {
        return Number(this.vars.ease(param4 - param1, param2, param3, param4));
    }

    public invalidate(param1: boolean = true): void {
        let _loc2_: number = NaN;
        if (this.initted) {
            _loc2_ = this.progress;
            if (!param1 && _loc2_ != 0) {
                this.progress = 0;
            }
            this.tweens = [];
            this._hasPlugins = false;
            this.exposedVars = this.vars.isTV == true ? this.vars.exposedProps : this.vars;
            this.initTweenVals();
            this._timeScale = Number(Number(this.vars.timeScale) || 1);
            this.combinedTimeScale = this._timeScale * TweenMax._globalTimeScale;
            this.delay = Number(Number(this.vars.delay) || 0);
            if (isNaN(this.pauseTime)) {
                this.startTime = this.initTime + this.delay * 1000 / this.combinedTimeScale;
            }
            if (this.vars.onCompleteListener != null || this.vars.onUpdateListener != null || this.vars.onStartListener != null) {
                if (this._dispatcher != null) {
                    this.vars.onStart = this._callbacks.onStart;
                    this.vars.onUpdate = this._callbacks.onUpdate;
                    this.vars.onComplete = this._callbacks.onComplete;
                    this._dispatcher = null;
                }
                this.initDispatcher();
            }
            if (_loc2_ != 0) {
                if (param1) {
                    this.adjustStartValues();
                } else {
                    this.progress = _loc2_;
                }
            }
        }
    }

    public setDestination(param1: string, param2: any, param3: boolean = true): void {
        let _loc5_: int = 0;
        let _loc6_: TweenInfo = null;
        let _loc7_: any = null;
        let _loc8_: any = null;
        let _loc9_: any[] = null;
        let _loc10_: boolean = false;
        let _loc11_: any[] = null;
        let _loc12_: any = null;
        let _loc4_: number = this.progress;
        if (this.initted) {
            if (!param3) {
                _loc5_ = (this.tweens.length - 1) | 0;
                while (_loc5_ > -1) {
                    if ((_loc6_ = as3.cast(this.tweens[_loc5_], TweenInfo)).name == param1) {
                        _loc6_.target[_loc6_.property] = _loc6_.start;
                    }
                    _loc5_--;
                }
            }
            _loc7_ = this.vars;
            _loc8_ = this.exposedVars;
            _loc9_ = this.tweens;
            _loc10_ = this._hasPlugins;
            this.tweens = [];
            this.vars = this.exposedVars = {};
            this.vars[param1] = param2;
            this.initTweenVals();
            if (this.ease != as3.bind(this, this.reverseEase) && as3.is(_loc7_.ease, Function)) {
                this.ease = _loc7_.ease;
            }
            if (param3 && _loc4_ != 0) {
                this.adjustStartValues();
            }
            _loc11_ = this.tweens;
            this.vars = _loc7_;
            this.exposedVars = _loc8_;
            this.tweens = _loc9_;
            (_loc12_ = {})[param1] = true;
            _loc5_ = (this.tweens.length - 1) | 0;
            while (_loc5_ > -1) {
                if ((_loc6_ = as3.cast(this.tweens[_loc5_], TweenInfo)).name == param1) {
                    this.tweens.splice(_loc5_, 1);
                } else if (_loc6_.isPlugin && _loc6_.name == "_MULTIPLE_") {
                    _loc6_.target.killProps(_loc12_);
                    if (_loc6_.target.overwriteProps.length == 0) {
                        this.tweens.splice(_loc5_, 1);
                    }
                }
                _loc5_--;
            }
            this.tweens = this.tweens.concat(_loc11_);
            this._hasPlugins = Boolean(_loc10_ || this._hasPlugins);
        }
        this.vars[param1] = this.exposedVars[param1] = param2;
    }

    protected adjustStartValues(): void {
        let _loc2_: number = NaN;
        let _loc3_: number = NaN;
        let _loc4_: number = NaN;
        let _loc5_: TweenInfo = null;
        let _loc6_: int = 0;
        let _loc1_: number = this.progress;
        if (_loc1_ != 0) {
            _loc2_ = Number(this.ease(_loc1_, 0, 1, 1));
            _loc3_ = 1 / (1 - _loc2_);
            _loc6_ = (this.tweens.length - 1) | 0;
            while (_loc6_ > -1) {
                _loc4_ = (_loc5_ = as3.cast(this.tweens[_loc6_], TweenInfo)).start + _loc5_.change;
                if (_loc5_.isPlugin) {
                    _loc5_.change = (_loc4_ - _loc2_) * _loc3_;
                } else {
                    _loc5_.change = (_loc4_ - _loc5_.target[_loc5_.property]) * _loc3_;
                }
                _loc5_.start = _loc4_ - _loc5_.change;
                _loc6_--;
            }
        }
    }

    public killProperties(param1: any[]): void {
        let _loc3_: int = 0;
        let _loc2_: any = {};
        _loc3_ = (param1.length - 1) | 0;
        while (_loc3_ > -1) {
            _loc2_[param1[_loc3_]] = true;
            _loc3_--;
        }
        this.killVars(_loc2_);
    }

    public override render(param1: uint): void {
        let _loc3_: number = NaN;
        let _loc4_: TweenInfo = null;
        let _loc5_: int = 0;
        let _loc2_: number = (param1 - this.startTime) * 0.001 * this.combinedTimeScale;
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

    public override complete(param1: boolean = false): void {
        if (!isNaN(Number(this.vars.yoyo)) && (this._repeatCount < this.vars.yoyo || this.vars.yoyo == 0) || !isNaN(Number(this.vars.loop)) && (this._repeatCount < this.vars.loop || this.vars.loop == 0)) {
            ++this._repeatCount;
            if (!isNaN(Number(this.vars.yoyo))) {
                this.ease = this.vars.ease == this.ease ? as3.bind(this, this.reverseEase) : this.vars.ease;
            }
            this.startTime = Number(param1 ? this.startTime + this.duration * (1000 / this.combinedTimeScale) : TweenLite.currentTime);
            this.initTime = this.startTime - this.delay * (1000 / this.combinedTimeScale);
        } else if (this.vars.persist == true) {
            this.pause();
        }
        super.complete(param1);
    }

    protected initDispatcher(): void {
        let _loc1_: any = null;
        let _loc2_: string = null;
        if (this._dispatcher == null) {
            this._dispatcher = new EventDispatcher(this);
            this._callbacks = { "onStart": this.vars.onStart, "onUpdate": this.vars.onUpdate, "onComplete": this.vars.onComplete };
            if (this.vars.isTV == true) {
                this.vars = this.vars.clone();
            } else {
                _loc1_ = {};
                for (_loc2_ in this.vars) {
                    _loc1_[_loc2_] = this.vars[_loc2_];
                }
                this.vars = _loc1_;
            }
            this.vars.onStart = as3.bind(this, this.onStartDispatcher);
            this.vars.onComplete = as3.bind(this, this.onCompleteDispatcher);
            if (as3.is(this.vars.onStartListener, Function)) {
                this._dispatcher.addEventListener(TweenEvent.START, this.vars.onStartListener, false, 0, true);
            }
            if (as3.is(this.vars.onUpdateListener, Function)) {
                this._dispatcher.addEventListener(TweenEvent.UPDATE, this.vars.onUpdateListener, false, 0, true);
                this.vars.onUpdate = as3.bind(this, this.onUpdateDispatcher);
                this._hasUpdate = true;
            }
            if (as3.is(this.vars.onCompleteListener, Function)) {
                this._dispatcher.addEventListener(TweenEvent.COMPLETE, this.vars.onCompleteListener, false, 0, true);
            }
        }
    }

    protected onStartDispatcher(...rest: any[]): void {
        if (this._callbacks.onStart != null) {
            this._callbacks.onStart.apply(null, this.vars.onStartParams);
        }
        this._dispatcher.dispatchEvent(new TweenEvent(TweenEvent.START));
    }

    protected onUpdateDispatcher(...rest: any[]): void {
        if (this._callbacks.onUpdate != null) {
            this._callbacks.onUpdate.apply(null, this.vars.onUpdateParams);
        }
        this._dispatcher.dispatchEvent(new TweenEvent(TweenEvent.UPDATE));
    }

    protected onCompleteDispatcher(...rest: any[]): void {
        if (this._callbacks.onComplete != null) {
            this._callbacks.onComplete.apply(null, this.vars.onCompleteParams);
        }
        this._dispatcher.dispatchEvent(new TweenEvent(TweenEvent.COMPLETE));
    }

    public addEventListener(param1: string, param2: Function, param3: boolean = false, param4: int = 0, param5: boolean = false): void {
        if (this._dispatcher == null) {
            this.initDispatcher();
        }
        if (param1 == TweenEvent.UPDATE && this.vars.onUpdate != as3.bind(this, this.onUpdateDispatcher)) {
            this.vars.onUpdate = as3.bind(this, this.onUpdateDispatcher);
            this._hasUpdate = true;
        }
        this._dispatcher.addEventListener(param1, param2, param3, param4, param5);
    }

    public removeEventListener(param1: string, param2: Function, param3: boolean = false): void {
        if (this._dispatcher != null) {
            this._dispatcher.removeEventListener(param1, param2, param3);
        }
    }

    public hasEventListener(param1: string): boolean {
        if (this._dispatcher == null) {
            return false;
        }
        return this._dispatcher.hasEventListener(param1);
    }

    public willTrigger(param1: string): boolean {
        if (this._dispatcher == null) {
            return false;
        }
        return this._dispatcher.willTrigger(param1);
    }

    public dispatchEvent(param1: Event): boolean {
        if (this._dispatcher == null) {
            return false;
        }
        return this._dispatcher.dispatchEvent(param1);
    }

    public get paused(): boolean {
        return !isNaN(this.pauseTime);
    }

    public set paused(param1: boolean) {
        if (param1) {
            this.pause();
        } else {
            this.resume();
        }
    }

    public get reversed(): boolean {
        return this.ease == as3.bind(this, this.reverseEase);
    }

    public set reversed(param1: boolean) {
        if (this.reversed != param1) {
            this.reverse();
        }
    }

    public get timeScale(): number {
        return this._timeScale;
    }

    public set timeScale(param1: number) {
        if (param1 < 0.00001) {
            param1 = this._timeScale = 0.00001;
        } else {
            this._timeScale = param1;
            param1 *= TweenMax._globalTimeScale;
        }
        this.initTime = TweenLite.currentTime - (TweenLite.currentTime - this.initTime - this.delay * (1000 / this.combinedTimeScale)) * this.combinedTimeScale * (1 / param1) - this.delay * (1000 / param1);
        if (this.startTime != 999999999999999) {
            this.startTime = this.initTime + this.delay * (1000 / param1);
        }
        this.combinedTimeScale = param1;
    }

    public override set enabled(param1: boolean) {
        if (!param1) {
            TweenMax._pausedTweens.set(this, null);
            TweenMax._pausedTweens.delete(this);
        }
        super.enabled = param1;
        if (param1) {
            this.combinedTimeScale = this._timeScale * TweenMax._globalTimeScale;
        }
    }

    public get repeatCount(): number {
        return this._repeatCount;
    }

    public set repeatCount(param1: number) {
        this._repeatCount = param1;
    }

    public get progress(): number {
        let _loc1_: number = Number(!isNaN(this.pauseTime) ? this.pauseTime : TweenLite.currentTime);
        let _loc2_: number = ((_loc1_ - this.initTime) * 0.001 - this.delay / this.combinedTimeScale) / this.duration * this.combinedTimeScale;
        if (_loc2_ > 1) {
            return 1;
        }
        if (_loc2_ < 0) {
            return 0;
        }
        return _loc2_;
    }

    public set progress(param1: number) {
        this.startTime = TweenLite.currentTime - this.duration * param1 * 1000;
        this.initTime = this.startTime - this.delay * (1000 / this.combinedTimeScale);
        if (!this.started) {
            this.activate();
        }
        this.render(TweenLite.currentTime);
        if (!isNaN(this.pauseTime)) {
            this.pauseTime = TweenLite.currentTime;
            this.startTime = 999999999999999;
            this.active = false;
        }
    }

    public override get enabled(): boolean {
        return super.enabled;
    }
}

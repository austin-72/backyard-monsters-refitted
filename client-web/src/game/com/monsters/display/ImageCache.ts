import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { Bitmap, BitmapData, DisplayObjectContainer } from "flash/display";
import { Event, IOErrorEvent, TimerEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { LoaderContext } from "flash/system";
import { Timer } from "flash/utils";
import { GLOBAL, Loadable, print } from "@game";

export class ImageCache extends ASObject {
    static {
        as3.fields(this, { queue: null, cache: null, concurrentLoadLimit: 20, loadTick: null });
    }

    public static load: any[] = null;

    public static groups: any = {};

    public static readonly UNLOADED: uint = 0;

    public static readonly LOADING: uint = 1;

    public static readonly LOADED: uint = 2;

    public static readonly GAVE_UP: uint = 3;

    private static instance: ImageCache = null;

    private static allowInstantiation: boolean = false;

    public static prependImagePath: string = "";
    public queue: any[];
    public cache: any;
    private concurrentLoadLimit: uint;
    private loadTick: Timer;

    public $ctor(): void {
        super.$ctor();
        if (ImageCache.allowInstantiation) {
            ImageCache.load = [].concat();
            this.queue = [].concat();
            this.cache = {};
            this.loadTick = new Timer(100);
            this.loadTick.addEventListener(TimerEvent.TIMER, as3.bind(this, this.checkQueue));
            this.loadTick.start();
            return;
        }
        throw new Error("nice try, sucka\'!");
    }

    private static getInstance(): ImageCache {
        if (!ImageCache.instance) {
            ImageCache.allowInstantiation = true;
            ImageCache.instance = new ImageCache();
            ImageCache.allowInstantiation = false;
        }
        return ImageCache.instance;
    }

    public static GetImageGroupWithCallBack(param1: string, param2: any[], param3: Function = null, param4: boolean = true, param5: int = 4, param6: string = null): void {
        let _loc7_: any = null;
        let _loc8_: string = null;
        if (!ImageCache.groups[param1]) {
            ImageCache.groups[param1] = { "urls": {}, "cbfs": [param3] };
            for (const $value of as3.values(param2)) {
                _loc8_ = as3.str($value);
                ImageCache.groups[param1].urls[_loc8_] = { "loaded": false, "bmd": null, "state": param6 };
            }
            for (const $value of as3.values(param2)) {
                _loc8_ = as3.str($value);
                ImageCache.GetImageWithCallBack(_loc8_, ImageCache.GroupImageLoaded, param4, param5, param1);
            }
        } else {
            ImageCache.groups[param1].cbfs.push(param3);
            ImageCache.GroupImageLoaded(param1);
        }
    }

    public static GroupImageLoaded(param1: string, param2: string = null, param3: BitmapData = null): void {
        let _loc4_: any = null;
        let _loc5_: string = null;
        let _loc7_: any[] = null;
        let _loc8_: Function = null;
        if (param2) {
            (_loc4_ = ImageCache.groups[param1].urls[param2]).loaded = true;
            _loc4_.bmd = param3;
        }
        let _loc6_: boolean = true;
        for (_loc4_ of as3.values(ImageCache.groups[param1].urls)) {
            if (!_loc4_.loaded) {
                _loc6_ = false;
            }
        }
        if (_loc6_) {
            _loc7_ = [];
            for (_loc5_ in ImageCache.groups[param1].urls) {
                _loc4_ = ImageCache.groups[param1].urls[_loc5_];
                // (a picture given up on is left out)
                if (_loc4_.bmd) {
                    _loc7_.push([_loc5_, _loc4_.bmd]);
                }
            }
            for (_loc8_ of as3.values(ImageCache.groups[param1].cbfs)) {
                _loc8_(_loc7_, _loc4_.state);
            }
            ImageCache.groups[param1].cbfs = [];
        }
    }

    public static ClearCache(): void {
        ImageCache.getInstance().cache = {};
    }

    public static GetImageWithCallBack(param1: string, param2: Function = null, param3: boolean = true, param4: int = 4, param5: string = "", param6: any[] = null): void {
        let _loc9_: Loadable = null;
        let _loc10_: Loadable = null;
        let _loc7_: boolean = false;
        if (ImageCache.getInstance().cache[param1]) {
            if (param2 != null) {
                ImageCache.getInstance().cache[param1].callbacks.push([param2, param5, param6]);
            }
            ImageCache.getInstance().executeAndRemoveCallbacksOnLoadable(as3.cast(ImageCache.getInstance().cache[param1], Loadable));
            _loc7_ = true;
        }
        let _loc8_: boolean = false;
        for (_loc9_ of as3.values(ImageCache.getInstance().queue)) {
            if (_loc9_.key == param1) {
                if (param2 != null) {
                    _loc9_.callbacks.push([param2, param5, param6]);
                }
                _loc8_ = true;
                break;
            }
        }
        if (!_loc7_ && !_loc8_) {
            _loc10_ = new Loadable();
            if (param2 != null) {
                if (param2 != null) {
                    _loc10_.callbacks.push([param2, param5, param6]);
                }
            }
            _loc10_.shouldPrepend = param3;
            _loc10_.key = param1;
            _loc10_.priority = param4;
            _loc10_.loadState = ImageCache.UNLOADED;
            ImageCache.getInstance().queue.push(_loc10_);
            as3.sortOn(ImageCache.getInstance().queue, "priority", Array.NUMERIC);
        }
    }

    public static loadImageAndAddChild(param1: string, param2: DisplayObjectContainer): void {
        ImageCache.GetImageWithCallBack(param1, ImageCache.onImageLoad, true, 4, "", [param2]);
    }

    private static onImageLoad(param1: string, param2: BitmapData, param3: any[]): void {
        as3.cast(param3[0], DisplayObjectContainer).addChild(new Bitmap(param2));
    }

    private checkQueue(param1: TimerEvent = null): void {
        let _loc2_: int = 0;
        while (ImageCache.load.length < this.concurrentLoadLimit && this.queue.length != 0) {
            _loc2_++;
            this.initLoadable(as3.cast(this.queue.shift(), Loadable));
        }
    }

    private initLoadable(queue: Loadable): void {
        let l: Loadable = null;
        let req_str: string = null;
        l = queue;
        l.loadState = ImageCache.LOADING;
        req_str = l.shouldPrepend ? ImageCache.prependImagePath + l.key : l.key;
        if (l.shouldPrepend) {
            // Inferno-only: the server's picture version, so a replaced picture is not served from a cache.
            req_str = GLOBAL.ioVersioned(req_str);
        }
        l.loader.load(new URLRequest(req_str), new LoaderContext(true));
        l.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, (param1: Event): void => {
            this.onAssetComplete(l);
        });
        l.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, (param1: IOErrorEvent): void => {
            this.onError(l);
        });
        l.loader.contentLoaderInfo.addEventListener(IOErrorEvent.NETWORK_ERROR, (param1: IOErrorEvent): void => {
            this.onError(l);
        });
        ImageCache.load.push(l);
    }

    private onError(queue: Loadable): void {
        let _loc2_: uint = 0;
        while (_loc2_ < ImageCache.load.length) {
            if (queue == ImageCache.load[_loc2_]) {
                ++queue.tries;
                if (queue.tries < queue.tryLimit) {
                    this.queue.push(ImageCache.load.splice(_loc2_, 1)[0]);
                } else {
                    queue.loadState = ImageCache.GAVE_UP;
                    ImageCache.load.splice(_loc2_, 1);
                    print("ImageCache.onError Failed" + queue);
                    // Inferno-only: a picture that cannot be had no longer holds up the others of its group
                    // (a building's top, shadow and animations load as one group: one missing file
                    // made the whole building invisible); the group goes on without it.
                    this.giveUpInGroups(queue);
                }
                return;
            }
            _loc2_++;
        }
    }

    private giveUpInGroups(l: Loadable): void {
        let cbs: any[] = l.callbacks.concat();
        l.callbacks = [];
        for (let cb of as3.values(cbs)) {
            if (cb[0] === ImageCache.GroupImageLoaded && cb[1] && ImageCache.groups[String(cb[1])]) {
                ImageCache.GroupImageLoaded(String(cb[1]), l.key, null);
            }
        }
    }

    private onAssetComplete(param1: Loadable): void {
        param1.loadState = ImageCache.LOADED;
        let _loc2_: uint = 0;
        while (_loc2_ < ImageCache.load.length) {
            if (param1 == ImageCache.load[_loc2_]) {
                ImageCache.load.splice(_loc2_, 1);
            }
            _loc2_++;
        }
        this.cache[param1.key] = param1;
        this.executeAndRemoveCallbacksOnLoadable(param1);
    }

    private executeAndRemoveCallbacksOnLoadable(param1: Loadable): void {
        let _loc3_: any[] = null;
        let _loc4_: Bitmap = null;
        let _loc5_: Function = null;
        let _loc6_: string = null;
        let _loc7_: any[] = null;
        let _loc2_: any[] = param1.callbacks.concat();
        param1.callbacks = [].concat();
        for (_loc3_ of as3.values(_loc2_)) {
            _loc4_ = as3.as(param1.loader.content, Bitmap);
            _loc5_ = _loc3_[0];
            _loc6_ = String(_loc3_[1]);
            _loc7_ = as3.cast(_loc3_[2], Array);
            if (_loc6_) {
                if (_loc7_) {
                    _loc5_(_loc6_, param1.key, _loc4_.bitmapData, _loc7_);
                } else {
                    _loc5_(_loc6_, param1.key, _loc4_.bitmapData);
                }
            } else if (_loc7_) {
                _loc5_(param1.key, _loc4_.bitmapData, _loc7_);
            } else {
                _loc5_(param1.key, _loc4_.bitmapData);
            }
        }
    }
}

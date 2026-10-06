import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Graphics, InteractiveObject, Shape, Sprite, Stage } from "flash/display";
import { ContextMenuEvent, Event, EventDispatcher } from "flash/events";
import { LocalConnection } from "flash/net";
import { System } from "flash/system";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { ContextMenu, ContextMenuItem } from "flash/ui";
import { getTimer } from "flash/utils";
import { GLOBAL } from "@game";

export class SWFProfiler extends ASObject {
    private static itvTime: int = 0;

    private static initTime: int = 0;

    private static currentTime: int = 0;

    private static frameCount: int = 0;

    private static totalCount: int = 0;

    public static minFps: number = NaN;

    public static maxFps: number = NaN;

    public static minMem: number = NaN;

    public static maxMem: number = NaN;

    public static history: int = 60;

    public static fpsList: any[] = [];

    public static memList: any[] = [];

    private static displayed: boolean = false;

    private static started: boolean = false;

    private static inited: boolean = false;

    private static frame: Sprite = null;

    private static stage: Stage = null;

    private static content: ProfilerContent = null;

    private static ci: ContextMenuItem = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static init(param1: Stage, param2: InteractiveObject = null): void {
        let _loc3_: ContextMenu = null;
        if (SWFProfiler.inited) {
            return;
        }
        SWFProfiler.inited = true;
        SWFProfiler.stage = param1;
        SWFProfiler.content = new ProfilerContent();
        SWFProfiler.frame = new Sprite();
        SWFProfiler.minFps = Number.MAX_VALUE;
        SWFProfiler.maxFps = Number.MIN_VALUE;
        SWFProfiler.minMem = Number.MAX_VALUE;
        SWFProfiler.maxMem = Number.MIN_VALUE;
        if (param2) {
            _loc3_ = new ContextMenu();
            _loc3_.hideBuiltInItems();
            SWFProfiler.ci = new ContextMenuItem("Show Profiler", true);
            SWFProfiler.addEvent(SWFProfiler.ci, ContextMenuEvent.MENU_ITEM_SELECT, SWFProfiler.onSelect);
            _loc3_.customItems = [SWFProfiler.ci];
            param2.contextMenu = _loc3_;
        }
        SWFProfiler.start();
    }

    public static start(): void {
        if (SWFProfiler.started) {
            return;
        }
        SWFProfiler.started = true;
        SWFProfiler.initTime = SWFProfiler.itvTime = getTimer();
        SWFProfiler.totalCount = SWFProfiler.frameCount = 0;
        SWFProfiler.addEvent(SWFProfiler.frame, Event.ENTER_FRAME, SWFProfiler.draw);
    }

    public static stop(): void {
        if (!SWFProfiler.started) {
            return;
        }
        SWFProfiler.started = false;
        SWFProfiler.removeEvent(SWFProfiler.frame, Event.ENTER_FRAME, SWFProfiler.draw);
    }

    public static gc(): void {
        try {
            new LocalConnection().connect("foo");
            new LocalConnection().connect("foo");
        } catch (e) {
        }
    }

    public static get currentFps(): number {
        return SWFProfiler.frameCount / SWFProfiler.intervalTime;
    }

    public static get currentMem(): number {
        return System.totalMemory / 1024 / 1000;
    }

    public static get averageFps(): number {
        return SWFProfiler.totalCount / SWFProfiler.runningTime;
    }

    private static get runningTime(): number {
        return (SWFProfiler.currentTime - SWFProfiler.initTime) / 1000;
    }

    private static get intervalTime(): number {
        return (SWFProfiler.currentTime - SWFProfiler.itvTime) / 1000;
    }

    public static onSelect(param1: ContextMenuEvent = null): void {
        if (!SWFProfiler.displayed) {
            SWFProfiler.show();
        } else {
            SWFProfiler.hide();
        }
    }

    private static show(): void {
        if (SWFProfiler.ci) {
            SWFProfiler.ci.caption = "Hide Profiler";
        }
        SWFProfiler.displayed = true;
        SWFProfiler.addEvent(SWFProfiler.stage, Event.RESIZE, SWFProfiler.resize);
        SWFProfiler.stage.addChild(SWFProfiler.content);
        SWFProfiler.updateDisplay();
    }

    private static hide(): void {
        if (SWFProfiler.ci) {
            SWFProfiler.ci.caption = "Show Profiler";
        }
        SWFProfiler.displayed = false;
        SWFProfiler.removeEvent(SWFProfiler.stage, Event.RESIZE, SWFProfiler.resize);
        SWFProfiler.stage.removeChild(SWFProfiler.content);
    }

    private static resize(param1: Event): void {
        SWFProfiler.content.update(SWFProfiler.runningTime, SWFProfiler.minFps, SWFProfiler.maxFps, SWFProfiler.minMem, SWFProfiler.maxMem, SWFProfiler.currentFps, SWFProfiler.currentMem, SWFProfiler.averageFps, SWFProfiler.fpsList, SWFProfiler.memList, SWFProfiler.history);
        SWFProfiler.content.x = GLOBAL._SCREEN.x;
        SWFProfiler.content.y = GLOBAL._SCREEN.y;
    }

    private static draw(param1: Event): void {
        SWFProfiler.currentTime = getTimer();
        ++SWFProfiler.frameCount;
        ++SWFProfiler.totalCount;
        if (SWFProfiler.intervalTime >= 1) {
            if (SWFProfiler.displayed) {
                SWFProfiler.updateDisplay();
            } else {
                SWFProfiler.updateMinMax();
            }
            SWFProfiler.fpsList.unshift(SWFProfiler.currentFps);
            SWFProfiler.memList.unshift(SWFProfiler.currentMem);
            if (SWFProfiler.fpsList.length > SWFProfiler.history) {
                SWFProfiler.fpsList.pop();
            }
            if (SWFProfiler.memList.length > SWFProfiler.history) {
                SWFProfiler.memList.pop();
            }
            SWFProfiler.itvTime = SWFProfiler.currentTime;
            SWFProfiler.frameCount = 0;
        }
    }

    private static updateDisplay(): void {
        SWFProfiler.updateMinMax();
        SWFProfiler.content.update(SWFProfiler.runningTime, SWFProfiler.minFps, SWFProfiler.maxFps, SWFProfiler.minMem, SWFProfiler.maxMem, SWFProfiler.currentFps, SWFProfiler.currentMem, SWFProfiler.averageFps, SWFProfiler.fpsList, SWFProfiler.memList, SWFProfiler.history);
    }

    private static updateMinMax(): void {
        SWFProfiler.minFps = Math.min(SWFProfiler.currentFps, SWFProfiler.minFps);
        SWFProfiler.maxFps = Math.max(SWFProfiler.currentFps, SWFProfiler.maxFps);
        SWFProfiler.minMem = Math.min(SWFProfiler.currentMem, SWFProfiler.minMem);
        SWFProfiler.maxMem = Math.max(SWFProfiler.currentMem, SWFProfiler.maxMem);
    }

    private static addEvent(param1: EventDispatcher, param2: string, param3: Function): void {
        param1.addEventListener(param2, param3, false, 0, true);
    }

    private static removeEvent(param1: EventDispatcher, param2: string, param3: Function): void {
        param1.removeEventListener(param2, param3);
    }
}

class ProfilerContent extends Sprite {
    static {
        as3.fields(this, { minFpsTxtBx: null, maxFpsTxtBx: null, minMemTxtBx: null, maxMemTxtBx: null, infoTxtBx: null, box: null, fps: null, mb: null });
    }

    private minFpsTxtBx: TextField;
    private maxFpsTxtBx: TextField;
    private minMemTxtBx: TextField;
    private maxMemTxtBx: TextField;
    private infoTxtBx: TextField;
    private box: Shape;
    private fps: Shape;
    private mb: Shape;

    public $ctor(): void {
        let _loc1_: TextFormat = null;
        super.$ctor();
        this.fps = new Shape();
        this.mb = new Shape();
        this.box = new Shape();
        this.mouseChildren = false;
        this.mouseEnabled = false;
        this.fps.x = 65;
        this.fps.y = 45;
        this.mb.x = 65;
        this.mb.y = 90;
        _loc1_ = new TextFormat("_sans", 9, 11184810);
        this.infoTxtBx = new TextField();
        this.infoTxtBx.autoSize = TextFieldAutoSize.LEFT;
        this.infoTxtBx.defaultTextFormat = new TextFormat("_sans", 11, 13421772);
        this.infoTxtBx.y = 98;
        this.minFpsTxtBx = new TextField();
        this.minFpsTxtBx.autoSize = TextFieldAutoSize.LEFT;
        this.minFpsTxtBx.defaultTextFormat = _loc1_;
        this.minFpsTxtBx.x = 7;
        this.minFpsTxtBx.y = 37;
        this.maxFpsTxtBx = new TextField();
        this.maxFpsTxtBx.autoSize = TextFieldAutoSize.LEFT;
        this.maxFpsTxtBx.defaultTextFormat = _loc1_;
        this.maxFpsTxtBx.x = 7;
        this.maxFpsTxtBx.y = 5;
        this.minMemTxtBx = new TextField();
        this.minMemTxtBx.autoSize = TextFieldAutoSize.LEFT;
        this.minMemTxtBx.defaultTextFormat = _loc1_;
        this.minMemTxtBx.x = 7;
        this.minMemTxtBx.y = 83;
        this.maxMemTxtBx = new TextField();
        this.maxMemTxtBx.autoSize = TextFieldAutoSize.LEFT;
        this.maxMemTxtBx.defaultTextFormat = _loc1_;
        this.maxMemTxtBx.x = 7;
        this.maxMemTxtBx.y = 50;
        this.addChild(this.box);
        this.addChild(this.infoTxtBx);
        this.addChild(this.minFpsTxtBx);
        this.addChild(this.maxFpsTxtBx);
        this.addChild(this.minMemTxtBx);
        this.addChild(this.maxMemTxtBx);
        this.addChild(this.fps);
        this.addChild(this.mb);
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.added), false, 0, true);
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this.removed), false, 0, true);
    }

    public update(param1: number, param2: number, param3: number, param4: number, param5: number, param6: number, param7: number, param8: number, param9: any[], param10: any[], param11: int): void {
        let _loc19_: number = NaN;
        if (param1 >= 1) {
            this.minFpsTxtBx.text = param2.toFixed(3) + " Fps";
            this.maxFpsTxtBx.text = param3.toFixed(3) + " Fps";
            this.minMemTxtBx.text = param4.toFixed(3) + " Mb";
            this.maxMemTxtBx.text = param5.toFixed(3) + " Mb";
        }
        this.infoTxtBx.text = "Current Fps " + param6.toFixed(3) + "   |   Average Fps " + param8.toFixed(3) + "   |   Memory Used " + param7.toFixed(3) + " Mb";
        this.infoTxtBx.x = this.stage.stageWidth - this.infoTxtBx.width - 20;
        let _loc12_: Graphics = null;
        (_loc12_ = this.fps.graphics).clear();
        _loc12_.lineStyle(1, 3407616, 0.7);
        let _loc13_: int = 0;
        let _loc14_: int = param9.length | 0;
        let _loc15_: int = 35;
        let _loc16_: int = 0;
        let _loc17_: number = (_loc16_ = (this.stage.stageWidth - 80) | 0) / (param11 - 1);
        let _loc18_: number = param3 - param2;
        _loc13_ = 0;
        while (_loc13_ < _loc14_) {
            _loc19_ = (param9[_loc13_] - param2) / _loc18_;
            if (_loc13_ == 0) {
                _loc12_.moveTo(0, -_loc19_ * _loc15_);
            } else {
                _loc12_.lineTo(_loc13_ * _loc17_, -_loc19_ * _loc15_);
            }
            _loc13_++;
        }
        (_loc12_ = this.mb.graphics).clear();
        _loc12_.lineStyle(1, 26367, 0.7);
        _loc13_ = 0;
        _loc14_ = param10.length | 0;
        _loc18_ = param5 - param4;
        _loc13_ = 0;
        while (_loc13_ < _loc14_) {
            _loc19_ = (param10[_loc13_] - param4) / _loc18_;
            if (_loc13_ == 0) {
                _loc12_.moveTo(0, -_loc19_ * _loc15_);
            } else {
                _loc12_.lineTo(_loc13_ * _loc17_, -_loc19_ * _loc15_);
            }
            _loc13_++;
        }
    }

    private added(param1: Event): void {
        this.resize();
        this.stage.addEventListener(Event.RESIZE, as3.bind(this, this.resize), false, 0, true);
    }

    private removed(param1: Event): void {
        this.stage.removeEventListener(Event.RESIZE, as3.bind(this, this.resize));
    }

    private resize(param1: Event = null): void {
        let _loc2_: Graphics = this.box.graphics;
        _loc2_.clear();
        _loc2_.beginFill(0, 0.8);
        _loc2_.drawRect(0, 0, this.stage.stageWidth, 120);
        _loc2_.lineStyle(1, 16777215, 0.2);
        _loc2_.moveTo(65, 45);
        _loc2_.lineTo(65, 10);
        _loc2_.moveTo(65, 45);
        _loc2_.lineTo(this.stage.stageWidth - 15, 45);
        _loc2_.moveTo(65, 90);
        _loc2_.lineTo(65, 55);
        _loc2_.moveTo(65, 90);
        _loc2_.lineTo(this.stage.stageWidth - 15, 90);
        _loc2_.endFill();
        this.infoTxtBx.x = this.stage.stageWidth - this.infoTxtBx.width - 20;
    }
}

import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Bitmap, BitmapData, IBitmapDrawable, Sprite } from "flash/display";
import { Event, FullScreenEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { System } from "flash/system";
import { TextField, TextFieldType, TextFormat, TextFormatAlign } from "flash/text";
import { Keyboard } from "flash/ui";
import { Dictionary } from "flash/utils";
import { Console, GLOBAL, print } from "@game";

export class ConsoleView extends Sprite {
    static {
        as3.fields(this, { _OUTPUT_COLOR: 0, _INPUT_COLOR: 0, _messageQueue: null, _maxLength: 200000, _truncating: false, _width: 500, _height: 150, _consoleHistory: null, _historyIndex: 0, _outputBitmap: null, _input: null, tabCompletionPrefix: "", tabCompletionCurrentStart: 0, tabCompletionCurrentEnd: 0, tabCompletionCurrentOffset: 0, glyphCache: null, bottomLineIndex: 2147483647, logCache: null, _dirtyConsole: true, _isActive: false });
    }

    private _OUTPUT_COLOR: uint;
    private _INPUT_COLOR: uint;
    protected _messageQueue: any[];
    protected _maxLength: uint;
    protected _truncating: boolean;
    protected _width: uint;
    protected _height: uint;
    protected _consoleHistory: any[];
    protected _historyIndex: uint;
    protected _outputBitmap: Bitmap;
    protected _input: TextField;
    protected tabCompletionPrefix: string;
    protected tabCompletionCurrentStart: int;
    protected tabCompletionCurrentEnd: int;
    protected tabCompletionCurrentOffset: int;
    protected glyphCache: GlyphCache;
    protected bottomLineIndex: int;
    protected logCache: any[];
    protected _dirtyConsole: boolean;
    protected _isActive: boolean;

    public $ctor(): void {
        this._messageQueue = [];
        this._consoleHistory = [];
        this._outputBitmap = new Bitmap(new BitmapData(640, 480, false, 0));
        this.glyphCache = new GlyphCache();
        this.logCache = [];
        super.$ctor();
        this.layout();
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.addedToStage));
    }

    public static clamp(param1: number, param2: number = 0, param3: number = 1): number {
        if (param1 < param2) {
            return param2;
        }
        if (param1 > param3) {
            return param3;
        }
        return param1;
    }

    public get isActive(): boolean {
        return this._isActive;
    }

    private addedToStage(param1: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.addedToStage));
        this.addListeners();
        this.resize();
    }

    protected layout(): void {
        if (!this._input) {
            this.createInputField();
        }
        this.resize();
        this._outputBitmap.name = "ConsoleOutput";
        this.addEventListener(MouseEvent.DOUBLE_CLICK, as3.bind(this, this.onBitmapDoubleClick));
        this._outputBitmap.alpha = 0.85;
        this.addChild(this._outputBitmap);
        this.addChild(this._input);
        this.mouseEnabled = true;
        this.doubleClickEnabled = true;
        this._dirtyConsole = true;
    }

    protected addListeners(): void {
        this._input.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onInputKeyDown), false, 1, true);
        this._input.addEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.onInputKeyUp), false, 1, true);
        this.stage.addEventListener(Event.RESIZE, as3.bind(this, this.resize));
        this.stage.addEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.resize));
        this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
    }

    protected onInputKeyDown(param1: KeyboardEvent): void {
        let _loc2_: Dictionary = null;
        let _loc3_: Vector<string> = null;
        let _loc4_: string = null;
        let _loc5_: int = 0;
        if (param1.keyCode == Keyboard.TAB) {
            _loc2_ = Console.commands;
            _loc3_ = new Vector<string>(0, false, String);
            this.tabCompletionPrefix = this._input.text.toLowerCase();
            for (const $value of (_loc2_?.keys() ?? [])) {
                _loc4_ = as3.str($value);
                if (_loc4_.substr(0, this.tabCompletionPrefix.length).toLowerCase() == this.tabCompletionPrefix) {
                    _loc3_.push(_loc4_);
                }
            }
            if (_loc3_.length >= 1) {
                this._input.text = as3.vget(_loc3_, 0) + " ";
                if (_loc3_.length >= 2) {
                    _loc5_ = 0;
                    while (_loc5_ < _loc3_.length) {
                        print("    " + as3.vget(_loc3_, _loc5_));
                        _loc5_++;
                    }
                }
                this.stage.focus = this._input;
                this._input.setSelection(5, 6);
            }
        }
        param1.stopImmediatePropagation();
        param1.stopPropagation();
    }

    protected removeListeners(): void {
        this._input.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onInputKeyDown));
        this._input.removeEventListener(KeyboardEvent.KEY_UP, as3.bind(this, this.onInputKeyUp));
        this.stage.removeEventListener(Event.RESIZE, as3.bind(this, this.resize));
        this.stage.removeEventListener(FullScreenEvent.FULL_SCREEN, as3.bind(this, this.resize));
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.onEnterFrame));
    }

    private onEnterFrame(param1: Event): void {
        this.onFrame();
    }

    protected onBitmapDoubleClick(param1: MouseEvent = null): void {
        let _loc2_: string = "";
        let _loc3_: int = 0;
        while (_loc3_ < this.logCache.length) {
            _loc2_ += this.logCache[_loc3_].text + "\n";
            _loc3_++;
        }
        System.setClipboard(_loc2_);
    }

    protected resize(param1: Event = null): void {
        if (Boolean(this.stage) && Boolean(GLOBAL._SCREEN)) {
            this.x = GLOBAL._SCREEN.x;
            this.y = GLOBAL._SCREEN.y;
            this._width = (this.stage.stageWidth - 1) >>> 0;
            this._height = (this.stage.stageHeight / 3) >>> 0;
        }
        this._outputBitmap.bitmapData.dispose();
        this._outputBitmap.bitmapData = new BitmapData(this._width, this._height, false, this._OUTPUT_COLOR);
        this._input.height = 18;
        this._input.width = this._width;
        this._input.y = this._outputBitmap.height;
        this._dirtyConsole = true;
    }

    protected createInputField(): TextField {
        this._input = new TextField();
        this._input.type = TextFieldType.INPUT;
        this._input.border = true;
        this._input.borderColor = this._INPUT_COLOR;
        this._input.multiline = false;
        this._input.wordWrap = false;
        this._input.condenseWhite = false;
        this._input.background = true;
        this._input.backgroundColor = this._INPUT_COLOR;
        let _loc1_: TextFormat = new TextFormat();
        _loc1_.font = "Verdana";
        _loc1_.size = 12;
        _loc1_.bold = true;
        _loc1_.color = 16777215;
        _loc1_.align = TextFormatAlign.LEFT;
        this._input.setTextFormat(_loc1_);
        this._input.defaultTextFormat = _loc1_;
        this._input.name = "ConsoleInput";
        return this._input;
    }

    protected setHistory(param1: string): void {
        this._input.text = param1;
    }

    protected onInputKeyUp(param1: KeyboardEvent): void {
        if (param1.keyCode != Keyboard.TAB && param1.keyCode != Keyboard.SHIFT) {
            this.tabCompletionPrefix = this._input.text;
            this.tabCompletionCurrentStart = -1;
            this.tabCompletionCurrentOffset = 0;
        }
        if (param1.keyCode == Keyboard.ENTER) {
            if (this._input.text.length <= 0) {
                this.addLogMessage("CMD", ">", this._input.text);
                return;
            }
            this.processCommand();
        } else if (param1.keyCode == Keyboard.UP) {
            if (this._historyIndex > 0) {
                this.setHistory(as3.str(this._consoleHistory[--this._historyIndex]));
            } else if (this._consoleHistory.length > 0) {
                this.setHistory(as3.str(this._consoleHistory[0]));
            }
            param1.preventDefault();
        } else if (param1.keyCode == Keyboard.DOWN) {
            if (this._historyIndex < this._consoleHistory.length - 1) {
                this.setHistory(as3.str(this._consoleHistory[++this._historyIndex]));
            } else if (this._historyIndex == this._consoleHistory.length - 1) {
                this._input.text = "";
            }
            param1.preventDefault();
        } else if (param1.keyCode == Keyboard.PAGE_UP) {
            if (this.bottomLineIndex == int.MAX_VALUE) {
                this.bottomLineIndex = (this.logCache.length - 1) | 0;
            }
            this.bottomLineIndex = (this.bottomLineIndex - (this.getScreenHeightInLines() - 2)) | 0;
            if (this.bottomLineIndex < 0) {
                this.bottomLineIndex = 0;
            }
        } else if (param1.keyCode == Keyboard.PAGE_DOWN) {
            if (this.bottomLineIndex != int.MAX_VALUE) {
                this.bottomLineIndex = (this.bottomLineIndex + (this.getScreenHeightInLines() - 2)) | 0;
                if (this.bottomLineIndex + this.getScreenHeightInLines() >= this.logCache.length) {
                    this.bottomLineIndex = int.MAX_VALUE;
                }
            }
        } else if (Console.isKey(param1.keyCode)) {
            this.toggleActive();
            this._input.text = "";
        }
        this._dirtyConsole = true;
        param1.stopImmediatePropagation();
    }

    protected processCommand(): void {
        this.addLogMessage("CMD", ">", this._input.text);
        let _loc1_: string = Console.processLine(this._input.text);
        if (_loc1_) {
            this.addLogMessage("CMD", "<", _loc1_);
        }
        this._consoleHistory.push(this._input.text);
        this._historyIndex = this._consoleHistory.length;
        this._input.text = "";
        this._dirtyConsole = true;
    }

    public getScreenHeightInLines(): int {
        let _loc1_: int = this._outputBitmap.bitmapData.height;
        return Math.floor(_loc1_ / this.glyphCache.getLineHeight()) | 0;
    }

    public onFrame(param1: number = 0): void {
        if (this._dirtyConsole == false || this.parent == null) {
            return;
        }
        this._dirtyConsole = false;
        let _loc2_: int = (this.getScreenHeightInLines() - 1) | 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        if (this.bottomLineIndex == int.MAX_VALUE) {
            _loc3_ = ConsoleView.clamp(this.logCache.length - _loc2_, 0, int.MAX_VALUE) | 0;
        } else {
            _loc3_ = ConsoleView.clamp(this.bottomLineIndex - _loc2_, 0, int.MAX_VALUE) | 0;
        }
        _loc4_ = ConsoleView.clamp(_loc3_ + _loc2_, 0, this.logCache.length - 1) | 0;
        _loc3_--;
        let _loc5_: BitmapData = this._outputBitmap.bitmapData;
        _loc5_.fillRect(_loc5_.rect, this._OUTPUT_COLOR);
        let _loc6_: int = _loc4_;
        while (_loc6_ >= _loc3_) {
            if (this.logCache[_loc6_]) {
                this.glyphCache.drawLineToBitmap(as3.str(this.logCache[_loc6_].text), 0, (this._outputBitmap.height - (_loc4_ + 1 - _loc6_) * this.glyphCache.getLineHeight()) | 0, this.logCache[_loc6_].color >>> 0, this._outputBitmap.bitmapData);
            }
            _loc6_--;
        }
    }

    public addLogMessage(param1: string, param2: string, param3: string): void {
        let _loc7_: string = null;
        let _loc8_: int = 0;
        let _loc9_: string = null;
        let _loc4_: string = this.getColorFromLevel(param1);
        let _loc5_: uint = 0;
        if ((_loc5_ = 0) < 2) {
            if ((_loc8_ = param2.lastIndexOf("::")) != -1) {
                param2 = param2.substr(_loc8_ + 2);
            }
        }
        let _loc6_: any[] = param3.split("\n");
        for (const $value of as3.values(_loc6_)) {
            _loc7_ = as3.str($value);
            _loc9_ = (_loc5_ > 0 ? param1 + ": " : "") + param2 + _loc7_;
            this.logCache.push({ "color": parseInt(_loc4_.substr(1), 16), "text": _loc9_ });
        }
        this._dirtyConsole = true;
    }

    private getColorFromLevel(param1: string): string {
        if (param1 == Console.WARNING) {
            return "#FF0000";
        }
        return "#FFFFFF";
    }

    public toggleActive(): void {
        if (this._isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    public activate(): void {
        this.visible = true;
        this.layout();
        this._isActive = true;
        this.addListeners();
        if (this.stage) {
            this.stage.focus = this._input;
        }
        this._input.text = "";
    }

    public deactivate(): void {
        this.visible = false;
        this.removeListeners();
        this._isActive = false;
        if (this.stage) {
            this.stage.focus = null;
        }
    }

    public set restrict(param1: string) {
        this._input.restrict = param1;
    }

    public get restrict(): string {
        return this._input.restrict;
    }
}

class GlyphCache extends ASObject {
    static {
        as3.fields(this, { _textFormat: null, _textField: null, _glyphCache: null, _colorCache: null });
    }

    protected _textFormat: TextFormat;
    protected _textField: TextField;
    protected _glyphCache: any[];
    protected _colorCache: any[];

    public $ctor(): void {
        this._textFormat = new TextFormat("Verdana", 12, 14540253, true);
        this._textField = new TextField();
        this._glyphCache = [];
        this._colorCache = [];
        super.$ctor();
        this._textField.setTextFormat(this._textFormat);
        this._textField.defaultTextFormat = this._textFormat;
    }

    public drawLineToBitmap(param1: string, param2: int, param3: int, param4: uint, param5: BitmapData): int {
        let _loc11_: int = 0;
        let _loc12_: Glyph = null;
        if (!this._colorCache[param4]) {
            this._colorCache[param4] = new BitmapData(128, 128, false, param4);
        }
        let _loc6_: BitmapData = as3.as(this._colorCache[param4], BitmapData);
        let _loc7_: Point = new Point(param2, param3);
        let _loc8_: int = 1;
        let _loc9_: int = param1.length;
        let _loc10_: int = 0;
        while (_loc10_ < _loc9_) {
            if ((_loc11_ = param1.charCodeAt(_loc10_) | 0) == 10) {
                _loc7_.x = param2;
                _loc7_.y += 16;
                _loc8_++;
            } else {
                _loc12_ = this.getGlyph(_loc11_);
                param5.copyPixels(_loc6_, _loc12_.rect, _loc7_, _loc12_.bitmap, null, true);
                _loc7_.x += _loc12_.rect.width - 1;
            }
            _loc10_++;
        }
        return _loc8_;
    }

    protected getGlyph(param1: int): Glyph {
        let _loc2_: Glyph = null;
        if (this._glyphCache[param1] == null) {
            _loc2_ = new Glyph();
            this._textField.text = String.fromCharCode(param1);
            _loc2_.bitmap = new BitmapData(this._textField.textWidth + 2, 16, true, 0);
            _loc2_.bitmap.draw(as3.cast(this._textField, IBitmapDrawable));
            _loc2_.rect = _loc2_.bitmap.rect;
            this._glyphCache[param1] = _loc2_;
        }
        return as3.as(this._glyphCache[param1], Glyph);
    }

    public getLineHeight(): int {
        this._textField.text = "HPI";
        return this._textField.getLineMetrics(0).height | 0;
    }
}

class Glyph extends ASObject {
    static {
        as3.fields(this, { rect: null, bitmap: null });
    }

    public rect: Rectangle;
    public bitmap: BitmapData;

    public $ctor(): void {
        super.$ctor();
    }
}

import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { TextField, TextFieldAutoSize, TextFieldType, TextFormat } from "flash/text";

export class AbstractChatBox extends MovieClip {
    static {
        as3.fields(this, { _displayAssets: null, _chats: null, _borderColor: 0, _thumbColor: 0, _inputColor: 0, _defaultColor: 3355443, _outputColor: 0, _fontName: "_sans", _fontSize: 9, _inputHeight: 0, _defaultTxtBG: 14596743, _highlightTxtBG: 15918030, fmt: null, fmt_input: null, fmt_userIndent: null });
    }

    protected _displayAssets: MovieClip;
    protected _chats: any[];
    protected _borderColor: uint;
    protected _thumbColor: uint;
    protected _inputColor: uint;
    protected _defaultColor: uint;
    protected _outputColor: uint;
    protected _fontName: string;
    protected _fontSize: int;
    protected _inputHeight: int;
    protected _defaultTxtBG: uint;
    protected _highlightTxtBG: uint;
    protected fmt: TextFormat;
    protected fmt_input: TextFormat;
    protected fmt_userIndent: TextFormat;

    public $ctor(param1?: MovieClip): void {
        this._chats = [];
        this._inputHeight = (this._fontSize + 5) | 0;
        this.fmt = new TextFormat(this._fontName, this._fontSize, this._defaultColor);
        this.fmt_input = new TextFormat(this._fontName, this._fontSize, this._inputColor);
        this.fmt_userIndent = new TextFormat(this._fontName, this._fontSize, this._defaultColor);
        super.$ctor();
        this._displayAssets = param1;
        this.addChild(this._displayAssets);
    }

    public init(): void {
    }

    protected createInput(param1: number): TextField {
        let _loc2_: TextField = new TextField();
        _loc2_.defaultTextFormat = this.fmt_input;
        _loc2_.background = true;
        _loc2_.width = param1;
        _loc2_.height = this._inputHeight;
        _loc2_.autoSize = TextFieldAutoSize.NONE;
        _loc2_.multiline = false;
        _loc2_.wordWrap = false;
        _loc2_.selectable = true;
        _loc2_.mouseEnabled = true;
        _loc2_.type = TextFieldType.INPUT;
        _loc2_.text = "";
        return _loc2_;
    }

    public push(param1: string, param2: string = null, param3: string = null, param4: string = null, param5: boolean = false): void {
        let _loc7_: string = null;
        this._chats.push(param1);
        let _loc6_: string = "";
        if (!param5) {
            while (this._chats.length > 40) {
                this._chats.shift();
            }
        }
        for (const $value of as3.values(this._chats)) {
            _loc7_ = as3.str($value);
            _loc6_ += _loc7_ + "<br>";
        }
        this.background._output.htmlText = _loc6_;
        this.background._output.autoSize = TextFieldAutoSize.LEFT;
    }

    public get inputText(): string {
        if (this.input != null) {
            return this.input.text;
        }
        return "";
    }

    public clearInputText(): void {
        if (this.input != null) {
            this.input.text = "";
        }
    }

    protected onHideOver(param1: MouseEvent): void {
    }

    protected onHideOut(param1: MouseEvent): void {
    }

    public update(): void {
    }

    public clearChat(): void {
        this._chats = [];
    }

    public get background(): MovieClip {
        return null;
    }

    public get input(): TextField {
        return null;
    }

    public get output(): TextField {
        return null;
    }
}

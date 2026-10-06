import * as as3 from "as3";
import { Bitmap, BitmapData, Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextFieldAutoSize } from "flash/text";
import { GLOBAL, KEYS, MapRoom3AssetCache, SOUNDS, bubblepopup5 } from "@game";

export class MapRoom3CellMouseoverButton extends Sprite {
    static {
        as3.fields(this, { m_BackgroundImage: null, m_ButtonImage: null, m_ButtonRolloverImage: null, m_ToolTip: null });
    }

    private static s_ButtonToolTip: bubblepopup5 = null;
    private m_BackgroundImage: Bitmap;
    private m_ButtonImage: Bitmap;
    private m_ButtonRolloverImage: Bitmap;
    private m_ToolTip: string;

    public $ctor(param1?: BitmapData, param2?: BitmapData, param3?: string): void {
        super.$ctor();
        this.m_ToolTip = param3;
        this.buttonMode = true;
        this.m_BackgroundImage = new Bitmap(MapRoom3AssetCache.instance.GetAsset(MapRoom3AssetCache.MOUSEOVER_BUTTON_BACKGROUND));
        this.addChild(this.m_BackgroundImage);
        this.m_ButtonImage = new Bitmap(param1);
        this.addChild(this.m_ButtonImage);
        this.m_ButtonRolloverImage = new Bitmap(param2);
        this.m_ButtonRolloverImage.visible = false;
        this.addChild(this.m_ButtonRolloverImage);
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.OnMouseOver));
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.OnMouseOut));
        SOUNDS.Play("ui_over");
        if (MapRoom3CellMouseoverButton.s_ButtonToolTip == null) {
            MapRoom3CellMouseoverButton.s_ButtonToolTip = new bubblepopup5();
            MapRoom3CellMouseoverButton.s_ButtonToolTip.mouseEnabled = false;
            MapRoom3CellMouseoverButton.s_ButtonToolTip.mouseChildren = false;
            MapRoom3CellMouseoverButton.s_ButtonToolTip.mcText.autoSize = TextFieldAutoSize.LEFT;
            MapRoom3CellMouseoverButton.s_ButtonToolTip.x = this.width * 0.5;
            MapRoom3CellMouseoverButton.s_ButtonToolTip.y = this.height;
        }
    }

    public OnMouseOver(param1: MouseEvent): void {
        this.m_ButtonImage.visible = false;
        this.m_ButtonRolloverImage.visible = true;
        MapRoom3CellMouseoverButton.s_ButtonToolTip.mcText.htmlText = "<b>" + KEYS.Get(this.m_ToolTip) + "</b>";
        let _loc2_: Point = new Point(this.width * 0.5, this.height);
        _loc2_ = GLOBAL._layerUI.globalToLocal(this.localToGlobal(_loc2_));
        MapRoom3CellMouseoverButton.s_ButtonToolTip.x = _loc2_.x;
        MapRoom3CellMouseoverButton.s_ButtonToolTip.y = _loc2_.y;
        MapRoom3CellMouseoverButton.s_ButtonToolTip.mcBG.width = MapRoom3CellMouseoverButton.s_ButtonToolTip.mcText.width + 10;
        GLOBAL._layerUI.addChild(MapRoom3CellMouseoverButton.s_ButtonToolTip);
    }

    public OnMouseOut(param1: MouseEvent): void {
        this.m_ButtonImage.visible = true;
        this.m_ButtonRolloverImage.visible = false;
        MapRoom3CellMouseoverButton.s_ButtonToolTip.mcText.htmlText = "";
        if (MapRoom3CellMouseoverButton.s_ButtonToolTip.parent == GLOBAL._layerUI) {
            GLOBAL._layerUI.removeChild(MapRoom3CellMouseoverButton.s_ButtonToolTip);
        }
    }
}

import * as as3 from "as3";
import { int } from "as3";
import { Loader, Sprite } from "flash/display";
import { Event, IOErrorEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { LoaderContext } from "flash/system";
import { TextFieldAutoSize } from "flash/text";
import { PlayerBase_CLIP, SecNum, com_monsters_maproom_MapRoom as MapRoom, com_monsters_maproom_PushPin as PushPin } from "@game";

export class PlayerBase extends PlayerBase_CLIP {
    static {
        as3.fields(this, { data: null, mapX: 0, mapY: 0, loader: null, image: null, nameBox: null, pin: null });
    }

    public data: any;
    public mapX: int;
    public mapY: int;
    private loader: Loader;
    public image: Sprite;
    public nameBox: Sprite;
    private pin: Sprite;

    public $ctor(param1?: number, param2?: number): void {
        let tgtWidth: number = NaN;
        let onLoadError: Function = null;
        let baseID: number = param1;
        let baseSeed: number = param2;
        onLoadError = (param1: IOErrorEvent): void => {
        };
        super.$ctor();
        this.data = {};
        this.data.baseid = new SecNum(baseID | 0);
        this.data.baseseed = new SecNum(baseSeed | 0);
        this.data.ownerName = "My Yard";
        this.loader = new Loader();
        try {
            if (MapRoom.BRIDGE._playerPic.length > 5) {
                this.loader.load(new URLRequest(MapRoom.BRIDGE._playerPic), new LoaderContext(true));
            }
        } catch (e) {
        }
        this.loader.x = this.placeholder.x;
        this.loader.y = this.placeholder.y;
        this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, as3.bind(this, this.onImageComplete));
        this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onLoadError);
        this.image = new Sprite();
        this.addChild(this.image);
        this.image.addChild(this.photoFrame_mc);
        this.image.addChild(this.placeholder);
        this.image.addChild(this.loader);
        this.image.addChild(this.frame_mc);
        this.name_txt.autoSize = TextFieldAutoSize.LEFT;
        this.name_txt.htmlText = "<b>" + MapRoom.BRIDGE.KEYS.Get("map_mybase");
        this.name_txt.x = this.name_txt.textWidth * -0.5;
        this.nameBox = new Sprite();
        this.nameBox.addChild(this.box_mc);
        this.nameBox.addChild(this.name_txt);
        this.addChild(this.nameBox);
        this.nameBox.x = -2;
        tgtWidth = this.name_txt.textWidth + 2 * 7;
        this.box_mc.width = Number(tgtWidth < 51 ? 51 : tgtWidth);
        this.pin = PushPin.getRandomPinWithColor(PushPin.GREEN);
        this.addChild(this.pin);
        this.mouseChildren = false;
    }

    private onImageComplete(param1: Event): void {
        this.loader.width = this.loader.height = 44;
    }
}

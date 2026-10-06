import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { CHAMPIONCAGE, CREATURELOCKER, GLOBAL, ImageCache, KEYS, MapRoomPopupInfoMonster_CLIP } from "@game";

export class PopupInfoMonster extends MapRoomPopupInfoMonster_CLIP {
    static {
        as3.fields(this, { _imageRequested: false });
    }

    private _imageRequested: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    public Setup(param1: int, param2: int, param3: string, param4: int): void {
        let ImageLoaded: Function = null;
        let name: string = null;
        let X: int = param1;
        let Y: int = param2;
        let monsterID: string = param3;
        let quantity: int = param4;
        ImageLoaded = (param1: string, param2: BitmapData): void => {
            this.mcImage.addChild(new Bitmap(param2));
            this.mcImage.width = 30;
            this.mcImage.height = 27;
        };
        this.x = X;
        this.y = Y;
        if (monsterID.substr(0, 1) == "G") {
            this.tName.htmlText = "<b>" + CHAMPIONCAGE._guardians[monsterID.substr(0, 2)].name + "</b>";
        } else {
            name = String(CREATURELOCKER._creatures[monsterID].name);
            if (monsterID == "IC8") {
                name = "#m_k_wormzer#";
            }
            if (quantity) {
                this.tName.htmlText = "<b>" + KEYS.Get(name) + ": " + GLOBAL.FormatNumber(quantity) + "</b>";
            } else {
                this.tName.htmlText = "<b>" + KEYS.Get(name) + "</b>";
            }
        }
        if (!this._imageRequested) {
            ImageCache.GetImageWithCallBack("monsters/" + monsterID + "-small.png", ImageLoaded);
            this._imageRequested = true;
        }
    }
}

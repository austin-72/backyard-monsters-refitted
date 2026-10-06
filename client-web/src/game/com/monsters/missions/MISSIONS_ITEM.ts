import * as as3 from "as3";
import { int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, GLOBAL, ImageCache, KEYS, MISSIONS_INFO, POPUPS, QUESTS, SOUNDS, TUTORIAL, UI_MISSIONS_ITEM_CLIP } from "@game";

export class MISSIONS_ITEM extends UI_MISSIONS_ITEM_CLIP {
    static {
        as3.fields(this, { _Width: 340, _Height: 32, _missionObject: null, _missionID: null, _missionKey: null, _isComplete: false, _isDisable: false, _skinTag: 0 });
    }

    public _Width: number;
    public _Height: number;
    public _missionObject: any;
    public _missionID: string;
    public _missionKey: string;
    public _isComplete: boolean;
    public _isDisable: boolean;
    private _skinTag: int;

    public $ctor(param1?: string): void {
        let ImageLoaded: Function = null;
        let nametxt: string = null;
        let description: string = null;
        let shortenStr: string = null;
        let missionID: string = param1;
        super.$ctor();
        this._missionObject = QUESTS._quests[missionID];
        this._missionID = missionID;
        this._missionKey = as3.str(this._missionObject.id);
        nametxt = KEYS.Get(as3.str(this._missionObject.name), this._missionObject.keyvars);
        description = KEYS.Get(as3.str(this._missionObject.description), this._missionObject.keyvars);
        description = description.replace("#installsgenerated#", BASE._installsGenerated);
        description = description.replace("#mushroomspicked#", QUESTS._global.mushroomspicked);
        description = description.replace("#goldmushroomspicked#", QUESTS._global.goldmushroomspicked);
        description = description.replace("#monstersblended#", QUESTS._global.monstersblended);
        description = description.replace("#giftssent#", QUESTS._global.bonus_gifts);
        description = description.replace("#sentgiftsaccepted#", QUESTS._global.gift_accept);
        this.tName.htmlText = "<b>" + nametxt + "</b>";
        if (description.length > 50) {
            shortenStr = description;
            description = shortenStr.substr(0, 46) + "...";
        }
        this.tDesc.htmlText = description;
        this.mouseChildren = false;
        if (this._missionObject.questicon) {
            ImageLoaded = (param1: string, param2: BitmapData): void => {
                try {
                    this.mcImage.addChild(new Bitmap(param2));
                } catch (e) {
                }
            };
            ImageCache.GetImageWithCallBack("missionicon/" + this._missionObject.questicon, ImageLoaded);
        }
        if (Boolean(QUESTS._completed) && QUESTS._completed[this._missionKey] == 1) {
            this._isComplete = true;
        } else {
            this._isComplete = false;
        }
        this.Init();
    }

    public Init(param1: boolean = false): void {
        this._isDisable = param1;
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !param1) {
            this.buttonMode = true;
            this.useHandCursor = true;
            if (!this.hasEventListener(MouseEvent.CLICK)) {
                this.addEventListener(MouseEvent.CLICK, this.ShowMission(this._missionID));
                this.addEventListener(MouseEvent.ROLL_OVER, this.MissionRollOver(this._missionID));
            }
            if (this._isComplete) {
                this.gotoAndStop(2);
            } else {
                this.gotoAndStop(1);
            }
        } else {
            this.buttonMode = false;
            this.useHandCursor = false;
            this.removeEventListener(MouseEvent.CLICK, this.ShowMission(this._missionID));
            this.removeEventListener(MouseEvent.ROLL_OVER, this.MissionRollOver(this._missionID));
            if (this._isComplete) {
                this.gotoAndStop(3);
            } else {
                this.gotoAndStop(4);
            }
        }
    }

    public ShowMission(param1: string): Function {
        let missionID: string = null;
        missionID = param1;
        return (param1: MouseEvent = null): void => {
            let _loc2_: any = undefined;
            let _loc3_: any = undefined;
            if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD && !this._isDisable) {
                _loc2_ = this._missionObject.id;
                if (TUTORIAL.hasFinished || QUESTS._completed && QUESTS._completed[_loc2_] == 1 && TUTORIAL._stage >= 26) {
                    _loc3_ = new MISSIONS_INFO(missionID);
                    POPUPS.Push(_loc3_);
                    SOUNDS.Play("click1");
                    QUESTS._open = true;
                }
            }
        };
    }

    public MissionRollOver(param1: string): Function {
        let missionID: string = param1;
        return (param1: MouseEvent = null): void => {
        };
    }
}

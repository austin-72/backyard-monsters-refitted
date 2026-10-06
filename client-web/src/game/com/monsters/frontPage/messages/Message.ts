import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BFOUNDATION, BUILDINGOPTIONS, BUILDINGS, Button, Category, FrontPageHandler, GLOBAL, KEYS, LOGGER, POPUPS } from "@game";

export class Message extends ASObject {
    static {
        as3.fields(this, { name: null, title: null, body: null, imageURL: null, videoURL: null, timeLastSeen: 0, category: null, _doesSave: true, _buttonCopy: null, _bodyArguments: null });
    }

    protected static readonly _IMAGE_DIRECTORY: string = "popups/front_page/";
    public name: string;
    public title: string;
    public body: string;
    public imageURL: string;
    public videoURL: string;
    public timeLastSeen: uint;
    public category: Category;
    protected _doesSave: boolean;
    protected _buttonCopy: string;
    protected _bodyArguments: any;

    public $ctor(param1?: string, param2?: string, param3: string = null, param4: string = null, param5: string = null): void {
        super.$ctor();
        this.title = KEYS.Get(param1);
        this.body = KEYS.Get(param2, this._bodyArguments);
        if (param3) {
            this.imageURL = Message._IMAGE_DIRECTORY + param3;
        }
        this.videoURL = param5;
        if (param4) {
            this._buttonCopy = KEYS.Get(param4);
        }
        this.name = param1;
    }

    public get hasBeenSeen(): boolean {
        return Boolean(this.timeLastSeen);
    }

    public get areRequirementsMet(): boolean {
        return true;
    }

    public setupButton(param1: Button): Button {
        if (!this._buttonCopy) {
            param1.visible = false;
            return param1;
        }
        param1.Highlight = true;
        param1.Setup(this._buttonCopy);
        param1.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedButton));
        param1.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedButton), false, 0, false);
        return param1;
    }

    public viewed(): void {
        this.timeLastSeen = GLOBAL.Timestamp() >>> 0;
        this.onView();
    }

    protected clickedButton(param1: MouseEvent): void {
        let _loc2_: MovieClip = as3.cast(param1.currentTarget, MovieClip);
        LOGGER.StatB({ "st1": "GTP", "st2": "CTA", "value": 1 }, this._buttonCopy);
        _loc2_.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.clickedButton));
        this.onButtonClick();
    }

    public refresh(): void {
    }

    protected onButtonClick(): void {
    }

    protected onView(): void {
    }

    public setup(param1: any): void {
        if (!param1) {
            return;
        }
        if (param1.seen == 1) {
            this.timeLastSeen = GLOBAL.Timestamp() >>> 0;
        } else {
            this.timeLastSeen = param1.seen >>> 0;
        }
    }

    public export(): any {
        if (!this.timeLastSeen || !this._doesSave) {
            return null;
        }
        return { "name": this.name, "seen": this.timeLastSeen };
    }

    public buyBuilding(param1: int, param2: boolean = true): void {
        if (param2) {
            FrontPageHandler.closeAll();
        }
        BUILDINGS._buildingID = param1;
        BUILDINGS.Show();
    }

    public buyMenu(param1: int = 1, param2: int = 1, param3: int = 0): void {
        BUILDINGS.Show();
        BUILDINGS._mc.SwitchB(param1, param2, param3);
        POPUPS.Next();
    }

    public upgradeBuilding(param1: int): void {
        let _loc2_: BFOUNDATION = null;
        FrontPageHandler.closeAll();
        _loc2_ = BASE.findBuilding(param1);
        if (_loc2_) {
            BUILDINGOPTIONS.Show(_loc2_, "upgrade");
        } else {
            this.buyBuilding(param1);
        }
    }

    public markAsUnseenIfOlderThan(param1: int): void {
        if (GLOBAL.Timestamp() - this.timeLastSeen >= param1) {
            this.timeLastSeen = 0;
        }
    }
}

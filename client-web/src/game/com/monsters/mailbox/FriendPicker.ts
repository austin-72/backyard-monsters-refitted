import * as as3 from "as3";
import { int, uint } from "as3";
import { Loader, Sprite } from "flash/display";
import { Event, IOErrorEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { Contact, FriendPickerItem, FriendPicker_CLIP, GLOBAL, LOGIN, ScrollSet, TweenLite, URLLoaderApi, system_message } from "@game";

export class FriendPicker extends FriendPicker_CLIP {
    static {
        as3.fields(this, { pool: null, currentPage: 0, loader: null, currentSelection: null, isOpen: false, shell: null, scroller: null });
    }

    private static _contacts: any[] = [];
    public pool: any[];
    private currentPage: uint;
    public loader: Loader;
    public currentSelection: FriendPickerItem;
    public isOpen: boolean;
    private shell: Sprite;
    public scroller: ScrollSet;

    public $ctor(param1: string = "all"): void {
        super.$ctor();
        this.scroller = new ScrollSet();
        this.scroller.x = 292;
        this.scroller.y = 63;
        this.addChild(this.scroller);
        if (param1 == "map2friends") {
            this.hitBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.openMap2Friends));
        } else {
            this.hitBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.open));
        }
        this.shell = new Sprite();
        this.shell.mask = this.mask_mc;
        this.shell.x = this.mask_mc.x;
        this.shell.y = this.mask_mc.y;
        this.scroller.visible = false;
        this.bg_mc.visible = false;
        this.name_txt.htmlText = "";
        this.photoRing.visible = false;
        this.arrowBtn.gotoAndStop(2);
        this.placeholder.visible = false;
    }

    public static ClearContacts(): void {
        FriendPicker._contacts = [];
    }

    private open(...rest: any[]): void {
        let _loc2_: any[] = null;
        let _loc3_: int = 0;
        let _loc4_: uint = 0;
        let _loc5_: FriendPickerItem = null;
        if (this.isOpen) {
            this.close();
            return;
        }
        this.scroller.visible = true;
        this.arrowBtn.gotoAndStop(1);
        if (!this.pool) {
            _loc2_ = Contact.contacts;
            _loc3_ = _loc2_.length | 0;
            this.pool = [];
            _loc4_ = 0;
            while (_loc4_ < _loc3_) {
                (_loc5_ = new FriendPickerItem(as3.cast(_loc2_[_loc4_], Contact))).addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.onItemOver));
                _loc5_.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.onItemOut));
                _loc5_.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onItemDown));
                _loc5_.shouldLoadImage();
                _loc5_.mouseChildren = false;
                _loc5_.useHandCursor = true;
                _loc5_.buttonMode = true;
                this.pool.push(_loc5_);
                _loc4_++;
            }
            this.pool = as3.sortOn(this.pool, "name_str", Array.CASEINSENSITIVE);
            _loc4_ = 0;
            while (_loc4_ < this.pool.length) {
                _loc5_ = as3.cast(this.pool[_loc4_], FriendPickerItem);
                this.shell.addChild(_loc5_);
                _loc5_.x = 0;
                _loc5_.y = _loc4_ * 60;
                _loc4_++;
            }
            this.scroller.Init(this.shell, this.mask_mc, 0, this.mask_mc.y, this.mask_mc.height - 4, 60);
        }
        if (this.currentSelection) {
            this.shell.addChild(this.currentSelection);
        }
        this.bg_mc.visible = true;
        this.addChild(this.shell);
        this.isOpen = true;
        this.scroller.ScrollTo(0);
        this.scroller.Show();
        this.stage.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onKey));
    }

    private openMap2Friends(...rest: any[]): void {
        let _loc2_: Contact = null;
        let _loc3_: Contact = null;
        let _loc4_: URLLoaderApi = null;
        if (this.isOpen) {
            this.close();
            return;
        }
        if (FriendPicker._contacts.length == 0) {
            FriendPicker._contacts = [];
            _loc2_ = new Contact(String(LOGIN._playerID), { "first_name": "Me", "last_name": "", "pic_square": LOGIN._playerPic }, true);
            _loc3_ = new Contact("0", { "first_name": "D.A.V.E.", "last_name": "", "pic_square": "" }, true);
            _loc3_.picClass = system_message;
            // Inferno-only: relocation invites go to alliance members (server lists them).
            (_loc4_ = new URLLoaderApi()).load(GLOBAL.INFERNO_ONLY ? GLOBAL._mapURL + "invitetargets" : GLOBAL._apiURL + "player/getmessagetargets", null, as3.bind(this, this.onTargetsSuccess));
        } else {
            this._openMap2Friends();
        }
    }

    private onTargetsSuccess(param1: any): void {
        let _loc3_: string = null;
        let _loc4_: Contact = null;
        let _loc2_: boolean = false;
        for (_loc3_ in param1.targets) {
            _loc4_ = new Contact(_loc3_, param1.targets[_loc3_]);
            if (Boolean(param1.targets[_loc3_].friend) && param1.targets[_loc3_].mapver == 2) {
                FriendPicker._contacts.push(_loc4_);
            }
        }
        if (GLOBAL.INFERNO_ONLY && FriendPicker._contacts.length == 0) {
            GLOBAL.Message("There is nobody else in your alliance to invite yet.");
            return;
        }
        this._openMap2Friends();
    }

    private _openMap2Friends(): void {
        let _loc1_: any[] = null;
        let _loc2_: int = 0;
        let _loc3_: uint = 0;
        let _loc4_: FriendPickerItem = null;
        this.scroller.visible = true;
        this.arrowBtn.gotoAndStop(1);
        if (!this.pool) {
            _loc1_ = FriendPicker._contacts;
            _loc2_ = _loc1_.length | 0;
            this.pool = [];
            _loc3_ = 0;
            while (_loc3_ < _loc2_) {
                (_loc4_ = new FriendPickerItem(as3.cast(_loc1_[_loc3_], Contact))).addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.onItemOver));
                _loc4_.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.onItemOut));
                _loc4_.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.onItemDown));
                _loc4_.shouldLoadImage();
                _loc4_.mouseChildren = false;
                _loc4_.useHandCursor = true;
                _loc4_.buttonMode = true;
                this.pool.push(_loc4_);
                _loc3_++;
            }
            this.pool = as3.sortOn(this.pool, "name_str", Array.CASEINSENSITIVE);
            _loc3_ = 0;
            while (_loc3_ < this.pool.length) {
                _loc4_ = as3.cast(this.pool[_loc3_], FriendPickerItem);
                this.shell.addChild(_loc4_);
                _loc4_.x = 0;
                _loc4_.y = _loc3_ * 60;
                _loc3_++;
            }
            this.scroller.Init(this.shell, this.mask_mc, 0, this.mask_mc.y, this.mask_mc.height - 4, 60);
        }
        if (this.currentSelection) {
            this.shell.addChild(this.currentSelection);
        }
        this.bg_mc.visible = true;
        this.addChild(this.shell);
        this.isOpen = true;
        this.scroller.ScrollTo(0);
        this.scroller.Show();
        this.stage.addEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onKey));
    }

    private onKey(param1: KeyboardEvent): void {
        let _loc7_: number = NaN;
        let _loc2_: string = "abcdefghijklmnopqrstuvwxyz";
        let _loc3_: any[] = [65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90];
        let _loc4_: any = {};
        let _loc5_: uint = 0;
        while (_loc5_ < _loc3_.length) {
            _loc4_[_loc3_[_loc5_]] = _loc2_.charAt(_loc5_);
            _loc5_++;
        }
        let _loc6_: string = String(_loc4_[param1.keyCode]);
        _loc5_ = 0;
        while (_loc5_ < this.pool.length) {
            if (this.pool[_loc5_].name_str.toLowerCase().charAt(0) == _loc6_) {
                if ((_loc7_ = this.pool[_loc5_].y / (this.shell.height - this.mask_mc.height)) > 1) {
                    _loc7_ = 1;
                }
                if (_loc7_ < 0) {
                    _loc7_ = 0;
                }
                this.scroller.ScrollTo(_loc7_);
                return;
            }
            _loc5_++;
        }
    }

    public preloadSelection(param1: Contact): void {
        let _loc2_: FriendPickerItem = new FriendPickerItem(param1);
        this.setData(_loc2_);
        this.removeChild(this.hitBtn);
        this.removeChild(this.arrowBtn);
        this.removeChild(this.arrowLine);
    }

    public getCurrentData(): Contact {
        return this.currentSelection.data;
    }

    public onItemOver(param1: MouseEvent): void {
    }

    public onItemOut(param1: MouseEvent): void {
    }

    public onItemDown(param1: MouseEvent): void {
        this.setData(as3.as(param1.target, FriendPickerItem));
    }

    public setData(param1: FriendPickerItem): void {
        let self: FriendPicker = null;
        let last_str: string = null;
        let onErr: Function = null;
        let onImgComplete: Function = null;
        let item: FriendPickerItem = param1;
        self = this;
        onErr = (param1: IOErrorEvent): void => {
        };
        onImgComplete = (param1: Event): void => {
            this.photoRing.visible = true;
            this.loader.width = this.loader.height = 50;
            this.setChildIndex(this.photoRing, (self.numChildren - 1) | 0);
        };
        this.currentSelection = item;
        this.close();
        last_str = this.currentSelection.data.lastname.length > 2 ? " " + this.currentSelection.data.lastname.charAt(0).toUpperCase() + "." : "";
        this.name_txt.htmlText = "<b>" + this.currentSelection.data.firstname.toUpperCase() + last_str;
        if (this.loader) {
            this.removeChild(this.loader);
            this.loader = null;
        }
        this.loader = new Loader();
        this.loader.x = this.loader.y = 5;
        this.addChild(this.loader);
        this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onImgComplete);
        this.loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onErr);
        try {
            if (this.currentSelection.data.pic.length > 5) {
                this.loader.load(new URLRequest(this.currentSelection.data.pic));
            }
        } catch (e) {
        }
        this.placeholder.visible = true;
    }

    public gotoPage(param1: uint): void {
        let _loc2_: uint = param1 * 15 + 15 > this.pool.length ? this.pool.length : (param1 * 15 + 15) >>> 0;
        let _loc3_: number = this.mask_mc.x - 210 * 3 * param1;
        TweenLite.to(this.shell, 0.5, { "x": _loc3_ });
        this.currentPage = param1;
    }

    public close(): void {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;
        this.arrowBtn.gotoAndStop(2);
        this.scroller.visible = false;
        this.removeChild(this.shell);
        this.bg_mc.visible = false;
        this.stage.removeEventListener(KeyboardEvent.KEY_DOWN, as3.bind(this, this.onKey));
    }
}

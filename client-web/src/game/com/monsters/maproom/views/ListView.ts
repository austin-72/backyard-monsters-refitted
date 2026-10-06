import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { ListView_CLIP, TweenLite, com_monsters_maproom_MapRoom as MapRoom, com_monsters_maproom_PlayerLayer as PlayerLayer, com_monsters_maproom_model_BaseObject as BaseObject, com_monsters_maproom_views_ListViewArrow as ListViewArrow, com_monsters_maproom_views_ListViewItem as ListViewItem, com_monsters_maproom_views_WMListViewItem as WMListViewItem } from "@game";

export class ListView extends ListView_CLIP {
    static {
        as3.fields(this, { players: null, rows: null, gotFirstData: false, shell: null, bNext: null, bPrevious: null, currentSort: null, sortedData: null, reversed: false, currentPage: 0, pageLimit: 0, currentSorter: null, rowsPerPage: 7, btns: null });
    }

    public players: PlayerLayer;
    public rows: any[];
    private gotFirstData: boolean;
    private shell: Sprite;
    public bNext: ListViewArrow;
    public bPrevious: ListViewArrow;
    private currentSort: string;
    private sortedData: any[];
    private reversed: boolean;
    private currentPage: uint;
    private pageLimit: uint;
    private currentSorter: MovieClip;
    private rowsPerPage: uint;
    private btns: any[];

    public $ctor(): void {
        let _loc1_: MovieClip = null;
        super.$ctor();
        this.btns = [this.levelBtn, this.lastSeenBtn, this.nameBtn, this.winBtn, this.statusBtn];
        for (_loc1_ of as3.values(this.btns)) {
            _loc1_.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.sortHandler));
            _loc1_.mouseChildren = false;
            _loc1_.useHandCursor = true;
            _loc1_.buttonMode = true;
        }
        this.bPrevious = new ListViewArrow();
        this.bPrevious.rotation = 180;
        this.bPrevious.x = -20;
        this.bPrevious.y = 190;
        this.bPrevious.Trigger();
        this.addChild(this.bPrevious);
        this.bNext = new ListViewArrow();
        this.bNext.x = 720;
        this.bNext.y = 190;
        this.bNext.Trigger();
        this.addChild(this.bNext);
        this.bNext.visible = this.bPrevious.visible = false;
        this.bPrevious.buttonMode = this.bNext.buttonMode = true;
    }

    public Setup(): void {
        let _loc2_: MovieClip = null;
        this.players.addEventListener(Event.COMPLETE, as3.bind(this, this.onPlayersLoad));
        this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this.onAdd));
        this.rows = [].concat();
        this.shell = new Sprite();
        this.shell.mask = this.mask_mc;
        this.addChild(this.shell);
        let _loc1_: any[] = [this.levelBtn, this.lastSeenBtn, this.statusBtn, this.nameBtn, this.winBtn];
        for (_loc2_ of as3.values(_loc1_)) {
            _loc2_.sorter_mc.gotoAndStop(1);
        }
        this.setChildIndex(this.bPrevious, (this.numChildren - 1) | 0);
        this.setChildIndex(this.bNext, (this.numChildren - 1) | 0);
    }

    public Clear(): void {
        this.players = null;
        let _loc1_: int = 0;
        while (_loc1_ < this.rows.length) {
            if (this.rows[_loc1_].parent) {
                this.rows[_loc1_].parent.removeChild(this.rows[_loc1_]);
            }
            _loc1_++;
        }
        if (Boolean(this.shell) && Boolean(this.shell.parent)) {
            this.shell.parent.removeChild(this.shell);
        }
        this.shell = null;
        this.rows = null;
    }

    private onAdd(param1: Event): void {
    }

    private onPlayersLoad(param1: Event): void {
        let _loc2_: any = undefined;
        let _loc3_: BaseObject = null;
        if (!this.gotFirstData) {
            for (_loc3_ of as3.values(this.players.baseData)) {
                _loc2_ = _loc3_.wm.Get() == 1 ? new WMListViewItem() : new ListViewItem();
                _loc2_.Setup(_loc3_);
                this.rows.push(_loc2_);
            }
            this.gotFirstData = true;
            this.btns[MapRoom.BRIDGE._lastSort].dispatchEvent(new MouseEvent(MouseEvent.MOUSE_DOWN));
            if (MapRoom.BRIDGE._lastSortReversed == 1) {
                this.btns[MapRoom.BRIDGE._lastSort].dispatchEvent(new MouseEvent(MouseEvent.MOUSE_DOWN));
            }
            if (this.players.baseData.length > 7) {
                this.bNext.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.nextDown));
                this.bPrevious.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this.prevDown));
                this.pageLimit = Math.floor((this.players.baseData.length - 1) / 7) >>> 0;
                this.bNext.visible = true;
                this.bPrevious.visible = true;
            }
            this.displayArray(this.rows);
            this.scrollToPage(0);
        } else {
            this.displayArray(this.rows);
        }
    }

    private nextDown(param1: MouseEvent): void {
        MapRoom.BRIDGE.SOUNDS.Play("click1");
        if (this.currentPage < this.pageLimit) {
            this.scrollToPage((this.currentPage + 1) >>> 0);
        }
    }

    private prevDown(param1: MouseEvent): void {
        MapRoom.BRIDGE.SOUNDS.Play("click1");
        if (this.currentPage > 0) {
            this.scrollToPage((this.currentPage - 1) >>> 0);
        }
    }

    public scrollToPage(param1: uint = 0): void {
        this.currentPage = param1;
        TweenLite.to(this.shell, 0.3, { "x": -param1 * this.mask_mc.width });
        if (this.currentPage > 0) {
            this.bPrevious.Trigger(true);
        } else {
            this.bPrevious.Trigger(false);
        }
        if (this.currentPage < this.pageLimit) {
            this.bNext.Trigger(true);
        } else {
            this.bNext.Trigger(false);
        }
        let _loc2_: uint = (this.currentPage * this.rowsPerPage) >>> 0;
        let _loc3_: uint = (this.currentPage + 1) * this.rowsPerPage > this.rows.length ? this.rows.length : ((this.currentPage + 1) * this.rowsPerPage) >>> 0;
        let _loc4_: uint = _loc2_;
        while (_loc4_ < _loc3_) {
            this.rows[_loc4_].Display();
            _loc4_++;
        }
    }

    private displayArray(param1: any[]): void {
        let _loc3_: any = undefined;
        this.cleanup();
        let _loc2_: uint = 0;
        while (_loc2_ < param1.length) {
            _loc3_ = param1[_loc2_];
            this.shell.addChild(as3.cast(_loc3_, DisplayObject));
            _loc3_.x = 8 + this.mask_mc.width * Math.floor(_loc2_ / this.rowsPerPage);
            _loc3_.y = 26 + (_loc2_ * 50 - 50 * this.rowsPerPage * Math.floor(_loc2_ / this.rowsPerPage));
            _loc2_++;
        }
    }

    private sortHandler(param1: MouseEvent): void {
        let _loc2_: string = null;
        if (this.currentSorter) {
            this.currentSorter.sorter_mc.gotoAndStop(1);
            this.currentSorter.gotoAndStop(1);
        }
        switch (param1.target) {
            case this.nameBtn:
                _loc2_ = "ownerName";
                break;
            case this.lastSeenBtn:
                _loc2_ = "online";
                break;
            case this.winBtn:
                _loc2_ = "attackStarPoints";
                break;
            case this.statusBtn:
                _loc2_ = "status";
                break;
            case this.levelBtn:
                _loc2_ = "level";
        }
        let _loc3_: boolean = _loc2_ == "ownerName" || _loc2_ == "status" ? true : false;
        let _loc4_: uint = _loc3_ ? Array.CASEINSENSITIVE : Array.NUMERIC;
        if (this.currentSort == _loc2_) {
            this.reversed = !this.reversed;
            if (this.reversed == _loc3_) {
                _loc4_ = (_loc4_ | Array.DESCENDING) >>> 0;
            }
        } else {
            if (_loc2_ != "ownerName" && _loc2_ != "status") {
                _loc4_ = (_loc4_ | Array.DESCENDING) >>> 0;
            }
            this.reversed = false;
        }
        if (this.reversed) {
            param1.target.sorter_mc.gotoAndStop(3);
        } else {
            param1.target.sorter_mc.gotoAndStop(2);
        }
        this.sortedData = as3.sortOn(this.rows, [_loc2_, "status"], [_loc4_, Array.CASEINSENSITIVE]);
        this.currentSort = _loc2_;
        this.currentSorter = as3.as(param1.target, MovieClip);
        this.currentSorter.gotoAndStop(2);
        this.displayArray(this.sortedData);
        this.scrollToPage(0);
        let _loc5_: int = 0;
        while (_loc5_ < this.btns.length) {
            if (param1.target == this.btns[_loc5_]) {
                MapRoom.BRIDGE.setLastSort(_loc5_);
                break;
            }
            _loc5_++;
        }
        MapRoom.BRIDGE.setLastSortReversed(this.reversed ? 1 : 0);
    }

    private cleanup(): void {
        let _loc1_: any[] = [];
        let _loc2_: uint = 0;
        while (_loc2_ < this.shell.numChildren) {
            _loc1_.push(this.shell.getChildAt(_loc2_));
            _loc2_++;
        }
        _loc2_ = 0;
        while (_loc2_ < _loc1_.length) {
            _loc1_[_loc2_].parent.removeChild(_loc1_[_loc2_]);
            _loc2_++;
        }
    }
}

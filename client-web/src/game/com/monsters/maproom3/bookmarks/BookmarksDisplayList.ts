import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { Event } from "flash/events";
import { Bookmark, MapRoom3, ScrollSetV } from "@game";

export class BookmarksDisplayList extends Sprite {
    static {
        as3.fields(this, { m_BookmarksToDisplay: null, m_BookmarkDisplays: null, m_BookmarkDisplayFactory: null, m_Container: null, m_ScrollMask: null, m_ScrollBar: null, m_MaxDisplayListHeight: NaN, m_LastSelectedBookmarkIndex: -1 });
    }

    private m_BookmarksToDisplay: Vector<Bookmark>;
    private m_BookmarkDisplays: Vector<Sprite>;
    private m_BookmarkDisplayFactory: Function;
    private m_Container: Sprite;
    private m_ScrollMask: Sprite;
    private m_ScrollBar: ScrollSetV;
    private m_MaxDisplayListHeight: number;
    private m_LastSelectedBookmarkIndex: int;

    public $ctor(param1?: Vector<Bookmark>, param2?: Function, param3: int = -1): void {
        super.$ctor();
        this.m_BookmarksToDisplay = param1;
        this.m_BookmarkDisplayFactory = param2;
        this.m_Container = new Sprite();
        this.addChild(this.m_Container);
        this.CreateBookmarkDisplays();
        this.m_MaxDisplayListHeight = this.m_Container.height;
        if (param3 != -1 && param3 < this.m_BookmarkDisplays.length) {
            this.m_MaxDisplayListHeight = param3 * as3.vget(this.m_BookmarkDisplays, 0).height;
        }
        this.m_ScrollMask = new Sprite();
        this.m_ScrollMask.graphics.beginFill(16777215, 0.01);
        this.m_ScrollMask.graphics.drawRect(0, 0, this.m_Container.width, this.m_MaxDisplayListHeight);
        this.m_ScrollMask.graphics.endFill();
        this.m_ScrollMask.mouseEnabled = false;
        this.m_ScrollMask.mouseChildren = false;
        this.addChild(this.m_ScrollMask);
        this.m_ScrollBar = new ScrollSetV(this.m_Container, this.m_ScrollMask);
        this.m_ScrollBar.x = this.m_Container.width - this.m_ScrollBar.width;
        this.addChild(this.m_ScrollBar);
    }

    public get maxDisplayListHeight(): number {
        return this.m_MaxDisplayListHeight;
    }

    public Clear(): void {
        this.ClearBookmarkDisplays();
        this.removeChild(this.m_ScrollBar);
        this.removeChild(this.m_ScrollMask);
        this.removeChild(this.m_Container);
        this.m_ScrollBar = null;
        this.m_ScrollMask = null;
        this.m_Container = null;
        this.m_BookmarksToDisplay = null;
        this.m_BookmarkDisplayFactory = null;
    }

    public Refresh(): void {
        this.ClearBookmarkDisplays();
        this.CreateBookmarkDisplays();
        this.m_ScrollBar.checkResize();
    }

    private CreateBookmarkDisplays(): void {
        let _loc1_: int = 0;
        let _loc2_: Sprite = null;
        if (this.m_BookmarksToDisplay == null) {
            return;
        }
        _loc1_ = 0;
        let _loc3_: uint = this.m_BookmarksToDisplay.length >>> 0;
        this.m_BookmarkDisplays = new Vector<Sprite>(_loc3_, false, Sprite);
        let _loc4_: uint = 0;
        while (_loc4_ < _loc3_) {
            _loc2_ = as3.cast(this.m_BookmarkDisplayFactory(as3.vget(this.m_BookmarksToDisplay, _loc4_), _loc4_), Sprite);
            as3.vset(this.m_BookmarkDisplays, _loc4_, _loc2_);
            this.m_Container.addChild(_loc2_);
            _loc2_.x = 0;
            _loc2_.y = _loc1_;
            _loc1_ = (_loc1_ + _loc2_.height) | 0;
            _loc4_++;
        }
    }

    private ClearBookmarkDisplays(): void {
        let _loc1_: Sprite = null;
        if (this.m_BookmarkDisplays == null) {
            return;
        }
        let _loc2_: uint = this.m_BookmarkDisplays.length >>> 0;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            _loc1_ = as3.vget(this.m_BookmarkDisplays, _loc3_);
            if (_loc1_.hasOwnProperty("Clear")) {
                _loc1_["Clear"]();
            }
            this.m_Container.removeChild(_loc1_);
            _loc3_++;
        }
        as3.vsetLength(this.m_BookmarkDisplays, 0);
        this.m_BookmarkDisplays = null;
    }

    public NavigateToNextBookmark(param1: Event = null): void {
        let _loc2_: uint = this.m_BookmarksToDisplay.length >>> 0;
        if (_loc2_ == 0) {
            return;
        }
        ++this.m_LastSelectedBookmarkIndex;
        if (this.m_LastSelectedBookmarkIndex >= this.m_BookmarksToDisplay.length) {
            this.m_LastSelectedBookmarkIndex = 0;
        }
        MapRoom3.mapRoom3Window.NavigateToCell(as3.vget(this.m_BookmarksToDisplay, this.m_LastSelectedBookmarkIndex).mapCell);
    }
}

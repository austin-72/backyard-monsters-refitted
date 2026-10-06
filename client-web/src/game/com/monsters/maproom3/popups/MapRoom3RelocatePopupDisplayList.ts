import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { MapRoom3FriendData, MapRoom3RelocatePopupItemDisplay, ScrollSetV } from "@game";

export class MapRoom3RelocatePopupDisplayList extends Sprite {
    static {
        as3.fields(this, { m_FriendsToDisplay: null, m_FriendItemDisplays: null, m_Container: null, m_ScrollMask: null, m_ScrollBar: null });
    }

    private m_FriendsToDisplay: Vector<MapRoom3FriendData>;
    private m_FriendItemDisplays: Vector<MapRoom3RelocatePopupItemDisplay>;
    private m_Container: Sprite;
    private m_ScrollMask: Sprite;
    private m_ScrollBar: ScrollSetV;

    public $ctor(param1?: Vector<MapRoom3FriendData>, param2: int = -1): void {
        super.$ctor();
        this.m_FriendsToDisplay = param1;
        this.m_Container = new Sprite();
        this.addChild(this.m_Container);
        this.CreateFriendDisplays();
        let _loc3_: number = this.m_Container.height;
        if (param2 != -1 && param2 < this.m_FriendItemDisplays.length) {
            _loc3_ = param2 * as3.vget(this.m_FriendItemDisplays, 0).height;
        }
        this.m_ScrollMask = new Sprite();
        this.m_ScrollMask.graphics.beginFill(16777215, 0.01);
        this.m_ScrollMask.graphics.drawRect(0, 0, this.m_Container.width, _loc3_);
        this.m_ScrollMask.graphics.endFill();
        this.m_ScrollMask.mouseEnabled = false;
        this.m_ScrollMask.mouseChildren = false;
        this.addChild(this.m_ScrollMask);
        this.m_ScrollBar = new ScrollSetV(this.m_Container, this.m_ScrollMask);
        this.m_ScrollBar.x = this.m_Container.width - this.m_ScrollBar.width;
        this.addChild(this.m_ScrollBar);
    }

    public Clear(): void {
        this.ClearFriendDisplays();
        this.removeChild(this.m_ScrollBar);
        this.removeChild(this.m_ScrollMask);
        this.removeChild(this.m_Container);
        this.m_ScrollBar = null;
        this.m_ScrollMask = null;
        this.m_Container = null;
        this.m_FriendsToDisplay = null;
    }

    public Refresh(): void {
        this.ClearFriendDisplays();
        this.CreateFriendDisplays();
        this.m_ScrollBar.checkResize();
    }

    private CreateFriendDisplays(): void {
        let _loc4_: MapRoom3RelocatePopupItemDisplay = null;
        if (this.m_FriendsToDisplay == null) {
            return;
        }
        let _loc1_: int = 0;
        let _loc2_: uint = this.m_FriendsToDisplay.length >>> 0;
        this.m_FriendItemDisplays = new Vector<MapRoom3RelocatePopupItemDisplay>(_loc2_, false, MapRoom3RelocatePopupItemDisplay);
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            _loc4_ = new MapRoom3RelocatePopupItemDisplay(as3.vget(this.m_FriendsToDisplay, _loc3_));
            as3.vset(this.m_FriendItemDisplays, _loc3_, _loc4_);
            this.m_Container.addChild(_loc4_);
            _loc4_.x = 0;
            _loc4_.y = _loc1_;
            _loc1_ = (_loc1_ + _loc4_.height) | 0;
            _loc3_++;
        }
    }

    private ClearFriendDisplays(): void {
        let _loc3_: MapRoom3RelocatePopupItemDisplay = null;
        if (this.m_FriendItemDisplays == null) {
            return;
        }
        let _loc1_: uint = this.m_FriendItemDisplays.length >>> 0;
        let _loc2_: uint = 0;
        while (_loc2_ < _loc1_) {
            _loc3_ = as3.vget(this.m_FriendItemDisplays, _loc2_);
            _loc3_.Clear();
            this.m_Container.removeChild(_loc3_);
            _loc2_++;
        }
        as3.vsetLength(this.m_FriendItemDisplays, 0);
        this.m_FriendItemDisplays = null;
    }
}

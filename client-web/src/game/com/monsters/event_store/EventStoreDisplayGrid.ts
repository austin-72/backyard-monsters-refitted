import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Sprite } from "flash/display";
import { EventStorePrize, EventStorePrizeData, ScrollSetV } from "@game";

export class EventStoreDisplayGrid extends Sprite {
    static {
        as3.fields(this, { m_ScrollContents: null, m_ScrollSpacer: null, m_ScrollMask: null, m_ScrollBar: null, m_DisplayItems: null, m_AvailablePrizes: null });
    }

    private static readonly MAX_ITEMS_PER_ROW: uint = 5;

    private static readonly X_BUFFER: number = 10;

    private static readonly Y_BUFFER: number = 10;
    private m_ScrollContents: Sprite;
    private m_ScrollSpacer: Sprite;
    private m_ScrollMask: Sprite;
    private m_ScrollBar: ScrollSetV;
    private m_DisplayItems: Vector<EventStorePrize>;
    private m_AvailablePrizes: any[];

    public $ctor(param1?: Sprite): void {
        this.m_DisplayItems = new Vector<EventStorePrize>(0, false, EventStorePrize);
        super.$ctor();
        this.m_ScrollContents = new Sprite();
        this.addChild(this.m_ScrollContents);
        this.m_ScrollSpacer = new Sprite();
        this.m_ScrollSpacer.graphics.beginFill(16777215, 0.01);
        this.m_ScrollSpacer.graphics.drawRect(0, 0, 2, 2);
        this.m_ScrollSpacer.graphics.endFill();
        this.m_ScrollContents.addChild(this.m_ScrollSpacer);
        this.m_ScrollMask = new Sprite();
        this.m_ScrollMask.graphics.beginFill(16777215, 0.01);
        this.m_ScrollMask.graphics.drawRect(0, 0, param1.width, param1.height);
        this.m_ScrollMask.graphics.endFill();
        this.m_ScrollMask.mouseEnabled = false;
        this.m_ScrollMask.mouseChildren = false;
        this.m_ScrollContents.mask = this.m_ScrollMask;
        this.addChild(this.m_ScrollMask);
        this.m_ScrollBar = new ScrollSetV(this.m_ScrollContents, this.m_ScrollMask, true);
        this.m_ScrollBar.x = param1.width - this.m_ScrollBar.width;
        this.addChild(this.m_ScrollBar);
    }

    public Populate(): void {
        let _loc1_: any[] = null;
        if (this.m_AvailablePrizes == null) {
            _loc1_ = [{ "id": "prize_rezghul", "xpcost": 999 }, { "id": "prize_gold_totem", "xpcost": 9999 }, { "id": "prize_black_totem", "xpcost": 999 }, { "id": "prize_spurtz_cannon_1", "xpcost": 9999 }, { "id": "prize_spurtz_cannon_2", "xpcost": 999 }, { "id": "prize_spurtz_cannon_bd", "xpcost": 9999 }, { "id": "prize_unlock_vorg", "xpcost": 999 }, { "id": "prize_unlock_slimeattikus", "xpcost": 9999 }, { "id": "prize_korath", "xpcost": 999 }, { "id": "prize_korath_ability_1", "xpcost": 9999 }, { "id": "prize_korath_ability_2", "xpcost": 999 }];
            this.OnAvailableItemsLoaded(_loc1_);
        } else {
            this._Populate();
        }
    }

    private OnAvailableItemsLoaded(param1: any[]): void {
        let _loc4_: any = null;
        let _loc5_: any = null;
        this.m_AvailablePrizes = new Array();
        let _loc2_: uint = param1.length;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            _loc4_ = param1[_loc3_];
            if ((_loc5_ = EventStorePrizeData.FindEventStorePrizeData(as3.str(_loc4_.id))) != null) {
                _loc5_.xpcost = _loc4_.xpcost;
                this.m_AvailablePrizes.push(_loc5_);
            }
            _loc3_++;
        }
        this._Populate();
    }

    private _Populate(): void {
        let _loc1_: int = 0;
        let _loc5_: EventStorePrize = null;
        if (this.m_AvailablePrizes == null) {
            return;
        }
        let _loc2_: number = EventStoreDisplayGrid.X_BUFFER;
        let _loc3_: number = EventStoreDisplayGrid.Y_BUFFER;
        let _loc4_: any = null;
        _loc5_ = null;
        let _loc6_: uint = this.m_AvailablePrizes.length;
        _loc1_ = 0;
        while (_loc1_ < _loc6_) {
            _loc4_ = this.m_AvailablePrizes[_loc1_];
            _loc5_ = new EventStorePrize(_loc4_);
            this.m_DisplayItems.push(_loc5_);
            this.m_ScrollContents.addChild(_loc5_);
            _loc5_.x = _loc2_;
            _loc5_.y = _loc3_;
            if ((_loc1_ + 1) % EventStoreDisplayGrid.MAX_ITEMS_PER_ROW == 0) {
                _loc2_ = EventStoreDisplayGrid.X_BUFFER;
                _loc3_ += _loc5_.height + EventStoreDisplayGrid.Y_BUFFER;
            } else {
                _loc2_ += _loc5_.width + EventStoreDisplayGrid.X_BUFFER;
            }
            _loc1_++;
        }
        this.m_ScrollSpacer.width = 1;
        this.m_ScrollSpacer.height = this.m_ScrollContents.height + EventStoreDisplayGrid.Y_BUFFER;
        this.m_ScrollBar.checkResize();
    }

    public Clear(): void {
        let _loc1_: EventStorePrize = null;
        let _loc2_: uint = this.m_DisplayItems.length >>> 0;
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            _loc1_ = as3.vget(this.m_DisplayItems, _loc3_);
            this.m_ScrollContents.removeChild(_loc1_);
            _loc1_.Destroy();
            _loc3_++;
        }
        as3.vsetLength(this.m_DisplayItems, 0);
    }
}

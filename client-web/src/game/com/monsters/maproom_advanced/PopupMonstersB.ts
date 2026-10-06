import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { KEYS, MapRoomCell, PopupInfoMonster, PopupMonstersB_CLIP, ScrollSet, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class PopupMonstersB extends PopupMonstersB_CLIP {
    static {
        as3.fields(this, { _cell: null, _transfer: null, _mcMonsters: null, _scroller: null });
    }

    private _cell: MapRoomCell;
    private _transfer: any;
    private _mcMonsters: MovieClip;
    private _scroller: ScrollSet;

    public $ctor(): void {
        super.$ctor();
        this.x = 760 / 2 + 75;
        this.y = 520 / 2 - 10;
        this.mMonsters.mask = this.mMonstersMask;
        this._scroller = new ScrollSet();
        this._scroller.isHiddenWhileUnnecessary = true;
        this._scroller.AutoHideEnabled = false;
        this._scroller.width = this.scroll.width;
        this._scroller.x = this.scroll.x;
        this._scroller.y = this.scroll.y;
        this.addChild(this._scroller);
        this._scroller.Init(this.mMonsters, this.mMonstersMask, 0, this.scroll.y, this.scroll.height);
        this.bTransfer.SetupKey("bunker_btn_transfer");
        this.bTransfer.addEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            MapRoom.TransferMonstersC(this._cell);
        });
        this.bCancel.SetupKey("btn_cancel");
        this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
    }

    public Setup(param1: any, param2: MapRoomCell): void {
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: string = null;
        let _loc6_: PopupInfoMonster = null;
        this.tDesc.htmlText = KEYS.Get("popup_desc_monstertransferb");
        if (this._mcMonsters) {
            while (this._mcMonsters.numChildren > 0) {
                this._mcMonsters.removeChildAt(0);
            }
            this._mcMonsters = null;
        }
        this._cell = param2;
        this._transfer = param1;
        if (this._transfer) {
            this._mcMonsters = new MovieClip();
            this._mcMonsters.x = -190;
            this._mcMonsters.y = -115;
            _loc3_ = 0;
            _loc4_ = 0;
            for (_loc5_ in this._transfer) {
                if (this._transfer[_loc5_].Get() > 0) {
                    (_loc6_ = new PopupInfoMonster()).Setup((_loc3_ * 130) | 0, (_loc4_ * 35) | 0, _loc5_, this._transfer[_loc5_].Get() | 0);
                    _loc3_ += 1;
                    if (_loc3_ == 3) {
                        _loc3_ = 0;
                        _loc4_ += 1;
                    }
                    this._mcMonsters.addChild(_loc6_);
                }
            }
            this.addChild(this._mcMonsters);
        }
        this._scroller.Update();
    }

    public Cleanup(): void {
        this.bTransfer.removeEventListener(MouseEvent.CLICK, (param1: MouseEvent): void => {
            MapRoom.TransferMonstersC(this._cell);
        });
        this.bCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        if (this._mcMonsters) {
            while (this._mcMonsters.numChildren > 0) {
                this._mcMonsters.removeChildAt(0);
            }
            this._mcMonsters = null;
        }
    }

    public Hide(param1: MouseEvent = null): void {
        if (MapRoom._mc) {
            MapRoom._mc.HideMonstersB();
        }
    }
}

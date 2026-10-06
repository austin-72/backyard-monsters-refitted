import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GLOBAL, KEYS, MapRoomCell, MonsterTransferBar, PopupInfoMonster, PopupMonstersA_CLIP, ScrollSet, SecNum, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class PopupMonstersA extends PopupMonstersA_CLIP {
    static {
        as3.fields(this, { _cell: null, _transfer: null, _mc: null, _mcMonsters: null, _tempMonsterID: null, _tickDelay: 0, _transferMonsters: null, _monstersLeft: null, _transferBars: null, _scroller: null });
    }

    private _cell: MapRoomCell;
    private _transfer: any;
    private _mc: PopupMonstersA;
    private _mcMonsters: MovieClip;
    private _tempMonsterID: string;
    private _tickDelay: int;
    private _transferMonsters: any;
    private _monstersLeft: any;
    private _transferBars: any[];
    private _scroller: ScrollSet;

    public $ctor(): void {
        this._transferMonsters = {};
        this._monstersLeft = {};
        this._transferBars = [];
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
        this._mc = this;
        this.bCancel.SetupKey("btn_cancel");
        this.bCancel.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        this.bTransfer.SetupKey("btn_transfer");
        this.bTransfer.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Transfer));
    }

    public Setup(param1: MapRoomCell, param2: boolean = false): void {
        let _loc3_: string = null;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc8_: MonsterTransferBar = null;
        let _loc9_: PopupInfoMonster = null;
        this._cell = param1;
        this._transfer = {};
        this._transferMonsters = {};
        this._monstersLeft = {};
        this._transferBars = [];
        this.tDesc.htmlText = KEYS.Get("popup_desc_monstertransfera");
        if (param2) {
            for (_loc3_ in MapRoom._monsterTransfer) {
                this._transfer[_loc3_] = new SecNum(MapRoom._monsterTransfer[_loc3_].Get() | 0);
            }
        }
        if (this._cell._monsters) {
            _loc4_ = 0;
            _loc5_ = 0;
            _loc6_ = 0;
            for (_loc7_ in this._cell._monsters) {
                _loc8_ = new MonsterTransferBar();
                (_loc9_ = new PopupInfoMonster()).Setup(0, 0, _loc7_, 0);
                _loc8_.addChild(_loc9_);
                _loc8_.y = _loc5_ * _loc8_.height;
                _loc8_.b1a.Setup("-");
                _loc8_.b1a.addEventListener(MouseEvent.MOUSE_DOWN, this.Subtract(_loc6_));
                _loc8_.b1a.buttonMode = true;
                _loc8_.b1a.enabled = true;
                _loc8_.b1b.Setup("+");
                _loc8_.b1b.addEventListener(MouseEvent.MOUSE_DOWN, this.Add(_loc6_));
                _loc8_.b1b.buttonMode = true;
                _loc8_.b1b.enabled = true;
                _loc6_++;
                if (param2) {
                    if (this._monstersLeft[_loc7_]) {
                        this._monstersLeft[_loc7_].Set((this._cell._monsters[_loc7_].Get() - this._transfer[_loc7_].Get()) | 0);
                    } else {
                        this._monstersLeft[_loc7_] = new SecNum((this._cell._monsters[_loc7_].Get() - this._transfer[_loc7_].Get()) | 0);
                    }
                    _loc8_.r1.text = as3.str(this._monstersLeft[_loc7_].Get());
                    this._transferMonsters[_loc7_] = new SecNum(this._transfer[_loc7_].Get() | 0);
                    _loc8_.t1.text = as3.str(this._transferMonsters[_loc7_].Get());
                } else {
                    _loc8_.r1.text = as3.str(this._cell._monsters[_loc7_].Get());
                    _loc8_.t1.text = "0";
                    this._monstersLeft[_loc7_] = new SecNum(this._cell._monsters[_loc7_].Get() | 0);
                    this._transferMonsters[_loc7_] = new SecNum(0);
                }
                this._transferBars.push({ "bar": _loc8_, "monster": _loc7_ });
                this.mMonsters.addChild(_loc8_);
                _loc5_ += 1;
            }
        }
        this.Update();
    }

    public Hide(param1: MouseEvent = null): void {
        let _loc3_: int = 0;
        let _loc2_: int = this._transferBars.length | 0;
        if (_loc2_ > 0) {
            _loc3_ = 0;
            while (_loc3_ < _loc2_) {
                if (Boolean(this._transferBars[_loc3_]) && Boolean(this._transferBars[_loc3_].bar) && Boolean(this._transferBars[_loc3_].bar.parent)) {
                    this._transferBars[_loc3_].bar.parent.removeChild(this._transferBars[_loc3_].bar);
                }
                _loc3_++;
            }
        }
        MapRoom._mc.HideMonstersA();
        MapRoom._mc.ShowInfoMine(this._cell);
        MapRoom._monsterTransferInProgress = false;
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.AddTick));
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.SubtractTick));
        this._mc.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.TickRemove));
    }

    public Cleanup(): void {
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.AddTick));
        this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.SubtractTick));
        this.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.TickRemove));
        this.bCancel.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Hide));
        this.bTransfer.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.Transfer));
    }

    private Update(): void {
        let _loc2_: MonsterTransferBar = null;
        let _loc3_: string = null;
        let _loc1_: int = 0;
        while (_loc1_ < this._transferBars.length) {
            _loc2_ = as3.cast(this._transferBars[_loc1_].bar, MonsterTransferBar);
            if (_loc2_ && _loc2_.r1 && Boolean(_loc2_.t1)) {
                _loc3_ = String(this._transferBars[_loc1_].monster);
                _loc2_.r1.htmlText = "<b>" + GLOBAL.FormatNumber(Number(this._monstersLeft[_loc3_].Get())) + "</b>";
                _loc2_.t1.htmlText = "<b>" + GLOBAL.FormatNumber(Number(this._transferMonsters[_loc3_].Get())) + "</b>";
            }
            _loc1_++;
        }
        if (this._scroller) {
            this._scroller.Update();
        }
    }

    private Add(param1: int): Function {
        let i: int = 0;
        i = param1;
        return (param1: MouseEvent): void => {
            if (this._cell._monsters[this._transferBars[i].monster].Get() > 0) {
                this._tempMonsterID = as3.str(this._transferBars[i].monster);
                this._tickDelay = 0;
                this.AddTick();
                this._tickDelay = 10;
                this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.AddTick));
                this._mc.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.TickRemove));
            }
        };
    }

    private AddTick(param1: Event = null): void {
        if (this._monstersLeft[this._tempMonsterID].Get() > 0 && this._cell._monsters[this._tempMonsterID].Get() - this._transferMonsters[this._tempMonsterID].Get() > 0 && this._tickDelay <= 0) {
            this._transferMonsters[this._tempMonsterID].Add(1);
            this._monstersLeft[this._tempMonsterID].Add(-1);
            this.Update();
        }
        --this._tickDelay;
    }

    private Subtract(param1: int): Function {
        let i: int = 0;
        i = param1;
        return (param1: MouseEvent): void => {
            if (Boolean(this._transferMonsters) && this._transferMonsters[this._transferBars[i].monster].Get() >= 1) {
                this._tempMonsterID = as3.str(this._transferBars[i].monster);
                this._tickDelay = 0;
                this.SubtractTick();
                this._tickDelay = 10;
                this._mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.SubtractTick));
                this._mc.addEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.TickRemove));
            }
        };
    }

    private SubtractTick(param1: Event = null): void {
        if (this._transferMonsters[this._tempMonsterID].Get() >= 1 && this._tickDelay <= 0) {
            this._transferMonsters[this._tempMonsterID].Add(-1);
            this._monstersLeft[this._tempMonsterID].Add(1);
            this.Update();
        }
        --this._tickDelay;
    }

    private TickRemove(param1: MouseEvent): void {
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.AddTick));
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.SubtractTick));
        this._mc.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.TickRemove));
    }

    private Transfer(param1: MouseEvent): void {
        let _loc3_: int = 0;
        MapRoom.TransferMonstersA(this._cell, this._transferMonsters);
        let _loc2_: int = this._transferBars.length | 0;
        if (_loc2_ > 0) {
            _loc3_ = 0;
            while (_loc3_ < _loc2_) {
                if (Boolean(this._transferBars[_loc3_]) && Boolean(this._transferBars[_loc3_].bar) && Boolean(this._transferBars[_loc3_].bar.parent)) {
                    this._transferBars[_loc3_].bar.parent.removeChild(this._transferBars[_loc3_].bar);
                }
                _loc3_++;
            }
        }
        MapRoom._mc.HideMonstersA();
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.AddTick));
        this._mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.SubtractTick));
        this._mc.removeEventListener(MouseEvent.MOUSE_UP, as3.bind(this, this.TickRemove));
    }
}

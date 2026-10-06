import * as as3 from "as3";
import { int } from "as3";
import { MovieClip } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { GLOBAL, KEYS, MONSTERBAITER, MONSTERBAITERPOPUP_CLIP, MonsterBaiterItem, POPUPSETTINGS, SOUNDS, STORE } from "@game";

export class MONSTERBAITERPOPUP extends MONSTERBAITERPOPUP_CLIP {
    static {
        as3.fields(this, { monsters: null, _arrows: null, _attackPt: null, _attackIndex: 0, attackArrow: null, attackStrings: null, items: null, _guidePage: 1 });
    }

    private static readonly BAITER_BAR_WIDTH: int = 535;
    public monsters: any[];
    public _arrows: any[];
    public _attackPt: Point;
    public _attackIndex: int;
    private attackArrow: MovieClip;
    private attackStrings: any[];
    private items: any[];
    private _guidePage: int;

    public $ctor(): void {
        super.$ctor();
        this.title_txt.htmlText = KEYS.Get("bait_title");
    }

    public Setup(param1: any, param2: int): void {
        let _loc4_: int = 0;
        let _loc6_: MovieClip = null;
        let _loc7_: MovieClip = null;
        let _loc8_: MonsterBaiterItem = null;
        this.clearBtn.SetupKey("bait_clear_btn");
        this.clearBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.clearDown));
        this.tSize.htmlText = "<b>" + KEYS.Get("size_of_attack") + "</b>";
        this.tUpgrade.htmlText = KEYS.Get("upgrade_monster_baiter");
        this.sendBtn.SetupKey("bait_start_btn");
        this.sendBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSendDown));
        this.attackStrings = ["tl", "tr", "br", "bl", "t", "r", "b", "l"];
        this.monsters = [this.m1, this.m2, this.m3, this.m4, this.m5, this.m6, this.m7, this.m8, this.m9, this.m10, this.m11, this.m12, this.m13, this.m14];
        let _loc3_: any[] = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C17"];
        this.sendBtn.Highlight = true;
        this.items = [];
        _loc4_ = 1;
        while (_loc4_ < 15) {
            _loc8_ = new MonsterBaiterItem();
            this["m" + _loc4_].addChild(_loc8_);
            _loc8_.Setup("C" + _loc4_);
            _loc8_._count = param1["C" + _loc4_] | 0;
            _loc8_.Update();
            _loc8_.addEventListener(Event.CHANGE, as3.bind(this, this.onChange));
            _loc8_.addEventListener("increment", as3.bind(this, this.onIncrementAttempt));
            this.items.push(_loc8_);
            _loc4_++;
        }
        let _loc5_: any[] = [this.tl_mc, this.tr_mc, this.br_mc, this.bl_mc, this.t_mc, this.r_mc, this.b_mc, this.l_mc];
        this._arrows = as3.cast(GLOBAL._bBaiter._lvl.Get() >= 3 ? _loc5_.splice(0, 8) : _loc5_.splice(0, 4), Array);
        if (param2 >= this._arrows.length) {
            param2 = 0;
        }
        for (_loc6_ of as3.values(_loc5_)) {
            _loc6_.visible = false;
        }
        for (_loc7_ of as3.values(this._arrows)) {
            _loc7_.gotoAndStop(2);
            _loc7_.addEventListener(MouseEvent.CLICK, as3.bind(this, this.handleArrowDown));
            _loc7_.buttonMode = true;
        }
        this._attackIndex = param2;
        this.setAttackDirection(as3.cast(this._arrows[param2], MovieClip));
        this.Update();
    }

    private handleArrowDown(param1: MouseEvent): void {
        let _loc2_: MovieClip = as3.as(param1.target, MovieClip);
        if (_loc2_ != this.attackArrow) {
            this.setAttackDirection(_loc2_);
        }
    }

    private onBuyDown(param1: MouseEvent): void {
        STORE.ShowB(2, 1, ["MUSK"]);
    }

    private onIncrementAttempt(param1: Event): void {
        let _loc4_: MonsterBaiterItem = null;
        let _loc2_: int = (MONSTERBAITER._musk / MONSTERBAITER._muskLimit * 100) | 0;
        let _loc3_: int = 0;
        for (_loc4_ of as3.values(this.items)) {
            _loc3_ += _loc4_.getCost();
        }
    }

    private clearDown(param1: MouseEvent): void {
        let _loc3_: MonsterBaiterItem = null;
        let _loc2_: any = {};
        for (_loc3_ of as3.values(this.items)) {
            _loc3_._count = 0;
            _loc2_[_loc3_._key] = _loc3_._count;
            _loc3_.Update();
        }
        MONSTERBAITER._queue = _loc2_;
        this.Update();
        SOUNDS.Play("click1");
    }

    public setAttackDirection(param1: MovieClip): void {
        let _loc2_: any[] = null;
        _loc2_ = [new Point(400, 180), new Point(400, 270), new Point(400, 0), new Point(400, 90), new Point(400, 225), new Point(400, 315), new Point(400, 45), new Point(400, 135)];
        if (this.attackArrow) {
            this.attackArrow.gotoAndStop(2);
        }
        let _loc3_: int = 0;
        _loc3_ = 0;
        while (_loc3_ < this._arrows.length) {
            if (this._arrows[_loc3_] == param1) {
                param1.gotoAndStop(1);
                this._attackPt = as3.cast(_loc2_[_loc3_], Point);
                this._attackIndex = _loc3_;
                this.attackArrow = param1;
                this._arrows[_loc3_].removeEventListener(MouseEvent.CLICK, as3.bind(this, this.handleArrowDown));
            } else {
                this._arrows[_loc3_].addEventListener(MouseEvent.CLICK, as3.bind(this, this.handleArrowDown));
            }
            _loc3_++;
        }
        MONSTERBAITER._attackDir = this._attackIndex;
        MONSTERBAITER._attackPt = as3.cast(_loc2_[this._attackIndex], Point);
    }

    private onChange(param1: Event = null): void {
        let _loc3_: MonsterBaiterItem = null;
        let _loc2_: any = {};
        for (_loc3_ of as3.values(this.items)) {
            _loc2_[_loc3_._key] = _loc3_._count;
        }
        MONSTERBAITER._queue = _loc2_;
    }

    public Tick(): void {
    }

    public Update(): void {
        let _loc2_: MonsterBaiterItem = null;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc1_: int = 0;
        for (_loc2_ of as3.values(this.items)) {
            _loc1_ += _loc2_.getCost();
        }
        this.clearBtn.Enabled = _loc1_ > 0;
        _loc3_ = (MONSTERBAITER._musk / MONSTERBAITER._muskLimit * 100) | 0;
        if ((_loc4_ = (MONSTERBAITER._musk - _loc1_) | 0) < 0) {
            _loc4_ = 0;
        }
        this.mcStorage.mcBar.width = (1 - _loc4_ / MONSTERBAITER._muskLimit) * MONSTERBAITERPOPUP.BAITER_BAR_WIDTH;
        this.mcStorage.mcBarB.width = 0;
        let _loc5_: int = (MONSTERBAITER._musk - _loc1_) | 0;
        for (_loc2_ of as3.values(this.items)) {
            _loc2_.Enable(_loc2_._cost <= _loc5_);
            _loc2_.Update();
        }
        if (_loc1_ > MONSTERBAITER._musk || _loc1_ == 0) {
            this.sendBtn.Enabled = false;
            this.sendBtn.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.onSendDown));
        } else {
            this.sendBtn.Enabled = true;
            this.sendBtn.addEventListener(MouseEvent.CLICK, as3.bind(this, this.onSendDown));
        }
    }

    private onSendDown(param1: MouseEvent): void {
        let _loc3_: MonsterBaiterItem = null;
        MONSTERBAITER.Hide();
        let _loc2_: int = 0;
        for (_loc3_ of as3.values(this.items)) {
            _loc2_ += _loc3_.getCost();
        }
        MONSTERBAITER._musk -= _loc2_;
        MONSTERBAITER.PrepAttack();
    }

    public Help(param1: MouseEvent = null): void {
        let _loc2_: int = 7;
        this._guidePage += 1;
        if (this._guidePage > _loc2_) {
            this._guidePage = 1;
        }
        this.gotoAndStop(this._guidePage);
        if (this._guidePage > 1) {
            this.txtGuide.htmlText = KEYS.Get("bait_tut_" + (this._guidePage - 1));
            if (this._guidePage == 2) {
                this.bContinue.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Help));
                this.bContinue.SetupKey("btn_continue");
            }
        }
    }

    public Hide(): void {
        MONSTERBAITER.Hide();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}

import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent, TimerEvent } from "flash/events";
import { Point } from "flash/geom";
import { TextField } from "flash/text";
import { Timer } from "flash/utils";
import { CasinoUI, CREATURES, GLOBAL, IoMapUi, IoOutpostsPopup, IoScrollPane, KEYS, SOUNDS, MapRoomCell, MonsterTransferBar, PopupInfoMonster, PopupMonstersA_CLIP, ScrollSet, SecNum, com_monsters_maproom_advanced_MapRoom as MapRoom } from "@game";

export class PopupMonstersA extends PopupMonstersA_CLIP {
    static {
        as3.fields(this, { _cell: null, _transfer: null, _mc: null, _mcMonsters: null, _tempMonsterID: null, _tickDelay: 0, _transferMonsters: null, _monstersLeft: null, _transferBars: null, _scroller: null, _ioAll: null, _ioTarget: null, _ioTargetBtn: null, _ioPicker: null });
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
    /** Inferno-only (QoL #104): All / None, every monster here at once. */
    private _ioAll: Sprite;
    /**
     * Inferno-only (QoL #338, 15 October): the outpost the monsters go to, chosen from a list of your outposts with
     * each one's free room (its line of the Outposts list); null: picked on the map, as before. While one is chosen,
     * "+" and All stop at its free room, and Transfer goes there on the map and asks to confirm (PopupMonstersB).
     */
    private _ioTarget: any;
    private _ioTargetBtn: MovieClip;
    private _ioPicker: Sprite;

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
        if (GLOBAL.INFERNO_ONLY) {
            this._ioAll = as3.as(this.addChild(CasinoUI.button(KEYS.Get("io_transfer_all"), 90, 26, (): void => {
                this.ioSelectAll(!this.ioAllChosen);
            })), Sprite);
            this._ioAll.name = "ioTransferAll";
            // (right, over Transfer)
            this._ioAll.x = this.bTransfer.x + this.bTransfer.width - 90;
            this._ioAll.y = this.bTransfer.y - 34;
            // (QoL #338: the target outpost, left of All on the same line)
            let targetW: int = Math.max(120, this._ioAll.x - 6 - this.bCancel.x) | 0;
            this._ioTargetBtn = IoMapUi.button(KEYS.Get("io_op2_tr_choose"), targetW, 26, (e: MouseEvent): void => {
                this.ioOpenPicker();
            }, "grey", 10);
            this._ioTargetBtn.name = "ioOp2TransferTarget";
            this._ioTargetBtn.x = this.bCancel.x;
            this._ioTargetBtn.y = this._ioAll.y;
            this.addChild(this._ioTargetBtn);
        }
    }

    /** True when every monster here is chosen to go. */
    public get ioAllChosen(): boolean {
        if (this._ioTarget) {
            // (QoL #338: with a target, "all" is as many as its room takes)
            return this.ioAnyChosen() && !this.ioCanAddMore();
        }
        for (let k in this._monstersLeft) {
            if (this._monstersLeft[k].Get() > 0) {
                return false;
            }
        }
        return true;
    }

    /** QoL #104: every monster here chosen (or none). */
    public ioSelectAll(all: boolean, only: string = null): void {
        if (all && this._ioTarget) {
            // (QoL #338: as many as the target's free room takes, kind by kind)
            let left: int = this.ioRoomLeft();
            for (let k in this._transferMonsters) {
                if (only != null && k != only) {
                    continue;
                }
                let have: int = this._cell._monsters[k] ? this._cell._monsters[k].Get() | 0 : 0;
                let size: int = PopupMonstersA.ioSize(k);
                left = (left + (this._transferMonsters[k].Get() | 0) * size) | 0;
                let n: int = Math.max(0, Math.min(have, (left / size) | 0)) | 0;
                this._transferMonsters[k].Set(n);
                this._monstersLeft[k].Set((have - n) | 0);
                left = (left - n * size) | 0;
            }
            this.Update();
            return;
        }
        for (let k in this._transferMonsters) {
            if (only != null && k != only) {
                continue;
            }
            let have: int = this._cell._monsters[k] ? this._cell._monsters[k].Get() | 0 : 0;
            this._transferMonsters[k].Set(all ? have : 0);
            this._monstersLeft[k].Set(all ? 0 : have);
        }
        this.Update();
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
        // (QoL #338: a new transfer starts without a target; coming back to the same one keeps it)
        if (!param2) {
            this._ioTarget = null;
        }
        this.ioClosePicker();
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
        if (GLOBAL.INFERNO_ONLY) {
            this.ioTrim();
            this.ioTargetLook();
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
        this.ioClosePicker();
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
        if (this._ioAll) {
            let label: TextField = as3.as(this._ioAll.getChildAt(0), TextField);
            if (label) {
                CasinoUI.setText(label, KEYS.Get(this.ioAllChosen && this._transferBars.length ? "io_transfer_none" : "io_transfer_all"));
            }
        }
    }

    private Add(param1: int): Function {
        let i: int = 0;
        i = param1;
        return (param1: MouseEvent): void => {
            // (QoL #104: Shift moves every one of the kind)
            if (GLOBAL.INFERNO_ONLY && param1 && param1.shiftKey) {
                SOUNDS.Play("click1");
                this.ioSelectAll(true, as3.str(this._transferBars[i].monster));
                return;
            }
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
        // (QoL #338: not past the target's free room)
        if (GLOBAL.INFERNO_ONLY && this._ioTarget && this.ioRoomLeft() < PopupMonstersA.ioSize(this._tempMonsterID)) {
            return;
        }
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
            if (GLOBAL.INFERNO_ONLY && param1 && param1.shiftKey) {
                SOUNDS.Play("click1");
                this.ioSelectAll(false, as3.str(this._transferBars[i].monster));
                return;
            }
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
        let target: any = GLOBAL.INFERNO_ONLY ? this._ioTarget : null;
        this.ioClosePicker();
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
        // (QoL #338: a chosen target: the map goes there and clicks it, which asks to confirm as a click does)
        if (target && MapRoom._monsterTransferInProgress) {
            IoOutpostsPopup.ioForget();
            PopupMonstersA.ioGoToTarget(target.x | 0, target.y | 0);
        }
    }

    // ---- (QoL #338) the target outpost
    /** How much room a monster of this kind takes (housing units, as the transfer counts it). */
    private static ioSize(id: string): int {
        let size: int = 1;
        try {
            size = CREATURES.GetProperty(id, "cStorage") | 0;
        } catch (e) {
        }
        return Math.max(1, size) | 0;
    }

    /** An outpost's free room, from its line of the Outposts list (0 without a Compound). */
    public static ioFreeOf(outpost: any): int {
        let room: int = IoOutpostsPopup.roomOf(outpost);
        return room > 0 ? Math.max(0, room - IoOutpostsPopup.usedOf(outpost)) | 0 : 0;
    }

    /** The target's free room still left after the monsters chosen so far. */
    private ioRoomLeft(): int {
        let left: int = PopupMonstersA.ioFreeOf(this._ioTarget);
        for (let k in this._transferMonsters) {
            left = (left - (this._transferMonsters[k].Get() | 0) * PopupMonstersA.ioSize(k)) | 0;
        }
        return left;
    }

    private ioAnyChosen(): boolean {
        for (let k in this._transferMonsters) {
            if (this._transferMonsters[k].Get() > 0) {
                return true;
            }
        }
        return false;
    }

    /** One more of some kind would still fit the target. */
    private ioCanAddMore(): boolean {
        let left: int = this.ioRoomLeft();
        for (let k in this._monstersLeft) {
            if (this._monstersLeft[k].Get() > 0 && PopupMonstersA.ioSize(k) <= left) {
                return true;
            }
        }
        return false;
    }

    /** More chosen than the target takes (a smaller target chosen after): the last kinds are cut back. */
    private ioTrim(): void {
        if (!this._ioTarget) {
            return;
        }
        let left: int = PopupMonstersA.ioFreeOf(this._ioTarget);
        for (let k in this._transferMonsters) {
            let size: int = PopupMonstersA.ioSize(k);
            let n: int = this._transferMonsters[k].Get() | 0;
            let fits: int = Math.max(0, Math.min(n, (left / size) | 0)) | 0;
            if (fits < n) {
                this._transferMonsters[k].Set(fits);
                this._monstersLeft[k].Add((n - fits) | 0);
            }
            left = (left - fits * size) | 0;
        }
    }

    /** The target button: "To: ... (room for N)", or "Choose the outpost..." while none is chosen. */
    private ioTargetLook(): void {
        if (!this._ioTargetBtn) {
            return;
        }
        let text: string = KEYS.Get("io_op2_tr_choose");
        if (this._ioTarget) {
            let id: string = String(this._ioTarget.baseid);
            let name: string = IoOutpostsPopup.ioNameOf(id);
            text = KEYS.Get("io_op2_tr_to", { "v1": name || IoMapUi.coord(this._ioTarget.x | 0, this._ioTarget.y | 0), "v2": GLOBAL.FormatNumber(PopupMonstersA.ioFreeOf(this._ioTarget)) });
        }
        this._ioTargetBtn.setText(text);
        for (let i: int = 0; i < this._ioTargetBtn.numChildren; i++) {
            let t: TextField = as3.as(this._ioTargetBtn.getChildAt(i), TextField);
            if (t) {
                GLOBAL.ioFitText(t, 7);
            }
        }
    }

    private ioClosePicker(): void {
        if (this._ioPicker && this._ioPicker.parent) {
            this._ioPicker.parent.removeChild(this._ioPicker);
        }
        this._ioPicker = null;
    }

    /** The list of your other outposts over the monsters, each with its free room; a click on one chooses it. */
    private ioOpenPicker(): void {
        let picker: Sprite = null;
        this.ioClosePicker();
        picker = new Sprite();
        picker.name = "ioOp2TransferPicker";
        let w: int = 301;
        let h: int = 254;
        IoMapUi.roundBox(picker.graphics, 0, 0, w, h, IoMapUi.PAPER, 1, IoMapUi.EDGE, 6, 1.5);
        // over the list of monsters (the popup's white panel is -150 to 155 wide; All and Transfer stay below)
        picker.x = -148;
        picker.y = -164;
        let title: TextField = IoMapUi.label(KEYS.Get("io_op2_tr_title"), 12, IoMapUi.INK, true, (w - 40) | 0);
        title.x = 8;
        title.y = 6;
        picker.addChild(title);
        let close: Sprite = new Sprite();
        close.name = "ioOp2TransferPickerClose";
        IoMapUi.hitArea(close.graphics, 18, 18);
        IoMapUi.cross(close.graphics, 5, 5, 8, IoMapUi.MUTED);
        close.x = w - 24;
        close.y = 6;
        close.buttonMode = true;
        close.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            SOUNDS.Play("close");
            this.ioClosePicker();
        });
        picker.addChild(close);
        let status: TextField = IoMapUi.label(KEYS.Get("io_map2_op_loading"), 11, IoMapUi.MUTED, false, (w - 20) | 0);
        status.x = 10;
        status.y = 34;
        picker.addChild(status);
        let pane: IoScrollPane = new IoScrollPane((w - 12) | 0, (h - 38) | 0);
        pane.x = 6;
        pane.y = 32;
        picker.addChild(pane);
        // (a press here is not the start of a map drag)
        picker.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            e.stopPropagation();
        });
        this.addChild(picker);
        this._ioPicker = picker;
        // the room as it is now (the list kept from before may be a minute old)
        IoOutpostsPopup.ioForget();
        IoOutpostsPopup.ioFetch((list: any[]): void => {
            if (this._ioPicker != picker) {
                return;
            }
            if (!list) {
                status.text = KEYS.Get("io_op2_tr_failed");
                return;
            }
            status.visible = false;
            this.ioFillPicker(pane, list);
        });
    }

    private ioFillPicker(pane: IoScrollPane, list: any[]): void {
        let y: int = 0;
        let w: int = pane.innerWidth;
        let source: string = String(this._cell._baseID);
        let others: any[] = [];
        for (let o of as3.values(list)) {
            if (o && String(o.baseid) != source) {
                others.push(o);
            }
        }
        // the most room first
        others.sort((a: any, b: any): number => PopupMonstersA.ioFreeOf(b) - PopupMonstersA.ioFreeOf(a));
        // first: back to picking it on the map, as before
        y = (y + this.ioPickerRow(pane, y, w, null, KEYS.Get("io_op2_tr_onmap"), "", "", true)) | 0;
        for (let o of as3.values(others)) {
            let id: string = String(o.baseid);
            let name: string = IoOutpostsPopup.ioNameOf(id);
            let where: string = IoMapUi.coord(o.x | 0, o.y | 0);
            let free: int = PopupMonstersA.ioFreeOf(o);
            let room: string = IoOutpostsPopup.roomOf(o) <= 0 ? KEYS.Get("io_op2_tr_nocompound") : (free > 0 ? KEYS.Get("io_op2_tr_free", { "v1": GLOBAL.FormatNumber(free) }) : KEYS.Get("io_op2_tr_full"));
            y = (y + this.ioPickerRow(pane, y, w, o, name || where, name ? where : "", room, free > 0)) | 0;
        }
        if (others.length == 0) {
            let none: TextField = IoMapUi.label(KEYS.Get("io_op2_tr_none"), 11, IoMapUi.MUTED, false, (w - 10) | 0);
            none.x = 4;
            none.y = y + 6;
            pane.content.addChild(none);
            y = (y + 30) | 0;
        }
        pane.refresh(y);
    }

    /** One line of the list: a name and where (or one text), the free room at the right; a click chooses it. */
    private ioPickerRow(pane: IoScrollPane, y: int, w: int, outpost: any, text: string, under: string, room: string, enabled: boolean): int {
        let row: Sprite = null;
        let draw: Function = null;
        let rowH: int = under ? 32 : 24;
        row = new Sprite();
        row.name = outpost ? "ioOp2TransferTo_" + outpost.baseid : "ioOp2TransferToMap";
        draw = (over: boolean): void => {
            row.graphics.clear();
            row.graphics.beginFill(over && enabled ? IoMapUi.PAPER_LIGHT : IoMapUi.PAPER, 1);
            row.graphics.drawRect(0, 0, w, rowH);
            row.graphics.endFill();
            row.graphics.lineStyle(1, IoMapUi.RULE, 1);
            row.graphics.moveTo(0, rowH - 0.5);
            row.graphics.lineTo(w, rowH - 0.5);
            row.graphics.lineStyle();
        };
        draw(false);
        let roomW: int = room ? 96 : 0;
        let title: TextField = IoMapUi.label(text, 11, (enabled ? IoMapUi.INK : IoMapUi.MUTED) >>> 0, outpost != null, (w - roomW - 8) | 0);
        GLOBAL.ioFitText(title, 8);
        title.x = 4;
        title.y = 3;
        row.addChild(title);
        if (under) {
            let where: TextField = IoMapUi.label(under, 9, IoMapUi.MUTED, false, (w - roomW - 8) | 0);
            where.x = 4;
            where.y = 17;
            row.addChild(where);
        }
        if (room) {
            let free: TextField = IoMapUi.label(room, 10, (enabled ? 0x2E7D32 : 0xB71C1C) >>> 0, true, roomW - 4, "right");
            GLOBAL.ioFitText(free, 7);
            free.x = w - roomW;
            free.y = ((rowH - 16) / 2) | 0;
            row.addChild(free);
        }
        row.y = y;
        row.mouseChildren = false;
        if (enabled) {
            row.buttonMode = true;
            row.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
                draw(true);
            });
            row.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
                draw(false);
            });
            row.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                if (pane.dragged) {
                    return;
                }
                SOUNDS.Play("click1");
                this._ioTarget = outpost;
                this.ioTrim();
                this.ioClosePicker();
                this.ioTargetLook();
                this.Update();
            });
        }
        pane.content.addChild(row);
        return rowH;
    }

    /**
     * After Transfer with a target: the map goes to it and clicks it once it is on screen (a click waits for its
     * monsters to arrive: MapRoom.ioClickWhenLoaded), which opens the confirmation as clicking it would. If it does
     * not show within a few seconds, the map is left as before: the target is picked there.
     */
    private static ioGoToTarget(cellX: int, cellY: int): void {
        let tries: int = 0;
        let wait: Timer = null;
        if (!MapRoom._open || !MapRoom._mc) {
            return;
        }
        MapRoom._mc.JumpTo(new Point(cellX, cellY));
        wait = new Timer(100);
        wait.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            tries++;
            if (!MapRoom._monsterTransferInProgress || !MapRoom._open || !MapRoom._mc || tries > 40) {
                wait.stop();
                return;
            }
            let cell: MapRoomCell = MapRoom._mc.ioCellAt(cellX, cellY);
            if (!cell) {
                return;
            }
            wait.stop();
            if (cell._ioSnap) {
                MapRoom.ioClickWhenLoaded(cell);
            } else {
                cell.ioClick();
            }
        });
        wait.start();
    }
}

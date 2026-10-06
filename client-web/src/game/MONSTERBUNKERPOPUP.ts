import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { BASE, BUILDING15, CREATURELOCKER, CREATURES, CreepBase, GLOBAL, HOUSING, HOUSINGBUNKER, ImageCache, InstanceManager, KEYS, LOGGER, LOGIN, MAP, MAPROOM_DESCENT, MONSTERBUNKER, MONSTERBUNKERPOPUP_CLIP, MonsterBase, MonsterBunkerPopup_TransferBtnA_CLIP, MonsterBunkerPopup_TransferBtnB_CLIP, POPUPS, POPUPSETTINGS, SOUNDS, STORE, ScrollSet, SecNum } from "@game";

export class MONSTERBUNKERPOPUP extends MONSTERBUNKERPOPUP_CLIP {
    static {
        as3.fields(this, { _juiceList: null, _bunker: null, _capacity: 0, _mode: null, _selected: null, _scrollerA: null, _scrollerB: null, BUYABLE_MONSTERS: null, BUNKERABLE_MONSTERS: null, _guidePage: 0 });
    }

    public _juiceList: any;
    private _bunker: any;
    private _capacity: int;
    private _mode: string;
    private _selected: any;
    private _scrollerA: ScrollSet;
    private _scrollerB: ScrollSet;
    private BUYABLE_MONSTERS: any;
    private BUNKERABLE_MONSTERS: any;
    private _guidePage: int;

    public $ctor(): void {
        this.BUYABLE_MONSTERS = { "C2": 2, "IC1": 3, "C6": 5, "C5": 16, "C7": 8, "C8": 12, "C10": 14, "C11": 24, "C13": 24, "C12": 65, "C17": 17, "IC2": 4, "IC5": 32, "IC7": 32, "IC8": 55 };
        this.BUNKERABLE_MONSTERS = { "IC1": 1, "IC2": 1, "IC3": 1, "IC4": 1, "IC5": 1, "IC6": 1, "IC7": 1, "IC8": 1, "IC12": 1, "IC14": 1, "IC15": 1, "IC20": 1, "C1": 1, "C2": 1, "C3": 1, "C4": 1, "C5": 1, "C6": 1, "C7": 1, "C8": 1, "C9": 1, "C10": 1, "C11": 1, "C12": 1, "C13": 1, "C17": 1 };
        let _loc1_: MovieClip = null;
        this._juiceList = {};
        super.$ctor();
        this._bunker = GLOBAL._selectedBuilding;
        this._capacity = GLOBAL._buildingProps[21].capacity[this._bunker._lvl.Get() - 1] | 0;
        this._selected = {};
        this._juiceList = {};
        this.transferCanvasA.mask = this.transferCanvasAmask;
        this.transferCanvasB.mask = this.transferCanvasBmask;
        this._scrollerA = new ScrollSet();
        this._scrollerA.AutoHideEnabled = false;
        this._scrollerA.width = this.scrollerA.width;
        this._scrollerA.x = this.scrollerA.x;
        this._scrollerA.y = this.scrollerA.y;
        this.addChild(this._scrollerA);
        this._scrollerA.Init(this.transferCanvasA, this.transferCanvasAmask, 0, this.scrollerA.y, this.scrollerA.height);
        this._scrollerB = new ScrollSet();
        this._scrollerB.AutoHideEnabled = false;
        this._scrollerB.width = this.scrollerB.width;
        this._scrollerB.x = this.scrollerB.x;
        this._scrollerB.y = this.scrollerB.y;
        this.addChild(this._scrollerB);
        this._scrollerB.Init(this.transferCanvasB, this.transferCanvasBmask, 0, this.scrollerB.y, this.scrollerB.height);
        this.title_txt.htmlText = KEYS.Get("bunker_title");
        this.tCapacity.htmlText = "<b>" + KEYS.Get("bunker_capacity") + "</b>";
        this.bHousing.addEventListener(MouseEvent.CLICK, this.Switch("housing"));
        this.bHousing.SetupKey("bunker_btn_housing");
        this.bHousing.buttonMode = true;
        this.bSpecial.addEventListener(MouseEvent.CLICK, this.Switch("special"));
        this.bSpecial.SetupKey("bunker_btn_store");
        this.bSpecial.buttonMode = true;
        this.bTransfer.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Transfer));
        this.bTransfer.Setup(">>");
        this.bTransfer.buttonMode = true;
        this.SwitchB("housing");
    }

    public InitTransferBarAListeners(param1: MovieClip): void {
        param1.bAdd.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectAdd));
        param1.bAdd.Setup("+");
        param1.bAdd.buttonMode = true;
        param1.bRemove.addEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectRemove));
        param1.bRemove.Setup("-");
        param1.bRemove.buttonMode = true;
    }

    public InitTransferBarBListeners(param1: MovieClip): void {
        param1.bRemove.addEventListener(MouseEvent.CLICK, as3.bind(this, this.BunkerJuiceID));
        let _loc2_: any = param1.id.substring(0, 2) == "IC";
        if (Boolean(GLOBAL._bJuicer) && !_loc2_) {
            param1.bRemove.SetupKey("bunker_btn_juice");
        } else {
            param1.bRemove.SetupKey("bunker_btn_remove");
        }
        param1.bRemove.buttonMode = true;
    }

    public RemoveTransferBarListeners(param1: MovieClip): void {
        if (param1 instanceof MonsterBunkerPopup_TransferBtnA_CLIP) {
            param1.bAdd.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectAdd));
            param1.bRemove.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectRemove));
        } else if (param1 instanceof MonsterBunkerPopup_TransferBtnB_CLIP) {
            param1.bRemove.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.BunkerJuiceID));
        }
    }

    public RemoveTransferBarBListeners(param1: MovieClip): void {
        param1.bAdd.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectAdd));
        param1.bRemove.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.SelectRemove));
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
        param3[0].mcLoading.visible = false;
    }

    private Switch(param1: string): Function {
        let mode: string = null;
        mode = param1;
        return (param1: MouseEvent): void => {
            this.SwitchB(mode);
            this.UpdateScrollers(true);
        };
    }

    private SwitchB(param1: string): void {
        SOUNDS.Play("click1");
        this._mode = param1;
        this._selected = {};
        if (this._mode == "housing") {
            this.bHousing.Enabled = false;
            this.bSpecial.Enabled = true;
        } else {
            this.bHousing.Enabled = true;
            this.bSpecial.Enabled = false;
        }
        this.Update();
    }

    private CanBunkerFromHousingNormal(param1: number): boolean {
        let _loc2_: boolean = false;
        if (param1 <= 13 && param1 > 0) {
            _loc2_ = true;
        }
        return _loc2_;
    }

    private CanBunkerFromHousingInferno(param1: number): boolean {
        let _loc2_: boolean = false;
        if (param1 <= 8 && param1 > 0) {
            _loc2_ = true;
        }
        return _loc2_;
    }

    private CanBunkerFromHousing(param1: string): boolean {
        let _loc2_: boolean = false;
        if (this.BUNKERABLE_MONSTERS[param1]) {
            _loc2_ = true;
        }
        return _loc2_;
    }

    private CanBunkerFromStoreNormal(param1: string): boolean {
        let _loc2_: boolean = false;
        if (this.BUYABLE_MONSTERS[param1] > 0) {
            _loc2_ = true;
        }
        return _loc2_;
    }

    private CanBunkerFromStoreInferno(param1: number): boolean {
        let _loc2_: boolean = false;
        if (param1 <= 8 && param1 > 0) {
            _loc2_ = true;
        }
        return _loc2_;
    }

    private ClearTransferCanvas(param1: MovieClip = null): void {
        let _loc2_: any[] = [];
        switch (param1) {
            case this.transferCanvasA:
                _loc2_.push(this.transferCanvasA);
                break;
            case this.transferCanvasB:
                _loc2_.push(this.transferCanvasB);
                break;
            default:
                _loc2_.push(this.transferCanvasA);
                _loc2_.push(this.transferCanvasB);
        }
        let _loc3_: int = 0;
        while (_loc3_ < _loc2_.length) {
            while (_loc2_[_loc3_].numChildren) {
                if (_loc2_[_loc3_].getChildAt(0) instanceof MovieClip) {
                    this.RemoveTransferBarListeners(as3.cast(_loc2_[_loc3_].getChildAt(0), MovieClip));
                }
                _loc2_[_loc3_].removeChildAt(0);
            }
            _loc3_++;
        }
    }

    public Update(): void {
        let monsterID: string = null;
        let c: string = null;
        let goo: int = 0;
        let creatureProps: any = null;
        let i: int = 0;
        let n: int = 0;
        let v: int = 0;
        let barMC: MovieClip = null;
        let p: int = 0;
        let housedMonsters: any[] = null;
        let transferBtnA: MonsterBunkerPopup_TransferBtnA_CLIP = null;
        let name: string = null;
        let availableMonsters: any[] = null;
        let quantity: int = 0;
        let transferBtnB: MonsterBunkerPopup_TransferBtnB_CLIP = null;
        let count: int = 0;
        let usedA: int = 0;
        let usedB: int = 0;
        let currX: number = 0;
        let currY: number = 0;
        let offsetX: number = 0;
        let offsetY: number = 0;
        let spacingX: number = 0;
        let spacingY: number = 0;
        try {
            this.ClearTransferCanvas(this.transferCanvasA);
            if (this._mode == "housing") {
                n = 1;
                housedMonsters = HOUSING.GetHousingCreatures();
                i = 0;
                while (i < housedMonsters.length) {
                    monsterID = String(housedMonsters[i].id);
                    if (this.CanBunkerFromHousing(monsterID)) {
                        transferBtnA = new MonsterBunkerPopup_TransferBtnA_CLIP();
                        ImageCache.GetImageWithCallBack("monsters/" + monsterID + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [transferBtnA.mcIcon]);
                        name = String(CREATURELOCKER._creatures[monsterID].name);
                        if (monsterID == "IC8") {
                            name = "#m_k_wormzer#";
                        }
                        transferBtnA.tName.htmlText = "<b>" + KEYS.Get(name) + "</b>";
                        transferBtnA.id = monsterID;
                        transferBtnA._id = monsterID.substring(monsterID.indexOf("C") + 1);
                        transferBtnA.index = monsterID.substring(monsterID.indexOf("C") + 1);
                        v = GLOBAL.player.monsterListByID(monsterID).numCreeps;
                        if (this._selected[monsterID]) {
                            v = (v - this._selected[monsterID].Get()) | 0;
                        }
                        if (v == 0) {
                            transferBtnA.tHoused.htmlText = "<font color=\"#FF0000\">" + KEYS.Get("bunker_housed", { "v1": 0 }) + "</font>";
                        } else {
                            transferBtnA.tHoused.htmlText = "<font color=\"#000000\">" + KEYS.Get("bunker_housed", { "v1": v }) + "</font>";
                        }
                        if (Boolean(this._selected[monsterID]) && this._selected[monsterID].Get() > 0) {
                            transferBtnA.tSelected.htmlText = "<font color=\"#FF0000\">" + KEYS.Get("bunker_selected", { "v1": this._selected[monsterID].Get() }) + "</font>";
                        } else {
                            transferBtnA.tSelected.htmlText = "<font color=\"#CCCCCC\">" + KEYS.Get("bunker_selected", { "v1": 0 }) + "</font>";
                        }
                        transferBtnA.x = 0 * transferBtnA.width;
                        transferBtnA.y = -(1 * transferBtnA.height) + n * transferBtnA.height + n * spacingY;
                        this.InitTransferBarAListeners(transferBtnA);
                        this.transferCanvasA.addChild(transferBtnA);
                        n += 1;
                    }
                    if (n == 1) {
                        this.tNoMonsters.htmlText = KEYS.Get("bunker_empty");
                    } else {
                        this.tNoMonsters.htmlText = "";
                    }
                    i++;
                }
            } else {
                n = 1;
                availableMonsters = this.GetBunkerCreatures();
                i = 0;
                while (i < availableMonsters.length) {
                    monsterID = String(availableMonsters[i].id);
                    if (this.CanBunkerFromStoreNormal(monsterID)) {
                        transferBtnA = new MonsterBunkerPopup_TransferBtnA_CLIP();
                        ImageCache.GetImageWithCallBack("monsters/" + monsterID + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [transferBtnA.mcIcon]);
                        name = String(CREATURELOCKER._creatures[monsterID].name);
                        if (monsterID == "IC8") {
                            name = "#m_k_wormzer#";
                        }
                        transferBtnA.tName.htmlText = "<b>" + KEYS.Get(name) + "</b>";
                        transferBtnA.id = monsterID;
                        transferBtnA._id = monsterID.substring(monsterID.indexOf("C") + 1);
                        transferBtnA.index = monsterID.substring(monsterID.indexOf("C") + 1);
                        if (GLOBAL.player.monsterListByID(monsterID)) {
                            v = GLOBAL.player.monsterListByID(monsterID).numCreeps;
                        }
                        if (Boolean(CREATURELOCKER._lockerData[monsterID]) && CREATURELOCKER._lockerData[monsterID].t == 2) {
                            transferBtnA.tHoused.htmlText = "<font color=\"#0000CC\">" + this.GetCost(monsterID, 1) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[4])) + "</font>";
                            if (Boolean(this._selected[monsterID]) && this._selected[monsterID].Get() > 0) {
                                transferBtnA.tSelected.htmlText = "<font color=\"#FF0000\">" + KEYS.Get("bunker_selected", { "v1": this._selected[monsterID].Get() }) + "</font>";
                            } else {
                                transferBtnA.tSelected.htmlText = "<font color=\"#CCCCCC\">" + KEYS.Get("bunker_selected", { "v1": 0 }) + "</font>";
                            }
                        } else {
                            transferBtnA.tHoused.htmlText = "<font color=\"#0000CC\">" + this.GetCost(monsterID, 1) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[4])) + "</font>";
                            transferBtnA.tSelected.htmlText = "<font color=\"#CC0000\">" + KEYS.Get("bunker_store_locked") + "</font>";
                        }
                        transferBtnA.x = 0 * transferBtnA.width;
                        transferBtnA.y = -(1 * transferBtnA.height) + n * transferBtnA.height + n * spacingY;
                        this.InitTransferBarAListeners(transferBtnA);
                        this.transferCanvasA.addChild(transferBtnA);
                        n += 1;
                    }
                    if (n == 1) {
                        this.tNoMonsters.htmlText = KEYS.Get("bunker_empty");
                    } else {
                        this.tNoMonsters.htmlText = "";
                    }
                    i++;
                }
            }
        } catch (e) {
            GLOBAL.ErrorMessage("MONSTERBUNKERPOPUP.Update TransferA" + e.message + " | " + e.getStackTrace());
            LOGGER.Log("err", "MONSTERBUNKERPOPUP.Update TransferA" + e.message + " | " + e.getStackTrace());
        }
        n = 0;
        for (c in this._selected) {
            n = (n + this._selected[c].Get()) | 0;
        }
        if (n > 0) {
            this.bTransfer.Highlight = true;
            this.bTransfer.Enabled = true;
        } else {
            this.bTransfer.Highlight = false;
            this.bTransfer.Enabled = false;
        }
        for (c in this._bunker._monsters) {
            usedA = (usedA + CREATURES.GetProperty(c, "cStorage", 0, true) * this._bunker._monsters[c]) | 0;
        }
        this._bunker._used = usedA;
        for (c in this._selected) {
            usedB = (usedB + CREATURES.GetProperty(c, "cStorage", 0, true) * this._selected[c].Get()) | 0;
        }
        p = (100 / this._capacity * (usedA + usedB)) | 0;
        this.mcStorage.mcBar.width = 535 / this._capacity * usedA;
        this.mcStorage.mcBarB.width = 535 / this._capacity * (usedA + usedB);
        if (usedA + usedB >= this._capacity) {
            if (this._bunker._lvl.Get() < 3) {
                this.tStored.htmlText = KEYS.Get("bunker_full_2");
            } else {
                this.tStored.htmlText = "<b>" + KEYS.Get("bunker_full") + "</b>";
            }
        } else {
            this.tStored.htmlText = "<b>" + GLOBAL.FormatNumber(usedA + usedB) + " / " + GLOBAL.FormatNumber(this._capacity) + " (" + p + "%)</b>";
        }
        usedA = 0;
        for (c in this._selected) {
            usedA += this.GetCost(c, this._selected[c].Get() | 0);
        }
        if (this._mode == "housing") {
            if (usedA > 0) {
                this.tCost.htmlText = "<b>" + GLOBAL.FormatNumber(usedA) + "<br>" + KEYS.Get(as3.str(GLOBAL._resourceNames[2])) + "</b>";
            } else {
                this.tCost.htmlText = "<b>" + KEYS.Get("bunker_btn_transfer") + "</b>";
            }
        } else {
            this.tCost.htmlText = "<font color=\"#0000CC\"><b>" + GLOBAL.FormatNumber(usedA) + "<br>" + KEYS.Get(as3.str(GLOBAL._resourceNames[4])) + "</b></font>";
        }
        try {
            this.ClearTransferCanvas(this.transferCanvasB);
            n = 1;
            for (c in this._bunker._monsters) {
                quantity = this._bunker._monsters[c] | 0;
                if (quantity > 0) {
                    creatureProps = CREATURELOCKER._creatures[c];
                    transferBtnB = new MonsterBunkerPopup_TransferBtnB_CLIP();
                    transferBtnB.id = c;
                    transferBtnB._id = c.substr(1);
                    transferBtnB.index = c.substr(1);
                    transferBtnB.tName.htmlText = "<b>" + KEYS.Get(as3.str(CREATURELOCKER._creatures[c].name)) + "</b>";
                    transferBtnB.tHoused.htmlText = KEYS.Get("bunker_bunkered", { "v1": quantity });
                    ImageCache.GetImageWithCallBack("monsters/" + c + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [transferBtnB.mcIcon]);
                    transferBtnB.x = 0 * transferBtnB.width;
                    transferBtnB.y = -(1 * transferBtnB.height) + n * transferBtnB.height + n * spacingY;
                    this.InitTransferBarBListeners(transferBtnB);
                    this.transferCanvasB.addChild(transferBtnB);
                    n += 1;
                }
            }
        } catch (e) {
            GLOBAL.ErrorMessage("MONSTERBUNKERPOPUP.Update TransferB" + e.message + " | " + e.getStackTrace());
            LOGGER.Log("err", "MONSTERBUNKERPOPUP.Update TransferB" + e.message + " | " + e.getStackTrace());
        }
        this.UpdateScrollers();
    }

    private UpdateScrollers(param1: boolean = false): void {
        if (this._scrollerA) {
            this._scrollerA.Update();
        }
        if (this._scrollerB) {
            this._scrollerB.Update();
        }
        if (param1) {
            this._scrollerA.ScrollTo(0, true);
            this._scrollerA.Update();
            this._scrollerB.ScrollTo(0, true);
            this._scrollerB.Update();
        }
    }

    private GetCost(param1: string, param2: int): int {
        let _loc4_: int = 0;
        let _loc3_: string = as3.str(LOGIN._playerID.toString());
        if (this._mode == "housing") {
            return (CREATURES.GetProperty(param1, "cResource", 0, true) * 0.5 * param2) | 0;
        }
        if (!this.BUYABLE_MONSTERS[param1]) {
            GLOBAL.ErrorMessage("MONSTERBUNKERPOPUP");
            return 0;
        }
        return (this.BUYABLE_MONSTERS[param1] * param2) | 0;
    }

    private SelectAdd(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        let _loc2_: string = String(param1.target.parent.id);
        if (this.CheckID(_loc2_)) {
            if (this._selected[_loc2_]) {
                this._selected[_loc2_].Add(1);
            } else {
                this._selected[_loc2_] = new SecNum(1);
            }
            this.Update();
        }
    }

    private SelectRemove(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        let _loc2_: string = String(param1.target.parent.id);
        if (this._selected[_loc2_]) {
            this._selected[_loc2_].Add(-1);
        }
        if (Boolean(this._selected[_loc2_]) && this._selected[_loc2_].Get() <= 0) {
            delete this._selected[_loc2_];
        }
        this.Update();
    }

    private Transfer(param1: MouseEvent): void {
        let _loc2_: string = null;
        let _loc5_: int = 0;
        if (!this.bTransfer.Enabled) {
            return;
        }
        let _loc3_: SecNum = new SecNum(0);
        let _loc4_: any[] = [];
        if (this._mode == "housing") {
            for (_loc2_ in this._selected) {
                _loc3_.Add(this.GetCost(_loc2_, this._selected[_loc2_].Get() | 0));
            }
            if (_loc3_.Get() == 0 || Boolean(BASE.Charge(3, _loc3_.Get(), false))) {
                for (_loc2_ in this._selected) {
                    _loc5_ = 0;
                    while (_loc5_ < this._selected[_loc2_].Get()) {
                        this.BunkerStore(_loc2_);
                        _loc5_++;
                    }
                }
                SOUNDS.Play("click1");
                this._selected = {};
                this.Update();
                BASE.Save();
            } else {
                GLOBAL.Message(KEYS.Get("bunker_lowputty"), KEYS.Get("bunker_btn_lowputty"), STORE.ShowB, [2, 0.8, ["BR31", "BR32", "BR33"]]);
            }
        } else {
            for (_loc2_ in this._selected) {
                _loc3_.Add(this.GetCost(_loc2_, this._selected[_loc2_].Get() | 0));
                _loc4_.push([this._selected[_loc2_].Get(), KEYS.Get(as3.str(CREATURELOCKER._creatures[_loc2_].name))]);
            }
            if (_loc3_.Get() <= BASE._credits.Get()) {
                if (!GLOBAL.ioConfirmShiny(_loc3_.Get() | 0, "on these monsters", (): void => {
                    this.Transfer(param1);
                })) {
                    return;
                }
                for (_loc2_ in this._selected) {
                    if (this._bunker._monsters[_loc2_]) {
                        this._bunker._monsters[_loc2_] += this._selected[_loc2_].Get();
                    } else {
                        this._bunker._monsters[_loc2_] = this._selected[_loc2_].Get();
                        this._bunker._monstersDispatched[_loc2_] = 0;
                    }
                }
                SOUNDS.Play("purchasepopup");
                this._selected = {};
                BASE.Purchase("BUNK", _loc3_.Get() | 0, "bunker");
                GLOBAL.Message(KEYS.Get("bunker_purchased", { "v1": _loc3_.Get() }));
            } else {
                POPUPS.DisplayGetShiny();
            }
            this.Update();
        }
        this.UpdateScrollers(true);
    }

    private Check(param1: int): boolean {
        let _loc5_: string = null;
        let _loc2_: int = 0;
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        for (_loc5_ in this._bunker._monsters) {
            _loc3_ = (_loc3_ + CREATURES.GetProperty(_loc5_, "cStorage", 0, true) * this._bunker._monsters[_loc5_]) | 0;
        }
        for (_loc5_ in this._selected) {
            _loc4_ = (_loc4_ + CREATURES.GetProperty(_loc5_, "cStorage", 0, true) * this._selected[_loc5_].Get()) | 0;
        }
        _loc4_ += CREATURELOCKER._creatures["C" + param1].props.cStorage | 0;
        if (_loc3_ + _loc4_ > this._capacity) {
            return false;
        }
        if (this._mode == "housing") {
            if (Boolean(GLOBAL.player.monsterListByID("C" + param1)) && GLOBAL.player.monsterListByID("C" + param1).numCreeps > 0) {
                _loc2_ = GLOBAL.player.monsterListByID("C" + param1).numCreeps;
            }
            if (this._selected["C" + param1]) {
                _loc2_ = (_loc2_ - this._selected["C" + param1].Get()) | 0;
            }
            if (_loc2_ > 0) {
                return true;
            }
        } else {
            if (Boolean(CREATURELOCKER._lockerData["C" + param1]) && CREATURELOCKER._lockerData["C" + param1].t == 2) {
                return true;
            }
            GLOBAL.Message(KEYS.Get("bunker_locker_desc", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures["C" + param1].name)) }), KEYS.Get("btn_openlocker"), CREATURELOCKER.Show);
        }
        return false;
    }

    private CheckID(param1: string): boolean {
        let _loc6_: string = null;
        let _loc2_: any = param1.substring(0, 2) == "IC";
        let _loc3_: int = 0;
        let _loc4_: int = 0;
        let _loc5_: int = 0;
        for (_loc6_ in this._bunker._monsters) {
            _loc4_ = (_loc4_ + CREATURES.GetProperty(_loc6_, "cStorage", 0, true) * this._bunker._monsters[_loc6_]) | 0;
        }
        for (_loc6_ in this._selected) {
            _loc5_ = (_loc5_ + CREATURES.GetProperty(_loc6_, "cStorage", 0, true) * this._selected[_loc6_].Get()) | 0;
        }
        if (CREATURELOCKER._creatures[param1].props.cStorage.length > 1) {
            _loc5_ += CREATURELOCKER._creatures[param1].props.cStorage[CREATURELOCKER._creatures[param1].level] | 0;
        } else {
            _loc5_ += CREATURELOCKER._creatures[param1].props.cStorage | 0;
        }
        if (_loc4_ + _loc5_ > this._capacity) {
            return false;
        }
        if (this._mode == "housing") {
            if (Boolean(GLOBAL.player.monsterListByID(param1)) && GLOBAL.player.monsterListByID(param1).numCreeps > 0) {
                _loc3_ = GLOBAL.player.monsterListByID(param1).numCreeps;
            }
            if (this._selected[param1]) {
                _loc3_ = (_loc3_ - this._selected[param1].Get()) | 0;
            }
            if (_loc3_ > 0) {
                return true;
            }
        } else {
            if (Boolean(CREATURELOCKER._lockerData[param1]) && CREATURELOCKER._lockerData[param1].t == 2) {
                return true;
            }
            if (_loc2_) {
                GLOBAL.Message(KEYS.Get("bunker_locker_desc_inf", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[param1].name)) }), null, null);
            } else {
                GLOBAL.Message(KEYS.Get("bunker_locker_desc", { "v1": KEYS.Get(as3.str(CREATURELOCKER._creatures[param1].name)) }), KEYS.Get("btn_openlocker"), CREATURELOCKER.Show);
            }
        }
        return false;
    }

    private BunkerStore(param1: string): void {
        let _loc3_: any = null;
        let _loc4_: int = 0;
        let _loc5_: CreepBase = null;
        let _loc6_: MonsterBase = null;
        let _loc2_: Vector<any> = InstanceManager.getInstancesByClass(BASE.isInfernoMainYardOrOutpost ? HOUSINGBUNKER : BUILDING15);
        for (_loc3_ of as3.values(BASE._buildingsHousing)) {
            _loc2_.push(_loc3_);
        }
        _loc4_ = CREATURELOCKER._creatures[param1].props.cStorage | 0;
        if (Boolean(GLOBAL.player.monsterListByID(param1)) && _loc4_ <= this._bunker._capacity - this._bunker._used) {
            _loc5_ = null;
            for (_loc6_ of as3.values(CREATURES._creatures)) {
                if (_loc6_._creatureID == param1 && (_loc6_._behaviour == "housing" || _loc6_._behaviour == "pen")) {
                    _loc5_ = as3.as(_loc6_, CreepBase);
                    break;
                }
            }
            if (_loc5_ == null) {
                _loc3_ = as3.vget(_loc2_, (Math.random() * _loc2_.length) | 0);
                _loc5_ = as3.as(CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "bunker", new Point(_loc3_.x, _loc3_.y).add(new Point(-60 + Math.random() * 135, 65 + Math.random() * 50)), Math.random() * 360), CreepBase);
            }
            if (_loc5_) {
                _loc5_._homeBunker = this._bunker;
                _loc5_.changeModeBunker();
                GLOBAL.player.monsterListByID(param1).add(-1);
                if (Boolean(this._bunker._monsters[param1]) && this._bunker._monsters[param1] > 0) {
                    this._bunker._monsters[param1] += 1;
                    this._bunker._used += _loc4_;
                    if (this._bunker._monstersDispatched[param1]) {
                        this._bunker._monstersDispatched[param1] += 1;
                    } else {
                        this._bunker._monstersDispatched[param1] = 1;
                    }
                } else {
                    this._bunker._monsters[param1] = 1;
                    this._bunker._monstersDispatched[param1] = 1;
                }
                ++this._bunker._monstersDispatchedTotal;
            }
            this.Update();
            HOUSING.HousingSpace();
        }
    }

    private BunkerJuice(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        this.BunkerJuiceById(as3.str(param1.target.parent._id));
    }

    private BunkerJuiceID(param1: MouseEvent = null): void {
        SOUNDS.Play("click1");
        this.BunkerJuiceById(as3.str(param1.target.parent.id));
    }

    private BunkerJuiceById(param1: string): void {
        let _loc3_: boolean = false;
        let _loc4_: MonsterBase = null;
        let _loc2_: any = param1.substring(0, 2) == "IC";
        if (Boolean(GLOBAL._bJuicer) && !_loc2_) {
            if (Boolean(GLOBAL._bJuicer) && GLOBAL._bJuicer._countdownUpgrade.Get() == 0) {
                if (GLOBAL._bJuicer.health > GLOBAL._bJuicer.maxHealth * 0.5) {
                    if (this._bunker._monsters[param1]) {
                        _loc3_ = false;
                        for (_loc4_ of as3.values(CREATURES._creatures)) {
                            if (_loc4_._creatureID == param1 && _loc4_._behaviour == "bunker") {
                                _loc4_.changeModeJuice();
                                this._bunker._monstersDispatched[param1] = (this._bunker._monstersDispatched[param1] | 0) - 1;
                                if (this._bunker._monstersDispatched[param1] < 0) {
                                    this._bunker._monstersDispatched[param1] = 0;
                                }
                                --this._bunker._monstersDispatchedTotal;
                                if (this._bunker._monstersDispatchedTotal < 0) {
                                    this._bunker._monstersDispatchedTotal = 0;
                                }
                                _loc3_ = true;
                                break;
                            }
                        }
                        if (!_loc3_) {
                            CREATURES.Spawn(param1, MAP._BUILDINGTOPS, "juice", new Point(this._bunker.x, this._bunker.y).add(new Point(-60 + Math.random() * 135, -5 + Math.random() * 20)), Math.random() * 360);
                        }
                        this._bunker._monsters[param1] = (this._bunker._monsters[param1] | 0) - 1;
                        if (this._bunker._monsters[param1] < 0) {
                            this._bunker._monsters[param1] = 0;
                        }
                    }
                    this.Update();
                    BASE.Save();
                    return;
                }
            }
        }
        if (this._bunker._monsters[param1]) {
            this._bunker._monsters[param1] = (this._bunker._monsters[param1] | 0) - 1;
            if (this._bunker._monsters[param1] < 0) {
                this._bunker._monsters[param1] = 0;
            }
        }
        this.Update();
        BASE.Save();
    }

    public GetBunkerCreatures(): any[] {
        let _loc9_: string = null;
        let _loc10_: any = null;
        let _loc11_: string = null;
        let _loc12_: any = null;
        let _loc1_: any = {};
        let _loc2_: any[] = [];
        let _loc3_: any[] = [];
        let _loc4_: any[] = [];
        let _loc5_: any = CREATURELOCKER.GetCreatures("above");
        let _loc6_: any = undefined;
        _loc6_ = !BASE.isInfernoMainYardOrOutpost;
        if (_loc6_) {
            for (_loc9_ in _loc5_) {
                if (!(_loc10_ = CREATURELOCKER._creatures[_loc9_]).blocked) {
                    _loc10_.id = _loc9_;
                    _loc2_.push(_loc10_);
                    _loc1_[_loc9_] = _loc10_;
                }
            }
            as3.sortOn(_loc2_, ["index"], Array.NUMERIC);
        }
        let _loc7_: any = CREATURELOCKER.GetCreatures("inferno");
        let _loc8_: boolean = false;
        _loc8_ = MAPROOM_DESCENT.DescentPassed;
        if (_loc8_) {
            for (_loc11_ in _loc7_) {
                if (!(_loc12_ = CREATURELOCKER._creatures[_loc11_]).blocked) {
                    _loc12_.id = _loc11_;
                    _loc3_.push(_loc12_);
                    _loc1_[_loc11_] = _loc12_;
                }
            }
            as3.sortOn(_loc3_, ["index"], Array.NUMERIC);
        }
        if (_loc2_.length > 0) {
            _loc4_ = _loc4_.concat(_loc2_);
        }
        if (_loc3_.length > 0) {
            _loc4_ = _loc4_.concat(_loc3_);
        }
        return _loc4_;
    }

    public Help(param1: MouseEvent = null): void {
        this._guidePage += 1;
        let _loc2_: string = KEYS.Get("bunker_tut_" + this._guidePage);
        if (this._guidePage <= 3) {
            this.gotoAndStop(2);
            this.txtGuide.htmlText = _loc2_;
            if (this._guidePage == 1) {
                this.bContinue.addEventListener(MouseEvent.CLICK, as3.bind(this, this.Help));
                this.bContinue.SetupKey("btn_continue");
            }
        } else {
            this._guidePage = 0;
            this.gotoAndStop(1);
        }
    }

    public Hide(param1: MouseEvent = null): void {
        MONSTERBUNKER.Hide(param1);
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}

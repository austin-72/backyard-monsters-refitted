import * as as3 from "as3";
import { Vector, int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { CREATURELOCKER, CREATURES, GLOBAL, HOUSING, INFERNOPORTAL, ImageCache, InfernoTransferMonster_CLIP, InfernoTransferPopup_CLIP, KEYS, POPUPSETTINGS, SecNum } from "@game";

export class INFERNO_ASCENSION_POPUP extends InfernoTransferPopup_CLIP {
    static {
        as3.fields(this, { NUM_MONSTER_ENTRIES: 15, _queuedForAscension: null, _monsterUi: null, _monsterUiIds: null, _storageWidth: 0, _newHousingUsed: null });
    }

    private NUM_MONSTER_ENTRIES: int;
    public _queuedForAscension: any;
    private _monsterUi: Vector<InfernoTransferMonster_CLIP>;
    private _monsterUiIds: Vector<string>;
    private _storageWidth: int;
    private _newHousingUsed: SecNum;

    public $ctor(): void {
        let i: int = 0;
        this._queuedForAscension = {};
        this._monsterUi = new Vector<InfernoTransferMonster_CLIP>(this.NUM_MONSTER_ENTRIES, true, InfernoTransferMonster_CLIP);
        this._monsterUiIds = new Vector<string>(this.NUM_MONSTER_ENTRIES, true, String);
        this._newHousingUsed = new SecNum(0);
        super.$ctor();
        this.title_txt.text = KEYS.Get("ascdlg_title");
        this.capacity_desc_txt.text = KEYS.Get("ascdlg_capacity_desc");
        this.transfer_action_txt.text = KEYS.Get("ascdlg_transfer_action");
        this.transfer_desc_txt.text = KEYS.Get("ascdlg_transfer_desc");
        this.bTransfer.SetupKey("ascdlg_transfer_btn");
        this.bTransfer.addEventListener(MouseEvent.CLICK, (): void => {
            this.AscendQueuedMonsters();
        });
        i = 0;
        while (i < this.NUM_MONSTER_ENTRIES) {
            this.SetupSection(as3.cast(this["m" + (i + 1)], InfernoTransferMonster_CLIP), i);
            i++;
        }
        this._storageWidth = (this.mcStorage.width / this.mcStorage.scaleX) | 0;
        this.Update();
    }

    private SetupSection(param1: InfernoTransferMonster_CLIP, param2: int): void {
        let index: int = 0;
        let section: InfernoTransferMonster_CLIP = param1;
        index = param2;
        as3.vset(this._monsterUi, index, section);
        section.bRemove.SetupKey("ascdlg_unqueue_btn");
        section.bRemove.addEventListener(MouseEvent.CLICK, (): void => {
            this.UnqueueMonster(as3.vget(this._monsterUiIds, index));
        });
        section.bAdd.SetupKey("ascdlg_queue_btn");
        section.bAdd.addEventListener(MouseEvent.CLICK, (): void => {
            this.QueueMonster(as3.vget(this._monsterUiIds, index));
        });
    }

    public Update(): void {
        let storedRatio: number = NaN;
        let queuedRatio: number = NaN;
        let id: string = null;
        let total: SecNum = null;
        let monsterSize: int = 0;
        let queued: int = 0;
        let index: int = 0;
        let monsterOrder: any[] = [];
        this._newHousingUsed.Set(HOUSING._housingUsed.Get());
        for (id in INFERNOPORTAL._ascensionData) {
            total = as3.cast(INFERNOPORTAL._ascensionData[id], SecNum);
            if (total.Get() > 0) {
                monsterSize = CREATURES.GetProperty(id, "cStorage", 0, true) | 0;
                queued = !(!this._queuedForAscension[id]) ? this._queuedForAscension[id].Get() | 0 : 0;
                this._newHousingUsed.Add(queued * monsterSize);
                monsterOrder.push(id);
            }
        }
        as3.sort(monsterOrder, (param1: string, param2: string): int => {
            return ((Number(param1.substring(2)) | 0) - (Number(param2.substring(2)) | 0)) | 0;
        });
        index = 0;
        while (index < this.NUM_MONSTER_ENTRIES && index < monsterOrder.length) {
            id = String(monsterOrder[index]);
            queued = !(!this._queuedForAscension[id]) ? this._queuedForAscension[id].Get() | 0 : 0;
            total = as3.cast(INFERNOPORTAL._ascensionData[id], SecNum);
            if (as3.vget(this._monsterUiIds, index) != id) {
                as3.vget(this._monsterUi, index).tName.text = KEYS.Get(as3.str(CREATURELOCKER._creatures[id].name));
                as3.vset(this._monsterUiIds, index, id);
                ImageCache.GetImageWithCallBack("monsters/" + id + "-medium.jpg", as3.bind(this, this.IconLoaded), true, 1, "", [as3.vget(this._monsterUi, index).mcIcon]);
            }
            monsterSize = CREATURES.GetProperty(id, "cStorage", 0, true) | 0;
            as3.vget(this._monsterUi, index).visible = true;
            as3.vget(this._monsterUi, index).tAvailable.text = KEYS.Get("ascdlg_monsters_available", { "v1": queued, "v2": total.Get() });
            as3.vget(this._monsterUi, index).tAvailable.text = queued + " / " + total.Get();
            as3.vget(this._monsterUi, index).bAdd.Enabled = queued < total.Get() && this._newHousingUsed.Get() + monsterSize <= HOUSING._housingCapacity.Get();
            as3.vget(this._monsterUi, index).bRemove.Enabled = queued > 0;
            index++;
        }
        while (index < this.NUM_MONSTER_ENTRIES) {
            as3.vget(this._monsterUi, index).visible = false;
            index++;
        }
        storedRatio = HOUSING._housingUsed.Get() / HOUSING._housingCapacity.Get();
        queuedRatio = this._newHousingUsed.Get() / HOUSING._housingCapacity.Get();
        this.mcStorage.mcBar.width = this._storageWidth * storedRatio;
        this.mcStorage.mcBarB.x = this._storageWidth * storedRatio;
        this.mcStorage.mcBarB.width = this._storageWidth * (queuedRatio - storedRatio);
        this.tStorage.htmlText = "<b>" + GLOBAL.FormatNumber(this._newHousingUsed.Get()) + " / " + GLOBAL.FormatNumber(HOUSING._housingCapacity.Get()) + " (" + Math.floor(queuedRatio * 100) + "%)</b>";
    }

    public IconLoaded(param1: string, param2: BitmapData, param3: any[] = null): void {
        let _loc4_: Bitmap = null;
        (_loc4_ = new Bitmap(param2)).smoothing = true;
        param3[0].mcImage.addChild(_loc4_);
    }

    public QueueMonster(param1: string): boolean {
        let _loc2_: int = CREATURES.GetProperty(param1, "cStorage", 0, true) | 0;
        if (!this._queuedForAscension[param1]) {
            this._queuedForAscension[param1] = new SecNum(0);
        }
        if (this._newHousingUsed.Get() + _loc2_ > HOUSING._housingCapacity.Get()) {
            return false;
        }
        if (this._queuedForAscension[param1].Get() < INFERNOPORTAL._ascensionData[param1].Get()) {
            this._queuedForAscension[param1].Add(1);
            this.Update();
            return true;
        }
        return false;
    }

    public UnqueueMonster(param1: string): boolean {
        if (!this._queuedForAscension[param1] || this._queuedForAscension[param1].Get() <= 0) {
            return false;
        }
        this._queuedForAscension[param1].Add(-1);
        this.Update();
        return true;
    }

    public AscendQueuedMonsters(): void {
        let _loc1_: SecNum = null;
        let _loc6_: string = null;
        let _loc2_: int = 1;
        let _loc3_: number = INFERNOPORTAL.building.x + 100;
        let _loc4_: number = INFERNOPORTAL.building.y + 100;
        let _loc5_: Point = new Point();
        for (_loc6_ in this._queuedForAscension) {
            _loc1_ = as3.cast(this._queuedForAscension[_loc6_], SecNum);
            while (_loc1_.Get() > 0) {
                _loc1_.Add(-1);
                INFERNOPORTAL._ascensionData[_loc6_].Add(-1);
                _loc5_.x = _loc3_ + Math.log(_loc2_) * 16 * Math.cos(_loc2_);
                _loc5_.y = _loc4_ - Math.log(_loc2_) * 16 * Math.sin(Math.log(_loc2_) * 4);
                HOUSING.HousingStore(_loc6_, _loc5_);
                _loc2_++;
            }
        }
        INFERNOPORTAL.PageAscensionData();
        this.Hide();
    }

    public Hide(): void {
        INFERNOPORTAL.HideAscendMonstersDialog();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToCenter(this);
    }

    public ScaleUp(): void {
        POPUPSETTINGS.ScaleUp(this);
    }
}

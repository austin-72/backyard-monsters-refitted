import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Event, MouseEvent } from "flash/events";
import { BASE, BasePlannerEvent, BasePlannerLoadPopup, BasePlannerPopup, BasePlannerSavePopup, BasePlannerService, BasePlannerServiceEvent, BasePlannerTransferEvent, BasePlannerTransferPopup, BaseTemplate, BuildingItem, GLOBAL, InstanceManager, PLANNER, POPUPS, PlannerNode, PlannerTemplate, SOUNDS } from "@game";

export class BasePlanner extends ASObject {
    static {
        as3.fields(this, { popup: null, service: null, _templates: null, _activeTemplate: null, _transferPopup: null });
    }

    public static readonly TYPE: uint = 10;

    public static canSave: boolean = true;

    public static readonly DEFAULT_NUMBER_OF_SLOTS: uint = 2;

    public static slots: uint = BasePlanner.DEFAULT_NUMBER_OF_SLOTS;

    public static maxNumberOfSlots: uint = BasePlanner.DEFAULT_NUMBER_OF_SLOTS;
    public popup: BasePlannerPopup;
    public service: BasePlannerService;
    private _templates: Vector<BaseTemplate>;
    private _activeTemplate: PlannerTemplate;
    private _transferPopup: BasePlannerTransferPopup;

    public $ctor(): void {
        super.$ctor();
    }

    public setup(param1: boolean = true): void {
        BasePlanner.canSave = !BASE.isOutpost;
        this.service = new BasePlannerService();
        this.service.loadTemplates();
        this.service.addEventListener(BasePlannerServiceEvent.LOADED_TEMPLATES_LIST, as3.bind(this, this.loadedTemplateList));
        this._activeTemplate = new PlannerTemplate();
        this.setActiveTemplate(BASE.getTemplate());
        this.show();
    }

    private loadedTemplateList(param1: BasePlannerServiceEvent): void {
        this._templates = param1.templatesList;
        if (this._transferPopup) {
            this._transferPopup.updateList(this._templates);
        }
    }

    private loadTemplateAtSlot(param1: uint): void {
        this.setActiveTemplate(as3.vget(this._templates, param1));
    }

    private setActiveTemplate(param1: BaseTemplate): void {
        this._activeTemplate.importData(param1);
        if (this.popup) {
            this.popup.redraw();
            this.popup.hasBeenSaved = true;
            this.popup.changedPlannerData();
        }
    }

    public show(param1: MouseEvent = null): void {
        BASE.BuildingDeselect();
        if (!this.popup) {
            this.popup = new BasePlannerPopup(this._activeTemplate);
            this.popup.addEventListener(BasePlannerEvent.APPLY, as3.bind(this, this.clickedApply));
            this.popup.addEventListener(BasePlannerEvent.SAVE, as3.bind(this, this.clickedSave));
            this.popup.addEventListener(BasePlannerEvent.LOAD, as3.bind(this, this.clickedLoad));
            GLOBAL._layerWindows.addChild(this.popup);
            this.popup.hasBeenSaved = true;
        }
    }

    private clickedSave(param1: Event): void {
        this.popup.removeSelection();
        if (this._transferPopup) {
            POPUPS.Remove(this._transferPopup);
        }
        this.service.loadTemplates();
        this._transferPopup = new BasePlannerSavePopup();
        if (this._templates) {
            this._transferPopup.updateList(this._templates);
        }
        this._transferPopup.addEventListener(BasePlannerEvent.SAVE, as3.bind(this, this.saveTemplate), false, 0, true);
        this._transferPopup.addEventListener(Event.CLOSE, as3.bind(this, this.closedTransferPopup));
        POPUPS.Add(this._transferPopup, 1);
    }

    private clickedLoad(param1: Event): void {
        this.popup.removeSelection();
        if (this._transferPopup) {
            POPUPS.Remove(this._transferPopup);
        }
        this.service.loadTemplates();
        this._transferPopup = new BasePlannerLoadPopup();
        if (this._templates) {
            this._transferPopup.updateList(this._templates);
        }
        this._transferPopup.addEventListener(BasePlannerEvent.LOAD, as3.bind(this, this.loadTemplate), false, 0, true);
        this._transferPopup.addEventListener(Event.CLOSE, as3.bind(this, this.closedTransferPopup));
        POPUPS.Add(this._transferPopup, 1);
    }

    private clickedApply(param1: Event): void {
        let _loc3_: PlannerNode = null;
        let _loc2_: int = 0;
        while (_loc2_ < this._activeTemplate.inventoryData.length) {
            _loc3_ = as3.vget(this._activeTemplate.inventoryData, _loc2_);
            if (_loc3_.building._id != PlannerTemplate._DECORATION_ID && _loc3_.category == BuildingItem.TYPE_DECORATION) {
                _loc3_.building.RecycleC();
                InstanceManager.removeInstance(_loc3_.building);
            }
            _loc2_++;
        }
        BASE.applyTemplate(this._activeTemplate.exportData());
        PLANNER.Hide();
        BASE.Save();
    }

    protected loadTemplate(param1: BasePlannerTransferEvent): void {
        this.loadTemplateAtSlot(param1.slot);
        this.closedTransferPopup(null);
    }

    protected saveTemplate(param1: BasePlannerTransferEvent): void {
        this._activeTemplate.name = param1.name;
        this._activeTemplate.slot = param1.slot;
        this.service.saveTemplate(this._activeTemplate.exportData(), param1.slot);
        if (this.popup) {
            this.popup.hasBeenSaved = true;
        }
        this.closedTransferPopup(null);
    }

    protected closedTransferPopup(param1: Event = null): void {
        POPUPS.Remove(this._transferPopup);
        this._transferPopup.clear();
        this._transferPopup.removeEventListener(Event.CLOSE, as3.bind(this, this.closedTransferPopup));
        this._transferPopup = null;
    }

    public hide(param1: MouseEvent = null): void {
        if (this.popup) {
            this.popup.removeEventListener(BasePlannerEvent.APPLY, as3.bind(this, this.clickedApply));
            this.popup.removeEventListener(BasePlannerEvent.SAVE, as3.bind(this, this.clickedSave));
            this.popup.removeEventListener(BasePlannerEvent.LOAD, as3.bind(this, this.clickedLoad));
            this.popup.Remove();
            SOUNDS.Play("close");
            GLOBAL._layerWindows.removeChild(this.popup);
            this.popup = null;
        }
        if (this._transferPopup) {
            this.closedTransferPopup();
        }
    }
}

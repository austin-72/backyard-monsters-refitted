import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { Event, MouseEvent } from "flash/events";
import { Sprite } from "flash/display";
import { GlowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { Dictionary, getTimer } from "flash/utils";
import { Point, Rectangle } from "flash/geom";
import { BASE, BFOUNDATION, GRID, BaseTemplateNode, BasePlannerTransferRow, IoMapUi, IoPlanShare, IoTextPrompt, KEYS, BasePlannerEvent, BasePlannerLoadPopup, BasePlannerPopup, BasePlannerSavePopup, BasePlannerService, BasePlannerServiceEvent, BasePlannerTransferEvent, BasePlannerTransferPopup, BaseTemplate, BuildingItem, GLOBAL, InstanceManager, InventoryManager, IoQuests, IoTd, PLANNER, POPUPS, PlannerNode, PlannerTemplate, SOUNDS } from "@game";

export class BasePlanner extends ASObject {
    static {
        as3.fields(this, { popup: null, service: null, _templates: null, _activeTemplate: null, _transferPopup: null });
    }

    public static readonly TYPE: uint = 10;

    public static canSave: boolean = true;

    public static readonly DEFAULT_NUMBER_OF_SLOTS: uint = 2;

    public static slots: uint = BasePlanner.DEFAULT_NUMBER_OF_SLOTS;

    public static maxNumberOfSlots: uint = BasePlanner.DEFAULT_NUMBER_OF_SLOTS;

    /** Inferno-only: the layout slots every player has. */
    public static readonly IO_SLOTS: uint = 10;
    public popup: BasePlannerPopup;
    public service: BasePlannerService;
    private _templates: Vector<BaseTemplate>;
    private _activeTemplate: PlannerTemplate;
    private _transferPopup: BasePlannerTransferPopup;

    public $ctor(): void {
        super.$ctor();
    }

    public setup(param1: boolean = true): void {
        // (Inferno-only: nor in Hellgate Defense's arena, whose layout is the run's maze)
        BasePlanner.canSave = !BASE.isOutpost && !IoTd.on;
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #678: outposts have plans too: the server keeps each yard's slots, by its baseid)
            BasePlanner.canSave = !IoTd.on;
        }
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno-only (10 October): ten layout slots (the server keeps slots 0 to 9)
            BasePlanner.slots = BasePlanner.IO_SLOTS;
            BasePlanner.maxNumberOfSlots = BasePlanner.IO_SLOTS;
        }
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
        let template: BaseTemplate = as3.vget(this._templates, param1);
        // (Inferno-only, 12 November: the outposts share their slots; one saved in another outpost records that outpost's
        // building ids, so it is placed by kind of building, nearest first, as Import does: on the yard as it stands)
        if (template && template.ioFromElsewhere && this.popup) {
            this.setActiveTemplate(BASE.getTemplate());
            let rows: any[] = IoPlanShare.TemplateRows(template).map((r: any[]): any[] => [r[0], r[1], r[2]]);
            this._activeTemplate.name = template.name;
            this._activeTemplate.slot = template.slot;
            this.popup.ioApplyRows(rows, KEYS.Get("io_plan4_from_other"));
            return;
        }
        this.setActiveTemplate(template);
    }

    private setActiveTemplate(param1: BaseTemplate): void {
        this._activeTemplate.importData(param1);
        if (this.popup) {
            this.popup.redraw();
            this.popup.hasBeenSaved = true;
            this.popup.changedPlannerData();
            // (Inferno-only, QoL #685: buildings built since the plan was saved went onto their planned spots: said)
            if (GLOBAL.INFERNO_ONLY && this._activeTemplate.ioGhostsFilled > 0) {
                this.popup.ioSay(KEYS.Get("io_plan3_ghost_filled", { "v1": this._activeTemplate.ioGhostsFilled }));
            }
        }
    }

    /** Inferno-only (QoL #686): this yard's slots as last read from the server (null: not in yet). */
    public get ioTemplates(): Vector<BaseTemplate> {
        return this._templates;
    }

    /** Inferno-only (QoL #686, #492): the Save or Load window closed (a layout was picked from the chooser over it). */
    public ioCloseTransfer(): void {
        if (this._transferPopup) {
            this.closedTransferPopup(null);
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
        this.ioWireSlots(this._transferPopup);
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
        this.ioWireSlots(this._transferPopup);
        if (GLOBAL.INFERNO_ONLY) {
            this._transferPopup.addEventListener(BasePlannerEvent.IO_CURRENT, as3.bind(this, this.ioLoadCurrentYard), false, 0, true);
        }
        POPUPS.Add(this._transferPopup, 1);
    }

    private clickedApply(param1: Event): void {
        let _loc3_: PlannerNode = null;
        let _loc2_: int = 0;
        let recycled: int = 0;
        while (_loc2_ < this._activeTemplate.inventoryData.length) {
            _loc3_ = as3.vget(this._activeTemplate.inventoryData, _loc2_);
            if (_loc3_.building._id != PlannerTemplate._DECORATION_ID && _loc3_.category == BuildingItem.TYPE_DECORATION) {
                recycled++;
                _loc3_.building.RecycleC();
                InstanceManager.removeInstance(_loc3_.building);
            } else if (IoTd.on && _loc3_.building._id != PlannerTemplate._DECORATION_ID && _loc3_.type == 17 && !IoTd.plannerLocked(_loc3_)) {
                recycled++;
                _loc3_.building.RecycleC();
                InstanceManager.removeInstance(_loc3_.building);
                InventoryManager.buildingStorageAdd(17);
            }
            _loc2_++;
        }
        // (QoL #490: what the yard was, for Undo; only when Apply put nothing down from storage and recycled nothing)
        let before: BaseTemplate = GLOBAL.INFERNO_ONLY && !IoTd.on ? BASE.getTemplate() : null;
        let applied: BaseTemplate = this._activeTemplate.exportData();
        let undoable: boolean = before != null && recycled == 0;
        for (let node of (applied.nodes ?? [])) {
            if (node.id == PlannerTemplate._DECORATION_ID) {
                undoable = false;
            }
        }
        BASE.applyTemplate(applied);
        PLANNER.Hide();
        if (before) {
            BasePlanner.ioApplied(before, applied, undoable);
        }
        BASE.Save();
        // (Inferno-only, from the base game's pull request #296: the yard is put down with the sound a building
        // makes being put down)
        if (GLOBAL.INFERNO_ONLY) {
            SOUNDS.Play("buildingplace");
        }
        if (IoTd.on) {
            IoTd.plannerApplied();
        } else if (GLOBAL.INFERNO_ONLY) {
            IoQuests.event("planner_apply");
        }
    }

    /** Inferno-only (QoL #680): the Save or Load window's Rename and Delete on its rows. */
    private ioWireSlots(param1: BasePlannerTransferPopup): void {
        if (!BasePlannerTransferRow.ioSlotButtons) {
            return;
        }
        param1.addEventListener(BasePlannerEvent.IO_RENAME, as3.bind(this, this.ioRenameSlot), false, 0, true);
        param1.addEventListener(BasePlannerEvent.IO_DELETE, as3.bind(this, this.ioDeleteSlot), false, 0, true);
    }

    /** The saved layout in a slot, or null (an empty slot, or the list not in yet). */
    private ioSavedAt(param1: int): BaseTemplate {
        let t: BaseTemplate = this._templates && param1 >= 0 && param1 < this._templates.length ? as3.vget(this._templates, param1) : null;
        return BasePlannerTransferRow.ioIsEmpty(t) ? null : t;
    }

    /** (QoL #680) Rename: a new name for a saved slot (up to 30 letters); its layout stays as it was saved. */
    public ioRenameSlot(param1: BasePlannerTransferEvent): void {
        let slot: int = param1.slot | 0;
        let t: BaseTemplate = this.ioSavedAt(slot);
        if (!t) {
            return;
        }
        IoTextPrompt.Show(KEYS.Get("io_plan_rename_title"), KEYS.Get("io_plan_rename_body", { "v1": slot + 1 }), t.name, 30, KEYS.Get("io_plan_rename"), (typed: string): void => {
            let name: string = String(typed || "").replace(/^\s+|\s+$/g, "");
            if (!name || name == t.name) {
                return;
            }
            this.service.renameTemplate(t, slot, name, (ok: boolean, why: string): void => {
                if (!ok) {
                    GLOBAL.Message(KEYS.Get("io_plan_rename_failed") + (why ? "<br><br>" + why : ""));
                    return;
                }
                if (this._activeTemplate && (this._activeTemplate.slot | 0) == slot) {
                    this._activeTemplate.name = name;
                }
            });
        });
    }

    /** (QoL #680) Delete: a saved slot emptied, once confirmed. */
    public ioDeleteSlot(param1: BasePlannerTransferEvent): void {
        let slot: int = param1.slot | 0;
        let t: BaseTemplate = this.ioSavedAt(slot);
        if (!t) {
            return;
        }
        // (the name as typed: the message is HTML)
        let shown: string = String(t.name || "Slot " + (slot + 1)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        GLOBAL.Message(KEYS.Get("io_plan_delete_ask", { "v1": shown, "v2": slot + 1 }), KEYS.Get("io_plan_delete"), (): void => {
            this.service.clearSlot(slot, (ok: boolean, why: string): void => {
                if (!ok) {
                    GLOBAL.Message(KEYS.Get("io_plan_delete_failed") + (why ? "<br><br>" + why : ""));
                }
            });
        }, null, KEYS.Get("btn_cancel"), null);
    }

    /**
     * (QoL #694) Load's "Current yard": the plan goes back to the yard as it stands now (as it is when the planner
     * opens), and counts as saved, as a loaded slot does.
     */
    public ioLoadCurrentYard(param1: Event = null): void {
        this.setActiveTemplate(BASE.getTemplate());
        if (this._transferPopup) {
            this.closedTransferPopup(null);
        }
    }

    /** Inferno-only: the Save or Load window is open (the planner's arrow keys wait). */
    public get ioTransferOpen(): boolean {
        return this._transferPopup != null && this._transferPopup.parent != null;
    }

    protected loadTemplate(param1: BasePlannerTransferEvent): void {
        this.loadTemplateAtSlot(param1.slot);
        this.closedTransferPopup(null);
    }

    protected saveTemplate(param1: BasePlannerTransferEvent): void {
        this._activeTemplate.name = param1.name;
        this._activeTemplate.slot = param1.slot;
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #679: saved once the server says so, and said; a failed save no longer looks like it worked)
            let slot: int = param1.slot | 0;
            let name: string = param1.name;
            this.service.saveTemplate(this._activeTemplate.exportData(), param1.slot, (ok: boolean, why: string): void => {
                if (ok) {
                    if (this.popup) {
                        this.popup.hasBeenSaved = true;
                    }
                    BasePlanner.ioToast(KEYS.Get("io_planner_saved", { "v1": name || "Slot " + (slot + 1), "v2": slot + 1 }));
                } else {
                    GLOBAL.Message(KEYS.Get("io_planner_save_failed") + (why ? "<br><br>" + why : ""));
                }
            });
            this.closedTransferPopup(null);
            return;
        }
        this.service.saveTemplate(this._activeTemplate.exportData(), param1.slot);
        if (this.popup) {
            this.popup.hasBeenSaved = true;
        }
        this.closedTransferPopup(null);
    }

    // ---- Inferno-only (QoL #490): after Apply, a line saying so, with Undo for a minute
    private static readonly IO_UNDO_MS: int = 60000;
    private static _ioBanner: Sprite = null;

    /**
     * The plan was applied: "N buildings moved", and Undo (when it can be undone) for 60 seconds. `atY`: where the line
     * goes (NaN: over the top of the yard; QoL #684's Apply selection puts it lower, the planner staying open).
     */
    public static ioApplied(before: BaseTemplate, applied: BaseTemplate, undoable: boolean, atY: number = NaN): void {
        let was: any = {};
        for (let n of (before.nodes ?? [])) {
            was[String(n.id)] = n;
        }
        let back: BaseTemplate = new BaseTemplate(before.name);
        let moved: int = 0;
        for (let n of (applied.nodes ?? [])) {
            let old: BaseTemplateNode = as3.as(was[String(n.id)], BaseTemplateNode);
            if (old && (old.x != n.x || old.y != n.y)) {
                moved++;
                back.addNode(new BaseTemplateNode(old.x, old.y, old.id, old.type));
            }
        }
        let line: string = KEYS.Get("io_planner_applied", { "v1": moved });
        BasePlanner.ioToast(line, undoable && moved > 0 ? back : null, atY);
    }

    /**
     * A line over the top of the yard for a few seconds; with `undo`, an Undo button there for a minute. `atY` (NaN: the
     * top): its height on the screen.
     */
    /**
     * (18 October) Would putting the plan's buildings where `undo` says make two buildings overlap in the yard as it
     * is now (each footprint where it would be: the plan's moved, everything else where it stands)?
     */
    public static ioUndoClashes(undo: BaseTemplate): boolean {
        let to: Dictionary = new Dictionary();
        for (let node of (undo.nodes ?? [])) {
            let b: BFOUNDATION = BASE.getBuildingFromNode(node);
            if (b) {
                to.set(b, new Point(node.x, node.y));
            }
        }
        let boxes: any[] = [];
        for (let o of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            let b: BFOUNDATION = as3.as(o, BFOUNDATION);
            if (!b || b._type == 7 || !b._footprint || !b._footprint.length || b === GLOBAL._newBuilding) {
                continue;
            }
            let now: Point = GRID.FromISO(b.x, b.y);
            let at: Point = as3.as(to.get(b), Point) || now;
            let moved: boolean = at.x != now.x || at.y != now.y;
            for (let f of as3.values(b._footprint)) {
                if (f && f.width > 0 && f.height > 0) {
                    boxes.push({ "r": new Rectangle(at.x + f.x, at.y + f.y, f.width, f.height), "moved": moved, "b": b });
                }
            }
        }
        as3.sort(boxes, (a: any, c: any): int => {
            return as3.cast(a.r, Rectangle).x < as3.cast(c.r, Rectangle).x ? -1 : (as3.cast(a.r, Rectangle).x > as3.cast(c.r, Rectangle).x ? 1 : 0);
        });
        for (let i: int = 0; i < boxes.length; i++) {
            let ra: Rectangle = as3.cast(boxes[i].r, Rectangle);
            for (let j: int = (i + 1) | 0; j < boxes.length; j++) {
                let rc: Rectangle = as3.cast(boxes[j].r, Rectangle);
                if (rc.x >= ra.right) {
                    break;
                }
                if ((boxes[i].moved || boxes[j].moved) && boxes[i].b != boxes[j].b && ra.intersects(rc)) {
                    return true;
                }
            }
        }
        return false;
    }

    public static ioToast(text: string, undo: BaseTemplate = null, atY: number = NaN): void {
        BasePlanner.ioHideToast();
        let bar: Sprite = new Sprite();
        bar.name = "ioPlannerToast";
        let label: TextField = new TextField();
        label.defaultTextFormat = new TextFormat("Verdana", 12, 0xFFF4E0, true);
        label.autoSize = TextFieldAutoSize.LEFT;
        label.selectable = false;
        label.mouseEnabled = false;
        label.text = text;
        label.x = 14;
        label.y = 9;
        bar.addChild(label);
        let w: int = (Math.ceil(label.textWidth) + 32) | 0;
        let h: int = 36;
        let yard: number = BASE._loadedBaseID;
        let until: int = (getTimer() + (undo ? BasePlanner.IO_UNDO_MS : 4000)) | 0;
        let button: any = null;
        if (undo) {
            button = IoMapUi.button(KEYS.Get("io_planner_undo", { "v1": 60 }), 110, 24, (e: MouseEvent): void => {
                e.stopPropagation();
                BasePlanner.ioHideToast();
                if (BASE._loadedBaseID != yard || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                    return;
                }
                // (18 October, SUSPECTED-BUGS.md: Undo put each building back without a look at what stood there now,
                // so one built or dragged onto an old spot in the meantime ended up under it) refused when it would
                if (BasePlanner.ioUndoClashes(undo)) {
                    BasePlanner.ioToast(KEYS.Get("io_planner_undo_blocked"));
                    return;
                }
                BASE.applyTemplate(undo);
                SOUNDS.Play("buildingplace");
                BasePlanner.ioToast(KEYS.Get("io_planner_undone"));
            }, "gold", 11);
            button.name = "ioPlannerUndo";
            button.x = w;
            button.y = 6;
            bar.addChild(button);
            w += 120;
        }
        bar.graphics.lineStyle(1, 0xFFB35A, 0.9);
        bar.graphics.beginFill(0x2A0E04, 0.92);
        bar.graphics.drawRoundRect(0, 0, w, h, 14);
        bar.graphics.endFill();
        bar.filters = [new GlowFilter(0, 0.6, 8, 8, 2)];
        bar.x = Math.round(GLOBAL._SCREENCENTER.x - w / 2);
        bar.y = Math.round(isNaN(atY) ? GLOBAL._SCREEN.y + 70 : atY);
        bar.addEventListener(Event.ENTER_FRAME, (e: Event): void => {
            let left: int = (until - getTimer()) | 0;
            if (left <= 0 || BASE._loadedBaseID != yard || GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
                BasePlanner.ioHideToast();
                return;
            }
            if (button && button.setText) {
                button.setText(KEYS.Get("io_planner_undo", { "v1": Math.ceil(left / 1000) }));
            }
        });
        GLOBAL._layerTop.addChild(bar);
        BasePlanner._ioBanner = bar;
    }

    public static ioHideToast(): void {
        if (BasePlanner._ioBanner && BasePlanner._ioBanner.parent) {
            BasePlanner._ioBanner.parent.removeChild(BasePlanner._ioBanner);
        }
        BasePlanner._ioBanner = null;
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

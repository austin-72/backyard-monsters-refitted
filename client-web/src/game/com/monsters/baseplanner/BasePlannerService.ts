import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { EventDispatcher } from "flash/events";
import { BASE, BasePlanner, BasePlannerServiceEvent, BaseTemplate, GLOBAL, IoQuests, URLLoaderApi, print } from "@game";

export class BasePlannerService extends EventDispatcher {
    public $ctor(): void {
        super.$ctor();
    }

    public callServerMethod(url: string, keyValue: any[], onComplete: Function = null): void {
        let urlLoader: URLLoaderApi = null;
        // The main yard keeps its own layouts and the outposts share theirs (server: controllers/yardplanner/
        // plannerSave.ts): the server is told which yard is being planned.
        keyValue = (keyValue || []).concat([["baseid", BASE._loadedBaseID]]);
        (urlLoader = new URLLoaderApi()).load(GLOBAL._apiURL + "bm/yardplanner/" + url, keyValue, onComplete);
    }

    public saveTemplate(baseTemplate: BaseTemplate, slotId: uint, onDone: Function = null): void {
        let _loc3_: any = JSON.stringify(baseTemplate.exportData());
        if (onDone != null) {
            // (Inferno-only, QoL #679: told whether it was saved: onDone(ok, why))
            let keyValue: any[] = [["slotid", slotId], ["name", baseTemplate.name], ["data", _loc3_], ["baseid", BASE._loadedBaseID]];
            new URLLoaderApi().load(GLOBAL._apiURL + "bm/yardplanner/savetemplate", keyValue, (serverData: any): void => {
                let failed: boolean = !serverData || Boolean(serverData.error);
                if (!failed) {
                    this.savedTemplate(serverData);
                }
                onDone(!failed, failed && serverData && serverData.error ? String(serverData.error) : "");
            }, (e: any): void => {
                onDone(false, "");
            });
            return;
        }
        this.callServerMethod("savetemplate", [["slotid", slotId], ["name", baseTemplate.name], ["data", _loc3_]], as3.bind(this, this.savedTemplate));
        print("saving \'" + baseTemplate.name + "\' in slot " + slotId);
    }

    private savedTemplate(serverData: any): void {
        if (serverData.error) {
            print(serverData.error);
            return;
        }
        // Inferno-only quest book: a layout saved
        if (GLOBAL.INFERNO_ONLY) {
            IoQuests.event("planner_save");
        }
        this.loadedTemplates(serverData);
    }

    public loadTemplates(): void {
        this.callServerMethod("gettemplates", null, as3.bind(this, this.loadedTemplates));
        print("loading template list from the server");
    }

    private loadedTemplates(serverData: any): void {
        let template: any = null;
        let slotIndex: int = 0;
        let slotId: uint = 0;
        let baseTemplate: BaseTemplate = null;
        let baseTemplateList: Vector<BaseTemplate> = new Vector<BaseTemplate>(BasePlanner.slots, true, BaseTemplate);
        for (template of as3.values(serverData)) {
            if (!(as3.is(template, Number))) {
                baseTemplate = new BaseTemplate();
                slotId = template.slotid >>> 0;
                baseTemplate.name = as3.str(template.name);
                baseTemplate.slot = slotId;
                baseTemplate.savedAt = Number(template.saved) || 0;
                baseTemplate.ioFrom = template.from != null ? String(template.from) : "";
                baseTemplate.importData(JSON.parse(as3.str(template.data)));
                if (slotId < baseTemplateList.length) {
                    as3.vset(baseTemplateList, slotId, baseTemplate);
                }
            }
        }
        slotIndex = (baseTemplateList.length - 1) | 0;
        while (slotIndex >= 0) {
            if (!as3.vget(baseTemplateList, slotIndex)) {
                as3.vset(baseTemplateList, slotIndex, new BaseTemplate("Slot" + (slotIndex + 1).toString()));
            }
            slotIndex--;
        }
        print("new template list is " + baseTemplateList);
        this.dispatchEvent(new BasePlannerServiceEvent(BasePlannerServiceEvent.LOADED_TEMPLATES_LIST, baseTemplateList));
    }

    public clearSlot(slotIndex: uint, onDone: Function = null): void {
        if (onDone != null) {
            // (Inferno-only, QoL #680: Delete on a slot; told whether it went: onDone(ok, why), and the list reloaded)
            this.ioCall("deletetemplate", [["slotid", slotIndex], ["baseid", BASE._loadedBaseID]], onDone);
            return;
        }
        this.callServerMethod("deletetemplate", [["slotid", slotIndex]]);
        print("deleting \'blah\' at slot index of " + slotIndex);
    }

    /**
     * Inferno-only (QoL #680): a saved slot gets a new name; its layout and when it was saved stay (the server's
     * savetemplate with rename=1). Its layout goes too, so a server without rename saves the same layout again.
     */
    public renameTemplate(template: BaseTemplate, slotId: uint, name: string, onDone: Function): void {
        let data: string = JSON.stringify(template.exportData());
        this.ioCall("savetemplate", [["slotid", slotId], ["name", name], ["data", data], ["rename", 1], ["baseid", BASE._loadedBaseID]], onDone);
    }

    /**
     * Inferno-only (QoL #492): a slot of this yard gets its earlier version back (kept 7 days after it was saved over or
     * deleted); what it had becomes its earlier version in turn. onDone(ok, why), and the new list sent out.
     */
    public ioRestoreTemplate(slotId: uint, onDone: Function): void {
        this.ioCall("restoretemplate", [["slotid", slotId], ["baseid", BASE._loadedBaseID]], onDone);
    }

    /** A call whose answer is the slots' list: onDone(ok, why), and the new list sent out (LOADED_TEMPLATES_LIST). */
    private ioCall(url: string, keyValue: any[], onDone: Function): void {
        new URLLoaderApi().load(GLOBAL._apiURL + "bm/yardplanner/" + url, keyValue, (serverData: any): void => {
            let failed: boolean = !serverData || Boolean(serverData.error);
            if (!failed) {
                this.loadedTemplates(serverData);
            }
            onDone(!failed, failed && serverData && serverData.error ? String(serverData.error) : "");
        }, (e: any): void => {
            onDone(false, "");
        });
    }
}

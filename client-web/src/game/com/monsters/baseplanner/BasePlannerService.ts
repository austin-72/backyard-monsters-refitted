import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { EventDispatcher } from "flash/events";
import { BASE, BasePlanner, BasePlannerServiceEvent, BaseTemplate, GLOBAL, URLLoaderApi, print } from "@game";

export class BasePlannerService extends EventDispatcher {
    public $ctor(): void {
        super.$ctor();
    }

    public callServerMethod(url: string, keyValue: any[], onComplete: Function = null): void {
        let urlLoader: URLLoaderApi = null;
        // Each yard keeps its own layouts (server: controllers/yardplanner/plannerSave.ts): a layout
        // records building ids, which differ between the main yard and every outpost.
        keyValue = (keyValue || []).concat([["baseid", BASE._loadedBaseID]]);
        (urlLoader = new URLLoaderApi()).load(GLOBAL._apiURL + "bm/yardplanner/" + url, keyValue, onComplete);
    }

    public saveTemplate(baseTemplate: BaseTemplate, slotId: uint): void {
        let _loc3_: any = JSON.stringify(baseTemplate.exportData());
        this.callServerMethod("savetemplate", [["slotid", slotId], ["name", baseTemplate.name], ["data", _loc3_]], as3.bind(this, this.savedTemplate));
        print("saving \'" + baseTemplate.name + "\' in slot " + slotId);
    }

    private savedTemplate(serverData: any): void {
        if (serverData.error) {
            print(serverData.error);
            return;
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

    public clearSlot(slotIndex: uint): void {
        this.callServerMethod("deletetemplate", [["slotid", slotIndex]]);
        print("deleting \'blah\' at slot index of " + slotIndex);
    }
}

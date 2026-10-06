import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { DisplayObject } from "flash/display";
import { MouseEvent } from "flash/events";
import { BASE, BUILDINGS, Chat, GLOBAL, IoQuests, MapRoom3, MapRoomManager, MonsterMadness, MonsterMadnessInfoBar, POPUPS, QUESTS, SPECIALEVENT, STORE, TUTORIAL, UI2, UI_MENU, UI_MISSIONMENU, UI_NEXTWAVE, UI_NEXTWAVE_WM1, popup_prefab_help } from "@game";

export class UI_BOTTOM extends ASObject {
    public static _nextwave: UI_NEXTWAVE = null;

    public static _nextwave_wm1: UI_NEXTWAVE_WM1 = null;

    public static _mc: UI_MENU = null;

    public static _missions: UI_MISSIONMENU = null;

    public static _monsterMadness: MonsterMadnessInfoBar = null;

    private static _children: Vector<DisplayObject> = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static Setup(): void {
        UI_BOTTOM._children = new Vector<DisplayObject>(0, false, DisplayObject);
        UI_BOTTOM._mc = new UI_MENU();
        if (!UI_BOTTOM._missions && !GLOBAL._flags.viximo) {
            UI_BOTTOM._missions = new UI_MISSIONMENU();
        }
        UI_BOTTOM._mc.Setup();
        UI_BOTTOM._mc.bBuild.addEventListener(MouseEvent.CLICK, BUILDINGS.Show);
        UI_BOTTOM._mc.bQuests.addEventListener(MouseEvent.CLICK, QUESTS.Show);
        UI_BOTTOM._mc.bStore.addEventListener(MouseEvent.CLICK, UI_BOTTOM.clickedStore);
        UI_BOTTOM._mc.bMap.addEventListener(MouseEvent.CLICK, GLOBAL.ShowMap);
        if (UI_BOTTOM._missions) {
            GLOBAL._layerUI.addChild(UI_BOTTOM._missions);
        }
        if (UI_BOTTOM._mc) {
            GLOBAL._layerUI.addChild(UI_BOTTOM._mc);
        }
        if (BASE.isOutpostMapRoom2Only) {
            UI_BOTTOM._mc.bKits.addEventListener(MouseEvent.CLICK, UI_BOTTOM.ShowStarterKits);
        }
        if (!UI2._showBottom) {
            UI_BOTTOM.Hide();
        }
        UI_BOTTOM._nextwave = new UI_NEXTWAVE();
        UI_BOTTOM._nextwave.Setup();
        if (UI_BOTTOM._nextwave) {
            GLOBAL._layerUI.addChild(UI_BOTTOM._nextwave);
        }
        UI_BOTTOM._nextwave.visible = false;

        UI_BOTTOM._nextwave_wm1 = new UI_NEXTWAVE_WM1();
        UI_BOTTOM._nextwave_wm1.Setup();
        if (UI_BOTTOM._nextwave_wm1) {
            GLOBAL._layerUI.addChild(UI_BOTTOM._nextwave_wm1);
        }
        UI_BOTTOM._nextwave_wm1.visible = false;
    }

    public static clickedStore(param1: MouseEvent): void {
        if (MapRoomManager.instance.isInMapRoom3 && !BASE.isMainYardOrInfernoMainYard) {
            return;
        }
        STORE.Show(1, 1)(param1);
    }

    public static ShowStarterKits(param1: MouseEvent = null): void {
        if (GLOBAL.ioDesignMode()) {
            // Inferno-only: a Designer draft isn't a real outpost; kits are designed here, not bought
            GLOBAL.Message("The kit popup isn't used in the Designer. Build the kit's buildings here, then Save.");
            return;
        }
        POPUPS.Push(new popup_prefab_help());
    }

    public static Update(): void {
        let _loc2_: int = 0;
        let _loc1_: int = 0;
        // Inferno-only: an icon that finished loading after the bar was taken down (a yard change) called this
        // with no bar (bug report #56)
        if (GLOBAL.INFERNO_ONLY && !UI_BOTTOM._mc) {
            return;
        }
        for (const $value of as3.values(QUESTS._completed)) {
            _loc2_ = $value | 0;
            if (_loc2_ == 1) {
                _loc1_ += 1;
            }
        }
        UI_BOTTOM._mc.bQuests.Alert = "";
        // Inferno-only: the quest book (IoQuests): how many are ready, kept up to date, its notice
        if (GLOBAL.INFERNO_ONLY) {
            IoQuests.refresh();
            IoQuests.tick();
            if (IoQuests.ready > 0) {
                UI_BOTTOM._mc.bQuests.Alert = String(IoQuests.ready);
            }
        }
        if (UI_BOTTOM._missions) {
            UI_BOTTOM._missions.Update();
        }
        if (UI_BOTTOM._mc.bStore) {
            if (MapRoomManager.instance.isInMapRoom3 && BASE.isMainYardOrInfernoMainYard && Boolean(GLOBAL._bStore)) {
                UI_BOTTOM._mc.bStore.Enabled = true;
            } else if (!MapRoomManager.instance.isInMapRoom3 && (GLOBAL._bStore || !BASE.isMainYard)) {
                UI_BOTTOM._mc.bStore.Enabled = true;
            } else {
                UI_BOTTOM._mc.bStore.Enabled = BASE.isMainYardInfernoOnly || GLOBAL.INFERNO_ONLY && BASE.isMainYard;
            }
        }
        if (Boolean(GLOBAL._bMap) || !BASE.isMainYard) {
            UI_BOTTOM._mc.bMap.Enabled = true;
        } else {
            UI_BOTTOM._mc.bMap.Enabled = false;
        }
        let _loc3_: boolean = !BASE.isMainYardOrInfernoMainYard && MapRoomManager.instance.isInMapRoom3;
        UI_BOTTOM._mc.bQuests.Enabled = !_loc3_;
        UI_BOTTOM._mc.bQuests.mouseEnabled = !_loc3_;
        if (!UI_BOTTOM._mc._sorted) {
            UI_BOTTOM._mc.sortAll();
        }
    }

    public static Resize(): void {
        if (Boolean(UI_BOTTOM._mc) && UI_BOTTOM._mc._loaded) {
            UI_BOTTOM._mc.Resize();
        }
        if (UI_BOTTOM._nextwave) {
            UI_BOTTOM._nextwave.Resize();
        }
        if (UI_BOTTOM._nextwave_wm1) {
            UI_BOTTOM._nextwave_wm1.Resize();
        }
        if (TUTORIAL._stage < TUTORIAL._endstage) {
            TUTORIAL.Resize();
        }
        if (MapRoom3.mapRoom3Window) {
            MapRoom3.mapRoom3WindowHUD.PositionRightMenuButtonsBar();
        }
    }

    public static Clear(): void {
        if (Boolean(UI_BOTTOM._mc) && Boolean(UI_BOTTOM._mc.parent)) {
            UI_BOTTOM._mc.bBuild.removeEventListener(MouseEvent.CLICK, BUILDINGS.Show);
            UI_BOTTOM._mc.bQuests.removeEventListener(MouseEvent.CLICK, QUESTS.Show);
            UI_BOTTOM._mc.bStore.removeEventListener(MouseEvent.CLICK, STORE.Show(1, 1));
            UI_BOTTOM._mc.bMap.removeEventListener(MouseEvent.CLICK, GLOBAL.ShowMap);
            UI_BOTTOM._mc.parent.removeChild(UI_BOTTOM._mc);
            UI_BOTTOM._mc = null;
        }
    }

    public static Show(): void {
        if (UI_BOTTOM._mc) {
            UI_BOTTOM._mc.visible = true;
        }
        if (UI_BOTTOM._missions) {
            UI_BOTTOM._missions.visible = true;
        }
        if (Chat.flagsShouldChatDisplay()) {
            if (Chat._bymChat) {
                Chat._bymChat.show();
            }
        }
        SPECIALEVENT.updateNextWaveUI();
        if (MonsterMadness.infoBar) {
            MonsterMadness.addInfoBar();
        }
        UI_BOTTOM.showChildren();
    }

    public static Hide(): void {
        if (UI_BOTTOM._mc) {
            UI_BOTTOM._mc.bQuests.Alert = "";
            UI_BOTTOM._mc.visible = false;
        }
        if (!Chat.flagsShouldChatDisplay()) {
            if (Chat._bymChat) {
                Chat._bymChat.hide();
            }
        }
        if (UI_BOTTOM._nextwave) {
            UI_BOTTOM._nextwave.visible = false;
        }
        if (UI_BOTTOM._nextwave_wm1) {
            UI_BOTTOM._nextwave_wm1.visible = false;
        }
        if (MonsterMadness.infoBar) {
            MonsterMadness.removeInfoBar();
        }
        UI_BOTTOM.hideChildren();
    }

    private static hideChildren(): void {
        let _loc1_: int = 0;
        while (_loc1_ < UI_BOTTOM._children.length) {
            as3.vget(UI_BOTTOM._children, _loc1_).visible = false;
            _loc1_++;
        }
    }

    private static showChildren(): void {
        let _loc1_: int = 0;
        while (_loc1_ < UI_BOTTOM._children.length) {
            as3.vget(UI_BOTTOM._children, _loc1_).visible = true;
            _loc1_++;
        }
    }

    public static addChild(param1: DisplayObject): void {
        UI_BOTTOM._children.push(param1);
        GLOBAL._layerUI.addChild(param1);
    }

    public static removeChild(param1: DisplayObject): void {
        UI_BOTTOM._children.push(param1);
        let _loc2_: uint = UI_BOTTOM._children.indexOf(param1) >>> 0;
        if (_loc2_) {
            UI_BOTTOM._children.splice(_loc2_, 1);
        }
        if (param1.parent) {
            param1.parent.removeChild(param1);
        }
    }
}

import * as as3 from "as3";
import { ASObject, int } from "as3";
import { DisplayObject, MovieClip } from "flash/display";
import { MouseEvent } from "flash/events";
import { Point, Rectangle } from "flash/geom";
import { BASE, Chat, GLOBAL, KEYS, QUEUE, STORE, TUTORIAL, UI2, bubblepopup, bubblepopupRight, icon_worker, icon_worker_inferno } from "@game";

export class UI_WORKERS extends ASObject {
    private static _do: DisplayObject = null;

    private static _mc: MovieClip = null;

    private static _workers: any[] = null;

    private static _popupdo: DisplayObject = null;

    private static _popupID: int = 0;

    private static _popupmc: bubblepopupRight = null;

    private static _popupmc2: bubblepopup = null;

    private static _maxWorkers: int = 0;

    private static _workerMCOffset: int = 45;

    private static _canUseHorizontal: boolean = false;

    /** Inferno-only: a button kept in the workers' column, under the fifth worker (Moloch's Gauntlet). */
    private static _ioExtra: DisplayObject = null;

    /** The gap between the fifth worker and that button. */
    private static readonly IO_EXTRA_GAP: int = 14;

    /** The Gauntlet button is drawn round this point of its own, its gold ring 25 across the middle. */
    private static readonly IO_EXTRA_MIDDLE: number = 20.75;

    /** Hell Freezes Over's button: under the Gauntlet's (in its place while that one is hidden). */
    private static _ioExtra2: DisplayObject = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static ioAddUnderWorkers(param1: DisplayObject): void {
        if (UI_WORKERS._ioExtra && UI_WORKERS._ioExtra != param1 && UI_WORKERS._ioExtra.parent) {
            UI_WORKERS._ioExtra.parent.removeChild(UI_WORKERS._ioExtra);
        }
        UI_WORKERS._ioExtra = param1;
        UI_WORKERS.ioPlaceExtra();
    }

    public static ioAddUnderGauntlet(param1: DisplayObject): void {
        if (UI_WORKERS._ioExtra2 && UI_WORKERS._ioExtra2 != param1 && UI_WORKERS._ioExtra2.parent) {
            UI_WORKERS._ioExtra2.parent.removeChild(UI_WORKERS._ioExtra2);
        }
        UI_WORKERS._ioExtra2 = param1;
        UI_WORKERS.ioPlaceExtra();
    }

    /** Centred under the fifth worker's button, the gap below it (it moves and hides with the column). */
    public static ioPlaceExtra(): void {
        if (!UI_WORKERS._mc) {
            return;
        }
        let r: Rectangle = UI_WORKERS._workers && UI_WORKERS._workers.length >= 5 ? as3.cast(UI_WORKERS._workers[4].mc, DisplayObject).getBounds(UI_WORKERS._mc) : new Rectangle(0, 20 + 4 * UI_WORKERS._workerMCOffset, 40, 40);
        if (UI_WORKERS._ioExtra2) {
            if (UI_WORKERS._ioExtra2.parent != UI_WORKERS._mc) {
                UI_WORKERS._mc.addChild(UI_WORKERS._ioExtra2);
            }
            let below: boolean = Boolean(UI_WORKERS._ioExtra) && UI_WORKERS._ioExtra.visible;
            UI_WORKERS._ioExtra2.x = r.x + r.width / 2 - UI_WORKERS.IO_EXTRA_MIDDLE;
            UI_WORKERS._ioExtra2.y = r.y + r.height + UI_WORKERS.IO_EXTRA_GAP + 25 - UI_WORKERS.IO_EXTRA_MIDDLE + (below ? 66 : 0);
        }
        if (!UI_WORKERS._ioExtra) {
            return;
        }
        if (UI_WORKERS._ioExtra.parent != UI_WORKERS._mc) {
            UI_WORKERS._mc.addChild(UI_WORKERS._ioExtra);
        }
        UI_WORKERS._ioExtra.x = r.x + r.width / 2 - UI_WORKERS.IO_EXTRA_MIDDLE;
        UI_WORKERS._ioExtra.y = r.y + r.height + UI_WORKERS.IO_EXTRA_GAP + 25 - UI_WORKERS.IO_EXTRA_MIDDLE;
    }

    /** A tip for the button, pointing at it from the left like the workers' own. */
    public static ioShowTip(param1: DisplayObject, param2: string): void {
        if (!param1 || !param1.stage) {
            return;
        }
        let p: Point = GLOBAL._layerUI.globalToLocal(param1.localToGlobal(new Point(UI_WORKERS.IO_EXTRA_MIDDLE, UI_WORKERS.IO_EXTRA_MIDDLE)));
        // as PopupShow, but the tip may have several lines (<br>): the bubble is sized for them
        UI_WORKERS.PopupHide();
        UI_WORKERS._popupID = -1;
        UI_WORKERS._popupmc = new bubblepopupRight();
        UI_WORKERS._popupmc.Setup(UI_WORKERS._mc ? (UI_WORKERS._mc.x - 5) | 0 : (p.x - 30) | 0, p.y | 0, "");
        UI_WORKERS._popupmc.Update(param2, param2.split("<br>").length);
        UI_WORKERS._popupmc.Nudge("left");
        UI_WORKERS._popupdo = GLOBAL._layerUI.addChild(UI_WORKERS._popupmc);
    }

    public static Setup(): void {
        let _loc1_: int = 0;
        let _loc2_: MovieClip = null;
        if (Boolean(UI_WORKERS._do) && Boolean(UI_WORKERS._do.parent)) {
            UI_WORKERS._do.parent.removeChild(UI_WORKERS._do);
            UI_WORKERS._do = null;
        }
        UI_WORKERS._mc = new MovieClip();
        UI_WORKERS._workers = [];
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            UI_WORKERS._maxWorkers = 5;
            if (!BASE.isMainYard) {
                UI_WORKERS._maxWorkers = GLOBAL.ioOutpostWorkers();
            }
            _loc1_ = 0;
            while (_loc1_ < UI_WORKERS._maxWorkers) {
                if (GLOBAL.InfernoMode()) {
                    _loc2_ = new icon_worker_inferno();
                } else {
                    _loc2_ = new icon_worker();
                }
                _loc2_.y = 20 + _loc1_ * UI_WORKERS._workerMCOffset;
                _loc2_.mouseChildren = false;
                _loc2_.addEventListener(MouseEvent.CLICK, UI_WORKERS.MouseClicked(_loc1_));
                _loc2_.addEventListener(MouseEvent.MOUSE_OVER, UI_WORKERS.MouseOver(_loc1_));
                _loc2_.addEventListener(MouseEvent.MOUSE_OUT, UI_WORKERS.MouseOut);
                _loc2_.buttonMode = true;
                UI_WORKERS._mc.addChild(_loc2_);
                UI_WORKERS._workers.push({ "purchased": false, "active": false, "id": 0, "message": "", "mc": _loc2_ });
                _loc1_++;
            }
            UI_WORKERS._do = GLOBAL._layerUI.addChild(UI_WORKERS._mc);
        }
        UI_WORKERS.ioPlaceExtra();
        UI_WORKERS.Update();
        if (!UI2._showBottom) {
            UI_WORKERS.Hide();
        }
    }

    private static MouseOver(param1: int): Function {
        let i: int = 0;
        i = param1;
        return (param1: MouseEvent = null): void => {
            let _loc3_: any = undefined;
            let _loc2_: any = UI_WORKERS._workers[i];
            if (_loc2_.purchased) {
                if (_loc2_.active) {
                    _loc3_ = _loc2_.message;
                } else {
                    _loc3_ = KEYS.Get("ui_worker_idle");
                }
            } else {
                _loc3_ = KEYS.Get("ui_worker_hire");
            }
            UI_WORKERS.PopupShow((UI_WORKERS._mc.x - 5) | 0, (UI_WORKERS._mc.y + UI_WORKERS._workerMCOffset / 2 + i * UI_WORKERS._workerMCOffset + UI_WORKERS._workerMCOffset * 0.5) | 0, as3.str(_loc3_), i);
        };
    }

    private static MouseOut(param1: MouseEvent): void {
        UI_WORKERS.PopupHide();
    }

    private static MouseClicked(param1: int): Function {
        let i: int = 0;
        i = param1;
        return (param1: MouseEvent = null): void => {
            if (UI_WORKERS._workers[i]) {
                if (UI_WORKERS._workers[i].purchased) {
                    QUEUE.JumpToWorker(i);
                } else {
                    STORE.ShowB(1, 0, ["BEW"]);
                }
            }
        };
    }

    public static Update(): void {
        let _loc3_: any = null;
        let _loc4_: any = null;
        let _loc1_: boolean = false;
        let _loc2_: int = 0;
        while (_loc2_ < UI_WORKERS._workers.length) {
            _loc3_ = UI_WORKERS._workers[_loc2_];
            if (Boolean(QUEUE._stack) && Boolean(QUEUE._stack[_loc2_])) {
                _loc4_ = QUEUE._stack[_loc2_];
                if (_loc3_.id != _loc4_.id) {
                    _loc3_.id = _loc4_.id;
                }
                _loc3_.message = "<b>" + _loc4_.title + "</b> " + _loc4_.message;
                if (!_loc3_.purchased) {
                    _loc3_.purchased = true;
                    _loc1_ = true;
                }
                if (_loc3_.active != _loc4_.active) {
                    _loc3_.active = _loc4_.active;
                    _loc1_ = true;
                }
                if (Boolean(_loc3_.active) && UI_WORKERS._popupID == _loc2_) {
                    UI_WORKERS.PopupUpdate(as3.str(_loc3_.message));
                }
            }
            _loc2_++;
        }
        if (_loc1_) {
            UI_WORKERS.Render();
        }
        UI_WORKERS.Resize();
    }

    public static Resize(): void {
        let _loc1_: int = 0;
        if (!Chat.flagsShouldChatDisplay() && UI_WORKERS._canUseHorizontal) {
            if (UI_WORKERS._mc) {
                UI_WORKERS._mc.x = GLOBAL._SCREEN.x;
                UI_WORKERS._mc.y = GLOBAL._SCREEN.bottom - 52;
            }
        } else if (UI_WORKERS._mc) {
            UI_WORKERS._mc.x = GLOBAL._SCREEN.x + GLOBAL._SCREEN.width - UI_WORKERS._workerMCOffset;
            _loc1_ = !(!UI2._wildMonsterBar) ? 20 : 0;
            UI_WORKERS._mc.y = GLOBAL._SCREEN.top + 50 + _loc1_ + 30 * UI2.TimersVisible();
        }
        UI_WORKERS.ioPlaceExtra();
    }

    private static Render(): void {
        let _loc2_: any = null;
        let _loc1_: int = 0;
        while (_loc1_ < UI_WORKERS._maxWorkers) {
            _loc2_ = UI_WORKERS._workers[_loc1_];
            if (_loc2_.purchased) {
                if (_loc2_.active) {
                    _loc2_.mc.gotoAndStop(2);
                } else {
                    _loc2_.mc.gotoAndStop(1);
                }
                if (STORE._storeData.BST) {
                    _loc2_.mc.mcIcon.gotoAndStop(2);
                } else {
                    _loc2_.mc.mcIcon.gotoAndStop(1);
                }
            } else {
                _loc2_.mc.gotoAndStop(3);
                _loc2_.mc.label_txt.htmlText = "<b>" + KEYS.Get("ui_worker_hireicon") + "</b>";
            }
            _loc1_++;
        }
    }

    public static PopupShow(param1: int, param2: int, param3: string, param4: int): void {
        UI_WORKERS.PopupHide();
        UI_WORKERS._popupID = param4;
        UI_WORKERS._popupmc = new bubblepopupRight();
        UI_WORKERS._popupmc.Setup(param1, param2, param3);
        UI_WORKERS._popupmc.Nudge("left");
        UI_WORKERS._popupdo = GLOBAL._layerUI.addChild(UI_WORKERS._popupmc);
    }

    public static PopupUpdate(param1: string): void {
        if (UI_WORKERS._popupmc) {
            UI_WORKERS._popupmc.Update(param1);
        } else if (UI_WORKERS._popupmc2) {
            UI_WORKERS._popupmc2.Update(param1);
        }
    }

    public static PopupHide(): void {
        if (UI_WORKERS._popupdo) {
            if (UI_WORKERS._popupdo.parent == GLOBAL._layerUI) {
                GLOBAL._layerUI.removeChild(UI_WORKERS._popupdo);
            }
            UI_WORKERS._popupdo = null;
        }
    }

    public static Show(): void {
        if (TUTORIAL._stage < 192) {
            UI_WORKERS._mc.visible = false;
        } else {
            UI_WORKERS._mc.visible = true;
        }
    }

    public static Hide(): void {
        UI_WORKERS._mc.visible = false;
    }
}

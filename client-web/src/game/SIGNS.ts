import { ASObject, int } from "as3";
import { Loader, MovieClip } from "flash/display";
import { Event, IOErrorEvent, MouseEvent } from "flash/events";
import { URLRequest } from "flash/net";
import { BASE, BFOUNDATION, GLOBAL, LOGIN, MAILBOX, SIGNPOPUP, SOUNDS, UPDATES, popup_sign_view } from "@game";

export class SIGNS extends ASObject {
    public static _mc: SIGNPOPUP = null;

    public static _view: MovieClip = null;

    public $ctor(): void {
        super.$ctor();
    }

    public static CreateForBuilding(param1: BFOUNDATION): void {
        let _loc2_: any = null;
        let _loc3_: int = 0;
        if (SIGNS._mc == null) {
            SOUNDS.Play("click1");
            SIGNS._mc = new SIGNPOPUP();
            GLOBAL._layerWindows.addChild(SIGNS._mc);
            SIGNS._mc._sign = param1;
            SIGNS._mc._senderid = LOGIN._playerID;
            SIGNS._mc._senderName = LOGIN._playerName;
            SIGNS._mc._senderPic = LOGIN._playerPic;
            SIGNS._mc._subject = "Sign";
            SIGNS._mc._mode = "create";
            SIGNS._mc.Setup();
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            _loc2_ = param1._buildingProps.costs[0];
            _loc3_ = _loc2_.r5 != undefined ? _loc2_.r5 | 0 : 0;
            UPDATES.CreateB(["BE", BASE._loadedBaseID, _loc2_.r1.Get(), _loc2_.r2.Get(), _loc2_.r3.Get(), _loc2_.r4.Get(), _loc3_], 0, -1);
        }
    }

    public static ShowMessage(param1: BFOUNDATION): void {
        SOUNDS.Play("click1");
        if (GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD) {
            MAILBOX.ShowWithThreadId(param1._threadid);
        } else {
            SIGNS.ViewForBuilding(param1);
        }
    }

    public static ViewForBuilding(param1: BFOUNDATION): void {
        let l: Loader = null;
        l = null;
        let onErr: Function = null;
        let onImageComplete: Function = null;
        let b: BFOUNDATION = param1;
        onErr = (param1: IOErrorEvent): void => {
        };
        onImageComplete = (param1: Event): void => {
            l.width = l.height = 50;
        };
        SIGNS._view = new popup_sign_view();
        GLOBAL._layerWindows.addChild(SIGNS._view);
        SIGNS._view.subject_txt.text = b._subject;
        SIGNS._view.name_txt.text = b._senderName;
        SIGNS._view.closeBtn.addEventListener(MouseEvent.MOUSE_DOWN, SIGNS.Hide);
        l = new Loader();
        SIGNS._view.placeholder.addChild(l);
        SIGNS._view.x = GLOBAL._SCREENCENTER.x;
        SIGNS._view.y = GLOBAL._SCREENCENTER.y;
        l.contentLoaderInfo.addEventListener(Event.COMPLETE, onImageComplete);
        l.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onErr);
        try {
            l.load(new URLRequest(b._senderPic));
        } catch (e) {
        }
    }

    public static EditForBuilding(param1: BFOUNDATION): void {
        if (SIGNS._mc == null) {
            SIGNS._mc = new SIGNPOPUP();
            GLOBAL._layerWindows.addChild(SIGNS._mc);
            SIGNS._mc._sign = param1;
            SIGNS._mc._senderid = LOGIN._playerID;
            SIGNS._mc._subject = param1._subject;
            SIGNS._mc._mode = "edit";
            SIGNS._mc.Setup();
        }
    }

    public static Hide(param1: MouseEvent = null): void {
        if (SIGNS._mc) {
            try {
                SOUNDS.Play("close");
                SIGNS._mc.parent.removeChild(SIGNS._mc);
            } catch (e) {
            }
            SIGNS._mc = null;
        }
        if (SIGNS._view) {
            try {
                SOUNDS.Play("close");
                SIGNS._view.parent.removeChild(SIGNS._view);
            } catch (e) {
            }
            SIGNS._view = null;
        }
    }
}

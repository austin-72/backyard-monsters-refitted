import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { BASE, GLOBAL, ImageCache, KEYS, POPUPSETTINGS, SOUNDS, popup_mr2tutorial } from "@game";

export class Tutorial extends ASObject {
    static {
        as3.fields(this, { _tutStep: 0, _currImageUrl: null, _bigPopup: null });
    }

    private static _instance: Tutorial = null;
    private _tutStep: int;
    private _currImageUrl: string;
    private _bigPopup: popup_mr2tutorial;

    public $ctor(): void {
        super.$ctor();
        this.Update();
    }

    public static ShowIfNeeded(): void {
        if (GLOBAL._mr2TutorialId < 2) {
            Tutorial.Hide();
            Tutorial._instance = new Tutorial();
        }
    }

    public static ForceShowAll(): void {
        GLOBAL._mr2TutorialId = 0;
        Tutorial.ShowIfNeeded();
    }

    public static Hide(): void {
        if (Tutorial._instance) {
            Tutorial._instance.HideBigDialog();
            Tutorial._instance = null;
        }
    }

    public Update(): void {
        while (this._tutStep <= 7) {
            if (GLOBAL._mr2TutorialId <= (this._tutStep == 1 || this._tutStep == 5) ? Boolean(1) : Boolean(0)) {
                break;
            }
            ++this._tutStep;
        }
        if (this._tutStep < 7) {
            this.ShowBigDialog(KEYS.Get("newmap_g" + (this._tutStep + 1)), "ui/mr2_tutorial_" + (this._tutStep + 1) + ".png");
        } else if (this._tutStep == 7) {
            this.ShowSmallDialog(KEYS.Get("newmap_g" + (this._tutStep + 1)));
        } else {
            this.FinishTutorial();
        }
    }

    private AdvanceTutorial(param1: Event = null): void {
        ++this._tutStep;
        this.Update();
    }

    private FinishTutorial(param1: Event = null): void {
        Tutorial.Hide();
        GLOBAL._mr2TutorialId = 2;
        BASE.Save();
    }

    private ShowBigDialog(param1: string, param2: string): void {
        this.HideBigDialog();
        GLOBAL.BlockerAdd();
        SOUNDS.Play("click1");
        this._bigPopup = new popup_mr2tutorial();
        this._bigPopup.tBody.htmlText = param1;
        this._bigPopup.bAction.SetupKey("btn_continue");
        this._bigPopup.bAction.addEventListener(MouseEvent.CLICK, as3.bind(this, this.AdvanceTutorial), false, 0, true);
        this._bigPopup.bAction.Highlight = true;
        this._bigPopup.mcFrame.Setup(true, as3.bind(this, this.FinishTutorial));
        this._currImageUrl = param2;
        ImageCache.GetImageWithCallBack(this._currImageUrl, as3.bind(this, this.ImageLoaded));
        GLOBAL._layerTop.addChild(this._bigPopup);
        POPUPSETTINGS.AlignToCenter(this._bigPopup);
        POPUPSETTINGS.ScaleUp(this._bigPopup);
    }

    private ImageLoaded(param1: string, param2: BitmapData): void {
        // (The picture can arrive after the window was closed: bug report #32.)
        if (this._currImageUrl == param1 && this._bigPopup) {
            this._bigPopup.mcImageContainer.addChild(new Bitmap(param2));
        }
    }

    private ShowSmallDialog(param1: string): void {
        this.HideBigDialog();
        this._currImageUrl = "";
        GLOBAL.Message(param1, KEYS.Get("btn_continue"), as3.bind(this, this.AdvanceTutorial));
    }

    private HideBigDialog(): void {
        if (this._bigPopup) {
            GLOBAL.BlockerRemove();
            // Inferno-only: the dialog may already be gone (closed with the map, or by the popup queue);
            // removing it again threw (bug report #62)
            if (!GLOBAL.INFERNO_ONLY || this._bigPopup.parent == GLOBAL._layerTop) {
                GLOBAL._layerTop.removeChild(this._bigPopup);
            }
            this._bigPopup = null;
        }
    }
}

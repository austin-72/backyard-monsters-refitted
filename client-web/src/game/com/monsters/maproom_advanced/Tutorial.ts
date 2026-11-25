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
        if (GLOBAL.INFERNO_ONLY && GLOBAL._mr2TutorialId < 2) {
            // (24 October: a player's first visit showed the stock game's 2012 introduction: overworld pictures, and
            // "the Flinger in your Main Yard now has increased range!" to someone who had just started. The Inferno's
            // own guide to the map (the "?" button's, QoL #647) instead, once, as that introduction was.)
            GLOBAL._mr2TutorialId = 2;
            BASE.Save();
            Tutorial.Hide();
            Tutorial.ioHelpPage(1);
            return;
        }
        if (GLOBAL._mr2TutorialId < 2) {
            Tutorial.Hide();
            Tutorial._instance = new Tutorial();
        }
    }

    public static ForceShowAll(): void {
        // (Inferno-only, QoL #647: the map room's "?" (MapRoomPopup.Help) is a guide to the map as it is today, page by
        // page, instead of the stock game's 2012 introduction; since 24 October a first visit shows it too: ShowIfNeeded)
        if (GLOBAL.INFERNO_ONLY) {
            Tutorial.Hide();
            Tutorial.ioHelpPage(1);
            return;
        }
        GLOBAL._mr2TutorialId = 0;
        Tutorial.ShowIfNeeded();
    }

    /** QoL #647: the help's pages (io_acc_maphelp_t1 / io_acc_maphelp_1 ...). */
    private static readonly IO_HELP_PAGES: int = 7;

    /**
     * QoL #647: page `n` of the map room's help: zoom and moving around, finding places, filters and Targets, attacking
     * and taking over, outposts, the Depths and their portals, moving the main yard. Next and Previous go through them;
     * Close (or the x) ends it.
     */
    private static ioHelpPage(n: int): void {
        let pages: int = Tutorial.IO_HELP_PAGES;
        n = Math.max(1, Math.min(pages, n)) | 0;
        let last: boolean = n >= pages;
        let text: string = "<b>" + KEYS.Get("io_acc_maphelp_t" + n) + "</b> <font color=\"#8A6A48\">" + KEYS.Get("io_acc_maphelp_of", { "v1": n, "v2": pages }) + "</font><br><br>" + KEYS.Get("io_acc_maphelp_" + n);
        SOUNDS.Play("click1");
        let m: any = GLOBAL.Message(text, KEYS.Get(last ? "btn_close" : "btn_next"), last ? null : (): void => {
            Tutorial.ioHelpPage((n + 1) | 0);
        }, null, n > 1 ? KEYS.Get("btn_previous") : null, n > 1 ? (): void => {
            Tutorial.ioHelpPage((n - 1) | 0);
        } : null);
        if (m) {
            m.name = "ioMapHelp" + n;
        }
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

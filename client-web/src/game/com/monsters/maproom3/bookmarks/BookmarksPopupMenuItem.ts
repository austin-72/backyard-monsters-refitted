import * as as3 from "as3";
import { Event, MouseEvent } from "flash/events";
import { Bookmark, BookmarksManager, KEYS, MapRoom3, MapRoom3BookmarksPopupItemDisplay } from "@game";

export class BookmarksPopupMenuItem extends MapRoom3BookmarksPopupItemDisplay {
    static {
        as3.fields(this, { m_BookmarkToDisplay: null });
    }

    private m_BookmarkToDisplay: Bookmark;

    public $ctor(param1?: Bookmark): void {
        super.$ctor();
        this.m_BookmarkToDisplay = param1;
        this.buttonMode = true;
        this.nameText.htmlText = param1.displayName;
        this.nameText.mouseEnabled = false;
        this.coordinatesText.htmlText = "(" + param1.cellX.toString() + "," + param1.cellY.toString() + ")";
        this.coordinatesText.mouseEnabled = false;
        this.background.gotoAndStop("default");
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnMouseClicked), false, 0, true);
        this.addEventListener(MouseEvent.MOUSE_OVER, as3.bind(this, this.OnMouseOver), false, 0, true);
        this.addEventListener(MouseEvent.MOUSE_OUT, as3.bind(this, this.OnMouseOut), false, 0, true);
        this.removeButton.SetupKey("mr3_bookmarks_popup_remove_button_label");
        this.removeButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnRemoveBookmarkClicked), false, 0, true);
        this.removeButton.buttonMode = true;
        if (param1.mapCell.isDataLoaded == false) {
            this.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.WaitForDataToLoad), false, 0, true);
            this.nameText.htmlText = KEYS.Get("msg_loading");
        }
    }

    private WaitForDataToLoad(param1: Event): void {
        if (this.m_BookmarkToDisplay == null) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.WaitForDataToLoad));
            return;
        }
        if (this.m_BookmarkToDisplay.mapCell.isDataLoaded == true) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.WaitForDataToLoad));
            this.nameText.htmlText = this.m_BookmarkToDisplay.displayName;
            return;
        }
    }

    public Clear(): void {
        if (this.hasEventListener(Event.ENTER_FRAME)) {
            this.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.WaitForDataToLoad));
        }
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnMouseClicked));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnMouseOver));
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnMouseOut));
        this.removeButton.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnRemoveBookmarkClicked));
        this.m_BookmarkToDisplay = null;
    }

    private OnMouseClicked(param1: MouseEvent): void {
        if (this.m_BookmarkToDisplay != null) {
            MapRoom3.mapRoom3Window.NavigateToCell(this.m_BookmarkToDisplay.mapCell);
        }
        if (MapRoom3.mapRoom3WindowHUD.bookmarksPopup.visible == true) {
            MapRoom3.mapRoom3WindowHUD.bookmarksPopup.Hide();
        }
    }

    private OnMouseOver(param1: MouseEvent): void {
        this.background.gotoAndStop("mouseover");
    }

    private OnMouseOut(param1: MouseEvent): void {
        this.background.gotoAndStop("default");
    }

    private OnRemoveBookmarkClicked(param1: MouseEvent): void {
        if (this.m_BookmarkToDisplay != null) {
            BookmarksManager.instance.RemoveBookmark(this.m_BookmarkToDisplay.mapCell);
        }
        if (MapRoom3.mapRoom3WindowHUD.bookmarksPopup.visible == true) {
            MapRoom3.mapRoom3WindowHUD.bookmarksPopup.Refresh();
        }
    }
}

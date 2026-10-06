import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Bookmark, BookmarksDisplayList, BookmarksPopupMenuItem, KEYS, MapRoom3BookmarksPopup, POPUPS } from "@game";

export class BookmarksPopup extends MapRoom3BookmarksPopup {
    static {
        as3.fields(this, { m_BookmarkDisplayList: null });
    }

    private static readonly MAX_BOOKMARKS_DISPLAY_LIST_LENGTH: uint = 10;
    private m_BookmarkDisplayList: BookmarksDisplayList;

    public $ctor(): void {
        super.$ctor();
        this.titleText.text = KEYS.Get("mr3_bookmarks_popup_title");
        this.contentsFrame.mouseEnabled = false;
        this.contentsMask.mouseEnabled = false;
    }

    public Show(param1: Vector<Bookmark>): void {
        this.Hide();
        this.m_BookmarkDisplayList = new BookmarksDisplayList(param1, as3.bind(this, this.CreateNewBookmarksPopupMenuItem), BookmarksPopup.MAX_BOOKMARKS_DISPLAY_LIST_LENGTH);
        this.contentsContainer.addChild(this.m_BookmarkDisplayList);
        POPUPS.Push(this);
    }

    private CreateNewBookmarksPopupMenuItem(param1: Bookmark, param2: int): BookmarksPopupMenuItem {
        return new BookmarksPopupMenuItem(param1);
    }

    public Hide(): void {
        POPUPS.Next();
        if (this.m_BookmarkDisplayList != null) {
            this.contentsContainer.removeChild(this.m_BookmarkDisplayList);
            this.m_BookmarkDisplayList = null;
        }
    }

    public Refresh(): void {
        if (this.m_BookmarkDisplayList != null) {
            this.m_BookmarkDisplayList.Refresh();
        }
    }
}

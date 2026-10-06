import * as as3 from "as3";
import { Bitmap, BitmapData } from "flash/display";
import { MouseEvent } from "flash/events";
import { Bookmark, KEYS, MapRoom3, MapRoom3AssetCache, MapRoom3BookmarkDisplay } from "@game";

export class BookmarkDisplay extends MapRoom3BookmarkDisplay {
    static {
        as3.fields(this, { m_BookmarkToDisplay: null, m_ThumbnailIcon: null, m_DamageBarIcon: null });
    }

    private m_BookmarkToDisplay: Bookmark;
    private m_ThumbnailIcon: Bitmap;
    private m_DamageBarIcon: Bitmap;

    public $ctor(param1?: Bookmark, param2?: string, param3?: BitmapData): void {
        super.$ctor();
        this.m_BookmarkToDisplay = param1;
        this.background.gotoAndStop(param2);
        this.buttonMode = true;
        this.m_ThumbnailIcon = new Bitmap(param3);
        this.imageHolder.addChild(this.m_ThumbnailIcon);
        let _loc4_: BitmapData = MapRoom3AssetCache.instance.GetDamageBarSegmentAsset(param1.mapCell.damagePercentage);
        this.m_DamageBarIcon = new Bitmap(_loc4_);
        this.m_DamageBarIcon.y = this.m_ThumbnailIcon.height - _loc4_.height;
        this.imageHolder.addChild(this.m_DamageBarIcon);
        this.nameText.htmlText = "<b>" + this.m_BookmarkToDisplay.displayName + "</b>";
        this.descriptionText.htmlText = KEYS.Get("mr3_bookmark_coordinates_info", { "v1": param1.cellX, "v2": param1.cellY });
        this.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnSelected), false, 0, true);
    }

    public Clear(): void {
        this.removeEventListener(MouseEvent.CLICK, as3.bind(this, this.OnSelected));
        if (this.m_ThumbnailIcon != null) {
            this.imageHolder.removeChild(this.m_ThumbnailIcon);
            this.m_ThumbnailIcon.bitmapData = null;
            this.m_ThumbnailIcon = null;
        }
        if (this.m_DamageBarIcon != null) {
            this.imageHolder.removeChild(this.m_DamageBarIcon);
            this.m_DamageBarIcon.bitmapData = null;
            this.m_DamageBarIcon = null;
        }
        this.m_BookmarkToDisplay = null;
    }

    private OnSelected(param1: MouseEvent): void {
        if (this.m_BookmarkToDisplay != null) {
            MapRoom3.mapRoom3Window.NavigateToCell(this.m_BookmarkToDisplay.mapCell);
        }
    }
}

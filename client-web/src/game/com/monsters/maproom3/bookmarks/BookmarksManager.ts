import * as as3 from "as3";
import { ASObject, Vector, int, uint } from "as3";
import { IOErrorEvent } from "flash/events";
import { Bookmark, EnumYardType, GLOBAL, KEYS, LOGGER, MapRoom3Cell, MapRoom3Data, MapRoomManager, SingletonLock, URLLoaderApi } from "@game";

export class BookmarksManager extends ASObject {
    static {
        as3.fields(this, { m_CustomBookmarks: null, m_EnemyBookmarks: null, m_FriendBookmarks: null, m_PlayerResourceBookmarks: null, m_PlayerStrongholdBookmarks: null });
    }

    private static s_Instance: BookmarksManager = null;

    private static readonly BOOKMARKS_VERSION_SAVE_DATA_VALUE: string = "mr3";

    private static readonly BOOKMARKS_VERSION_SAVE_DATA_FIELD: string = "v";

    private static readonly BOOKMARKS_CUSTOM_SAVE_DATA_FIELD: string = "c";

    private static readonly BOOKMARKS_ENEMIES_SAVE_DATA_FIELD: string = "e";

    private static readonly BOOKMARKS_FRIENDS_SAVE_DATA_FIELD: string = "f";

    private static readonly MAX_AUTO_BOOKMARKS: int = 16000;

    private static readonly MAX_CUSTOM_BOOKMARKS: int = 50;

    public static readonly TYPE_CUSTOM: int = 0;

    public static readonly TYPE_ENEMIES: int = 1;

    public static readonly TYPE_FRIENDS: int = 2;

    public static readonly TYPE_PLAYER_RESOURCES: int = 3;

    public static readonly TYPE_PLAYER_STRONGHOLDS: int = 4;
    private m_CustomBookmarks: Vector<Bookmark>;
    private m_EnemyBookmarks: Vector<Bookmark>;
    private m_FriendBookmarks: Vector<Bookmark>;
    private m_PlayerResourceBookmarks: Vector<Bookmark>;
    private m_PlayerStrongholdBookmarks: Vector<Bookmark>;

    public $ctor(param1?: SingletonLock): void {
        this.m_CustomBookmarks = new Vector<Bookmark>(0, false, Bookmark);
        this.m_EnemyBookmarks = new Vector<Bookmark>(0, false, Bookmark);
        this.m_FriendBookmarks = new Vector<Bookmark>(0, false, Bookmark);
        this.m_PlayerResourceBookmarks = new Vector<Bookmark>(0, false, Bookmark);
        this.m_PlayerStrongholdBookmarks = new Vector<Bookmark>(0, false, Bookmark);
        super.$ctor();
    }

    public static get instance(): BookmarksManager {
        return BookmarksManager.s_Instance = BookmarksManager.s_Instance || new BookmarksManager(new SingletonLock());
    }

    public Setup(param1: any, param2: MapRoom3Data): void {
        let _loc3_: MapRoom3Cell = null;
        let _loc4_: uint = param2.playerOwnedCells.length >>> 0;
        let _loc5_: uint = 0;
        while (_loc5_ < _loc4_) {
            _loc3_ = as3.as(as3.vget(param2.playerOwnedCells, _loc5_), MapRoom3Cell);
            switch (_loc3_.cellType) {
                case EnumYardType.RESOURCE:
                    this.AddBookmark(_loc3_, BookmarksManager.TYPE_PLAYER_RESOURCES, false);
                    break;
                case EnumYardType.STRONGHOLD:
                    this.AddBookmark(_loc3_, BookmarksManager.TYPE_PLAYER_STRONGHOLDS, false);
                    break;
            }
            _loc5_++;
        }
        if (param1.hasOwnProperty(BookmarksManager.BOOKMARKS_VERSION_SAVE_DATA_FIELD) == false || param1[BookmarksManager.BOOKMARKS_VERSION_SAVE_DATA_FIELD] != BookmarksManager.BOOKMARKS_VERSION_SAVE_DATA_VALUE) {
            return;
        }
        if (param1.hasOwnProperty(BookmarksManager.BOOKMARKS_CUSTOM_SAVE_DATA_FIELD) == true) {
            this.LoadBookmarksOfType(as3.cast(param1[BookmarksManager.BOOKMARKS_CUSTOM_SAVE_DATA_FIELD], Array), param2, BookmarksManager.TYPE_CUSTOM);
        }
        if (param1.hasOwnProperty(BookmarksManager.BOOKMARKS_ENEMIES_SAVE_DATA_FIELD) == true) {
            this.LoadBookmarksOfType(as3.cast(param1[BookmarksManager.BOOKMARKS_ENEMIES_SAVE_DATA_FIELD], Array), param2, BookmarksManager.TYPE_ENEMIES);
        }
        if (param1.hasOwnProperty(BookmarksManager.BOOKMARKS_FRIENDS_SAVE_DATA_FIELD) == true) {
            this.LoadBookmarksOfType(as3.cast(param1[BookmarksManager.BOOKMARKS_FRIENDS_SAVE_DATA_FIELD], Array), param2, BookmarksManager.TYPE_FRIENDS);
        }
    }

    public SaveBookmarks(): void {
        let _loc1_: any = null;
        _loc1_ = {};
        _loc1_[BookmarksManager.BOOKMARKS_VERSION_SAVE_DATA_FIELD] = BookmarksManager.BOOKMARKS_VERSION_SAVE_DATA_VALUE;
        _loc1_[BookmarksManager.BOOKMARKS_CUSTOM_SAVE_DATA_FIELD] = this.SaveBookmarksOfType(BookmarksManager.TYPE_CUSTOM);
        _loc1_[BookmarksManager.BOOKMARKS_ENEMIES_SAVE_DATA_FIELD] = this.SaveBookmarksOfType(BookmarksManager.TYPE_ENEMIES);
        _loc1_[BookmarksManager.BOOKMARKS_FRIENDS_SAVE_DATA_FIELD] = this.SaveBookmarksOfType(BookmarksManager.TYPE_FRIENDS);
        MapRoomManager.instance.bookmarkData = _loc1_;
        let _loc2_: any = GLOBAL._apiURL + "player/savebookmarks";
        let _loc3_: any[] = [["bookmarks", JSON.stringify(_loc1_)]];
        new URLLoaderApi().load(as3.str(_loc2_), _loc3_, as3.bind(this, this.OnBookmarksSaved), as3.bind(this, this.OnBookmarksSavedError));
    }

    private OnBookmarksSaved(param1: any): void {
        if (param1.error != 0) {
            LOGGER.Log("err", "BookmarksManager.SaveBookmarks", Boolean(param1.error));
        }
    }

    private OnBookmarksSavedError(param1: IOErrorEvent): void {
        LOGGER.Log("err", "BookmarksManager.SaveBookmarks HTTP");
    }

    private SaveBookmarksOfType(param1: int): any[] {
        let _loc3_: Bookmark = null;
        let _loc4_: any = null;
        let _loc2_: Vector<Bookmark> = this.GetBookmarksOfType(param1);
        if (_loc2_ == null) {
            return [];
        }
        let _loc5_: any[] = [];
        let _loc6_: uint = _loc2_.length >>> 0;
        let _loc7_: uint = 0;
        while (_loc7_ < _loc6_) {
            _loc3_ = as3.vget(_loc2_, _loc7_);
            if (!(_loc3_ == null || _loc3_.mapCell == null)) {
                _loc4_ = { "x": _loc3_.mapCell.cellX, "y": _loc3_.mapCell.cellY, "n": _loc3_.userDefinedName };
                _loc5_.push(_loc4_);
            }
            _loc7_++;
        }
        return _loc5_;
    }

    private LoadBookmarksOfType(param1: any[], param2: MapRoom3Data, param3: int): void {
        let _loc5_: int = 0;
        let _loc6_: int = 0;
        let _loc7_: string = null;
        let _loc8_: Bookmark = null;
        let _loc9_: any = null;
        let _loc10_: MapRoom3Cell = null;
        let _loc4_: Vector<Bookmark> = null;
        if ((_loc4_ = this.GetBookmarksOfType(param3)) == null) {
            return;
        }
        let _loc11_: uint = param1.length;
        let _loc12_: uint = 0;
        while (_loc12_ < _loc11_) {
            if ((_loc9_ = param1[_loc12_]) != null) {
                _loc5_ = _loc9_.x | 0;
                _loc6_ = _loc9_.y | 0;
                if ((_loc10_ = param2.GetMapRoom3Cell(_loc5_, _loc6_)) != null) {
                    _loc7_ = String(_loc9_.n);
                    _loc8_ = new Bookmark(_loc10_, _loc7_);
                    _loc4_.push(_loc8_);
                }
            }
            _loc12_++;
        }
    }

    public Cleanup(): void {
        this.ClearBookmarks(BookmarksManager.TYPE_CUSTOM);
        this.ClearBookmarks(BookmarksManager.TYPE_ENEMIES);
        this.ClearBookmarks(BookmarksManager.TYPE_FRIENDS);
        this.ClearBookmarks(BookmarksManager.TYPE_PLAYER_RESOURCES);
        this.ClearBookmarks(BookmarksManager.TYPE_PLAYER_STRONGHOLDS);
    }

    public AddBookmark(param1: MapRoom3Cell, param2: int = 0, param3: boolean = true): void {
        let _loc4_: Vector<Bookmark> = null;
        if ((_loc4_ = this.GetBookmarksOfType(param2)) == null) {
            return;
        }
        if (this.IsBookmarked(param1, param2) == true) {
            return;
        }
        let _loc5_: int = param2 == BookmarksManager.TYPE_CUSTOM ? BookmarksManager.MAX_CUSTOM_BOOKMARKS : BookmarksManager.MAX_AUTO_BOOKMARKS;
        if (_loc4_.length >= _loc5_) {
            GLOBAL.Message(KEYS.Get("mr3_bookmarks_full_message", { "v1": _loc5_ }));
            return;
        }
        let _loc6_: Bookmark = new Bookmark(param1);
        _loc4_.unshift(_loc6_);
        if (param3) {
            this.SaveBookmarks();
        }
        if (param1.cellGraphic != null) {
            param1.cellGraphic.redrawTile();
        }
    }

    public RemoveBookmark(param1: MapRoom3Cell, param2: int = 0, param3: boolean = true): void {
        let _loc4_: Vector<Bookmark> = null;
        if ((_loc4_ = this.GetBookmarksOfType(param2)) == null) {
            return;
        }
        let _loc5_: Bookmark = null;
        if ((_loc5_ = this.FindBookmark(param1, param2)) == null) {
            return;
        }
        let _loc6_: int = 0;
        if ((_loc6_ = _loc4_.indexOf(_loc5_) | 0) < 0) {
            return;
        }
        _loc4_.splice(_loc6_, 1);
        if (param3) {
            this.SaveBookmarks();
        }
        if (param1.cellGraphic != null) {
            param1.cellGraphic.redrawTile();
        }
    }

    public ClearBookmarks(param1: int = 0, param2: boolean = false): void {
        let _loc3_: Vector<Bookmark> = this.GetBookmarksOfType(param1);
        if (_loc3_ == null) {
            return;
        }
        let _loc4_: uint = _loc3_.length >>> 0;
        let _loc5_: uint = 0;
        while (_loc5_ < _loc4_) {
            as3.vget(_loc3_, _loc5_).Clear();
            _loc5_++;
        }
        as3.vsetLength(_loc3_, 0);
        if (param2 == true) {
            this.SaveBookmarks();
        }
    }

    public IsBookmarked(param1: MapRoom3Cell, param2: int = 0): boolean {
        return this.FindBookmark(param1, param2) != null;
    }

    private FindBookmark(param1: MapRoom3Cell, param2: int = 0): Bookmark {
        let _loc4_: Bookmark = null;
        let _loc3_: Vector<Bookmark> = this.GetBookmarksOfType(param2);
        if (_loc3_ == null) {
            return null;
        }
        let _loc5_: uint = _loc3_.length >>> 0;
        let _loc6_: uint = 0;
        while (_loc6_ < _loc5_) {
            if ((_loc4_ = as3.vget(_loc3_, _loc6_)) != null && _loc4_.mapCell == param1) {
                return _loc4_;
            }
            _loc6_++;
        }
        return null;
    }

    public GetBookmarksOfType(param1: int): Vector<Bookmark> {
        switch (param1) {
            case BookmarksManager.TYPE_CUSTOM:
                return this.m_CustomBookmarks;
            case BookmarksManager.TYPE_ENEMIES:
                return this.m_EnemyBookmarks;
            case BookmarksManager.TYPE_FRIENDS:
                return this.m_FriendBookmarks;
            case BookmarksManager.TYPE_PLAYER_RESOURCES:
                return this.m_PlayerResourceBookmarks;
            case BookmarksManager.TYPE_PLAYER_STRONGHOLDS:
                return this.m_PlayerStrongholdBookmarks;
            default:
                return null;
        }
    }
}

import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { MouseEvent } from "flash/events";
import { BASE, EnumYardType, GLOBAL, KEYS, LOGGER, MapRoom3FriendData, MapRoom3RelocateMainYardPopup, MapRoom3RelocatePopupDisplayList, MapRoomManager, PLEASEWAIT, POPUPS, SingletonLock, URLLoaderApi } from "@game";

export class MapRoom3RelocatePopup extends MapRoom3RelocateMainYardPopup {
    static {
        as3.fields(this, { m_LoadedFriendData: null, m_DisplayList: null, m_IsShowing: false });
    }

    private static s_Instance: MapRoom3RelocatePopup = null;

    public static readonly k_RELOCATE_BUTTONINFO: string = "btn_relocateYard";

    private static readonly k_MAX_FRIEND_ITEMS_TO_DISPLAY: int = 6;
    private m_LoadedFriendData: Vector<MapRoom3FriendData>;
    private m_DisplayList: MapRoom3RelocatePopupDisplayList;
    private m_IsShowing: boolean;

    public $ctor(param1?: SingletonLock): void {
        super.$ctor();
        this.titleText.htmlText = KEYS.Get("mr3_relocate_main_yard_title");
        this.selectDescriptionText.htmlText = KEYS.Get("mr3_relocate_main_yard_description_select");
        this.randomDescriptionText.htmlText = KEYS.Get("mr3_relocate_main_yard_description_random");
        this.orText.htmlText = KEYS.Get("mr3_relocate_main_yard_or");
        this.levelTitleText.htmlText = "<b>" + KEYS.Get("mr3_relocate_main_yard_title_level") + "</b>";
        this.nameTitletext.htmlText = "<b>" + KEYS.Get("mr3_relocate_main_yard_title_name") + "</b>";
        this.worldtTitleText.htmlText = "<b>" + KEYS.Get("mr3_relocate_main_yard_title_world") + "</b>";
        this.randomButton.SetupKey("btn_random");
        this.randomButton.addEventListener(MouseEvent.CLICK, as3.bind(this, this.OnRandomButtonClicked), false, 0, true);
        this.contentsFrame.mouseEnabled = false;
        this.contentsMask.mouseEnabled = false;
    }

    public static get instance(): MapRoom3RelocatePopup {
        return MapRoom3RelocatePopup.s_Instance = MapRoom3RelocatePopup.s_Instance || new MapRoom3RelocatePopup(new SingletonLock());
    }

    public Show(): void {
        if (this.m_IsShowing == true) {
            return;
        }
        POPUPS.Push(this);
        this.m_IsShowing = true;
        let _loc1_: any = MapRoomManager.instance.mapRoom3URL + "getfriendinfo";
        new URLLoaderApi().load(as3.str(_loc1_), null, as3.bind(this, this.OnFriendInfoLoaded));
    }

    private OnFriendInfoLoaded(param1: any): void {
        if (this.m_IsShowing == false) {
            return;
        }
        if (param1 == null || param1.hasOwnProperty("friends") == false || param1.friends.length == 0) {
            return;
        }
        let _loc2_: uint = param1.friends.length >>> 0;
        this.m_LoadedFriendData = new Vector<MapRoom3FriendData>(_loc2_, false, MapRoom3FriendData);
        let _loc3_: uint = 0;
        while (_loc3_ < _loc2_) {
            as3.vset(this.m_LoadedFriendData, _loc3_, new MapRoom3FriendData(param1.friends[_loc3_]));
            _loc3_++;
        }
        this.m_DisplayList = new MapRoom3RelocatePopupDisplayList(this.m_LoadedFriendData, MapRoom3RelocatePopup.k_MAX_FRIEND_ITEMS_TO_DISPLAY);
        this.contentsContainer.addChild(this.m_DisplayList);
    }

    public Hide(): void {
        if (this.m_IsShowing == false) {
            return;
        }
        POPUPS.Next();
        this.m_IsShowing = false;
        if (this.m_DisplayList != null) {
            this.contentsContainer.removeChild(this.m_DisplayList);
            this.m_DisplayList.Clear();
            this.m_DisplayList = null;
        }
        if (this.m_LoadedFriendData != null) {
            as3.vsetLength(this.m_LoadedFriendData, 0);
            this.m_LoadedFriendData = null;
        }
    }

    private OnRandomButtonClicked(param1: MouseEvent): void {
        this.Relocate();
    }

    public Relocate(param1: int = -1): void {
        if (GLOBAL._flags.nwm_relocate == "0") {
            GLOBAL.Message(KEYS.Get("mr3_relocate_confirmationOFF"), KEYS.Get("mr3_relocate_confirmation_OK"), as3.bind(this, this.ConfirmRelocation), [param1]);
        } else if (GLOBAL._flags.nwm_relocate == "1") {
            GLOBAL.Message(KEYS.Get("mr3_relocate_confirmation"), KEYS.Get("mr3_relocate_confirmationyes"), as3.bind(this, this.ConfirmRelocation), [param1]);
        }
    }

    private ConfirmRelocation(param1: int = -1): void {
        this.Hide();
        PLEASEWAIT.Show(KEYS.Get("wait_relocating"));
        let _loc2_: any = MapRoomManager.instance.mapRoom3URL + "relocate";
        let _loc3_: any[] = [];
        if (param1 != -1) {
            _loc3_.push(["userid", param1]);
        }
        new URLLoaderApi().load(as3.str(_loc2_), _loc3_, as3.bind(this, this.OnRelocationSuccessful), as3.bind(this, this.OnRelocationFailed));
    }

    private OnRelocationSuccessful(param1: any): void {
        PLEASEWAIT.Hide();
        if (param1.error != 0) {
            GLOBAL.ErrorMessage("Error relocating main base, MapRoom3RelocatePopup::OnRelocationSuccessful");
            LOGGER.Log("err", "Error relocating main base, MapRoom3RelocatePopup::OnRelocationSuccessful " + param1.error);
            return;
        }
        MapRoomManager.instance.OnMapRoom3RelocationSuccessful(as3.str(param1.mapheaderurl));
        BASE.LoadBase(null, 0, 0, GLOBAL.e_BASE_MODE.BUILD, false, EnumYardType.PLAYER);
    }

    private OnRelocationFailed(param1: any): void {
        PLEASEWAIT.Hide();
        GLOBAL.ErrorMessage("Error relocating main base, MapRoom3RelocatePopup::OnRelocationFailed");
        LOGGER.Log("err", "Error relocating main base, MapRoom3RelocatePopup::OnRelocationFailed " + param1.error);
    }
}

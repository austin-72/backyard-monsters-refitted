import { ASObject, int, uint } from "as3";

export class AllianceConstants extends ASObject {
    public static readonly CONTENT_W: int = 808;
    // Default beige inner-background height. Tabs may override via
    // AllianceTabBase.contentHeight (e.g. My Alliance needs a taller area).
    public static readonly CONTENT_H: int = 452;

    public static readonly INNER_BG: uint = 15718849;
    public static readonly BORDER_COLOR: uint = 10652788;

    // Original alliance palette, from alliance.v343.css
    public static readonly HEADER_BG: uint = 13279862;
    public static readonly ROW_ALT0: uint = 16248032;
    public static readonly ROW_ALT1: uint = 15718849;
    public static readonly ROW_ME: uint = 16445570;
    public static readonly TABLE_BORDER: uint = 9737363;
    public static readonly CELL_BORDER: uint = 5066061;

    public static readonly ACTION_BG: uint = 11501395;
    public static readonly SHOUTBOX_BG: uint = 14540253;

    public static readonly SHOUT_BAND0: uint = 13426622;
    public static readonly SHOUT_BAND1: uint = 15134687;
    public static readonly SHOUT_GOLD: uint = 16511901;

    public static readonly INVITE_TYPE_INVITE: string = "invite";
    public static readonly INVITE_TYPE_REQUEST: string = "request";
    public static readonly INVITE_PENDING: string = "pending";
    public static readonly INVITE_ACCEPTED: string = "accepted";
    public static readonly INVITE_DECLINED: string = "declined";

    public static readonly REL_HOSTILE: uint = 16729640;
    public static readonly REL_NEUTRAL: uint = 16776960;
    public static readonly REL_FRIENDLY: uint = 1301765;
    public static readonly REL_FRIEND: uint = 41179;

    public static readonly TAB_LABELS: any[] = ["alliance_tab_browse", "alliance_tab_myalliance", "alliance_tab_powerups", "alliance_tab_members", "alliance_tab_suggested", "alliance_tab_invites"];
    public static readonly TAB_WIDTHS: any[] = [142, 110, 98, 126, 100, 100];

    // ---- Inferno-only: the redesigned window (2 October). The tab ids carry on from TAB_LABELS (so
    // SelectTab(1) still means "the alliance's own page": Overview, or Create for a player with none).
    public static readonly IO_TAB_BROWSE: int = 0;
    public static readonly IO_TAB_OVERVIEW: int = 1;
    public static readonly IO_TAB_POWERUPS: int = 2;
    public static readonly IO_TAB_MEMBERS: int = 3;
    public static readonly IO_TAB_RECRUIT: int = 4;
    public static readonly IO_TAB_INVITES: int = 5;
    public static readonly IO_TAB_BOARD: int = 6;
    public static readonly IO_TAB_OUTPOSTS: int = 7;

    public static readonly IO_TAB_LABELS: any[] = ["io_alliance_tab_browse", "io_alliance_tab_overview", "alliance_tab_powerups", "alliance_tab_members", "io_alliance_tab_recruit", "alliance_tab_invites", "io_alliance_tab_board", "io_alliance_tab_outposts"];
    public static readonly IO_TAB_WIDTHS: any[] = [86, 92, 100, 128, 82, 96, 88, 94];

    /** A member's tabs, in order; a player without an alliance has IO_TABS_NONE. */
    public static readonly IO_TABS_MEMBER: any[] = [1, 6, 7, 3, 2, 4, 5, 0];
    public static readonly IO_TABS_NONE: any[] = [0, 5, 1];

    /** The strip above the tabs: the alliance's emblem, name and standing. */
    public static readonly IO_HEADER_H: int = 64;

    public static readonly IO_GAINED: uint = 3046687;
    public static readonly IO_LOST: uint = 11546654;
    public static readonly IO_INK: uint = 3811866;
    public static readonly IO_MUTED: uint = 8021328;
    public static readonly IO_CARD: uint = 16511976;
    public static readonly IO_CARD_EDGE: uint = 13217420;
}

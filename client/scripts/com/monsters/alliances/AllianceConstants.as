package com.monsters.alliances {
    public class AllianceConstants {
        public static const CONTENT_W:int = 808;
        // Default beige inner-background height. Tabs may override via
        // AllianceTabBase.contentHeight (e.g. My Alliance needs a taller area).
        public static const CONTENT_H:int = 452;

        public static const INNER_BG:uint = 0xEFD9C1;
        public static const BORDER_COLOR:uint = 0xA28C74;

        // Original alliance palette, from alliance.v343.css
        public static const HEADER_BG:uint = 0xCAA276;
        public static const ROW_ALT0:uint = 0xF7ECE0;
        public static const ROW_ALT1:uint = 0xEFD9C1;
        public static const ROW_ME:uint = 0xFAF082;
        public static const TABLE_BORDER:uint = 0x949493;
        public static const CELL_BORDER:uint = 0x4D4D4D;

        public static const ACTION_BG:uint = 0xAF7F53;
        public static const SHOUTBOX_BG:uint = 0xDDDDDD;

        public static const SHOUT_BAND0:uint = 0xCCDFBE;
        public static const SHOUT_BAND1:uint = 0xE6EFDF;
        public static const SHOUT_GOLD:uint = 0xFBF39D;

        public static const INVITE_TYPE_INVITE:String = "invite";
        public static const INVITE_TYPE_REQUEST:String = "request";
        public static const INVITE_PENDING:String = "pending";
        public static const INVITE_ACCEPTED:String = "accepted";
        public static const INVITE_DECLINED:String = "declined";

        public static const REL_HOSTILE:uint = 0xFF4628;
        public static const REL_NEUTRAL:uint = 0xFFFF00;
        public static const REL_FRIENDLY:uint = 0x13DD05;
        public static const REL_FRIEND:uint = 0x00A0DB;

        public static const TAB_LABELS:Array = [
                "alliance_tab_browse",
                "alliance_tab_myalliance",
                "alliance_tab_powerups",
                "alliance_tab_members",
                "alliance_tab_suggested",
                "alliance_tab_invites"
            ];
        public static const TAB_WIDTHS:Array = [142, 110, 98, 126, 100, 100];

        // ---- Inferno-only: the redesigned window (2 October). The tab ids carry on from TAB_LABELS (so
        // SelectTab(1) still means "the alliance's own page": Overview, or Create for a player with none).
        public static const IO_TAB_BROWSE:int = 0;
        public static const IO_TAB_OVERVIEW:int = 1;
        public static const IO_TAB_POWERUPS:int = 2;
        public static const IO_TAB_MEMBERS:int = 3;
        public static const IO_TAB_RECRUIT:int = 4;
        public static const IO_TAB_INVITES:int = 5;
        public static const IO_TAB_BOARD:int = 6;
        public static const IO_TAB_OUTPOSTS:int = 7;

        public static const IO_TAB_LABELS:Array = [
                "io_alliance_tab_browse",
                "io_alliance_tab_overview",
                "alliance_tab_powerups",
                "alliance_tab_members",
                "io_alliance_tab_recruit",
                "alliance_tab_invites",
                "io_alliance_tab_board",
                "io_alliance_tab_outposts"
            ];
        public static const IO_TAB_WIDTHS:Array = [86, 92, 100, 128, 82, 96, 88, 94];

        /** A member's tabs, in order; a player without an alliance has IO_TABS_NONE. */
        public static const IO_TABS_MEMBER:Array = [1, 6, 7, 3, 2, 4, 5, 0];
        public static const IO_TABS_NONE:Array = [0, 5, 1];

        /** The strip above the tabs: the alliance's emblem, name and standing. */
        public static const IO_HEADER_H:int = 64;

        public static const IO_GAINED:uint = 0x2E7D1F;
        public static const IO_LOST:uint = 0xB0301E;
        public static const IO_INK:uint = 0x3A2A1A;
        public static const IO_MUTED:uint = 0x7A6550;
        public static const IO_CARD:uint = 0xFBF3E8;
        public static const IO_CARD_EDGE:uint = 0xC9AE8C;
    }
}

import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Rectangle } from "flash/geom";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceTabBase, BrowseTab, ButtonBrown_CLIP, GLOBAL, InvitesTab, IoAllianceUi, IoBoardTab, IoMembersTab, IoOutpostsTab, IoOverviewTab, KEYS, MembersTab, MyAllianceTab, POPUPSETTINGS, PowerUpsTab, Quad, SOUNDS, SuggestedTab, TweenLite, frame_CLIP } from "@game";

export class ALLIANCEPOPUP extends MovieClip {
    static {
        as3.fields(this, { _tabs: null, _contentMC: null, _innerBg: null, _activeTab: 0, _io: false, _h: 0, _tabY: 0, _contentY: 0, _header: null, _ioFirstTab: 0, _ioFit: 1 });
    }

    private static readonly W: int = 860;
    private static readonly H: int = 580;
    private static readonly CONTENT_X: int = 26;
    private static readonly CONTENT_Y: int = 63;
    // TAB_LABELS indices of the two tabs whose labels carry a count.
    private static readonly MEMBERS_TAB: int = 3;
    private static readonly INVITES_TAB: int = 5;

    private static readonly TAB_Y: int = 26;
    private static readonly TAB_H: int = 38;
    private static readonly TAB_GAP: int = 5;

    private static readonly IO_HEADER_Y: int = 22;
    private _tabs: any[];
    private _contentMC: MovieClip;
    private _innerBg: MovieClip;
    private _activeTab: int;
    /**
     * Inferno-only: the redesigned window (the user's design of 2 October). A strip above the tabs shows
     * the alliance (emblem, name, rank, level, members online, outposts, empire value); the tabs are
     * Overview, Board, Outposts, Members, Power-Ups, Recruit (the leader and officers), Invites and Browse
     * for a member, and Browse, Invites and Create for a player without an alliance. The alliance's chat
     * is the chat dock's Alliance tab only.
     */
    private _io: boolean;
    private _h: int;
    private _tabY: int;
    private _contentY: int;
    private _header: Sprite;
    private _ioFirstTab: int;
    /** Inferno-only: the scale it is shown at, under 1 on a screen narrower than the window (bug report B15). */
    private _ioFit: number;

    public $ctor(): void {
        this._h = ALLIANCEPOPUP.H;
        this._tabY = ALLIANCEPOPUP.TAB_Y;
        this._contentY = ALLIANCEPOPUP.CONTENT_Y;
        super.$ctor();
        this._io = GLOBAL.INFERNO_ONLY;
        if (this._io) {
            this._tabY = (ALLIANCEPOPUP.IO_HEADER_Y + AllianceConstants.IO_HEADER_H + 8) | 0;
            this._contentY = (this._tabY + ALLIANCEPOPUP.TAB_H - 1) | 0;
            this._h = (this._contentY + AllianceConstants.CONTENT_H + 26) | 0;
        }
        this._buildFrame();
        if (this._io) {
            this._header = as3.as(this.addChild(new Sprite()), Sprite);
            this._header.x = ALLIANCEPOPUP.CONTENT_X;
            this._header.y = ALLIANCEPOPUP.IO_HEADER_Y;
            this._ioDrawHeader();
        }
        this._buildTabs();
        this._buildInnerBackground();
        this._contentMC = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._contentMC.x = ALLIANCEPOPUP.CONTENT_X;
        this._contentMC.y = this._contentY;
        if (this._io) {
            // Inferno: the first tab opens once the window is on the stage. A tab's data can come back at
            // once from the store (the window opened a second time), before ALLIANCEWINDOW has added the
            // window, and a tab draws nothing off the stage: the first tab stayed empty.
            this._ioFirstTab = this._ioInAlliance() ? AllianceConstants.IO_TAB_OVERVIEW : 0;
            this._activeTab = this._ioFirstTab;
            this.addEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this._ioOnStage));
            return;
        }
        this._switchTab(0);
    }

    private _ioOnStage(e: Event): void {
        this.removeEventListener(Event.ADDED_TO_STAGE, as3.bind(this, this._ioOnStage));
        this._switchTab(this._ioFirstTab);
    }

    /** Inferno: in an alliance (as far as the game knows yet). */
    private _ioInAlliance(): boolean {
        return ALLIANCES._myAlliance != null || ALLIANCES._allianceID > 0 || ALLIANCES.ioData() != null;
    }

    private _tabWidth(idx: int): int {
        return (this._io ? AllianceConstants.IO_TAB_WIDTHS : AllianceConstants.TAB_WIDTHS)[idx] | 0;
    }

    /**
     * Inferno: the strip above the tabs. Drawn again whenever the alliance has loaded (RefreshTabLabels).
     */
    private _ioDrawHeader(): void {
        while (this._header.numChildren > 0) {
            this._header.removeChildAt(0);
        }
        const w: int = AllianceConstants.CONTENT_W;
        const h: int = AllianceConstants.IO_HEADER_H;
        this._header.graphics.clear();
        IoAllianceUi.card(this._header.graphics, 0, 0, w, h, AllianceConstants.INNER_BG, AllianceConstants.BORDER_COLOR);
        let data: any = ALLIANCES.ioData();
        if (data == null) {
            let title: string = this._ioInAlliance() ? KEYS.Get("msg_loading") : KEYS.Get("io_alliance_header_none");
            IoAllianceUi.addText(this._header, title, 16, 8, 18, AllianceConstants.IO_INK, true, (w - 32) | 0);
            if (!this._ioInAlliance()) {
                IoAllianceUi.addText(this._header, KEYS.Get("io_alliance_header_none_desc"), 16, 36, 12, AllianceConstants.IO_MUTED, false, (w - 32) | 0);
            }
            return;
        }
        let shield: Sprite = new Sprite();
        shield.x = 8;
        shield.y = 6;
        this._header.addChild(shield);
        IoAllianceUi.emblem(shield, data.image | 0, 52);
        IoAllianceUi.addText(this._header, String(data.name), 70, 6, 18, AllianceConstants.IO_INK, true, 330);
        let role: string = ALLIANCES.ioRole();
        let line: string = KEYS.Get("io_alliance_header_line", { "v1": String(data.rank || "-"), "v2": String(data.avg_level), "v3": String(data.leader_name) });
        if (role) {
            line += "   " + KEYS.Get("io_alliance_header_role", { "v1": KEYS.Get("io_alliance_role_" + role) });
        }
        IoAllianceUi.addText(this._header, line, 71, 36, 11, AllianceConstants.IO_MUTED, false, 330);
        let stats: any[] = [[KEYS.Get("io_alliance_stat_online"), (data.online_members | 0) + " / " + (data.number_of_members | 0)], [KEYS.Get("io_alliance_stat_outposts"), IoAllianceUi.num(Number(data.outposts))], [KEYS.Get("io_alliance_stat_empire"), IoAllianceUi.num(Number(data.empire))]];
        const boxW: int = 124;
        const gap: int = 8;
        let x: int = (w - 10 - stats.length * boxW - (stats.length - 1) * gap) | 0;
        for (let st of as3.values(stats)) {
            let box: Sprite = new Sprite();
            box.x = x;
            box.y = 9;
            IoAllianceUi.card(box.graphics, 0, 0, boxW, h - 18, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            IoAllianceUi.addText(box, String(st[0]), 0, 3, 10, AllianceConstants.IO_MUTED, false, boxW, IoAllianceUi.CENTER);
            IoAllianceUi.addText(box, String(st[1]), 0, 20, 14, AllianceConstants.IO_INK, true, boxW, IoAllianceUi.CENTER);
            this._header.addChild(box);
            x = (x + (boxW + gap)) | 0;
        }
    }

    private _buildFrame(): void {
        let mcFrame: frame_CLIP = as3.as(this.addChild(new frame_CLIP()), frame_CLIP);
        mcFrame.graphics.beginFill(0, 0);
        mcFrame.graphics.drawRect(0, 0, ALLIANCEPOPUP.W, this._h);
        mcFrame.graphics.endFill();
        mcFrame.Setup();
    }

    private _buildInnerBackground(): void {
        this._innerBg = as3.as(this.addChild(new MovieClip()), MovieClip);
        this._innerBg.mouseEnabled = false;
        this._innerBg.x = ALLIANCEPOPUP.CONTENT_X;
        this._innerBg.y = this._contentY;
    }

    /**
     * Redraws the beige inner background at the given height. Called per tab
     * switch so each tab can size its own content area. The panel's top border
     * is split around the active tab so the active tab visually merges into the
     * content area (no line drawn beneath it), while inactive tabs keep the line.
     * @param {int} contentHeight - The active tab's desired background height.
     */
    private _drawInnerBackground(contentHeight: int): void {
        const w: int = AllianceConstants.CONTENT_W;

        this._innerBg.graphics.clear();

        this._innerBg.graphics.lineStyle();
        this._innerBg.graphics.beginFill(AllianceConstants.INNER_BG, 1);
        this._innerBg.graphics.drawRect(0, 0, w, contentHeight);
        this._innerBg.graphics.endFill();

        let gapStart: int = -1;
        let gapEnd: int = -1;
        let active: any = this._activeTabDescriptor();
        if (active != null) {
            gapStart = ((active.btn.x | 0) - ALLIANCEPOPUP.CONTENT_X) | 0;
            gapEnd = (gapStart + this._tabWidth(active.index | 0)) | 0;
        }

        this._innerBg.graphics.lineStyle(1, AllianceConstants.BORDER_COLOR, 1);
        this._innerBg.graphics.moveTo(0, 0);
        this._innerBg.graphics.lineTo(0, contentHeight);
        this._innerBg.graphics.lineTo(w, contentHeight);
        this._innerBg.graphics.lineTo(w, 0);
        if (gapStart < 0) {
            this._innerBg.graphics.moveTo(0, 0);
            this._innerBg.graphics.lineTo(w, 0);
        } else {
            this._innerBg.graphics.moveTo(0, 0);
            this._innerBg.graphics.lineTo(gapStart, 0);
            this._innerBg.graphics.moveTo(gapEnd, 0);
            this._innerBg.graphics.lineTo(w, 0);
        }
    }

    /**
     * Tears down the current tab buttons and rebuilds them from the live
     * alliance state. The button row is otherwise built once at construction
     * from a snapshot of membership/leader state, so a membership change
     * (create / leave / promote) leaves newly un/locked tabs missing until the
     * popup is reopened. Called by SelectTab, which fires on exactly those
     * transitions.
     */
    private _rebuildTabs(): void {
        if (this._tabs != null) {
            let i: int = 0;
            while (i < this._tabs.length) {
                let btn: MovieClip = as3.as(this._tabs[i].btn, MovieClip);
                if (btn != null && this.contains(btn)) {
                    this.removeChild(btn);
                }
                i++;
            }
        }
        if (this._header != null) {
            this._ioDrawHeader();
        }
        this._buildTabs();
        if (this._innerBg != null) {
            this.addChild(this._innerBg);
        }
        if (this._contentMC != null) {
            this.addChild(this._contentMC);
        }
    }

    private _buildTabs(): void {
        let tabLabel: string = null;
        let currentX: int = ALLIANCEPOPUP.CONTENT_X;
        this._tabs = [];
        let visible: any[] = this._visibleTabIndices();
        let n: int = 0;
        while (n < visible.length) {
            let i: int = visible[n] | 0;
            let btn: ButtonBrown_CLIP = as3.as(this.addChild(new ButtonBrown_CLIP()), ButtonBrown_CLIP);
            if (this._io) {
                tabLabel = this._ioTabLabel(i);
            } else if (i == ALLIANCEPOPUP.MEMBERS_TAB) {
                tabLabel = KEYS.Get(String(AllianceConstants.TAB_LABELS[i]), { "v1": String(ALLIANCES.OnlineCount()), "v2": String(ALLIANCES.MemberCount()) });
            } else if (i == ALLIANCEPOPUP.INVITES_TAB) {
                tabLabel = KEYS.Get(String(AllianceConstants.TAB_LABELS[i]), { "v1": String(ALLIANCES.PendingInviteCount()) });
            } else {
                tabLabel = KEYS.Get(String(AllianceConstants.TAB_LABELS[i]));
            }
            btn.Setup(tabLabel, false, this._tabWidth(i), ALLIANCEPOPUP.TAB_H, "#ECBF88");
            btn.focusRect = false;
            btn.x = currentX;
            btn.y = this._tabY;
            btn.addEventListener(MouseEvent.CLICK, this._onTabClick(i));
            // Store the button alongside its original TAB_LABELS index so layout
            // position stays decoupled from the index used by _createTab and the
            // inner-background gap.
            this._tabs.push({ btn: btn, index: i });
            currentX = (currentX + (this._tabWidth(i) + ALLIANCEPOPUP.TAB_GAP)) | 0;
            n++;
        }
    }

    /**
     * Indices into TAB_LABELS for the tabs that should be shown, in order.
     * Mirrors the original visibility rules (alliances.min.v343.js w()):
     * Power-Ups and Members require alliance membership; Suggested also
     * requires the player to be the alliance leader. Browse, My Alliance and
     * Invites are always shown.
     * @returns {Array} Visible tab indices.
     */
    private _visibleTabIndices(): any[] {
        if (this._io) {
            if (!this._ioInAlliance()) {
                return AllianceConstants.IO_TABS_NONE.concat();
            }
            let mine: any[] = [];
            for (const $value of as3.values(AllianceConstants.IO_TABS_MEMBER)) {
                let t: int = $value | 0;
                if (t != AllianceConstants.IO_TAB_RECRUIT || ALLIANCES.ioIsStaff()) {
                    mine.push(t);
                }
            }
            return mine;
        }
        let inAlliance: boolean = (ALLIANCES._myAlliance != null);
        let isLeader: boolean = ALLIANCES._isLeader;
        let out: any[] = [];
        let i: int = 0;
        while (i < AllianceConstants.TAB_LABELS.length) {
            if (this._isTabVisible(i, inAlliance, isLeader)) {
                out.push(i);
            }
            i++;
        }
        return out;
    }

    /**
     * @param {int} idx - TAB_LABELS index
     * @param {Boolean} inAlliance - Whether the player is in an alliance
     * @param {Boolean} isLeader - Whether the player leads their alliance
     * @returns {Boolean} Whether the tab should be shown
     */
    private _isTabVisible(idx: int, inAlliance: boolean, isLeader: boolean): boolean {
        switch (idx) {
            case 2:
            // Power-Ups
            case 3:
                // Members
                return inAlliance;
            case 4:
                // Suggested — leader only
                return inAlliance && isLeader;
            default:
                // Browse, My Alliance, Invites
                return true;
        }
    }

    /**
     * @returns {Object} The visible-tab descriptor ({btn, index}) for the
     * active tab, or null if none matches.
     */
    private _activeTabDescriptor(): any {
        if (this._tabs == null) {
            return null;
        }
        let i: int = 0;
        while (i < this._tabs.length) {
            if ((this._tabs[i].index | 0) == this._activeTab) {
                return this._tabs[i];
            }
            i++;
        }
        return null;
    }

    private _onTabClick(idx: int): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this._switchTab(idx);
        };
    }

    private _switchTab(idx: int): void {
        let i: int = 0;
        while (i < this._tabs.length) {
            this._tabs[i].btn.Highlight = ((this._tabs[i].index | 0) == idx);
            i++;
        }
        this._activeTab = idx;
        while (this._contentMC.numChildren > 0) {
            this._contentMC.removeChildAt(0);
        }
        let tab: AllianceTabBase = this._createTab(idx);
        this._drawInnerBackground(tab.contentHeight);
        this._contentMC.addChild(tab);
        tab.build();
    }

    /** Inferno: a tab's label (the Board, Members and Invites tabs carry a count). */
    private _ioTabLabel(i: int): string {
        switch (i) {
            case AllianceConstants.IO_TAB_OVERVIEW:
                return KEYS.Get(this._ioInAlliance() ? "io_alliance_tab_overview" : "io_alliance_tab_create");
            case AllianceConstants.IO_TAB_BOARD:
                let unread: int = ALLIANCES.ioUnreadPins();
                return unread > 0 ? KEYS.Get("io_alliance_tab_board_n", { "v1": String(unread) }) : KEYS.Get("io_alliance_tab_board");
            case AllianceConstants.IO_TAB_MEMBERS:
                return KEYS.Get("alliance_tab_members", { "v1": String(ALLIANCES.OnlineCount()), "v2": String(ALLIANCES.MemberCount()) });
            case AllianceConstants.IO_TAB_INVITES:
                return KEYS.Get("alliance_tab_invites", { "v1": String(ALLIANCES.PendingInviteCount()) });
            default:
                return KEYS.Get(String(AllianceConstants.IO_TAB_LABELS[i]));
        }
    }

    private _createTab(idx: int): AllianceTabBase {
        if (this._io) {
            switch (idx) {
                case AllianceConstants.IO_TAB_OVERVIEW:
                    // (a player without an alliance: MyAllianceTab's Create prompt)
                    return as3.cast(this._ioInAlliance() ? new IoOverviewTab() : new MyAllianceTab(), AllianceTabBase);
                case AllianceConstants.IO_TAB_MEMBERS:
                    return new IoMembersTab();
                case AllianceConstants.IO_TAB_BOARD:
                    return new IoBoardTab();
                case AllianceConstants.IO_TAB_OUTPOSTS:
                    return new IoOutpostsTab();
            }
        }
        switch (idx) {
            case 0:
                return new BrowseTab();
            case 1:
                return new MyAllianceTab();
            case 2:
                return new PowerUpsTab();
            case 3:
                return new MembersTab();
            case 4:
                return new SuggestedTab();
            case 5:
                return new InvitesTab();
            default:
                return new BrowseTab();
        }
    }

    /**
     * Switches to the given tab (TAB_LABELS index) and renders it. Used after
     * the player's alliance membership changes (e.g. jumping to My Alliance
     * once an alliance is created), so it first rebuilds the tab row to reflect
     * tabs that were just un/locked by that change.
     * @param {int} idx - TAB_LABELS index to switch to.
     */
    public SelectTab(idx: int): void {
        this._rebuildTabs();
        this._switchTab(idx);
    }

    /**
     * Redraws the tab strip so labels pick up counts that arrived after the
     * popup was built. The stores are fetched when the window opens, which is
     * after the first draw, so without this the Members and Invites counts are
     * always one open behind.
     */
    public RefreshTabLabels(): void {
        this._rebuildTabs();

        let i: int = 0;
        while (i < this._tabs.length) {
            this._tabs[i].btn.Highlight = ((this._tabs[i].index | 0) == this._activeTab);
            i++;
        }
    }

    public Hide(param1: MouseEvent = null): void {
        ALLIANCEWINDOW.Hide();
    }

    public Center(): void {
        POPUPSETTINGS.AlignToUpperLeft(this);
        this.y += 70;
        if (GLOBAL.INFERNO_ONLY) {
            // Inferno-only: centred by its frame (W x _h). Its height counts the whole member list behind the
            // scroll mask, so on a short screen its top (and the close button) were above the screen. On a
            // screen narrower than the window (800 wide), it is shown smaller, so its close button is on it.
            // (by what it covers, which is wider than its frame W: the tabs, the close button)
            let sx: number = this.scaleX;
            this.scaleX = this.scaleY = 1;
            let lb: Rectangle = this.getBounds(this);
            let left: number = Math.min(0, lb.x);
            let wide: number = Math.max(ALLIANCEPOPUP.W, lb.x + lb.width) - left;
            this._ioFit = Math.min(1, (GLOBAL._SCREEN.width - 16) / wide);
            this.scaleX = this.scaleY = sx;
            this.x = (GLOBAL._SCREENCENTER.x - (left + wide * 0.5) * this._ioFit) | 0;
            this.y = Math.max(GLOBAL._SCREEN.y + 16, GLOBAL._SCREENCENTER.y - this._h * this._ioFit * 0.5 - 20) | 0;
        }
    }

    public ScaleUp(): void {
        if (GLOBAL.INFERNO_ONLY && this._ioFit < 1) {
            this.scaleX = this.scaleY = this._ioFit * 0.9;
            TweenLite.to(this, 0.2, { "scaleX": this._ioFit, "scaleY": this._ioFit, "ease": Quad.easeOut });
            return;
        }
        POPUPSETTINGS.ScaleUp(this);
    }
}

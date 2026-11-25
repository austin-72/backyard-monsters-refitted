import * as as3 from "as3";
import { int } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { FocusEvent, KeyboardEvent, MouseEvent } from "flash/events";
import { TextField, TextFieldType, TextFormat } from "flash/text";
import { Keyboard } from "flash/ui";
import { AllianceConstants, ALLIANCES, ALLIANCEWINDOW, GLOBAL, IoAllianceMembersPopup, IoAllianceUi, IoLeaderboards, IoMapUi, IoSocial, IoTextPrompt, KEYS, MembersTab } from "@game";

export class SuggestedTab extends MembersTab {
    // (Inferno-only, QoL #163) the Recruit tab's filters, kept while the game runs; the page goes back to the first
    // each time the tab is opened
    private static _ioMine: boolean = false;
    private static _ioActive: boolean = false;
    private static _ioMinLevel: int = 0;
    private static _ioPage: int = 0;

    /** (QoL #163) the filter row, between the title and the table (which moves down by its height) */
    private static readonly IO_ROW_Y: int = 60;
    private static readonly IO_ROW_H: int = 30;

    public $ctor(): void {
        super.$ctor();
        if (GLOBAL.INFERNO_ONLY && SuggestedTab._ioPage != 0) {
            SuggestedTab._ioPage = 0;
            ALLIANCES.ioSetSuggestFilters(SuggestedTab.ioVars());
        }
    }

    protected override get _tableTop(): int {
        return (super._tableTop + (GLOBAL.INFERNO_ONLY ? SuggestedTab.IO_ROW_H : 0)) | 0;
    }

    protected override get _viewHeight(): int {
        return (super._viewHeight - (GLOBAL.INFERNO_ONLY ? SuggestedTab.IO_ROW_H : 0)) | 0;
    }

    /** (QoL #163) What the list is asked with (none: the stock request). */
    private static ioVars(): any[] {
        let v: any[] = [];
        if (SuggestedTab._ioMine) {
            v.push(["mine", "1"]);
        }
        if (SuggestedTab._ioActive) {
            v.push(["active", "1"]);
        }
        if (SuggestedTab._ioMinLevel > 0) {
            v.push(["min_level", String(SuggestedTab._ioMinLevel)]);
        }
        if (SuggestedTab._ioPage > 0) {
            v.push(["page", String(SuggestedTab._ioPage)]);
        }
        return v;
    }

    /** (QoL #163) A filter or the page changed: the list is asked for again. */
    private ioApply(): void {
        ALLIANCES.ioSetSuggestFilters(SuggestedTab.ioVars());
        this._load();
    }

    /**
     * (Inferno-only, QoL #163) My world only, Active in the last 24 hours, a minimum level (Enter, or leaving the
     * box), how many match, and the pages (50 a page).
     */
    private ioBuildFilters(): void {
        const y: int = SuggestedTab.IO_ROW_Y;
        let mine: MovieClip = IoMapUi.checkbox(KEYS.Get("io_al4_rec_mine"), SuggestedTab._ioMine, (on: boolean): void => {
            SuggestedTab._ioMine = on;
            SuggestedTab._ioPage = 0;
            this.ioApply();
        }, 150);
        mine.name = "ioAl4RecMine";
        mine.x = 10;
        mine.y = y + 3;
        this.addChild(mine);
        let active: MovieClip = IoMapUi.checkbox(KEYS.Get("io_al4_rec_active"), SuggestedTab._ioActive, (on: boolean): void => {
            SuggestedTab._ioActive = on;
            SuggestedTab._ioPage = 0;
            this.ioApply();
        }, 196);
        active.name = "ioAl4RecActive";
        active.x = 166;
        active.y = y + 3;
        this.addChild(active);
        let label: TextField = IoAllianceUi.addText(this, KEYS.Get("io_al4_rec_minlevel"), 370, (y + 4) | 0, 11, AllianceConstants.IO_INK, false, 0);
        const boxW: int = 44;
        const boxH: int = 22;
        let bx: int = (label.x + label.width + 6) | 0;
        let bg: Sprite = new Sprite();
        bg.graphics.lineStyle(1, 8947848, 1);
        bg.graphics.beginFill(16777215, 1);
        bg.graphics.drawRoundRect(0, 0, boxW, boxH, 4, 4);
        bg.graphics.endFill();
        bg.x = bx;
        bg.y = y + 1;
        this.addChild(bg);
        let level: TextField = new TextField();
        level.name = "ioAl4RecMinLevel";
        level.type = TextFieldType.INPUT;
        level.selectable = true;
        level.restrict = "0-9";
        level.maxChars = 3;
        level.defaultTextFormat = new TextFormat("Verdana", 12, 0x222222);
        level.text = SuggestedTab._ioMinLevel > 0 ? String(SuggestedTab._ioMinLevel) : "";
        level.x = bx + 4;
        level.y = bg.y + 2;
        level.width = boxW - 8;
        level.height = 18;
        let take: Function = (): void => {
            let n: int = Math.min(500, parseInt(String(level.text || "0"), 10) || 0) | 0;
            if (n != SuggestedTab._ioMinLevel) {
                SuggestedTab._ioMinLevel = n;
                SuggestedTab._ioPage = 0;
                this.ioApply();
            }
        };
        level.addEventListener(KeyboardEvent.KEY_DOWN, (e: KeyboardEvent): void => {
            if (e.keyCode == Keyboard.ENTER) {
                take();
            }
        });
        level.addEventListener(FocusEvent.FOCUS_OUT, (e: FocusEvent): void => {
            take();
        });
        bg.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            if (level.stage) {
                level.stage.focus = level;
            }
        });
        this.addChild(level);
        let meta: any = ALLIANCES.ioSuggestMeta();
        let count: TextField = IoAllianceUi.addText(this, meta ? KEYS.Get("io_al4_rec_count", { "v1": String(meta.total | 0) }) : "", (bx + boxW + 10) | 0, (y + 4) | 0, 11, AllianceConstants.IO_MUTED, false, 130);
        count.name = "ioAl4RecCount";
        // (the pages: < Page 2 >, at the row's right end)
        const navW: int = 28;
        const pageW: int = 90;
        let next: MovieClip = IoAllianceUi.button(">", navW, 24, (e: MouseEvent): void => {
            SuggestedTab._ioPage = (SuggestedTab._ioPage + 1) | 0;
            this.ioApply();
        }, "grey", 12);
        next.name = "ioAl4RecNext";
        next.x = this.CONTENT_W - 10 - navW;
        next.y = y;
        this.addChild(next);
        let page: TextField = IoAllianceUi.addText(this, KEYS.Get("io_al4_rec_page", { "v1": String(SuggestedTab._ioPage + 1) }), (next.x - 4 - pageW) | 0, (y + 4) | 0, 11, AllianceConstants.IO_INK, true, pageW, IoAllianceUi.CENTER);
        page.name = "ioAl4RecPage";
        let prev: MovieClip = IoAllianceUi.button("<", navW, 24, (e: MouseEvent): void => {
            SuggestedTab._ioPage = Math.max(0, SuggestedTab._ioPage - 1) | 0;
            this.ioApply();
        }, "grey", 12);
        prev.name = "ioAl4RecPrev";
        prev.x = page.x - 4 - navW;
        prev.y = y;
        this.addChild(prev);
        Object(prev).setEnabled(SuggestedTab._ioPage > 0);
        Object(next).setEnabled(Boolean(meta && meta.more));
        if (this._members != null && this._members.length == 0 && meta != null) {
            // (nothing found: said under the headings, not an empty table alone)
            IoAllianceUi.addText(this, KEYS.Get("io_al4_rec_none"), 20, (this._tableTop + 34) | 0, 12, AllianceConstants.IO_MUTED, false, (this.CONTENT_W - 40) | 0, IoAllianceUi.CENTER).name = "ioAl4RecNone";
        }
    }

    protected override get _titleKey(): string {
        return "alliance_suggested_title";
    }

    public override build(): void {
        super.build();
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #162: a friend who isn't among the suggestions can be invited by name)
            let w: int = 150;
            let b: MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_invite_name"), w, 26, (e: MouseEvent): void => {
                this.ioAskName();
            }, "gold", 11);
            b.name = "ioInviteByName";
            b.x = this.CONTENT_W - 10 - w;
            b.y = 22;
            this.addChild(b);
            // (QoL #164: the invites still waiting on an answer, who sent them and when, each with Cancel)
            let sw: int = 130;
            let sent: MovieClip = IoAllianceUi.button(KEYS.Get("io_al2_invites_btn"), sw, 26, (e: MouseEvent): void => {
                ALLIANCES.ioSentInvites(0, (response: any): void => {
                    if (IoAllianceUi.failed(response)) {
                        return;
                    }
                    new IoAllianceMembersPopup().ShowInvites(response);
                });
            }, "grey", 11);
            sent.name = "ioAlInvitesBtn";
            sent.x = b.x - 8 - sw;
            sent.y = 22;
            this.addChild(sent);
            // (QoL #163: the filters and pages)
            this.ioBuildFilters();
        }
    }

    /** "Invite by name": the name typed, then the invite sent as from a row. */
    private ioAskName(): void {
        IoTextPrompt.Show(KEYS.Get("io_alliance_invite_name"), KEYS.Get("io_alliance_invite_name_ask"), "", 12, KEYS.Get("alliance_btn_invite"), (typed: string): void => {
            let name: string = String(typed || "").replace(/^\s+|\s+$/g, "");
            if (!name) {
                return;
            }
            ALLIANCES.ioInviteByName(name, (response: any): void => {
                this.ioInvited(response);
            });
        });
    }

    private ioInvited(response: any): void {
        if (response == null) {
            GLOBAL.Message(KEYS.Get("alliance_err_generic"));
            return;
        }
        if (response.error) {
            GLOBAL.Message(String(response.error));
            return;
        }
        GLOBAL.Message(KEYS.Get("alliance_invite_sent"));
        this._load();
    }

    /**
     * Suggested members aren't in the alliance yet, so the actions are to
     * visit their base or invite them.
     * @param {Object} rowData - The row the actions apply to
     * @returns {Array} Visit Base + Invite actions for MemberActionPopup
     */
    protected override _actionsFor(rowData: any): any[] {
        if (GLOBAL.INFERNO_ONLY) {
            // (Inferno: the map can show where they are; QoL #188: and their yard, in view mode, on any world)
            let acts: any[] = [{ labelKey: "io_alliance_act_jump", handler: as3.bind(this, this._ioOnJump) }];
            if (Number(rowData.base_id) > 0) {
                acts.push({ labelKey: "io_soc_view_yard", handler: (r: any): void => { IoSocial.ViewYard(Number(r.base_id)); } });
            }
            acts.push({ labelKey: "alliance_btn_invite", handler: as3.bind(this, this._onInvite) });
            return acts;
        }
        return [{ labelKey: "alliance_btn_visit", handler: as3.bind(this, this._onVisitBase) }, { labelKey: "alliance_btn_invite", handler: as3.bind(this, this._onInvite) }];
    }

    private _ioOnJump(rowData: any): void {
        ALLIANCEWINDOW.Hide();
        IoLeaderboards.JumpToPlayer(rowData.user_id | 0, String(rowData.name));
    }

    /**
     * Invites the suggested player. The store drops its candidate list on success,
     * so _load refetches and the invited player drops out of the table - the server
     * leaves out anyone already holding a pending invite.
     *
     * @param {Object} rowData - The row that was acted on
     */
    private _onInvite(rowData: any): void {
        ALLIANCES.InviteUser(rowData.user_id | 0, (response: any): void => {
            if (response == null) {
                GLOBAL.Message(KEYS.Get("alliance_err_generic"));
                return;
            }

            if (response.error) {
                GLOBAL.Message(String(response.error));
                return;
            }

            GLOBAL.Message(KEYS.Get("alliance_invite_sent"));

            this._load();
        });
    }

    /**
     * Candidates come from their own store cache rather than the roster one, but
     * arrive in the same row shape, so the inherited mapping and table draw them.
     */
    protected override _load(): void {
        let answeredDuringBuild: boolean = false;
        answeredDuringBuild = true;

        ALLIANCES.LoadSuggested((members: any[]): void => {
            this._members = (members != null) ? this._mapRows(members) : [];

            if (!answeredDuringBuild) {
                this._rerender();
            }
        });

        answeredDuringBuild = false;
    }
}

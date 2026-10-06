import * as as3 from "as3";
import { int, uint } from "as3";
import { DisplayObject, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { Point } from "flash/geom";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceTabBase, BYMChat, Button_CLIP, GLOBAL, IoAllianceUi, IoLeaderboards, IoScrollPane, KEYS, LOGIN, MemberActionPopup, SOUNDS } from "@game";

/**
 * Inferno-only: the Members tab (the user's design of 2 October). Each member's role, level, outposts,
 * empire value and whether they are online (or when they were last seen), sorted by any column (click
 * its heading; again for the other way). Actions: send them a message, jump to their yard, and for the
 * leader and officers kick; the leader also names officers and hands over the lead. An officer can't
 * kick the leader or another officer.
 */
export class IoMembersTab extends AllianceTabBase {
    static {
        as3.fields(this, { _members: null, _pane: null, _head: null, _popup: null });
    }

    private static readonly PAD: int = 12;

    private static readonly HEAD_Y: int = 12;

    private static readonly HEAD_H: int = 26;

    private static readonly ROW_H: int = 34;

    // role, name, level, outposts, empire, status, actions
    private static readonly COLS: any[] = [[0, 84], [84, 196], [280, 58], [338, 80], [418, 130], [548, 116], [664, 108]];

    private static readonly SORTS: any[] = ["role", "name", "level", "outposts", "empire", "status", ""];

    private static _sort: string = "role";

    private static _desc: boolean = false;
    private _members: any[];
    private _pane: IoScrollPane;
    private _head: Sprite;
    private _popup: MemberActionPopup;

    public $ctor(): void {
        this._members = [];
        super.$ctor();
    }

    public override build(): void {
        this._head = new Sprite();
        this._head.x = IoMembersTab.PAD;
        this._head.y = IoMembersTab.HEAD_Y;
        this.addChild(this._head);
        this._pane = new IoScrollPane((this.CONTENT_W - IoMembersTab.PAD * 2) | 0, (this.CONTENT_H - IoMembersTab.HEAD_Y - IoMembersTab.HEAD_H - IoMembersTab.PAD) | 0);
        this._pane.x = IoMembersTab.PAD;
        this._pane.y = IoMembersTab.HEAD_Y + IoMembersTab.HEAD_H;
        this.addChild(this._pane);
        this.addEventListener(Event.REMOVED_FROM_STAGE, (e: Event): void => {
            this._dismiss();
        });
        this._drawHead();
        this._load();
    }

    private _load(): void {
        ALLIANCES.LoadMembers((rows: any[]): void => {
            if (this.stage == null) {
                return;
            }
            this._members = rows || [];
            this._drawRows();
        });
    }

    // ---- the headings (click to sort)
    private _drawHead(): void {
        while (this._head.numChildren > 0) {
            this._head.removeChildAt(0);
        }
        let w: int = (this.CONTENT_W - IoMembersTab.PAD * 2 - IoScrollPane.BAR_W - 2) | 0;
        this._head.graphics.clear();
        this._head.graphics.lineStyle(1, AllianceConstants.TABLE_BORDER, 1);
        this._head.graphics.beginFill(AllianceConstants.HEADER_BG, 1);
        this._head.graphics.drawRect(0, 0, w, IoMembersTab.HEAD_H);
        this._head.graphics.endFill();
        let labels: any[] = ["io_alliance_col_role", "alliance_col_name", "alliance_col_level", "io_alliance_col_outposts", "io_alliance_col_empire", "alliance_col_status", "alliance_col_actions"];
        for (let i: int = 0; i < labels.length; i++) {
            let cell: Sprite = new Sprite();
            cell.x = IoMembersTab.COLS[i][0] | 0;
            let key: string = String(IoMembersTab.SORTS[i]);
            cell.graphics.beginFill(0, 0);
            cell.graphics.drawRect(0, 0, IoMembersTab.COLS[i][1] | 0, IoMembersTab.HEAD_H);
            cell.graphics.endFill();
            // (smaller when it doesn't fit: "Avant-postes" was cut off)
            GLOBAL.ioFitText(IoAllianceUi.addText(cell, KEYS.Get(String(labels[i])), 6, 4, 11, 0, true, ((IoMembersTab.COLS[i][1] | 0) - 22) | 0));
            if (key) {
                cell.buttonMode = true;
                cell.mouseChildren = false;
                cell.name = "ioSort_" + key;
                cell.addEventListener(MouseEvent.CLICK, this._sorter(key));
                if (key == IoMembersTab._sort) {
                    // a small triangle: which way it is sorted
                    let ax: int = ((IoMembersTab.COLS[i][1] | 0) - 13) | 0;
                    cell.graphics.beginFill(3811866, 1);
                    if (IoMembersTab._desc) {
                        cell.graphics.moveTo(ax, 10);
                        cell.graphics.lineTo(ax + 8, 10);
                        cell.graphics.lineTo(ax + 4, 16);
                    } else {
                        cell.graphics.moveTo(ax, 16);
                        cell.graphics.lineTo(ax + 8, 16);
                        cell.graphics.lineTo(ax + 4, 10);
                    }
                    cell.graphics.endFill();
                }
            }
            if (i > 0) {
                this._head.graphics.lineStyle(1, AllianceConstants.CELL_BORDER, 0.5);
                this._head.graphics.moveTo(IoMembersTab.COLS[i][0] | 0, 0);
                this._head.graphics.lineTo(IoMembersTab.COLS[i][0] | 0, IoMembersTab.HEAD_H);
            }
            this._head.addChild(cell);
        }
    }

    private _sorter(key: string): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            if (IoMembersTab._sort == key) {
                IoMembersTab._desc = !IoMembersTab._desc;
            } else {
                IoMembersTab._sort = key;
                // (numbers biggest first; names and roles from the top)
                IoMembersTab._desc = key == "level" || key == "outposts" || key == "empire" || key == "status";
            }
            this._drawHead();
            this._drawRows();
        };
    }

    private static roleRank(m: any): int {
        let r: string = String(m.role || (m.is_leader ? "leader" : "member"));
        return r == "leader" ? 0 : (r == "officer" ? 1 : 2);
    }

    private static seen(m: any): number {
        return (m.status && m.status.online) ? 1e12 : Number(m.last_seen || 0);
    }

    private _sorted(): any[] {
        let key: string = null;
        let dir: int = 0;
        let list: any[] = this._members.concat();
        key = IoMembersTab._sort;
        dir = IoMembersTab._desc ? -1 : 1;
        as3.sort(list, (a: any, b: any): int => {
            let d: number = 0;
            switch (key) {
                case "role":
                    d = IoMembersTab.roleRank(a) - IoMembersTab.roleRank(b);
                    break;
                case "name":
                    d = String(a.display_name).toLowerCase() < String(b.display_name).toLowerCase() ? -1 : (String(a.display_name).toLowerCase() > String(b.display_name).toLowerCase() ? 1 : 0);
                    break;
                case "level":
                    d = Number(a.level) - Number(b.level);
                    break;
                case "outposts":
                    d = Number(a.outposts) - Number(b.outposts);
                    break;
                case "empire":
                    d = Number(a.empire) - Number(b.empire);
                    break;
                case "status":
                    d = IoMembersTab.seen(a) - IoMembersTab.seen(b);
                    break;
            }
            if (d == 0 && key != "empire") {
                // ties: the bigger empire first
                return Number(b.empire) - Number(a.empire) > 0 ? 1 : (Number(b.empire) - Number(a.empire) < 0 ? -1 : 0);
            }
            return d * dir > 0 ? 1 : (d * dir < 0 ? -1 : 0);
        });
        return list;
    }

    // ---- the rows
    private _drawRows(): void {
        this._dismiss();
        let c: Sprite = this._pane.content;
        while (c.numChildren > 0) {
            c.removeChildAt(0);
        }
        let w: int = this._pane.innerWidth;
        let list: any[] = this._sorted();
        for (let i: int = 0; i < list.length; i++) {
            c.addChild(this._row(list[i], i, w));
        }
        this._pane.refresh(list.length * IoMembersTab.ROW_H);
    }

    private _row(m: any, i: int, w: int): Sprite {
        let r: Sprite = new Sprite();
        r.y = i * IoMembersTab.ROW_H;
        r.name = "ioMember" + (m.user_id | 0);
        let self: boolean = (m.user_id | 0) == LOGIN._playerID;
        r.graphics.beginFill(self ? AllianceConstants.ROW_ME : (i % 2 == 0 ? AllianceConstants.ROW_ALT0 : AllianceConstants.ROW_ALT1), 1);
        r.graphics.drawRect(0, 0, w, IoMembersTab.ROW_H);
        r.graphics.endFill();
        r.graphics.lineStyle(1, 14205862, 1);
        r.graphics.moveTo(0, IoMembersTab.ROW_H - 0.5);
        r.graphics.lineTo(w, IoMembersTab.ROW_H - 0.5);
        let ty: int = ((IoMembersTab.ROW_H - 18) / 2) | 0;
        let role: string = String(m.role || (m.is_leader ? "leader" : "member"));
        let roleColor: uint = (role == "leader" ? 0x8A5A00 : (role == "officer" ? 0x24406E : AllianceConstants.IO_MUTED)) >>> 0;
        IoAllianceUi.addText(r, KEYS.Get("io_alliance_role_" + role), ((IoMembersTab.COLS[0][0] | 0) + 6) | 0, ty, 11, roleColor, role != "member", ((IoMembersTab.COLS[0][1] | 0) - 8) | 0);
        IoAllianceUi.addText(r, String(m.display_name), ((IoMembersTab.COLS[1][0] | 0) + 6) | 0, ty, 12, AllianceConstants.IO_INK, true, ((IoMembersTab.COLS[1][1] | 0) - 8) | 0);
        IoAllianceUi.addText(r, String(m.level | 0), IoMembersTab.COLS[2][0] | 0, ty, 12, AllianceConstants.IO_INK, false, IoMembersTab.COLS[2][1] | 0, IoAllianceUi.CENTER);
        IoAllianceUi.addText(r, String(m.outposts | 0), IoMembersTab.COLS[3][0] | 0, ty, 12, AllianceConstants.IO_INK, false, IoMembersTab.COLS[3][1] | 0, IoAllianceUi.CENTER);
        IoAllianceUi.addText(r, IoAllianceUi.num(Number(m.empire)), IoMembersTab.COLS[4][0] | 0, ty, 12, AllianceConstants.IO_INK, false, ((IoMembersTab.COLS[4][1] | 0) - 10) | 0, IoAllianceUi.RIGHT);
        let online: boolean = Boolean(m.status && m.status.online == true);
        let dot: Sprite = new Sprite();
        dot.graphics.lineStyle(1, (online ? 0x1E6E14 : 0x8A8A8A) >>> 0, 1);
        dot.graphics.beginFill((online ? 0x3FD12A : 0xC8C8C8) >>> 0, 1);
        dot.graphics.drawCircle(0, 0, 5);
        dot.graphics.endFill();
        dot.x = (IoMembersTab.COLS[5][0] | 0) + 12;
        dot.y = (IoMembersTab.ROW_H / 2) | 0;
        r.addChild(dot);
        let status: string = online ? KEYS.Get("io_alliance_online") : (Number(m.last_seen) > 0 ? IoAllianceUi.ago(Number(m.last_seen)) : "-");
        IoAllianceUi.addText(r, status, ((IoMembersTab.COLS[5][0] | 0) + 22) | 0, ty, 11, online ? AllianceConstants.IO_GAINED : AllianceConstants.IO_MUTED, online, ((IoMembersTab.COLS[5][1] | 0) - 24) | 0);
        if (!self) {
            let act: Button_CLIP = new Button_CLIP();
            act.Setup(KEYS.Get("alliance_col_actions"), false, 96, (IoMembersTab.ROW_H - 6) | 0);
            act._txt.htmlText = "<b><font color=\"#000000\">" + KEYS.Get("alliance_col_actions") + "</font></b>";
            act.x = (IoMembersTab.COLS[6][0] | 0) + ((((IoMembersTab.COLS[6][1] | 0) - 96) / 2) | 0);
            act.y = 3;
            act.name = "ioActions";
            act.addEventListener(MouseEvent.CLICK, this._actionsHandler(m));
            r.addChild(act);
        }
        return r;
    }

    // ---- actions
    private _actionsFor(m: any): any[] {
        let actions: any[] = [{ labelKey: "io_alliance_act_message", handler: as3.bind(this, this._onMessage) }, { labelKey: "io_alliance_act_jump", handler: as3.bind(this, this._onJump) }];
        let targetRole: string = String(m.role || (m.is_leader ? "leader" : "member"));
        if (ALLIANCES._isLeader && targetRole != "leader") {
            actions.push({ labelKey: targetRole == "officer" ? "io_alliance_act_unofficer" : "io_alliance_act_officer", handler: as3.bind(this, this._onOfficer) });
        }
        if (ALLIANCES.ioIsStaff() && targetRole != "leader" && (ALLIANCES._isLeader || targetRole == "member")) {
            actions.push({ labelKey: "alliance_btn_kick", handler: as3.bind(this, this._onKick) });
        }
        if (ALLIANCES._isLeader && targetRole != "leader") {
            actions.push({ labelKey: "io_alliance_act_leader", handler: as3.bind(this, this._onPromote) });
        }
        return actions;
    }

    private _actionsHandler(m: any): Function {
        return (e: MouseEvent): void => {
            SOUNDS.Play("click1");
            this._dismiss();
            let actions: any[] = this._actionsFor(m);
            let b: DisplayObject = as3.as(e.currentTarget, DisplayObject);
            let at: Point = this.globalToLocal(b.localToGlobal(new Point(0, 0)));
            let h: int = MemberActionPopup.heightFor(actions.length);
            this._popup = new MemberActionPopup(m, as3.bind(this, this._dismiss), actions);
            this._popup.name = "ioMemberActions";
            this._popup.x = (at.x | 0) - MemberActionPopup.POPUP_W - 6;
            this._popup.y = Math.max(4, Math.min(this.CONTENT_H - h - 4, (at.y | 0) - 4));
            this.addChild(this._popup);
            if (this.stage) {
                this.stage.addEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageDown));
            }
        };
    }

    private _onStageDown(e: MouseEvent): void {
        if (this._popup && e.target instanceof DisplayObject && this._popup.contains(as3.cast(e.target, DisplayObject))) {
            return;
        }
        this._dismiss();
    }

    private _dismiss(): void {
        if (this.stage) {
            this.stage.removeEventListener(MouseEvent.MOUSE_DOWN, as3.bind(this, this._onStageDown));
        }
        if (this._popup && this._popup.parent) {
            this._popup.parent.removeChild(this._popup);
        }
        this._popup = null;
    }

    private _onMessage(m: any): void {
        BYMChat.ioMessagePlayer(String(m.user_id), String(m.display_name));
    }

    private _onJump(m: any): void {
        ALLIANCEWINDOW.Hide();
        IoLeaderboards.JumpToPlayer(m.user_id | 0, String(m.display_name));
    }

    private _onOfficer(m: any): void {
        let on: boolean = false;
        on = String(m.role) != "officer";
        ALLIANCES.ioSetOfficer(m.user_id | 0, on, (response: any): void => {
            if (IoAllianceUi.failed(response)) {
                return;
            }
            GLOBAL.Message(KEYS.Get(on ? "io_alliance_officer_done" : "io_alliance_unofficer_done", { "v1": String(m.display_name) }));
            if (this.stage != null) {
                this._load();
            }
        });
    }

    private _onKick(m: any): void {
        GLOBAL.Message(KEYS.Get("alliance_kick_confirm", { "name": String(m.display_name) }), KEYS.Get("alliance_btn_kick_user"), (): void => {
            let allianceName: string = null;
            allianceName = ALLIANCES.AllianceName();
            ALLIANCES.KickMember(m.user_id | 0, (response: any): void => {
                this._done(response, "alliance_kick_response", String(m.display_name), allianceName);
            });
        }, null);
    }

    private _onPromote(m: any): void {
        GLOBAL.Message(KEYS.Get("alliance_promote_confirm", { "name": String(m.display_name) }), KEYS.Get("alliance_btn_promote_user"), (): void => {
            let allianceName: string = null;
            allianceName = ALLIANCES.AllianceName();
            ALLIANCES.PromoteMember(m.user_id | 0, (response: any): void => {
                this._done(response, "alliance_promote_response", String(m.display_name), allianceName);
            });
        }, null);
    }

    private _done(response: any, key: string, name: string, allianceName: string): void {
        if (IoAllianceUi.failed(response)) {
            return;
        }
        GLOBAL.Message(KEYS.Get(key, { "name": name, "alliance": allianceName }));
        if (this.stage != null) {
            this._load();
        }
        ALLIANCES.LoadMyAlliance(ALLIANCEWINDOW.RefreshTabLabels);
    }
}

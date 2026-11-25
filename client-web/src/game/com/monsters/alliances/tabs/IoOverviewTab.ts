import * as as3 from "as3";
import { int, uint } from "as3";
import { MovieClip, Sprite } from "flash/display";
import { Event, IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { TextField, TextFieldType, TextFormat } from "flash/text";
import { Timer } from "flash/utils";
import { ALLIANCES, ALLIANCEWINDOW, AllianceConstants, AllianceFormPopup, AllianceTabBase, Button_CLIP, GLOBAL, IoAllianceUi, IoMapUi, KEYS, SOUNDS, URLLoaderApi, IoEmotes } from "@game";

/**
 * Inferno-only: the Overview tab (the user's design of 2 October). The alliance's description with Edit
 * (the leader) and Leave; the two newest pins on the board; the outposts gained and lost this week; the
 * power-ups running, with the time they have left.
 * (QoL #174) Under "Who can join", what the leader lets officers do, with Change for the leader; an officer the
 * leader lets edit the description gets Edit for it (greyed, with the reason, when not).
 */
export class IoOverviewTab extends AllianceTabBase {
    static {
        as3.fields(this, { _data: null, _powerBox: null, _powerups: null, _clock: null, _ioJp: null, _ioJpMode: "request", _ioPermDraft: null });
    }

    private static PAD: int; // const

    private static LEFT_W: int; // const

    private static RIGHT_X: int; // const

    private static RIGHT_W: int; // const

    private static BTN_H: int; // const

    static {
        as3.lazyStatics(this, { PAD: 0, LEFT_W: 0, RIGHT_X: 0, RIGHT_W: 0, BTN_H: 0 }, () => {
            IoOverviewTab.PAD = 12;
            IoOverviewTab.LEFT_W = 372;
            IoOverviewTab.RIGHT_X = (IoOverviewTab.PAD + IoOverviewTab.LEFT_W + 14) | 0;
            IoOverviewTab.RIGHT_W = (AllianceConstants.CONTENT_W - IoOverviewTab.RIGHT_X - IoOverviewTab.PAD) | 0;
            IoOverviewTab.BTN_H = 36;
        });
    }
    private _data: any;
    private _powerBox: Sprite;
    private _powerups: any[];
    private _clock: Timer;
    /** (QoL #166) the leader's "Who can join" panel while it is open, and the choice in it */
    private _ioJp: Sprite;
    private _ioJpMode: string;
    /** (QoL #174) the switches ticked in the leader's "What officers may do" panel, not saved yet */
    private _ioPermDraft: any;

    public $ctor(): void {
        super.$ctor();
    }

    public override build(): void {
        this.addEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this._onRemoved));
        ALLIANCES.LoadMyAlliance(as3.bind(this, this._onData));
    }

    private _onData(data: any): void {
        if (this.stage == null) {
            return;
        }
        while (this.numChildren > 0) {
            this.removeChildAt(0);
        }
        this._data = data;
        if (data == null) {
            IoAllianceUi.addText(this, KEYS.Get("alliance_err_generic"), IoOverviewTab.PAD, IoOverviewTab.PAD, 13, AllianceConstants.IO_INK, false, (this.CONTENT_W - IoOverviewTab.PAD * 2) | 0);
            // (Inferno-only, QoL #452: and Retry, rather than a dead end until the game is reloaded)
            if (GLOBAL.INFERNO_ONLY) {
                let retry: MovieClip = IoAllianceUi.button(KEYS.Get("io_retry"), 110, 28, (e: MouseEvent = null): void => {
                    while (this.numChildren > 0) {
                        this.removeChildAt(0);
                    }
                    IoAllianceUi.addText(this, KEYS.Get("msg_loading"), IoOverviewTab.PAD, IoOverviewTab.PAD, 13, AllianceConstants.IO_MUTED, false, (this.CONTENT_W - IoOverviewTab.PAD * 2) | 0);
                    ALLIANCES.LoadMyAlliance(as3.bind(this, this._onData), true);
                }, "gold", 12);
                retry.name = "ioOverviewRetry";
                retry.x = IoOverviewTab.PAD;
                retry.y = IoOverviewTab.PAD + 30;
                this.addChild(retry);
            }
            return;
        }
        this._buildAbout();
        this._buildPins();
        this._buildWeek();
        this._buildPowerups();
    }

    // ---- the left: the description, Edit and Leave
    private _buildAbout(): void {
        IoAllianceUi.band(this, IoOverviewTab.PAD, IoOverviewTab.PAD, IoOverviewTab.LEFT_W, KEYS.Get("io_alliance_about"));
        const top: int = (IoOverviewTab.PAD + 32) | 0;
        // (Inferno-only, QoL #172: to an officer, a card under the description when the leader has been away 14 days)
        let succession: any = GLOBAL.INFERNO_ONLY ? this._data.succession : null;
        const cardH: int = 52;
        const bottom: int = (this.CONTENT_H - IoOverviewTab.PAD - IoOverviewTab.BTN_H - 14 - (succession ? cardH + 8 : 0)) | 0;
        let box: Sprite = new Sprite();
        box.x = IoOverviewTab.PAD;
        box.y = top;
        box.graphics.lineStyle(1, 3355443, 1);
        box.graphics.beginFill(16777215, 1);
        box.graphics.drawRoundRect(0, 0, IoOverviewTab.LEFT_W, bottom - top, 8, 8);
        box.graphics.endFill();
        this.addChild(box);
        let desc: string = this._data.description ? String(this._data.description) : "";
        let t: TextField = IoAllianceUi.addText(box, desc ? desc : KEYS.Get("io_alliance_no_desc"), 10, 8, 13, (desc ? 0x333333 : AllianceConstants.IO_MUTED) >>> 0, false, (IoOverviewTab.LEFT_W - 20) | 0, "left", false, true);
        t.height = bottom - top - 16;
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #166: who can join, at the box's foot; the leader can change it)
            const rowH: int = 24;
            // (QoL #174: and, to the leader and officers, a row under it: what officers may do)
            let permRow: boolean = ALLIANCES.ioIsStaff();
            let joinY: int = (bottom - top - rowH * (permRow ? 2 : 1)) | 0;
            t.height = joinY - 16;
            box.graphics.lineStyle(1, 13217420, 1);
            box.graphics.moveTo(8, joinY - 4);
            box.graphics.lineTo(IoOverviewTab.LEFT_W - 8, joinY - 4);
            let line: TextField = IoAllianceUi.addText(box, KEYS.Get("io_soc_jp_line", { "v1": IoOverviewTab.ioPolicyText(this._data.join_policy) }), 10, joinY, 11, AllianceConstants.IO_INK, true, (IoOverviewTab.LEFT_W - 110) | 0);
            line.name = "ioSocJoinLine";
            if (ALLIANCES._isLeader) {
                let change: Sprite = IoAllianceUi.link(KEYS.Get("io_soc_jp_change"), 11, (): void => {
                    this._ioShowJoinPolicy((top) | 0, (bottom - top) | 0);
                });
                change.name = "ioSocJoinChange";
                change.x = IoOverviewTab.LEFT_W - change.width - 10;
                change.y = joinY;
                box.addChild(change);
            }
            if (permRow) {
                let permLine: TextField = IoAllianceUi.addText(box, KEYS.Get("io_al7_perm_line", { "v1": IoOverviewTab.ioPermsText(this._data.officer_perms) }), 10, (joinY + rowH) | 0, 11, AllianceConstants.IO_INK, false, (IoOverviewTab.LEFT_W - 110) | 0);
                permLine.name = "ioAl7PermLine";
                GLOBAL.ioFitText(permLine, 8);
                if (ALLIANCES._isLeader) {
                    let permChange: Sprite = IoAllianceUi.link(KEYS.Get("io_soc_jp_change"), 11, (): void => {
                        this._ioShowOfficerPerms((top) | 0, (bottom - top) | 0);
                    });
                    permChange.name = "ioAl7PermChange";
                    permChange.x = IoOverviewTab.LEFT_W - permChange.width - 10;
                    permChange.y = joinY + rowH;
                    box.addChild(permChange);
                }
            }
        }
        if (succession) {
            this._buildSuccession(succession, (bottom + 8) | 0, cardH);
        }

        const gap: int = 16;
        const btnW: int = ((IoOverviewTab.LEFT_W - gap) / 2) | 0;
        // (Inferno-only, QoL #174: an officer has Edit for the description where the leader's Edit is: greyed, with the
        // reason on a click, while the leader hasn't let officers edit it)
        let officerEdit: boolean = GLOBAL.INFERNO_ONLY && !ALLIANCES._isLeader && ALLIANCES.ioRole() == "officer";
        if (ALLIANCES._isLeader) {
            let edit: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
            edit.Setup(KEYS.Get("alliance_btn_edit"), false, btnW, IoOverviewTab.BTN_H);
            edit.x = IoOverviewTab.PAD;
            edit.y = this.CONTENT_H - IoOverviewTab.PAD - IoOverviewTab.BTN_H;
            edit.name = "ioEdit";
            edit.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onEdit));
        } else if (officerEdit) {
            let descEdit: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
            descEdit.Setup(KEYS.Get("io_al7_edit_desc"), false, btnW, IoOverviewTab.BTN_H);
            descEdit.x = IoOverviewTab.PAD;
            descEdit.y = this.CONTENT_H - IoOverviewTab.PAD - IoOverviewTab.BTN_H;
            descEdit.name = "ioAl7EditDesc";
            let allowed: boolean = ALLIANCES.ioCan("description");
            descEdit.Enabled = allowed;
            descEdit.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                SOUNDS.Play("click1");
                if (!allowed) {
                    GLOBAL.Message(KEYS.Get("io_al7_perm_no_description"));
                    return;
                }
                this._ioShowDescEdit((top) | 0, (bottom - top) | 0);
            });
        }
        let leave: Button_CLIP = as3.as(this.addChild(new Button_CLIP()), Button_CLIP);
        leave.Setup(KEYS.Get("alliance_btn_leave"), false, btnW, IoOverviewTab.BTN_H);
        leave.x = Number(ALLIANCES._isLeader || officerEdit ? IoOverviewTab.PAD + btnW + gap : IoOverviewTab.PAD);
        leave.y = this.CONTENT_H - IoOverviewTab.PAD - IoOverviewTab.BTN_H;
        leave.name = "ioLeave";
        leave.addEventListener(MouseEvent.CLICK, as3.bind(this, this._onLeave));
    }

    /**
     * (Inferno-only, QoL #172) "The leader hasn't been seen for 16 days": Take the lead for the most senior active
     * officer (the server checks again); the others are told who can.
     */
    private _buildSuccession(s: any, y: int, h: int): void {
        let card: Sprite = new Sprite();
        card.name = "ioAl4Succession";
        card.x = IoOverviewTab.PAD;
        card.y = y;
        IoAllianceUi.card(card.graphics, 0, 0, IoOverviewTab.LEFT_W, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        this.addChild(card);
        let canTake: boolean = Boolean(s.can_take);
        const btnW: int = 132;
        let textW: int = (IoOverviewTab.LEFT_W - 20 - (canTake ? btnW + 10 : 0)) | 0;
        let days: int = Math.max(s.days | 0, ((Number(s.away) || 0) / 86400) | 0) | 0;
        let line: string = KEYS.Get("io_al4_lead_away", { "v1": String(s.leader || ""), "v2": String(days) });
        if (!canTake) {
            line += " " + (s.candidate ? KEYS.Get("io_al4_lead_who", { "v1": String(s.candidate) }) : KEYS.Get("io_al4_lead_none"));
        }
        let t: TextField = IoAllianceUi.addText(card, line, 10, 6, 11, AllianceConstants.IO_INK, false, textW, "left", false, true);
        t.height = h - 10;
        t.name = "ioAl4SuccessionText";
        if (canTake) {
            let take: MovieClip = IoAllianceUi.button(KEYS.Get("io_al4_lead_btn"), btnW, 30, (e: MouseEvent): void => {
                this._onTakeLead(String(s.leader || ""));
            }, "gold", 11);
            take.name = "ioAl4TakeLead";
            take.x = IoOverviewTab.LEFT_W - btnW - 10;
            take.y = ((h - 30) / 2) | 0;
            card.addChild(take);
        }
    }

    private _onTakeLead(leader: string): void {
        GLOBAL.Message(KEYS.Get("io_al4_lead_confirm", { "v1": leader }), KEYS.Get("io_al4_lead_btn"), (): void => {
            ALLIANCES.ioTakeLead((response: any): void => {
                if (IoAllianceUi.failed(response)) {
                    return;
                }
                GLOBAL.Message(KEYS.Get("io_al4_lead_done", { "v1": leader }));
                // (the tabs follow: the leader's Edit, Recruit and the rest)
                if (ALLIANCEWINDOW._mc != null) {
                    ALLIANCEWINDOW._mc.SelectTab(AllianceConstants.IO_TAB_OVERVIEW);
                } else if (this.stage != null) {
                    ALLIANCES.LoadMyAlliance(as3.bind(this, this._onData), true);
                }
            });
        });
    }

    // ---- (Inferno-only, QoL #166) who can join
    /** "By request, level 20+". */
    private static ioPolicyText(p: any): string {
        let mode: string = p && p.mode ? String(p.mode) : "request";
        let text: string = KEYS.Get("io_soc_jp_" + (mode == "open" || mode == "invite" ? mode : "request"));
        let min: int = p ? p.min_level | 0 : 0;
        return min > 0 ? text + ", " + KEYS.Get("io_soc_jp_level_plus", { "v1": String(min) }) : text;
    }

    /** The leader's panel over the description: Open, By request or Invite only, the minimum level, Save. */
    private _ioShowJoinPolicy(y: int, h: int): void {
        if (this._ioJp && this._ioJp.parent) {
            this._ioJp.parent.removeChild(this._ioJp);
        }
        let p: any = this._data ? this._data.join_policy : null;
        this._ioJpMode = p && p.mode ? String(p.mode) : "request";
        let panel: Sprite = new Sprite();
        panel.name = "ioSocJoinPolicy";
        panel.x = IoOverviewTab.PAD;
        panel.y = y;
        this._ioJp = panel;
        this.addChild(panel);
        this._ioDrawJoinPolicy(h, p ? p.min_level | 0 : 0);
    }

    private _ioDrawJoinPolicy(h: int, minLevel: int): void {
        let panel: Sprite = this._ioJp;
        if (panel == null) {
            return;
        }
        while (panel.numChildren > 0) {
            panel.removeChildAt(0);
        }
        const w: int = IoOverviewTab.LEFT_W;
        panel.graphics.clear();
        IoAllianceUi.card(panel.graphics, 0, 0, w, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        IoAllianceUi.addText(panel, KEYS.Get("io_soc_jp_title"), 12, 10, 14, AllianceConstants.IO_INK, true, (w - 24) | 0);
        // the three choices, the chosen one in gold, what it means under them
        const gap: int = 8;
        const bw: int = ((w - 24 - gap * 2) / 3) | 0;
        let modes: any[] = ["open", "request", "invite"];
        let names: any[] = ["ioSocJpOpen", "ioSocJpRequest", "ioSocJpInvite"];
        // (the level typed is kept when another choice is clicked)
        let level: TextField = null;
        for (let i: int = 0; i < modes.length; i++) {
            let mode: string = String(modes[i]);
            let b: MovieClip = IoAllianceUi.button(KEYS.Get("io_soc_jp_" + mode), bw, 28, (e: MouseEvent): void => {
                this._ioJpMode = mode;
                this._ioDrawJoinPolicy(h, level ? Math.min(300, parseInt(String(level.text || "0"), 10) || 0) | 0 : minLevel);
            }, mode == this._ioJpMode ? "gold" : "grey", 11);
            b.name = String(names[i]);
            b.x = 12 + i * (bw + gap);
            b.y = 38;
            panel.addChild(b);
        }
        let hint: TextField = IoAllianceUi.addText(panel, KEYS.Get("io_soc_jp_" + this._ioJpMode + "_hint"), 12, 74, 11, AllianceConstants.IO_MUTED, false, (w - 24) | 0, "left", false, true);
        hint.height = 32;
        hint.name = "ioSocJpHint";
        // the minimum level
        let label: TextField = IoAllianceUi.addText(panel, KEYS.Get("io_soc_jp_minlevel"), 12, 116, 11, AllianceConstants.IO_INK, false, 0);
        const boxW: int = 50;
        let bg: Sprite = new Sprite();
        bg.graphics.lineStyle(1, 8947848, 1);
        bg.graphics.beginFill(16777215, 1);
        bg.graphics.drawRoundRect(0, 0, boxW, 22, 4, 4);
        bg.graphics.endFill();
        bg.x = label.x + label.width + 8;
        bg.y = 113;
        panel.addChild(bg);
        level = new TextField();
        level.name = "ioSocJpMinLevel";
        level.type = TextFieldType.INPUT;
        level.selectable = true;
        level.restrict = "0-9";
        level.maxChars = 3;
        level.defaultTextFormat = new TextFormat("Verdana", 12, 0x222222);
        level.text = String(minLevel | 0);
        level.x = bg.x + 4;
        level.y = bg.y + 2;
        level.width = boxW - 8;
        level.height = 18;
        bg.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            if (level.stage) {
                level.stage.focus = level;
            }
        });
        panel.addChild(level);
        // Save and Cancel, at the foot
        const sw: int = 120;
        let save: MovieClip = IoAllianceUi.button(KEYS.Get("io_soc_jp_save"), sw, 30, (e: MouseEvent): void => {
            let min: int = Math.max(0, Math.min(300, parseInt(String(level.text || "0"), 10) || 0)) | 0;
            ALLIANCES.ioSetJoinPolicy(this._ioJpMode, min, (response: any): void => {
                if (IoAllianceUi.failed(response)) {
                    return;
                }
                if (this._data && response.policy) {
                    this._data.join_policy = response.policy;
                }
                GLOBAL.Message(KEYS.Get("io_soc_jp_saved", { "v1": IoOverviewTab.ioPolicyText(response.policy) }));
                if (this.stage != null) {
                    this._onData(this._data);
                }
            });
        }, "gold", 12);
        save.name = "ioSocJpSave";
        save.x = w - 12 - sw;
        save.y = h - 12 - 30;
        panel.addChild(save);
        let cancel: MovieClip = IoAllianceUi.button(KEYS.Get("io_soc_jp_cancel"), sw, 30, (e: MouseEvent): void => {
            if (this._ioJp && this._ioJp.parent) {
                this._ioJp.parent.removeChild(this._ioJp);
            }
            this._ioJp = null;
        }, "grey", 12);
        cancel.name = "ioSocJpCancel";
        cancel.x = save.x - 10 - sw;
        cancel.y = save.y;
        panel.addChild(cancel);
    }

    // ---- (Inferno-only, QoL #174) what officers may do; an officer's edit of the description
    /** "power-ups, relations" (what is switched on), or "nothing more" when none is. */
    private static ioPermsText(p: any): string {
        let on: any[] = [];
        for (const $value of as3.values(["powerups", "relations", "description"])) {
            let k: string = as3.str($value);
            if (p && p[k]) {
                on.push(KEYS.Get("io_al7_perm_short_" + k));
            }
        }
        return on.length ? on.join(", ") : KEYS.Get("io_al7_perm_short_none");
    }

    /** The panel over the description (who can join, what officers may do, the officer's edit) goes. */
    private _ioClosePanel(): void {
        if (this._ioJp && this._ioJp.parent) {
            this._ioJp.parent.removeChild(this._ioJp);
        }
        this._ioJp = null;
    }

    /** The leader's panel over the description: a switch for each of the three, Save and Cancel. */
    private _ioShowOfficerPerms(y: int, h: int): void {
        this._ioClosePanel();
        let current: any = this._data && this._data.officer_perms ? this._data.officer_perms : null;
        this._ioPermDraft = { "powerups": Boolean(current && current.powerups), "relations": Boolean(current && current.relations), "description": Boolean(current && current.description) };
        let panel: Sprite = new Sprite();
        panel.name = "ioAl7OfficerPerms";
        panel.x = IoOverviewTab.PAD;
        panel.y = y;
        this._ioJp = panel;
        this.addChild(panel);
        const w: int = IoOverviewTab.LEFT_W;
        IoAllianceUi.card(panel.graphics, 0, 0, w, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        IoAllianceUi.addText(panel, KEYS.Get("io_al7_perm_title"), 12, 10, 14, AllianceConstants.IO_INK, true, (w - 24) | 0);
        let hint: TextField = IoAllianceUi.addText(panel, KEYS.Get("io_al7_perm_hint"), 12, 34, 11, AllianceConstants.IO_MUTED, false, (w - 24) | 0, "left", false, true);
        hint.height = 32;
        let keys: any[] = ["powerups", "relations", "description"];
        let names: any[] = ["ioAl7PermPowerups", "ioAl7PermRelations", "ioAl7PermDescription"];
        for (let i: int = 0; i < keys.length; i++) {
            let k: string = String(keys[i]);
            let box: MovieClip = IoMapUi.checkbox(KEYS.Get("io_al7_perm_" + k), Boolean(this._ioPermDraft[k]), (on: boolean): void => {
                if (this._ioPermDraft) {
                    this._ioPermDraft[k] = on;
                }
            }, (w - 24) | 0);
            box.name = String(names[i]);
            box.x = 12;
            box.y = 76 + i * 28;
            panel.addChild(box);
        }
        const sw: int = 120;
        let save: MovieClip = IoAllianceUi.button(KEYS.Get("io_soc_jp_save"), sw, 30, (e: MouseEvent): void => {
            let draft: any = this._ioPermDraft;
            ALLIANCES.ioSetOfficerPerms(draft, (response: any): void => {
                if (IoAllianceUi.failed(response)) {
                    return;
                }
                if (this._data && response.perms) {
                    this._data.officer_perms = response.perms;
                }
                GLOBAL.Message(KEYS.Get("io_al7_perm_saved", { "v1": IoOverviewTab.ioPermsText(response.perms) }));
                this._ioJp = null;
                if (this.stage != null) {
                    this._onData(this._data);
                }
            });
        }, "gold", 12);
        save.name = "ioAl7PermSave";
        save.x = w - 12 - sw;
        save.y = h - 12 - 30;
        panel.addChild(save);
        let cancel: MovieClip = IoAllianceUi.button(KEYS.Get("io_soc_jp_cancel"), sw, 30, (e: MouseEvent): void => {
            this._ioClosePanel();
        }, "grey", 12);
        cancel.name = "ioAl7PermCancel";
        cancel.x = save.x - 10 - sw;
        cancel.y = save.y;
        panel.addChild(cancel);
    }

    /** An officer the leader lets edit the description: a panel over it to type it in, Save and Cancel. */
    private _ioShowDescEdit(y: int, h: int): void {
        this._ioClosePanel();
        let panel: Sprite = new Sprite();
        panel.name = "ioAl7DescPanel";
        panel.x = IoOverviewTab.PAD;
        panel.y = y;
        this._ioJp = panel;
        this.addChild(panel);
        const w: int = IoOverviewTab.LEFT_W;
        IoAllianceUi.card(panel.graphics, 0, 0, w, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        IoAllianceUi.addText(panel, KEYS.Get("io_al7_desc_title"), 12, 10, 14, AllianceConstants.IO_INK, true, (w - 24) | 0);
        // the text, in a white box between the title and the buttons
        const boxY: int = 36;
        const boxH: int = (h - boxY - 12 - 30 - 12) | 0;
        let bg: Sprite = new Sprite();
        bg.graphics.lineStyle(1, 8947848, 1);
        bg.graphics.beginFill(16777215, 1);
        bg.graphics.drawRoundRect(0, 0, w - 24, boxH, 4, 4);
        bg.graphics.endFill();
        bg.x = 12;
        bg.y = boxY;
        panel.addChild(bg);
        let field: TextField = new TextField();
        field.name = "ioAl7DescField";
        field.type = TextFieldType.INPUT;
        field.selectable = true;
        field.wordWrap = true;
        field.multiline = true;
        field.maxChars = 255;
        field.defaultTextFormat = new TextFormat("Verdana", 12, 0x333333);
        field.text = this._data && this._data.description ? String(this._data.description) : "";
        field.x = bg.x + 6;
        field.y = bg.y + 4;
        field.width = w - 36;
        field.height = boxH - 8;
        bg.addEventListener(MouseEvent.MOUSE_DOWN, (e: MouseEvent): void => {
            if (field.stage) {
                field.stage.focus = field;
            }
        });
        panel.addChild(field);
        const sw: int = 120;
        let save: MovieClip = IoAllianceUi.button(KEYS.Get("alliance_btn_save"), sw, 30, (e: MouseEvent): void => {
            let text: string = String(field.text || "").replace(/^\s+|\s+$/g, "");
            if (text.length == 0) {
                GLOBAL.Message(KEYS.Get("alliance_err_desc_too_short"));
                return;
            }
            // (the server keeps the shield, name and tag as they are for an officer: the shield is sent as it is)
            let image: int = Math.max(1, this._data ? this._data.image | 0 : 1) | 0;
            new URLLoaderApi().load(GLOBAL._allianceURL + "editalliance", [["alliance_image", image], ["alliance_desc", text]], (response: any): void => {
                if (response && response.alliance) {
                    if (this._data) {
                        this._data.description = String(response.alliance.description);
                    }
                    this._ioJp = null;
                    if (this.stage != null) {
                        this._onData(this._data);
                    }
                    return;
                }
                GLOBAL.Message(response && response.error ? String(response.error) : KEYS.Get("alliance_err_generic"));
            }, (err: IOErrorEvent): void => {
                GLOBAL.Message(KEYS.Get("alliance_err_generic"));
            });
        }, "gold", 12);
        save.name = "ioAl7DescSave";
        save.x = w - 12 - sw;
        save.y = h - 12 - 30;
        panel.addChild(save);
        let cancel: MovieClip = IoAllianceUi.button(KEYS.Get("io_soc_jp_cancel"), sw, 30, (e: MouseEvent): void => {
            this._ioClosePanel();
        }, "grey", 12);
        cancel.name = "ioAl7DescCancel";
        cancel.x = save.x - 10 - sw;
        cancel.y = save.y;
        panel.addChild(cancel);
        if (field.stage) {
            field.stage.focus = field;
        }
    }

    // ---- the right: the newest pins, this week's outposts, the power-ups
    private _sectionLink(y: int, label: string, tab: int): void {
        let l: Sprite = IoAllianceUi.link(label, 11, (): void => {
            if (ALLIANCEWINDOW._mc != null) {
                ALLIANCEWINDOW._mc.SelectTab(tab);
            }
        });
        l.x = IoOverviewTab.RIGHT_X + IoOverviewTab.RIGHT_W - l.width - 8;
        l.y = y + 3;
        l.name = "ioLink" + tab;
        this.addChild(l);
    }

    private _buildPins(): void {
        const y0: int = IoOverviewTab.PAD;
        IoAllianceUi.band(this, IoOverviewTab.RIGHT_X, y0, IoOverviewTab.RIGHT_W, KEYS.Get("io_alliance_latest_pins"));
        this._sectionLink(y0, KEYS.Get("io_alliance_open_board"), AllianceConstants.IO_TAB_BOARD);
        let pins: any[] = as3.as(this._data.pins_top, Array) || [];
        let y: int = (y0 + 32) | 0;
        const cardH: int = 76;
        if (pins.length == 0) {
            let empty: Sprite = new Sprite();
            IoAllianceUi.card(empty.graphics, 0, 0, IoOverviewTab.RIGHT_W, cardH * 2 + 6, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            IoAllianceUi.addText(empty, KEYS.Get(ALLIANCES.ioIsStaff() ? "io_alliance_no_pins_staff" : "io_alliance_no_pins"), 12, 12, 12, AllianceConstants.IO_MUTED, false, (IoOverviewTab.RIGHT_W - 24) | 0, "left", false, true);
            empty.x = IoOverviewTab.RIGHT_X;
            empty.y = y;
            this.addChild(empty);
            return;
        }
        for (let i: int = 0; i < 2; i++) {
            if (i < pins.length) {
                this.addChild(this._pinCard(pins[i], IoOverviewTab.RIGHT_X, (y + i * (cardH + 6)) | 0, IoOverviewTab.RIGHT_W, cardH));
            }
        }
    }

    /** A short pin: title, two lines of it, who and when, and Jump when it has a place. */
    private _pinCard(pin: any, x: int, y: int, w: int, h: int): Sprite {
        let px: int = 0;
        let py: int = 0;
        let world: string = null;
        let c: Sprite = new Sprite();
        c.x = x;
        c.y = y;
        IoAllianceUi.card(c.graphics, 0, 0, w, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        let hasPlace: boolean = pin.x !== null && pin.x !== undefined && pin.y !== null && pin.y !== undefined;
        let textW: int = (w - 20 - (hasPlace ? 96 : 0)) | 0;
        IoAllianceUi.addText(c, String(pin.title), 10, 6, 12, AllianceConstants.IO_INK, true, textW);
        let body: TextField = IoAllianceUi.addText(c, IoEmotes.plain(String(pin.body || "")), 10, 24, 11, 3355443, false, textW, "left", false, true);
        body.height = 30;
        IoAllianceUi.addText(c, KEYS.Get("io_alliance_pin_by", { "v1": String(pin.author), "v2": IoAllianceUi.ago(Number(pin.created)) }), 10, (h - 20) | 0, 10, AllianceConstants.IO_MUTED, false, textW);
        if (hasPlace) {
            px = pin.x | 0;
            py = pin.y | 0;
            world = pin.world_id ? String(pin.world_id) : "";
            IoAllianceUi.addText(c, IoAllianceUi.coord(px, py), (w - 96) | 0, 10, 11, AllianceConstants.IO_INK, true, 86, IoAllianceUi.CENTER);
            let jump: MovieClip = IoAllianceUi.button(KEYS.Get("io_alliance_jump"), 76, 24, (e: MouseEvent): void => {
                IoAllianceUi.jump(px, py, world);
            }, "gold");
            jump.x = w - 86;
            jump.y = 32;
            jump.name = "ioPinJump";
            c.addChild(jump);
        }
        return c;
    }

    private _buildWeek(): void {
        const y0: int = (IoOverviewTab.PAD + 32 + 76 * 2 + 6 + 14) | 0;
        IoAllianceUi.band(this, IoOverviewTab.RIGHT_X, y0, IoOverviewTab.RIGHT_W, KEYS.Get("io_alliance_week"));
        this._sectionLink(y0, KEYS.Get("io_alliance_see_history"), AllianceConstants.IO_TAB_OUTPOSTS);
        let week: any = this._data.week || { "gained": 0, "lost": 0, "net": 0 };
        let figures: any[] = [[KEYS.Get("io_alliance_gained"), "+" + (week.gained | 0), AllianceConstants.IO_GAINED], [KEYS.Get("io_alliance_lost"), ((week.lost | 0) > 0 ? "-" : "") + (week.lost | 0), AllianceConstants.IO_LOST], [KEYS.Get("io_alliance_net"), IoAllianceUi.signed(week.net | 0), (week.net | 0) > 0 ? AllianceConstants.IO_GAINED : ((week.net | 0) < 0 ? AllianceConstants.IO_LOST : AllianceConstants.IO_INK)]];
        const gap: int = 8;
        const boxW: int = ((IoOverviewTab.RIGHT_W - gap * 2) / 3) | 0;
        for (let i: int = 0; i < figures.length; i++) {
            let b: Sprite = new Sprite();
            b.x = IoOverviewTab.RIGHT_X + i * (boxW + gap);
            b.y = y0 + 32;
            IoAllianceUi.card(b.graphics, 0, 0, boxW, 50, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
            IoAllianceUi.addText(b, String(figures[i][0]), 0, 4, 10, AllianceConstants.IO_MUTED, false, boxW, IoAllianceUi.CENTER);
            IoAllianceUi.addText(b, String(figures[i][1]), 0, 20, 17, figures[i][2] >>> 0, true, boxW, IoAllianceUi.CENTER);
            this.addChild(b);
        }
    }

    private _buildPowerups(): void {
        const y0: int = (IoOverviewTab.PAD + 32 + 76 * 2 + 6 + 14 + 32 + 50 + 14) | 0;
        IoAllianceUi.band(this, IoOverviewTab.RIGHT_X, y0, IoOverviewTab.RIGHT_W, KEYS.Get("io_alliance_powerups_running"));
        this._sectionLink(y0, KEYS.Get("alliance_tab_powerups"), AllianceConstants.IO_TAB_POWERUPS);
        this._powerBox = new Sprite();
        this._powerBox.x = IoOverviewTab.RIGHT_X;
        this._powerBox.y = y0 + 32;
        this.addChild(this._powerBox);
        IoAllianceUi.addText(this._powerBox, KEYS.Get("msg_loading"), 10, 4, 11, AllianceConstants.IO_MUTED, false, (IoOverviewTab.RIGHT_W - 20) | 0);
        ALLIANCES.LoadPowerups((rows: any[]): void => {
            if (this.stage == null) {
                return;
            }
            this._powerups = rows || [];
            this._drawPowerups();
            if (this._clock == null) {
                this._clock = new Timer(1000);
                this._clock.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
                    this._drawPowerups();
                });
                this._clock.start();
            }
        });
    }

    /** The power-ups running, each with the time it has left (every second). */
    private _drawPowerups(): void {
        if (this._powerBox == null || this.stage == null) {
            return;
        }
        while (this._powerBox.numChildren > 0) {
            this._powerBox.removeChildAt(0);
        }
        let running: any[] = [];
        for (let p of as3.values(this._powerups)) {
            let left: int = ((p.endTime | 0) - GLOBAL.Timestamp()) | 0;
            if (p.active && left > 0) {
                running.push([KEYS.Get(String(p.type) + "_name"), left]);
            }
        }
        let h: int = Math.max(30, running.length * 22 + 10) | 0;
        this._powerBox.graphics.clear();
        IoAllianceUi.card(this._powerBox.graphics, 0, 0, IoOverviewTab.RIGHT_W, h, AllianceConstants.IO_CARD, AllianceConstants.IO_CARD_EDGE);
        if (running.length == 0) {
            IoAllianceUi.addText(this._powerBox, KEYS.Get("io_alliance_powerups_none"), 10, 6, 11, AllianceConstants.IO_MUTED, false, (IoOverviewTab.RIGHT_W - 20) | 0);
            return;
        }
        for (let i: int = 0; i < running.length; i++) {
            IoAllianceUi.addText(this._powerBox, String(running[i][0]), 10, (5 + i * 22) | 0, 12, AllianceConstants.IO_INK, true, (IoOverviewTab.RIGHT_W - 150) | 0);
            IoAllianceUi.addText(this._powerBox, KEYS.Get("io_alliance_left", { "v1": GLOBAL.ToTime(running[i][1] | 0, true, true, true, false) }), (IoOverviewTab.RIGHT_W - 150) | 0, (5 + i * 22) | 0, 12, AllianceConstants.IO_GAINED, true, 140, IoAllianceUi.RIGHT);
        }
    }

    private _onRemoved(e: Event): void {
        this.removeEventListener(Event.REMOVED_FROM_STAGE, as3.bind(this, this._onRemoved));
        if (this._clock != null) {
            this._clock.stop();
            this._clock = null;
        }
    }

    // ---- Edit and Leave (as the stock My Alliance tab has them)
    private _onEdit(e: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this._data == null) {
            return;
        }
        new AllianceFormPopup().Show(AllianceFormPopup.MODE_EDIT, String(this._data.name), this._data.image | 0, String(this._data.description), this._data.tag != null ? String(this._data.tag) : null, this._data.tag_default != null ? String(this._data.tag_default) : null, this._data.crest ? String(this._data.crest) : null);
    }

    private _onLeave(e: MouseEvent): void {
        SOUNDS.Play("click1");
        if (this._data == null) {
            return;
        }
        let members: int = this._data.number_of_members | 0;
        if (ALLIANCES._isLeader && members > 1) {
            GLOBAL.Message(KEYS.Get("alliance_err_leader_cannot_leave", { "alliance": String(this._data.name) }));
            return;
        }
        let confirmKey: string = (ALLIANCES._isLeader && members <= 1) ? "alliance_disband_confirm" : "alliance_leave_confirm";
        // (QoL #486, #489: the danger confirmation, with verbs: "Leave Hellions" / "Stay", rather than Yes / No)
        if (GLOBAL.INFERNO_ONLY) {
            let verb: string = KEYS.Get(confirmKey == "alliance_disband_confirm" ? "io_danger_disband" : "io_danger_leave", { "v1": String(this._data.name) });
            let text: string = KEYS.Get(confirmKey, { "alliance": String(this._data.name) });
            if (confirmKey == "alliance_leave_confirm") {
                // (QoL #500: what is lost: their role and join date, kept a day for a return)
                text += "<br><br>" + this._leaveLoses();
            } else {
                // (QoL #502: what goes at once, and what is kept 14 days for them to restore)
                text += "<br><br>" + KEYS.Get("io_soc_disband_lists", { "v1": "14" });
            }
            GLOBAL.ioDanger(text, verb, as3.bind(this, this._confirmLeave), null, KEYS.Get("io_danger_stay"));
            return;
        }
        GLOBAL.Message(KEYS.Get(confirmKey, { "alliance": String(this._data.name) }), KEYS.Get("btn_yes"), as3.bind(this, this._confirmLeave), null, KEYS.Get("btn_no"), null, null);
    }

    /** (QoL #500) What leaving loses: the officer role and 45d of membership, unless they come back within 24 hours. */
    private _leaveLoses(): string {
        let role: string = ALLIANCES.ioRole() || "member";
        let joined: int = this._data.my_joined | 0;
        let hours: int = (this._data.rejoin_hours | 0) || 24;
        let since: string = joined > 0 ? IoAllianceUi.span(Math.max(0, GLOBAL.Timestamp() - joined) | 0) : "";
        let key: string = role == "officer" ? (since ? "io_al4_leave_lose_officer" : "io_al4_leave_lose_officer_nodate") : (since ? "io_al4_leave_lose" : "io_al4_leave_lose_nodate");
        return KEYS.Get(key, { "v1": since, "v2": String(hours) });
    }

    private _confirmLeave(): void {
        new URLLoaderApi().load(GLOBAL._allianceURL + "leavealliance", [["confirm", "1"]], as3.bind(this, this._onLeaveComplete), (e: IOErrorEvent): void => {
            GLOBAL.Message(KEYS.Get("alliance_err_generic"));
        });
    }

    private _onLeaveComplete(response: any): void {
        if (response && response.error) {
            GLOBAL.Message(String(response.error));
            return;
        }
        if (GLOBAL.INFERNO_ONLY && response && (response.kept_days | 0) > 0) {
            // (QoL #502: disbanded, and kept for them to restore)
            GLOBAL.Message(KEYS.Get("io_soc_disbanded_kept", { "v1": this._data ? String(this._data.name) : "", "v2": String(response.kept_days | 0) }));
        }
        ALLIANCES.Clear();
        ALLIANCES._allianceID = 0;
        ALLIANCES.InvalidateMyAlliance();
        if (ALLIANCEWINDOW._mc != null) {
            ALLIANCEWINDOW._mc.SelectTab(AllianceConstants.IO_TAB_OVERVIEW);
        }
    }
}

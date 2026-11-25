import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { DisplayObject, Shape, Sprite, Stage } from "flash/display";
import { KeyboardEvent, MouseEvent } from "flash/events";
import { DropShadowFilter } from "flash/filters";
import { TextField, TextFieldAutoSize, TextFormat } from "flash/text";
import { Keyboard } from "flash/ui";
import { setTimeout } from "flash/utils";
import { IoTrophies, ALLIANCES, BYMChat, Chat, GLOBAL, IoKit, IoLeaderboards, IoSocial, IoWhosOnline, KEYS, LOGIN, SOUNDS } from "@game";
import { System } from "flash/system";

/**
 * Inferno-only: the menu a player's name opens in the chat (the user's, 2 October): Send a message,
 * Ignore / Unignore, Jump to their yard (on the player's own world: IoLeaderboards knows where it is),
 * Find on the leaderboards. Closed by a click elsewhere, Escape, or once a choice is made.
 */
export class IoChatMenu extends ASObject {
    private static readonly W: int = 210;

    private static readonly ROW_H_MOUSE: int = 26;

    /** (QoL #557) 36 px rows on a touch screen */
    private static get ROW_H(): int {
        return GLOBAL.ioTouch ? 36 : IoChatMenu.ROW_H_MOUSE;
    }

    private static _mc: Sprite = null;

    public static get isOpen(): boolean {
        return IoChatMenu._mc != null && IoChatMenu._mc.parent != null;
    }

    /**
     * `param6`: {staff: "admin" | "mod" | null (the viewer's role), lineId, channel (the clicked line), targetRole,
     * tag, aid (the player's alliance tag and id), online (true, false, or unknown), ago (seconds since they were on)}:
     * staff also get Delete line and Mute (the server checks every request). `text`: the clicked line's words (QoL #152).
     *
     * (13 October, the user's: next to the mouse, from the chat or Who's Online; who it is at the top, their tag and
     * whether they are online; Mention in chat, Invite to my alliance and Copy name added.)
     *
     * (Inferno-only, QoL #187: under that, their card: level, world, outposts, ranks, the best Hellgate run and when
     * they started, IoSocial; QoL #188: View yard, on any world.)
     */
    public static Show(param1: string, param2: string, param3: boolean, param4: number, param5: number, param6: any = null): void {
        let uid: string = null;
        let name: string = null;
        let lineId: string = null;
        let channel: string = null;
        let mc: Sprite = null;
        IoChatMenu.Hide();
        uid = param1;
        name = param2 ? param2 : KEYS.Get("io_t3m_ch_player_n", { "v1": param1 });
        let opts: any = param6 || {};
        let me: boolean = uid == String(LOGIN._playerID);
        let items: any[] = [];
        if (!me) {
            items.push([KEYS.Get("io_t3m_cm_message"), "ioChatMenuMessage", (): void => {
                BYMChat.ioMessagePlayer(uid, name);
            }]);
            items.push([KEYS.Get("io_t3m_cm_mention"), "ioChatMenuMention", (): void => {
                if (Chat._bymChat == null || !Chat._bymChat.chatBox) {
                    return;
                }
                let box: any = Chat._bymChat.chatBox as any;
                let now: string = box.input ? String(box.input.text || "") : "";
                Chat._bymChat.chatBox.ioSetInput((now && !/\s$/.test(now) ? now + " " : now) + "@" + name + " ");
                try {
                    if (box.input && box.input.stage) {
                        box.input.stage.focus = box.input;
                    }
                } catch (e) {
                }
            }]);
        }
        if (!param3) {
            items.push([me ? KEYS.Get("io_t3m_cm_my_yard") : KEYS.Get("io_t3m_cm_their_yard"), "ioChatMenuJump", (): void => {
                IoLeaderboards.JumpToPlayer(Number(uid) | 0, name);
            }]);
        }
        // (Inferno-only, QoL #188: their yard, in view mode, whatever world it is on)
        if (GLOBAL.INFERNO_ONLY && !me) {
            items.push([KEYS.Get("io_soc_view_yard"), "ioSocViewYard", (): void => {
                IoSocial.ViewYardOf(Number(uid) | 0);
            }]);
        }
        items.push([KEYS.Get("io_t3m_cm_find"), "ioChatMenuFind", (): void => {
            IoLeaderboards.ShowPlayer(Number(uid) | 0, name);
        }]);
        // (an officer or the leader, and a player with no alliance: as the Suggested tab's Invite)
        if (!me && ALLIANCES.ioIsStaff() && opts.aid != null && (opts.aid | 0) == 0) {
            items.push([KEYS.Get("io_t3m_cm_invite"), "ioChatMenuInvite", (): void => {
                ALLIANCES.InviteUser(Number(uid) | 0, (r: any): void => {
                    GLOBAL.Message(r && !r.error ? KEYS.Get("io_t3m_cm_invited", { "v1": name }) : (r && r.error ? String(r.error) : KEYS.Get("io_t3m_cm_invite_failed")));
                });
            }]);
        }
        items.push([KEYS.Get("io_t3m_cm_copy"), "ioChatMenuCopy", (): void => {
            System.setClipboard(name);
        }]);
        if (!me) {
            // (QoL #557: a gap before Ignore, so a miss on Copy name doesn't ignore them)
            items.push(["~"]);
            items.push([param3 ? KEYS.Get("io_t3m_cm_unignore") : KEYS.Get("io_t3m_cm_ignore"), "ioChatMenuIgnore", (): void => {
                if (Chat._bymChat == null) {
                    return;
                }
                if (param3) {
                    Chat._bymChat.unignoreUser(uid);
                } else {
                    Chat._bymChat.ignoreUser(uid, name);
                }
            }]);
            // (Inferno-only, QoL #152: a line clicked: reported to the admins, with the lines around it)
            let reportId: string = opts.lineId ? String(opts.lineId) : null;
            let reportIn: string = opts.channel ? String(opts.channel) : null;
            if (GLOBAL.INFERNO_ONLY && reportId && reportIn && Chat._bymChat != null) {
                let words: string = opts.text != null ? String(opts.text) : null;
                items.push([KEYS.Get("io_chat2_menu_report"), "ioChat2MenuReport", (): void => {
                    GLOBAL.Message(KEYS.Get("io_chat2_report_confirm", { "v1": BYMChat.ioEsc(name) }), KEYS.Get("io_chat2_report_btn"), (): void => {
                        if (Chat._bymChat != null) {
                            Chat._bymChat.ioChat2Report(reportIn, reportId, uid, words);
                        }
                    });
                }]);
            }
        }
        let staff: string = opts.staff ? String(opts.staff) : null;
        if (staff && !me && Chat._bymChat != null) {
            let mod: any[] = [];
            lineId = opts.lineId ? String(opts.lineId) : null;
            channel = opts.channel ? String(opts.channel) : null;
            if (lineId && channel) {
                mod.push([KEYS.Get("io_t3m_cm_delete"), "ioChatMenuDelete", (): void => {
                    Chat._bymChat.ioDeleteLine(channel, lineId);
                }]);
            }
            let targetRole: string = opts.targetRole ? String(opts.targetRole) : null;
            if (targetRole != "admin" && (targetRole != "mod" || staff == "admin")) {
                for (let m of as3.values([[KEYS.Get("io_t3m_cm_mute10"), 10, "ioChatMenuMute10"], [KEYS.Get("io_t3m_cm_mute60"), 60, "ioChatMenuMute60"], [KEYS.Get("io_t3m_cm_mute1440"), 1440, "ioChatMenuMute1440"], [KEYS.Get("io_t3m_cm_unmute"), 0, "ioChatMenuUnmute"]])) {
                    mod.push([m[0], m[2], IoChatMenu.muteFn(uid, m[1] | 0)]);
                }
                if (GLOBAL.INFERNO_ONLY) {
                    // (QoL #153: a mute with the reason the player is shown, typed in the chat box; and their last lines gone)
                    mod.push([KEYS.Get("io_chat2_menu_mute_reason"), "ioChat2MenuMuteReason", (): void => {
                        if (Chat._bymChat != null) {
                            Chat._bymChat.ioChat2MuteWithReason(name);
                        }
                    }]);
                    if (channel) {
                        mod.push([KEYS.Get("io_chat2_menu_purge", { "v1": 10 }), "ioChat2MenuPurge", (): void => {
                            GLOBAL.Message(KEYS.Get("io_chat2_purge_confirm", { "v1": 10, "v2": BYMChat.ioEsc(name) }), KEYS.Get("io_chat2_purge_btn"), (): void => {
                                if (Chat._bymChat != null) {
                                    Chat._bymChat.ioChat2Purge(channel, uid, 10);
                                }
                            });
                        }]);
                    }
                }
            }
            if (mod.length) {
                items.push(["-"]);
                items = items.concat(mod);
            }
        }
        mc = new Sprite();
        mc.name = "ioChatMenu";
        let rows: int = 0;
        let seps: int = 0;
        let gaps: int = 0;
        for (let it of as3.values(items)) {
            if (it[0] == "-") {
                seps++;
            } else if (it[0] == "~") {
                gaps++;
            } else {
                rows++;
            }
        }
        // (who it is: a dot, the tag, the name; under it whether they are on, and their role)
        // (QoL #187: and their card's three lines under it)
        const CARD_Y: int = 42;
        const CARD_LINE: int = 15;
        const HEAD: int = (GLOBAL.INFERNO_ONLY ? CARD_Y + CARD_LINE * 3 + 4 : 46) | 0;
        let h: int = (HEAD + 4 + rows * IoChatMenu.ROW_H + seps * 20 + gaps * 8 + 6) | 0;
        let bg: Shape = new Shape();
        // (the UI kit's obsidian panel, 11 October)
        if (!IoKit.panel(bg.graphics, 0, 0, IoChatMenu.W, h)) {
            bg.graphics.lineStyle(2, 14708778, 1);
            bg.graphics.beginFill(1970704, 0.97);
            bg.graphics.drawRoundRect(0, 0, IoChatMenu.W, h, 12, 12);
            bg.graphics.endFill();
        }
        bg.graphics.lineStyle(1, 5913126, 1);
        bg.graphics.moveTo(8, HEAD - 1);
        bg.graphics.lineTo(IoChatMenu.W - 8, HEAD - 1);
        let online: any = opts.online;
        if (online != null) {
            bg.graphics.lineStyle(1, (online ? 0x1E7A12 : 0x5A5A5A) >>> 0, 1);
            bg.graphics.beginFill((online ? 0x35C21F : 0x8A8A8A) >>> 0, 1);
            bg.graphics.drawCircle(15, 15, 4);
            bg.graphics.endFill();
        }
        mc.addChild(bg);
        mc.filters = [new DropShadowFilter(3, 90, 0, 0.6, 8, 8, 1, 1)];
        let tagHtml: string = opts.tag ? "<font color=\"#E8E0D8\">[</font><font color=\"" + IoWhosOnline.tagColor(opts.aid | 0) + "\">" + BYMChat.ioEsc(String(opts.tag)) + "</font><font color=\"#E8E0D8\">]</font> " : "";
        let title: TextField = IoChatMenu.label(tagHtml + "<font color=\"#FFD24A\">" + BYMChat.ioEsc(name) + "</font>", 13, 16765514, true);
        title.x = online != null ? 24 : 10;
        title.y = 5;
        mc.addChild(title);
        // (Inferno-only, QoL #607: their trophies, small, at the right end of the name's line; the name keeps clear of them)
        let ioCups: int = GLOBAL.INFERNO_ONLY ? IoTrophies.LIST.length * 16 : 0;
        if (title.width > IoChatMenu.W - title.x - 8 - ioCups) {
            title.autoSize = TextFieldAutoSize.NONE;
            title.width = IoChatMenu.W - title.x - 8 - ioCups;
        }
        if (GLOBAL.INFERNO_ONLY) {
            let cups: Sprite = IoTrophies.iconsFor(Number(uid) | 0, 14, true);
            cups.name = "ioChatMenuTrophies";
            cups.x = IoChatMenu.W - 8;
            cups.y = 8;
            mc.addChild(cups);
        }
        let status: string = online == null ? "" : (online ? "<font color=\"#5BE04A\">" + KEYS.Get("io_tr_who_online") + "</font>" : (Number(opts.ago) > 0 ? KEYS.Get("io_t3m_cm_seen", { "v1": IoWhosOnline.ago(Number(opts.ago)) }) : KEYS.Get("io_t3m_cm_offline")));
        let role: string = opts.targetRole == "admin" ? "<font color=\"#FF6A4A\">" + KEYS.Get("io_t3m_cm_admin") + "</font>" : (opts.targetRole == "mod" ? "<font color=\"#7DB8FF\">" + KEYS.Get("io_t3m_cm_moderator") + "</font>" : "");
        let sub: string = [status, role, me ? KEYS.Get("io_t3m_cm_you") : ""].filter((x: string): boolean => !!x).join("  ·  ");
        if (sub) {
            let line2: TextField = IoChatMenu.label(sub, 10, 0xB8B0A8, false);
            line2.x = 10;
            line2.y = 25;
            mc.addChild(line2);
        }
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #187: from memory, or "Loading..." until the card comes, if the menu is still open then)
            let lines: TextField[] = [];
            for (let li: int = 0; li < 3; li++) {
                let tf: TextField = IoChatMenu.label("", 10, 0xD8CFC4, false);
                tf.name = "ioSocCard" + li;
                tf.autoSize = TextFieldAutoSize.NONE;
                tf.width = IoChatMenu.W - 20;
                tf.height = CARD_LINE + 2;
                tf.x = 10;
                tf.y = CARD_Y + li * CARD_LINE;
                mc.addChild(tf);
                lines.push(tf);
            }
            let fill: Function = (card: any): void => {
                let text: any[] = IoSocial.cardLines(card);
                for (let li: int = 0; li < lines.length; li++) {
                    lines[li].htmlText = li < text.length ? String(text[li]) : "";
                    GLOBAL.ioFitText(lines[li], 8);
                }
            };
            let cached: any = IoSocial.card(Number(uid) | 0);
            fill(cached);
            if (cached === undefined) {
                IoSocial.loadCard(Number(uid) | 0, (card: any): void => {
                    if (IoChatMenu._mc == mc) {
                        fill(card);
                    }
                });
            }
        }
        let y: int = HEAD + 3;
        for (let i: int = 0; i < items.length; i++) {
            if (items[i][0] == "~") {
                y += 8;
                continue;
            }
            if (items[i][0] == "-") {
                // (the moderation part: staff only)
                let line: Shape = new Shape();
                line.graphics.lineStyle(1, 5913126, 1);
                line.graphics.moveTo(8, y + 4);
                line.graphics.lineTo(IoChatMenu.W - 8, y + 4);
                mc.addChild(line);
                let head: TextField = IoChatMenu.label(KEYS.Get("io_t3m_cm_moderation"), 10, 14708832, true);
                head.x = 10;
                head.y = y + 4;
                mc.addChild(head);
                y += 20;
                continue;
            }
            mc.addChild(IoChatMenu.row(as3.str(items[i][0]), as3.str(items[i][1]), items[i][2], y));
            y += IoChatMenu.ROW_H;
        }
        // Next to the mouse: right of it, its top at the mouse; left of it, or higher, where the screen ends. On the
        // stage itself: the chat sits over the game's top layer, which hid the menu's lower rows behind its lines.
        // (the stage's own coordinates start where the game's first screen did, centred in the window: what is shown
        // runs from minus half the extra width to the window's width after it; kept to 0..stageWidth, the menu could
        // land far right of a name in the chat at the screen's left edge)
        let stage: Stage = GLOBAL._ROOT.stage;
        let left: number = -(stage.stageWidth - GLOBAL._SCREENINIT.width) / 2;
        let topEdge: number = -(stage.stageHeight - GLOBAL._SCREENINIT.height) / 2;
        let right: number = left + stage.stageWidth;
        let bottom: number = topEdge + stage.stageHeight;
        let x: number = param4 + 12;
        if (x + IoChatMenu.W > right - 4) {
            x = param4 - IoChatMenu.W - 12;
        }
        let top: number = param5 - 12;
        if (top + h > bottom - 4) {
            top = bottom - h - 4;
        }
        mc.x = Math.max(left + 4, Math.min(right - IoChatMenu.W - 4, x)) | 0;
        mc.y = Math.max(topEdge + 4, top) | 0;
        stage.addChild(mc);
        IoChatMenu._mc = mc;
        SOUNDS.Play("click1");
        // (after this click has finished: it would close the menu at once)
        setTimeout((): void => {
            if (IoChatMenu._mc == mc && mc.stage) {
                mc.stage.addEventListener(MouseEvent.MOUSE_DOWN, IoChatMenu.onStageDown, true);
                mc.stage.addEventListener(KeyboardEvent.KEY_DOWN, IoChatMenu.onKey);
            }
        }, 0);
    }

    private static muteFn(param1: string, param2: int): Function {
        return (): void => {
            if (Chat._bymChat != null) {
                Chat._bymChat.ioMute(param1, param2);
            }
        };
    }

    public static Hide(): void {
        if (IoChatMenu._mc == null) {
            return;
        }
        if (IoChatMenu._mc.stage) {
            IoChatMenu._mc.stage.removeEventListener(MouseEvent.MOUSE_DOWN, IoChatMenu.onStageDown, true);
            IoChatMenu._mc.stage.removeEventListener(KeyboardEvent.KEY_DOWN, IoChatMenu.onKey);
        }
        if (IoChatMenu._mc.parent) {
            IoChatMenu._mc.parent.removeChild(IoChatMenu._mc);
        }
        IoChatMenu._mc = null;
    }

    private static onStageDown(param1: MouseEvent): void {
        if (IoChatMenu._mc != null && !IoChatMenu._mc.contains(as3.as(param1.target, DisplayObject))) {
            IoChatMenu.Hide();
        }
    }

    private static onKey(param1: KeyboardEvent): void {
        if (param1.keyCode == Keyboard.ESCAPE) {
            IoChatMenu.Hide();
        }
    }

    private static row(param1: string, param2: string, param3: Function, param4: int): Sprite {
        let hover: Shape = null;
        let b: Sprite = new Sprite();
        b.name = param2;
        b.buttonMode = true;
        b.mouseChildren = false;
        b.x = 4;
        b.y = param4;
        hover = new Shape();
        hover.graphics.beginFill(6961678, 1);
        hover.graphics.drawRoundRect(0, 0, IoChatMenu.W - 8, IoChatMenu.ROW_H - 2, 8, 8);
        hover.graphics.endFill();
        hover.alpha = 0;
        b.addChild(hover);
        let t: TextField = IoChatMenu.label(param1, 12, 15918808, false);
        t.x = 8;
        t.y = ((IoChatMenu.ROW_H - 2 - t.height) / 2) | 0;
        b.addChild(t);
        b.addEventListener(MouseEvent.ROLL_OVER, (e: MouseEvent): void => {
            hover.alpha = 1;
        });
        b.addEventListener(MouseEvent.ROLL_OUT, (e: MouseEvent): void => {
            hover.alpha = 0;
        });
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            e.stopPropagation();
            IoChatMenu.Hide();
            SOUNDS.Play("click1");
            param3();
        });
        return b;
    }

    private static label(param1: string, param2: int, param3: uint, param4: boolean): TextField {
        let t: TextField = new TextField();
        t.defaultTextFormat = new TextFormat("Verdana", param2, param3, param4);
        t.selectable = false;
        t.mouseEnabled = false;
        t.autoSize = TextFieldAutoSize.LEFT;
        t.htmlText = param1;
        return t;
    }
}

import * as as3 from "as3";
import { ASObject, int } from "as3";
import { IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { Timer, getTimer } from "flash/utils";
import { ACADEMY, ALLIANCES, ALLIANCEWINDOW, ARCADE, BASE, BUILDING13, Button_CLIP, Chat, CREATURELOCKER, EnumYardType, GLOBAL, HATCHERY, IoChatLift, IoChatMenu, KEYS, LOGIN, MapRoomManager, POPUPS, SOUNDS, URLLoaderApi } from "@game";

/**
 * Inferno-only: the social bits that several windows share.
 *
 * - (QoL #187) The player card the chat's name menu shows at its top (IoChatMenu): level, world, outposts, the
 *   leaderboards' ranks, the best Hellgate Defense run, when they started. From the server's /playercard (kept a
 *   minute there, and a minute here).
 * - (QoL #188) View yard: a player's yard in view mode (as the alliance's Members list's Visit yard, IoVisitUi), from
 *   the name menu and the Recruit tab, whatever world it is on.
 * - (QoL #140) The "Warn your friends" popups (a monster trained, unlocked or being unlocked, a champion back, a lab
 *   power-up, a siege weapon) get buttons that do something: Train next level, Hatch now, Share in chat. "Warn your
 *   friends" posted to a Facebook page there isn't.
 * - (QoL #195) Browser notifications, opt-in in the page's settings (Shell.ts: "browserNotify"), only while the tab is
 *   hidden: your turn in a Siege duel, an outpost attacked (IoWelcomeBack's watch calls ioNotify), an alliance invite.
 */
export class IoSocial extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    // ---- the player card (QoL #187)
    private static readonly CARD_MS: int = 60000;

    /** uid -> { t (getTimer), card (or null: no one) } */
    private static _cards: any = {};

    /** uid -> the callbacks waiting for its card */
    private static _waiting: any = {};

    /** The card asked for less than a minute ago, or undefined when there is none (null: there is no such player). */
    public static card(uid: int): any {
        let hit: any = IoSocial._cards[uid];
        if (hit && getTimer() - Number(hit.t) < IoSocial.CARD_MS) {
            return hit.card;
        }
        return undefined;
    }

    /** The player's card (`onDone(card or null)`), from memory when it is under a minute old. */
    public static loadCard(uid: int, onDone: Function): void {
        let now: any = IoSocial.card(uid);
        if (now !== undefined) {
            if (onDone != null) {
                onDone(now);
            }
            return;
        }
        let list: any[] = IoSocial._waiting[uid];
        if (list) {
            if (onDone != null) {
                list.push(onDone);
            }
            return;
        }
        IoSocial._waiting[uid] = onDone != null ? [onDone] : [];
        let done: Function = (card: any, keep: boolean): void => {
            if (keep) {
                IoSocial._cards[uid] = { "t": getTimer(), "card": card };
            }
            let waiting: any[] = IoSocial._waiting[uid] || [];
            delete IoSocial._waiting[uid];
            for (let f of as3.values(waiting)) {
                f(card);
            }
        };
        new URLLoaderApi().load(GLOBAL.serverUrl + "playercard", [["userid", String(uid)]], (r: any): void => {
            if (r && !r.error) {
                done(r.card ? r.card : null, true);
            } else {
                done(null, false);
            }
        }, (e: IOErrorEvent): void => {
            done(null, false);
        });
    }

    /**
     * The card's lines for the name menu (html): "Level 34 · World: Ann · Outposts: 5", "Rank 12 of 340 · 3 on their
     * world", "Hellgate best: wave 18 · Started 45d ago". `card` undefined: still loading; null: no one.
     */
    public static cardLines(card: any): any[] {
        if (card === undefined) {
            return [KEYS.Get("io_soc_card_loading")];
        }
        if (card == null || card.user_id == null) {
            return [KEYS.Get("io_soc_card_none")];
        }
        let dot: string = "  ·  ";
        let a: any[] = [];
        if ((card.level | 0) > 0) {
            a.push(KEYS.Get("io_soc_card_level", { "v1": String(card.level | 0) }));
        }
        if (card.world) {
            a.push(KEYS.Get("io_soc_card_world", { "v1": IoSocial.esc(String(card.world)) }));
        }
        a.push(KEYS.Get("io_soc_card_outposts", { "v1": String(card.outposts | 0) }));
        let b: any[] = [];
        if ((card.rank | 0) > 0) {
            b.push(KEYS.Get("io_soc_card_rank", { "v1": String(card.rank | 0), "v2": String(card.rank_of | 0) }));
            if ((card.world_rank | 0) > 0) {
                b.push(KEYS.Get("io_soc_card_world_rank", { "v1": String(card.world_rank | 0) }));
            }
        } else {
            b.push(KEYS.Get("io_soc_card_unranked"));
        }
        let c: any[] = [];
        if (card.hellgate && (card.hellgate.wave | 0) > 0) {
            c.push(KEYS.Get("io_soc_card_hellgate", { "v1": String(card.hellgate.wave | 0) }));
        }
        if (Number(card.joined) > 0) {
            c.push(KEYS.Get("io_soc_card_joined", { "v1": IoSocial.since(Number(card.joined)) }));
        }
        let out: any[] = [a.join(dot), b.join(dot)];
        if (c.length) {
            out.push(c.join(dot));
        }
        return out;
    }

    /** "45d ago" (as the alliance windows say it). */
    private static since(ts: number): string {
        let sec: int = Math.max(0, GLOBAL.Timestamp() - (ts | 0)) | 0;
        let span: string = sec < 3600 ? Math.max(1, (sec / 60) | 0) + "m" : (sec < 86400 ? ((sec / 3600) | 0) + "h" : ((sec / 86400) | 0) + "d");
        return KEYS.Get("io_alliance_ago", { "v1": span });
    }

    private static esc(s: string): string {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // ---- View yard (QoL #188)
    /**
     * A yard, by its base id, in view mode (any world: view mode loads any yard by its id). As IoVisitUi's Visit yard
     * does it: not while a yard loads, an attack runs or the yard is being saved. True when it is on its way.
     */
    public static ViewYard(baseId: number): boolean {
        if (!GLOBAL.INFERNO_ONLY || !(baseId > 0)) {
            return false;
        }
        if (BASE._loading || BASE.ioAttackRunning()) {
            return false;
        }
        if (BASE._saving || BASE._saveCounterA != BASE._saveCounterB) {
            GLOBAL.Message(KEYS.Get("io_visit_saving"));
            return false;
        }
        ALLIANCEWINDOW.Hide();
        IoChatMenu.Hide();
        // (QoL #469: the chat back in its place before the yard's layers are made again)
        IoChatLift.ioTick();
        SOUNDS.Play("click1");
        GLOBAL._currentCell = null;
        let yardType: int = MapRoomManager.instance.isInMapRoom3 ? EnumYardType.PLAYER | 0 : EnumYardType.MAIN_YARD | 0;
        BASE.LoadBase(null, 0, baseId, GLOBAL.e_BASE_MODE.VIEW, false, yardType);
        return true;
    }

    /** A player's yard, by their id: their card says where it is. */
    public static ViewYardOf(uid: int): void {
        if (uid <= 0 || uid == LOGIN._playerID) {
            return;
        }
        IoSocial.loadCard(uid, (card: any): void => {
            let baseId: number = card && card.base_id ? Number(card.base_id) : 0;
            if (!(baseId > 0)) {
                GLOBAL.Message(KEYS.Get("io_soc_view_none"));
                return;
            }
            IoSocial.ViewYard(baseId);
        });
    }

    // ---- Share in chat (QoL #140)
    /** The words go into the chat's box (opened if it was closed), for the player to send or change. */
    public static ShareInChat(text: string): void {
        POPUPS.Next();
        if (Chat._bymChat == null || !Chat._bymChat.chatBox) {
            GLOBAL.Message(KEYS.Get("io_soc_share_no_chat"));
            return;
        }
        if (!Chat._bymChat._open) {
            Chat._bymChat.toggleVisible();
        }
        let box: any = Chat._bymChat.chatBox as any;
        Chat._bymChat.chatBox.ioSetInput(text);
        try {
            if (box.input && box.input.stage) {
                box.input.stage.focus = box.input;
            }
        } catch (e) {
        }
    }

    /** A popup's button: its label (one of ours), its click, and its name (tests). */
    private static setButton(b: Button_CLIP, key: string, name: string, onClick: Function): void {
        if (!b) {
            return;
        }
        b.SetupKey(key);
        b.name = name;
        b.visible = true;
        b.Highlight = true;
        if (b._txt) {
            GLOBAL.ioFitText(b._txt, 9);
        }
        b.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
            onClick();
        });
    }

    /** (QoL #140) Trained a level in the Academy: Train next level (when there is one) and Share in chat. */
    public static ioWarnTrained(mc: any, monsterID: string, monsterName: string, level: int): void {
        let props: any = CREATURELOCKER._creatures && CREATURELOCKER._creatures[monsterID] ? CREATURELOCKER._creatures[monsterID].props : null;
        let levels: any[] = props ? as3.as(props.cResource, Array) : null;
        let more: boolean = GLOBAL._bAcademy != null && (!levels || level < levels.length - 1);
        if (more) {
            IoSocial.setButton(mc.bAction, "io_soc_btn_train_next", "ioSocTrainNext", (): void => {
                POPUPS.Next();
                if (ACADEMY._open && ACADEMY._mc) {
                    ACADEMY._mc.Setup(monsterID);
                    return;
                }
                if (GLOBAL._bAcademy) {
                    ACADEMY.Show(GLOBAL._bAcademy);
                    if (ACADEMY._mc) {
                        ACADEMY._mc.Setup(monsterID);
                    }
                }
            });
        } else if (mc.bAction) {
            mc.bAction.visible = false;
        }
        IoSocial.setButton(more ? mc.bSpeedup : mc.bAction, "io_soc_btn_share", "ioSocShare", (): void => {
            IoSocial.ShareInChat(KEYS.Get("io_soc_share_trained", { "v1": monsterName, "v2": String(level) }));
        });
        if (!more && mc.bSpeedup) {
            mc.bSpeedup.visible = false;
        }
    }

    /** (QoL #140) A monster unlocked: Hatch now (when there is a Hatchery) and Share in chat. */
    public static ioWarnUnlocked(mc: any, monsterName: string): void {
        let hatchery: BUILDING13 = as3.as(GLOBAL._bHatchery, BUILDING13);
        if (hatchery) {
            IoSocial.setButton(mc.bSpeedup, "io_soc_btn_hatch_now", "ioSocHatchNow", (): void => {
                POPUPS.Next();
                let h: BUILDING13 = as3.as(GLOBAL._bHatchery, BUILDING13);
                if (h && !HATCHERY._open) {
                    HATCHERY.Show(h);
                }
            });
        } else if (mc.bSpeedup) {
            mc.bSpeedup.visible = false;
        }
        IoSocial.setButton(mc.bAction, "io_soc_btn_share", "ioSocShare", (): void => {
            IoSocial.ShareInChat(KEYS.Get("io_soc_share_unlocked", { "v1": monsterName }));
        });
    }

    /** (QoL #140) A monster being unlocked (Speed up stays as it is): Share in chat. */
    public static ioWarnUnlocking(mc: any, monsterName: string): void {
        IoSocial.setButton(mc.bAction, "io_soc_btn_share", "ioSocShare", (): void => {
            IoSocial.ShareInChat(KEYS.Get("io_soc_share_unlocking", { "v1": monsterName }));
        });
    }

    /** (QoL #140) A champion back in the yard, a lab power-up or a siege weapon made: Share in chat. */
    public static ioWarnShare(b: Button_CLIP, text: string): void {
        IoSocial.setButton(b, "io_soc_btn_share", "ioSocShare", (): void => {
            IoSocial.ShareInChat(text);
        });
    }

    // ---- browser notifications (QoL #195)
    /** The page's setting (Shell.ts) is on, the browser has allowed them, and the tab is hidden. */
    private static ioMayNotify(): boolean {
        if (!GLOBAL.INFERNO_ONLY || GLOBAL.ioPageSettings.browserNotify !== true) {
            return false;
        }
        try {
            let w: any = window as any;
            return !!w.Notification && String(w.Notification.permission) == "granted" && !!w.document && w.document.hidden === true;
        } catch (e) {
        }
        return false;
    }

    /** Notifications shown, by tag, so one thing is said once. */
    private static _said: any = {};

    /**
     * A browser notification, when the player has turned them on and the tab is hidden: `kind` "siege", "outpost" or
     * "invite" (its title), `text` (html is taken out), `tag` (one notification for one thing). A click brings the tab
     * back. Called by IoWelcomeBack's outpost watch, and here.
     */
    public static ioNotify(kind: string, text: string, tag: string = null): void {
        if (!IoSocial.ioMayNotify()) {
            return;
        }
        let id: string = "bymr-" + kind + (tag ? "-" + tag : "");
        if (tag && IoSocial._said[id]) {
            return;
        }
        IoSocial._said[id] = true;
        let body: string = String(text || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        try {
            let w: any = window as any;
            let n: any = new w.Notification(KEYS.Get("io_soc_nt_" + kind + "_title"), { "body": body, "tag": id });
            n.onclick = (): void => {
                try {
                    w.focus();
                    n.close();
                } catch (e) {
                }
            };
        } catch (e) {
        }
    }

    private static _watch: Timer = null;

    private static _ticks: int = 0;

    /** Starts the hidden-tab checks (once): the alliance's invites every minute, the Siege duels every two. */
    public static ioWatch(): void {
        if (!GLOBAL.INFERNO_ONLY || IoSocial._watch) {
            return;
        }
        // (QoL #469: the chat over the reading windows; its own start is in Chat.initChat, this only makes sure)
        IoChatLift.ioWatch();
        IoSocial._watch = new Timer(60000);
        IoSocial._watch.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            IoSocial._ticks = (IoSocial._ticks + 1) | 0;
            if (!IoSocial.ioMayNotify() || !LOGIN.token) {
                return;
            }
            ALLIANCES.LoadMessages(null, true);
            if (IoSocial._ticks % 2 == 0) {
                ARCADE.call("siege", [["op", "status"]], (r: any): void => {
                    if (r && !r.error) {
                        IoSocial.ioSiegeSeen(r);
                    }
                });
            }
        });
        IoSocial._watch.start();
    }

    /** Invites known already, by id (the first list only notes them). */
    private static _invitesKnown: any = null;

    /** The alliance's inbox has loaded (ALLIANCES): a new invite to the player is news. */
    public static ioInvitesSeen(messages: any[]): void {
        if (!GLOBAL.INFERNO_ONLY || messages == null) {
            return;
        }
        IoSocial.ioWatch();
        let first: boolean = IoSocial._invitesKnown == null;
        if (first) {
            IoSocial._invitesKnown = {};
        }
        for (let m of as3.values(messages)) {
            if (!m || String(m.type) != "invite" || String(m.status) != "pending" || (m.user_id | 0) != LOGIN._playerID) {
                continue;
            }
            let id: string = String(m.invite_id);
            if (IoSocial._invitesKnown[id]) {
                continue;
            }
            IoSocial._invitesKnown[id] = true;
            if (!first) {
                IoSocial.ioNotify("invite", KEYS.Get("io_soc_nt_invite", { "v1": String(m.invited_by_name || m.leader_name || ""), "v2": String(m.alliance_name || "") }), id);
            }
        }
    }

    /** Duels whose turn was already known, by id. */
    private static _duelsKnown: any = null;

    /** The arcade's Siege status: a duel newly waiting for the player's attack (someone challenged them) is news. */
    public static ioSiegeSeen(r: any): void {
        let first: boolean = IoSocial._duelsKnown == null;
        if (first) {
            IoSocial._duelsKnown = {};
        }
        for (let d of as3.values(as3.as(r.duels, Array) || [])) {
            if (!d || !d.canAttack || d.youChallenged) {
                continue;
            }
            let id: string = String(d.id);
            if (IoSocial._duelsKnown[id]) {
                continue;
            }
            IoSocial._duelsKnown[id] = true;
            if (!first) {
                IoSocial.ioNotify("siege", d.rival ? KEYS.Get("io_soc_nt_siege", { "v1": String(d.rival) }) : KEYS.Get("io_soc_nt_siege_open"), id);
            }
        }
    }
}

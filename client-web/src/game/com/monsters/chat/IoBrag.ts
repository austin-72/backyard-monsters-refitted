import * as as3 from "as3";
import { ASObject, int } from "as3";
import { getTimer } from "flash/utils";
import { ALLIANCES, BYMChat, Chat, ChatEvent, GLOBAL, IoMapShare, IoReplays, IoToast, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only (QoL #99, 16 October): "Brag" and "Talk trash" post a short line to the player's chat, on the tab the
 * chat is showing (Global, or Alliance when the player is in one), with the attack's replay token ([replay:...], its
 * pill "Ann vs Bob · 87%") or, without a replay, the yard's map token ([map:x,y:world]). They posted to Facebook.
 *
 * - Brag (ATTACK: the attack log of a main yard, the result of an outpost or a tribe yard; IoAttackLogs' My attacks;
 *   a takeover, BASE): "I just wrecked Bob's yard: 87% and 1.2M looted".
 * - Talk trash (IoAttackLogs' Attacks on me, a player's attack with a replay): a taunt with the attacker's name.
 *
 * The words are one of three variants, at random (io_brag_<kind>1..3). One post every 30 s from these buttons; with the
 * chat off or not connected, or the player muted or banned (heard from the chat server's last refusal), a short notice
 * instead and nothing is sent. What the player had typed into the chat box stays there.
 */
export class IoBrag extends ASObject {
    /** One post from these buttons every 30 seconds. */
    public static readonly RATE_MS: int = 30000;

    /** An attack that destroyed this much of a yard (or its hall) is something to brag about. */
    public static readonly MIN_DAMAGE: int = 50;

    private static readonly VARIANTS: int = 3;

    /** getTimer() of the last post (-1: none yet). */
    private static _lastAt: number = -1;

    /** The chat system listened to for its refusals, and until when the player is muted (epoch ms; -1: banned). */
    private static _heard: any = null;

    private static _mutedUntil: number = 0;

    /** Tests: the last line built for a post (sent or not), and the tab it went to (null: not sent). */
    public static ioLast: string = null;

    public static ioLastTab: string = null;

    public $ctor(): void {
        super.$ctor();
    }

    // ---- the words
    /** A name as it goes into a line: one line, 24 characters at most. */
    private static nameOf(name: any): string {
        return String(name == null ? "" : name).replace(/[\r\n<>]+/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").substr(0, 24);
    }

    /** io_brag_<kind>1..3: one at random, or `pick` (1..3; tests). */
    private static variant(kind: string, args: any, pick: int = 0): string {
        let n: int = pick >= 1 && pick <= IoBrag.VARIANTS ? pick : (1 + Math.floor(Math.random() * IoBrag.VARIANTS)) | 0;
        return KEYS.Get("io_brag_" + kind + n, args);
    }

    /** After a win: "I just wrecked Bob's yard: 87% and 1.2M looted" (without the loot when there was none). */
    public static BragText(name: any, damage: number, loot: number, pick: int = 0): string {
        let d: string = String(Math.max(0, Math.min(100, Math.round(Number(damage) || 0))));
        if (Number(loot) > 0) {
            return IoBrag.variant("win", { "v1": IoBrag.nameOf(name), "v2": d, "v3": GLOBAL.ioShort(Number(loot)) }, pick);
        }
        return IoBrag.variant("winnl", { "v1": IoBrag.nameOf(name), "v2": d }, pick);
    }

    /** After being attacked: a taunt, the attacker's name in it (`damage`: how much of the yard they took). */
    public static TrashText(name: any, damage: number, pick: int = 0): string {
        let d: int = Math.max(0, Math.min(100, Math.round(Number(damage) || 0))) | 0;
        return IoBrag.variant(d < IoBrag.MIN_DAMAGE ? "held" : "hit", { "v1": IoBrag.nameOf(name), "v2": String(d) }, pick);
    }

    /** After a takeover: the previous owner's name (a tribe's or a player's). */
    public static TakeoverText(name: any, pick: int = 0): string {
        return IoBrag.variant("take", { "v1": IoBrag.nameOf(name) }, pick);
    }

    // ---- the tokens
    /** [replay:KEY|Ann|Bob|87] (IoReplays.Token, the chat's pill), or null without a key. */
    public static ReplayToken(key: string, attacker: any, defender: any, damage: number): string {
        if (!key) {
            return null;
        }
        return IoReplays.Token(String(key), { "attacker": attacker, "defender": defender, "damage": Math.max(0, Math.min(100, Math.round(Number(damage) || 0))) });
    }

    /** [map:x,y:world] (IoMapShare.Token), or null for a place that is not on the map. */
    public static MapToken(cellX: number, cellY: number): string {
        if (!(cellX >= 0) || !(cellY >= 0) || cellX > 999 || cellY > 999) {
            return null;
        }
        return IoMapShare.Token(cellX | 0, cellY | 0);
    }

    /** The words and the token, as one chat line. */
    public static Line(text: string, token: string): string {
        return token ? text + " " + token : text;
    }

    // ---- posting
    /** Milliseconds before the next post is allowed (0: now). */
    public static WaitLeft(): int {
        if (IoBrag._lastAt < 0) {
            return 0;
        }
        return Math.max(0, IoBrag.RATE_MS - (getTimer() - IoBrag._lastAt)) | 0;
    }

    /** The chat server's refusals: a "muted" one says until when (no minutes: the account is banned). */
    private static listen(): void {
        let sys: any = BYMChat.chatSystem;
        if (!sys || sys === IoBrag._heard) {
            return;
        }
        IoBrag._heard = sys;
        sys.addEventListener(ChatEvent.SERVER_ERROR, IoBrag.onServerError);
    }

    private static onServerError(e: ChatEvent): void {
        if (!e || as3.as(e.Get("code"), String) != "muted") {
            return;
        }
        let minutes: int = e.Get("minutes") | 0;
        IoBrag._mutedUntil = minutes > 0 ? new Date().getTime() + minutes * 60000 : -1;
        // (our line just now was the one refused: said instead of "Sent to chat", and not counted for the 30 s)
        if (IoBrag._lastAt >= 0 && getTimer() - IoBrag._lastAt < 5000 && e.Get("fresh") != true) {
            IoBrag._lastAt = -1;
            IoToast.Show(KEYS.Get("io_brag_muted"));
        }
    }

    private static muted(): boolean {
        return IoBrag._mutedUntil < 0 || IoBrag._mutedUntil > new Date().getTime();
    }

    /**
     * Posts `text` and `token` as one line to the chat's showing tab (Alliance only when the player is in one). True
     * when it went; otherwise a short notice says why (too soon, the chat off or not connected, muted or banned).
     */
    public static Post(text: string, token: string): boolean {
        let line: string = IoBrag.Line(text, token);
        IoBrag.ioLast = line;
        IoBrag.ioLastTab = null;
        if (!GLOBAL.INFERNO_ONLY || !text) {
            return false;
        }
        let wait: int = IoBrag.WaitLeft();
        if (wait > 0) {
            IoToast.Show(KEYS.Get("io_brag_wait", { "v1": String(Math.ceil(wait / 1000)) }));
            return false;
        }
        let chat: BYMChat = Chat._bymChat;
        if (!chat || !chat.chatBox || !Chat._chatEnabled || !chat.IsConnected) {
            IoToast.Show(KEYS.Get("io_brag_no_chat"));
            return false;
        }
        IoBrag.listen();
        if (IoBrag.muted()) {
            IoToast.Show(KEYS.Get("io_brag_muted"));
            return false;
        }
        let tab: string = chat.ioMode == BYMChat.IO_ALLIANCE && ALLIANCES._allianceID > 0 ? BYMChat.IO_ALLIANCE : BYMChat.IO_GLOBAL;
        // (ioShareLocation sends what is in the box before the token: the box is emptied for it, and given back)
        let draft: string = "";
        try {
            draft = chat.chatBox.inputText || "";
            chat.chatBox.clearInputText();
        } catch (e) {
        }
        let error: string = chat.ioShareLocation(tab, line);
        if (draft) {
            try {
                chat.chatBox.ioSetInput(draft);
            } catch (e) {
            }
        }
        if (error) {
            IoToast.Show(KEYS.Get("io_brag_no_chat"));
            return false;
        }
        IoBrag._lastAt = getTimer();
        IoBrag.ioLastTab = tab;
        SOUNDS.Play("click1");
        IoToast.Show(KEYS.Get("io_brag_sent"));
        return true;
    }

    /**
     * A takeover's Brag (BASE, once the new outpost is up; its "Veni, Vidi, Vici!" popup is gone, QoL #332): a toast
     * with a Brag button that posts it, with the outpost's map token.
     */
    public static ioTakeover(previousOwner: any, cellX: number, cellY: number): void {
        let token: string = IoBrag.MapToken(cellX, cellY);
        if (!GLOBAL.INFERNO_ONLY || !token || !IoBrag.nameOf(previousOwner)) {
            return;
        }
        IoToast.Show(KEYS.Get("io_brag_take_toast", { "v1": IoBrag.nameOf(previousOwner) }), 12000, KEYS.Get("io_brag_btn"), (): void => {
            IoBrag.Post(IoBrag.TakeoverText(previousOwner), token);
        });
    }
}

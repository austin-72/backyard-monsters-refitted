import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Sprite } from "flash/display";
import { MouseEvent } from "flash/events";
import { DropShadowFilter } from "flash/filters";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { ArcadeNet, CasinoUI, GLOBAL, IoKit, IoTd, IoTd2, IoTdUi, IoTdWaves, KEYS, SOUNDS } from "@game";

/**
 * Inferno-only: Hellgate Defense Versus and Co-op (the Devil's Arcade). Each player defends an arena of their
 * own (an ordinary run, IoTd); the two are linked through the arcade's socket (ArcadeNet; the server's
 * RelayRoom passes the messages on and decides the match):
 *
 *  - Versus: waves come by themselves (Auto is on; the first after BUILD_SECONDS). Gold buys monsters to send
 *    into the rival's arena at once (SENDS; they come with the strength of the sender's wave), and every send
 *    raises the gold each cleared wave pays (a tenth of what it cost). The first whose lives run out loses.
 *    Twice IoTd.AUTO_WAIT between waves (IoTd.VERSUS_WAIT; 7 October, the user's).
 *  - Co-op: the same waves in both arenas. Each wave starts when both players are ready (the Ready button), or
 *    READY_SECONDS after the first one is, both being between waves (7 October, the user's: "make both players
 *    ready up (60 sec timer once one does)"); alone (the partner left or fell) it starts when the player is. A monster that gets through a player's maze isn't counted there:
 *    it runs on into the partner's arena (with the health it had left); one that gets through both costs
 *    lives, and the 20 lives are shared. The run ends when they are gone; both are credited the waves held.
 *
 * Leaving loses a Versus match (Co-op: the partner plays on alone, and leaks then cost lives directly).
 * Linked runs don't count for the Solo leaderboard (td/finish with linked=1).
 */
export class IoTdLink extends ASObject {
    public static readonly BUILD_SECONDS: int = 25;

    /** Co-op: the most a wave waits for the second player once the first is ready. */
    public static readonly READY_SECONDS: int = 60;

    /** Co-op: the wave this player is ready for (0: not ready), the wave the partner is ready for. */
    public static readyFor: int = 0;

    public static partnerReadyFor: int = 0;
    /** Co-op: the link dropped mid-run and this player plays on alone (QoL #288). */
    public static linkLost: boolean = false;

    /** Co-op: when the wave starts without the second player (getTimer; 0: no one ready yet). */
    private static _readyDeadline: int = 0;

    /** What can be sent in Versus: [id, label, price, monster, how many]. */
    public static readonly SENDS: any[] = [["spurtz", "5 Spurtz", 60, "IC1", 5], ["sabnox", "4 Sabnox", 220, "IC7", 4], ["valgos", "3 Valgos", 180, "IC4", 3], ["grokus", "Grokus", 380, "IC6", 1], ["wormzer", "King Wormzer", 520, "IC8", 1], ["drull", "Drull", 1500, "IC10", 1]];

    /** QoL #235: a send's label in the player's language (io_t3t_link_send_<id>; the table's English otherwise). */
    private static sendLabel(s: any[]): string {
        return IoTd2.ioWords("io_t3t_link_send_" + s[0], s[1]);
    }

    private static _start: any = null;

    public static on: boolean = false;

    public static mode: string = "";

    public static rivalName: string = "";

    public static rivalLives: int = 20;

    public static rivalWave: int = 0;

    public static rivalGone: boolean = false;

    public static rivalFell: boolean = false;

    /** Versus: extra gold every cleared wave pays (from sends). */
    public static income: int = 0;

    private static _startAt: int = 0;

    private static _sentAt: int = 0;

    private static _shownSecond: int = -1;

    private static _ui: Sprite = null;

    private static _status: TextField = null;

    private static _sendButtons: any[] = [];

    private static _result: any = null;

    private static _fell: boolean = false;

    public static get coop(): boolean {
        return IoTdLink.on && IoTdLink.mode == "coop";
    }

    public static get versus(): boolean {
        return IoTdLink.on && IoTdLink.mode == "versus";
    }

    /** The match is made (ArcadeWindow, the socket's "start"): a run opens, linked. */
    public static Begin(start: any): void {
        IoTdLink._start = start;
        IoTdLink._result = null;
        IoTdLink._fell = false;
        IoTdLink.mode = String(start.mode);
        let players: any[] = as3.as(start.players, Array);
        let you: int = start.you | 0;
        IoTdLink.rivalName = players && players.length > 1 ? String(players[1 - you].name) : KEYS.Get("io_t3t_link_rival");
        IoTdLink.rivalLives = IoTd.START_LIVES;
        IoTdLink.rivalWave = 0;
        IoTdLink.rivalGone = false;
        IoTdLink.rivalFell = false;
        IoTdLink.linkLost = false;
        IoTdLink.income = 0;
        IoTdLink.readyFor = 0;
        IoTdLink.partnerReadyFor = 0;
        IoTdLink._readyDeadline = 0;
        ArcadeNet.handler = IoTdLink.onNet;
        ArcadeNet.onLost = IoTdLink.onLost;
        IoTd.open();
    }

    /** True while a linked run is waiting for its arena to load (IoTd.Setup asks). */
    public static get pending(): boolean {
        return IoTdLink._start != null && !IoTdLink.on;
    }

    /** The arena is up (IoTd.Setup): Auto on, the build time counting down, the link's panel. */
    public static attached(): void {
        IoTdLink.on = true;
        IoTd.auto = true;
        IoTdLink._startAt = (IoTdLink.mode == "coop" ? 0 : getTimer() + IoTdLink.BUILD_SECONDS * 1000) | 0;
        IoTdLink.makeUi();
        IoTdUi.Banner(KEYS.Get(IoTdLink.mode == "versus" ? "io_t3t_link_vs_banner" : "io_t3t_link_coop_banner", { "v1": IoTdLink.rivalName.toUpperCase() }), 16765514, IoTdLink.mode == "coop" ? KEYS.Get("io_t3t_link_coop_sub") : KEYS.Get("io_t3t_link_vs_sub", { "v1": IoTdLink.BUILD_SECONDS }));
    }

    /** Co-op: the next wave this player is waiting for. */
    private static nextWave(): int {
        return (IoTd.cleared + 1) | 0;
    }

    private static partnerHere(): boolean {
        return !IoTdLink.rivalGone && !IoTdLink.rivalFell;
    }

    /**
     * Co-op: the player pressed Ready (IoTd.StartWave from its button). True when the wave waits (for the
     * partner); false when it can start now (the partner is ready too, or gone).
     */
    public static readyUp(): boolean {
        if (!IoTdLink.coop) {
            return false;
        }
        let w: int = IoTdLink.nextWave();
        if (!IoTdLink.partnerHere() || IoTdLink.partnerReadyFor == w) {
            ArcadeNet.send({ "t": "ev", "k": "ready", "w": w });
            IoTdLink.readyFor = 0;
            IoTdLink._readyDeadline = 0;
            return false;
        }
        if (IoTdLink.readyFor != w) {
            IoTdLink.readyFor = w;
            ArcadeNet.send({ "t": "ev", "k": "ready", "w": w });
            SOUNDS.Play("click1");
            IoTdUi.Toast(KEYS.Get("io_t3t_link_ready_wait", { "v1": IoTdLink.rivalName, "v2": IoTdLink.READY_SECONDS }), 3);
        }
        if (IoTdLink._readyDeadline == 0) {
            IoTdLink._readyDeadline = (getTimer() + IoTdLink.READY_SECONDS * 1000) | 0;
        }
        IoTdLink.updateUi();
        return true;
    }

    /** Co-op, between waves: start when both are ready or the minute is up. */
    private static coopTick(now: int): void {
        if (IoTd.waveOn || IoTd.over) {
            return;
        }
        let w: int = IoTdLink.nextWave();
        let mine: boolean = IoTdLink.readyFor == w;
        let theirs: boolean = IoTdLink.partnerReadyFor == w;
        // (the minute starts once someone is ready and this player is between waves)
        if ((mine || theirs) && IoTdLink._readyDeadline == 0) {
            IoTdLink._readyDeadline = (now + IoTdLink.READY_SECONDS * 1000) | 0;
            IoTdLink.updateUi();
        }
        let go: boolean = (mine && (theirs || !IoTdLink.partnerHere())) || (IoTdLink._readyDeadline > 0 && now >= IoTdLink._readyDeadline);
        if (go) {
            IoTdLink.readyFor = 0;
            IoTdLink._readyDeadline = 0;
            IoTd.StartWave();
            IoTdLink.updateUi();
        } else if (IoTdLink._readyDeadline > 0 && (((IoTdLink._readyDeadline - now) / 1000) | 0) != IoTdLink._shownSecond) {
            IoTdLink._shownSecond = ((IoTdLink._readyDeadline - now) / 1000) | 0;
            IoTdLink.updateUi();
        }
    }

    /** Co-op: the start button's words. */
    public static get readyLabel(): string {
        let w: int = IoTdLink.nextWave();
        if (IoTdLink.readyFor == w) {
            return KEYS.Get("io_t3t_link_waiting");
        }
        return IoTdLink.partnerReadyFor == w ? KEYS.Get("io_t3t_link_ready_partner", { "v1": IoTdLink.rivalName }) : KEYS.Get("io_t3t_link_ready");
    }

    /** Every frame (IoTd's tick). */
    public static tick(): void {
        if (!IoTdLink.on) {
            return;
        }
        // (the match ended, or the partner fell, while this arena was loading: those messages were passed over
        // then, and the run went on for a match already over; 9 October)
        if (IoTd.on && !IoTd.over && ((IoTdLink._result && !IoTdLink._result.lost && IoTdLink.mode == "versus") || (IoTdLink.rivalFell && IoTdLink.mode == "coop"))) {
            IoTd.linkedLost();
            IoTdLink.showResult();
            return;
        }
        IoTd.auto = true;
        let now: int = getTimer();
        if (IoTdLink.mode == "coop") {
            IoTdLink.coopTick(now);
        } else if (IoTd.autoLeft > 0 && IoTd.autoLeft != IoTdLink._shownSecond) {
            IoTdLink._shownSecond = IoTd.autoLeft;
            IoTdLink.updateUi();
        }
        if (!IoTd.waveOn && IoTd.cleared == 0 && !IoTd.over && IoTdLink._startAt > 0) {
            if (now >= IoTdLink._startAt) {
                IoTdLink._startAt = 0;
                IoTd.StartWave();
            } else if ((((IoTdLink._startAt - now) / 1000) | 0) != IoTdLink._shownSecond) {
                IoTdLink._shownSecond = ((IoTdLink._startAt - now) / 1000) | 0;
                IoTdLink.updateUi();
            }
        } else if (IoTdLink._startAt > 0 && (IoTd.waveOn || IoTd.cleared > 0)) {
            // (the player started wave 1 early)
            IoTdLink._startAt = 0;
            IoTdLink.updateUi();
        }
        if (now - IoTdLink._sentAt > 2000) {
            IoTdLink._sentAt = now;
            ArcadeNet.send({ "t": "s", "score": IoTd.cleared, "lives": IoTd.lives, "wave": IoTd.wave });
            IoTdLink.updateUi();
        }
    }

    // ---- Versus: sending monsters
    private static sendClick(i: int): Function {
        return (e: MouseEvent): void => {
            e.stopPropagation();
            let s: any[] = as3.cast(IoTdLink.SENDS[i], Array);
            if (IoTd.over || !IoTd.on) {
                return;
            }
            if (IoTd.gold < (s[2] | 0)) {
                IoTdUi.Toast(KEYS.Get("io_t3t_td_no_gold_for", { "v1": IoTdLink.sendLabel(s), "v2": s[2] }));
                return;
            }
            IoTd.gold -= s[2] | 0;
            IoTdLink.income += Math.round((s[2] | 0) / 10) | 0;
            ArcadeNet.send({ "t": "ev", "k": "send", "id": String(s[3]), "n": s[4] | 0, "w": Math.max(1, IoTd.wave) });
            SOUNDS.Play("wmbhorn", 0.4);
            IoTdUi.Toast(KEYS.Get("io_t3t_link_sent", { "v1": IoTdLink.sendLabel(s), "v2": IoTdLink.rivalName, "v3": Math.round((s[2] | 0) / 10) }));
            IoTdUi.Update();
            IoTdLink.updateUi();
        };
    }

    // ---- Co-op: leaks and lives
    /** A monster got through this maze: it runs on into the partner's arena (Co-op). */
    public static relay(id: string, hp: int, leak: int): void {
        ArcadeNet.send({ "t": "ev", "k": "leak", "id": id, "hp": hp, "leak": leak, "w": Math.max(1, IoTd.wave) });
    }

    /** Lives were lost here (Co-op): the partner's count follows. */
    public static lives(n: int): void {
        if (IoTdLink.coop) {
            ArcadeNet.send({ "t": "ev", "k": "life", "n": n });
        }
    }

    // ---- the end
    /** This arena's lives are gone (IoTd.lost): the server ends the match. */
    public static fell(): void {
        if (IoTdLink._fell) {
            return;
        }
        IoTdLink._fell = true;
        if (IoTdLink.linkLost && !IoTdLink._result) {
            // (Co-op on alone after the link dropped: no end comes from the arcade, so this run's own result)
            IoTdLink._result = { "winner": -1, "lost": true, "coop": IoTd.cleared, "alone": true };
        }
        ArcadeNet.send({ "t": "done", "score": IoTd.cleared });
        IoTdLink.updateUi();
        if (IoTdLink._result) {
            IoTdLink.showResult();
        }
    }

    /** Leaving the run (IoTd.Leave). */
    public static leave(): void {
        ArcadeNet.send({ "t": "x" });
    }

    private static onNet(msg: any): void {
        let t: string = String(msg.t);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #367: a dropped connection's grace: this player's (ArcadeNet comes back) or the rival's)
            if (t == "reconnecting") {
                IoTdUi.Toast(KEYS.Get("io_arc2_reconnecting", { "v1": msg.s | 0 }), 6);
                return;
            }
            if (t == "reconnected") {
                IoTdUi.Toast(KEYS.Get("io_arc2_reconnected"), 3);
                return;
            }
            if (t == "away") {
                IoTdUi.Toast(KEYS.Get("io_arc2_away", { "v1": IoTdLink.rivalName, "v2": msg.s | 0 }), 6);
                return;
            }
            if (t == "back") {
                IoTdUi.Toast(KEYS.Get("io_arc2_back", { "v1": IoTdLink.rivalName }), 3);
                return;
            }
        }
        if (t == "s") {
            IoTdLink.rivalLives = msg.lives | 0;
            IoTdLink.rivalWave = msg.score | 0;
            IoTdLink.updateUi();
        } else if (t == "ev") {
            // (each kind only in its mode: a "life" in Versus felled this Hall at once; 9 October)
            if (msg.k == "send" && IoTdLink.mode == "versus" && IoTd.on && !IoTd.over) {
                IoTd.spawnSent(String(msg.id), msg.n | 0, msg.w | 0);
                IoTdUi.Toast(KEYS.Get("io_t3t_link_sent_you", { "v1": IoTdLink.rivalName, "v2": msg.n | 0, "v3": IoTdWaves.name(String(msg.id)) }), 3);
                SOUNDS.Play("wmbhorn", 0.5);
            } else if (msg.k == "leak" && IoTdLink.mode == "coop" && IoTd.on && !IoTd.over) {
                IoTd.spawnRelayed(String(msg.id), msg.hp | 0, msg.leak | 0, msg.w | 0);
                IoTdUi.Toast(KEYS.Get("io_t3t_link_leaked", { "v1": IoTdWaves.name(String(msg.id)), "v2": IoTdLink.rivalName }), 3);
            } else if (msg.k == "ready") {
                IoTdLink.partnerReadyFor = msg.w | 0;
                if (IoTd.on && !IoTd.over && !IoTd.waveOn && IoTdLink.partnerReadyFor == IoTdLink.nextWave() && IoTdLink.readyFor != IoTdLink.partnerReadyFor) {
                    IoTdUi.Toast(KEYS.Get("io_t3t_link_partner_ready", { "v1": IoTdLink.rivalName, "v2": IoTdLink.partnerReadyFor, "v3": IoTdLink.READY_SECONDS }), 4);
                }
                IoTdUi.Update();
                IoTdLink.updateUi();
            } else if (msg.k == "life" && IoTdLink.mode == "coop" && IoTd.on && !IoTd.over) {
                IoTd.lives = Math.min(IoTd.lives, msg.n | 0) | 0;
                IoTdUi.Update();
                if (IoTd.lives <= 0) {
                    IoTd.linkedLost();
                }
            }
        } else if (t == "done") {
            IoTdLink.rivalFell = true;
            if (IoTdLink.mode == "coop" && IoTd.on && !IoTd.over) {
                IoTd.linkedLost();
            }
            IoTdLink.updateUi();
        } else if (t == "left") {
            IoTdLink.rivalGone = true;
            IoTdUi.Toast(KEYS.Get("io_t3t_link_left", { "v1": IoTdLink.rivalName }), 4);
            IoTdLink.updateUi();
        } else if (t == "end") {
            IoTdLink._result = msg;
            if (IoTdLink.mode == "versus" && IoTd.on && !IoTd.over) {
                // (the rival fell or left: the match is won, this run ends here)
                IoTd.linkedLost();
            }
            IoTdLink.showResult();
        }
    }

    private static onLost(message: string): void {
        if (!IoTdLink.on) {
            return;
        }
        if (IoTdLink.mode == "coop" && IoTd.on && !IoTd.over) {
            // (Co-op: a dropped link counts as the partner leaving; the run plays on alone and leaks cost lives
            // directly. It ended the run before; QoL #288.)
            IoTdLink.linkLost = true;
            IoTdLink.rivalGone = true;
            IoTdLink.partnerReadyFor = 0;
            IoTdUi.Toast(KEYS.Get("io_t3t_link_lost_alone", { "v1": IoTdLink.rivalName }), 7);
            IoTdLink.updateUi();
            IoTdUi.Update();
            return;
        }
        IoTdUi.Toast(message, 6);
        IoTdLink._result = { "winner": -1, "lost": true };
        if (IoTd.on && !IoTd.over) {
            IoTd.linkedLost();
        }
        IoTdLink.showResult();
    }

    // ---- the link's panel (left of the screen) and the result
    private static makeUi(): void {
        IoTdLink.removeUi();
        IoTdLink._ui = new Sprite();
        IoTdLink._ui.name = "tdLink";
        let w: int = 176;
        let h: int = (IoTdLink.mode == "versus" ? 82 + IoTdLink.SENDS.length * 34 : 104) | 0;
        // (the UI kit's obsidian panel, 11 October)
        if (!IoKit.panel(IoTdLink._ui.graphics, 0, 0, w, h)) {
            IoTdLink._ui.graphics.lineStyle(2, 10115626, 1);
            IoTdLink._ui.graphics.beginFill(2759184, 0.93);
            IoTdLink._ui.graphics.drawRoundRect(0, 0, w, h, 14, 14);
            IoTdLink._ui.graphics.endFill();
        }
        IoTdLink._ui.filters = [new DropShadowFilter(3, 60, 0, 0.6, 6, 6)];
        let head: TextField = CasinoUI.label(KEYS.Get(IoTdLink.mode == "versus" ? "io_t3t_link_vs" : "io_t3t_link_coop"), 12, 16765514, true, w, TextFormatAlign.CENTER);
        head.y = 6;
        IoTdLink._ui.addChild(head);
        IoTdLink._status = CasinoUI.label("", 11, 15918796, true, (w - 12) | 0, TextFormatAlign.CENTER);
        IoTdLink._status.multiline = true;
        IoTdLink._status.wordWrap = true;
        IoTdLink._status.height = IoTdLink.mode == "coop" ? 70 : 46;
        IoTdLink._status.x = 6;
        IoTdLink._status.y = 24;
        IoTdLink._ui.addChild(IoTdLink._status);
        IoTdLink._sendButtons = [];
        if (IoTdLink.mode == "versus") {
            let i: int = 0;
            while (i < IoTdLink.SENDS.length) {
                let b: Sprite = CasinoUI.button(IoTdLink.sendLabel(IoTdLink.SENDS[i]) + "  " + IoTdLink.SENDS[i][2], (w - 16) | 0, 30, IoTdLink.sendClick(i), true, 11);
                b.name = "tdSend:" + IoTdLink.SENDS[i][0];
                b.x = 8;
                b.y = 78 + i * 34;
                IoTdLink._ui.addChild(b);
                IoTdLink._sendButtons.push(b);
                i++;
            }
        }
        GLOBAL._layerUI.addChild(IoTdLink._ui);
        let s: any = GLOBAL._SCREEN;
        IoTdLink._ui.x = (s.x + 8) | 0;
        IoTdLink._ui.y = (s.y + 120) | 0;
        IoTdLink.updateUi();
    }

    private static updateUi(): void {
        if (!IoTdLink._ui || !IoTdLink._status) {
            return;
        }
        let s: any = GLOBAL._SCREEN;
        IoTdLink._ui.x = (s.x + 8) | 0;
        IoTdLink._ui.y = (s.y + 120) | 0;
        let next: string = "";
        // (QoL #235: in the player's language)
        if (IoTdLink._startAt > 0) {
            next = KEYS.Get("io_t3t_link_wave1_in", { "v1": Math.max(0, Math.ceil((IoTdLink._startAt - getTimer()) / 1000)) }) + "\n";
        } else if (IoTdLink.mode == "versus" && IoTd.autoLeft > 0) {
            next = KEYS.Get("io_t3t_link_next_in", { "v1": IoTd.autoLeft }) + "\n";
        } else if (IoTdLink.mode == "coop" && !IoTd.waveOn && !IoTd.over) {
            let w: int = IoTdLink.nextWave();
            next = KEYS.Get(IoTdLink.readyFor == w ? "io_t3t_link_you_ready" : "io_t3t_link_you_not") + "  ·  " + KEYS.Get(IoTdLink.partnerReadyFor == w ? "io_t3t_link_p_ready" : "io_t3t_link_p_not") + (IoTdLink._readyDeadline > 0 ? "\n" + KEYS.Get("io_t3t_link_wave_in", { "v1": w, "v2": Math.max(0, Math.ceil((IoTdLink._readyDeadline - getTimer()) / 1000)) }) : "") + "\n";
        }
        let who: string = IoTdLink.rivalName + (IoTdLink.linkLost ? " " + KEYS.Get("io_t3t_link_s_lost") : IoTdLink.rivalGone ? " " + KEYS.Get("io_t3t_link_s_left") : (IoTdLink.rivalFell ? " " + KEYS.Get("io_t3t_link_s_fallen") : ""));
        if (IoTdLink.mode == "versus") {
            IoTdLink._status.text = next + KEYS.Get("io_t3t_link_status_vs", { "v1": who, "v2": IoTdLink.rivalWave, "v3": IoTdLink.rivalLives }) + "\n" + KEYS.Get("io_t3t_link_income", { "v1": IoTdLink.income });
            let i: int = 0;
            while (i < IoTdLink._sendButtons.length) {
                CasinoUI.enable(as3.cast(IoTdLink._sendButtons[i], Sprite), IoTd.gold >= (IoTdLink.SENDS[i][2] | 0) && !IoTd.over && !IoTdLink.rivalGone && !IoTdLink.rivalFell);
                i++;
            }
        } else {
            IoTdLink._status.text = next + KEYS.Get("io_t3t_link_status_coop", { "v1": who, "v2": IoTdLink.rivalWave }) + "\n" + KEYS.Get("io_t3t_link_shared", { "v1": IoTd.lives });
        }
    }

    private static removeUi(): void {
        if (IoTdLink._ui && IoTdLink._ui.parent) {
            IoTdLink._ui.parent.removeChild(IoTdLink._ui);
        }
        IoTdLink._ui = null;
        IoTdLink._status = null;
        IoTdLink._sendButtons = [];
    }

    /** The match's result, once both the server's end and this run's end are in. */
    private static showResult(): void {
        if (!IoTdLink._result || !IoTd.over) {
            return;
        }
        let won: boolean = !IoTdLink._result.lost && (IoTdLink._result.winner | 0) == (IoTdLink._start.you | 0);
        let title: string = null;
        let line: string = null;
        // (QoL #235: in the player's language)
        let held: int = IoTdLink._result.coop | 0;
        if (IoTdLink._result.alone) {
            title = KEYS.Get("io_t3t_link_t_hall");
            line = KEYS.Get(held == 1 ? "io_t3t_link_l_alone_one" : "io_t3t_link_l_alone_n", { "v1": IoTdLink.rivalName, "v2": held });
        } else if (IoTdLink._result.lost) {
            title = KEYS.Get("io_t3t_link_t_disc");
            line = KEYS.Get("io_t3t_link_l_lost", { "v1": IoTdLink.rivalName });
        } else if (IoTdLink.mode == "coop") {
            title = KEYS.Get(IoTdLink._result.reason == "time" ? "io_t3t_link_t_time" : "io_t3t_link_t_halls");
            line = KEYS.Get(held == 1 ? "io_t3t_link_l_together_one" : "io_t3t_link_l_together_n", { "v1": IoTdLink.rivalName, "v2": held });
        } else if ((IoTdLink._result.winner | 0) < 0) {
            // (a draw: the match ran out of time with both Halls standing; it said "Defeat"; 9 October)
            title = KEYS.Get("io_t3t_link_t_draw");
            line = KEYS.Get("io_t3t_link_l_draw");
        } else {
            title = KEYS.Get(won ? "io_t3t_td2ui_victory" : "io_t3t_link_t_defeat");
            line = won ? KEYS.Get(IoTdLink._result.reason == "left" ? "io_t3t_link_l_left_win" : "io_t3t_link_l_win", { "v1": IoTdLink.rivalName }) : KEYS.Get("io_t3t_link_l_lose", { "v1": IoTdLink.rivalName });
        }
        IoTdUi.LinkedOver(title, line, (won ? 0x7CFF6A : (IoTdLink.mode == "coop" || (IoTdLink._result.winner | 0) < 0 ? 0xFFD24A : 0xFF6A5A)) >>> 0);
    }

    /** The run is over and left (IoTd.Cleanup): the link is let go. */
    public static Cleanup(): void {
        if (!IoTdLink.on && !IoTdLink._start) {
            return;
        }
        IoTdLink.on = false;
        IoTdLink._start = null;
        IoTdLink.removeUi();
        ArcadeNet.close();
    }
}

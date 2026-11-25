import * as as3 from "as3";
import { int } from "as3";
import { GradientType, MovieClip, Sprite } from "flash/display";
import { IOErrorEvent, MouseEvent, TimerEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Rectangle } from "flash/geom";
import { SharedObject } from "flash/net";
import { TextField, TextFormatAlign } from "flash/text";
import { Timer, getTimer } from "flash/utils";
import { IoSocial, ARCADE, ArcadeWindow, BASE, BFOUNDATION, BRESOURCE, CasinoUI, GLOBAL, InstanceManager, IoAttackLogs, IoKit, IoMapShare, IoOutpostsPopup, IoQuestBook, IoQuests, IoReplays, IoSiege, IoTd, IoToast, IoWin, KEYS, LOGIN, MapRoomManager, POPUPS, SOUNDS, UI2, URLLoaderApi, WMATTACK } from "@game";

/**
 * Inferno-only (15 October): what the player finds on coming back, in one card, and the outposts watched while
 * they play.
 *
 * - QoL #461 / #91: the "Welcome back" card. As the session's first yard of the player's own loads (their main yard,
 *   build mode), POPUPS holds the popups that yard brings (ioBegin: POPUPS.Setup; POPUPS.Push and Show wait while
 *   `holding`). Once the yard has loaded (and the attack logs, the Siege duels and the quest book have answered, 4 s
 *   at most) the card goes first in the queue, and the popups it covers leave it (POPUPS.ioRelease): the "attacked
 *   you" ones (popup_attackedme, the away summary), the repair one and the injured one (popup_damaged). The rest
 *   follow it as before. Its rows:
 *     - while you were away: each attack on the player since they last looked (the attack logs, attacklogs/game):
 *       the attacker, the yard, the damage, the loot lost, with Replay (IoReplays) and Revenge (the map on the
 *       attacker's main yard: IoMapShare.OpenOwnWorld, as the Attack Log's Revenge), and the Attack Log;
 *     - the yard: buildings damaged (Repair all, as the repair popup's), repairs under way, monsters injured (Heal,
 *       BASE.startHealAllHelper), harvesters full (Bank all, BRESOURCE.ioBankAll);
 *     - waiting: the Daily Reward, quests to collect, Siege duels waiting for the player's attack (QoL #132).
 *   Shown when there was an attack, damage, an injury or a duel waiting; else the popups go on as before.
 * - QoL #634: while the player has outposts, every minute the attack logs' last two hours (attacklogs/game recent=1):
 *   an outpost attacked, wrecked or taken says so (IoToast, the horn), with a red mark on the top bar's Outposts.
 */
export class IoWelcomeBack {
    // ---- the hold (POPUPS)
    /** The session's card was shown (or not needed): later yards' popups go as before. */
    private static _done: boolean = false;

    /** A load is being watched for the card (POPUPS holds its popups meanwhile). */
    private static _watching: boolean = false;

    /** Each watch's number: an answer for an older one is dropped. */
    private static _seq: int = 0;

    private static _timer: Timer = null;

    private static _startedAt: int = 0;

    /** When the yard finished loading (getTimer), 0 before. */
    private static _loadedAt: int = 0;

    /** The yard was seen loading (the login's POPUPS.Setup comes before it begins). */
    private static _sawLoading: boolean = false;

    private static _logs: any = null;

    private static _logsDone: boolean = false;

    private static _siege: any = null;

    private static _siegeDone: boolean = false;

    /** The card on screen (or queued). */
    public static mc: MovieClip = null;

    /** How long the popups are held at most (a load that never ends). */
    private static readonly HOLD_MAX_MS: int = 90000;

    /** How long after the yard has loaded the answers are waited for. */
    private static readonly ANSWER_WAIT_MS: int = 4000;

    /**
     * POPUPS.Setup, as a yard begins to load: whether its popups are held for the card (the session's first load of
     * the player's own yard in build mode). Asks for the attack logs and the Siege duels meanwhile.
     */
    public static ioBegin(): boolean {
        if (!GLOBAL.INFERNO_ONLY || IoWelcomeBack._done || GLOBAL._loadmode != GLOBAL.e_BASE_MODE.BUILD || !LOGIN.token) {
            IoWelcomeBack.stop();
            return false;
        }
        // (the login's POPUPS.Setup, then the yard's: the answers asked for at the first serve the second)
        if (IoWelcomeBack._watching && IoWelcomeBack._loadedAt == 0 && getTimer() - IoWelcomeBack._startedAt < 30000) {
            IoWelcomeBack._sawLoading = IoWelcomeBack._sawLoading || BASE._loading;
            return true;
        }
        IoWelcomeBack.stop();
        IoWelcomeBack._watching = true;
        IoWelcomeBack._sawLoading = BASE._loading;
        let seq: int = ++IoWelcomeBack._seq;
        IoWelcomeBack._startedAt = getTimer();
        IoWelcomeBack._loadedAt = 0;
        IoWelcomeBack._logs = null;
        IoWelcomeBack._logsDone = false;
        IoWelcomeBack._siege = null;
        IoWelcomeBack._siegeDone = false;
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["v", 1]], (r: any): void => {
            if (seq == IoWelcomeBack._seq) {
                IoWelcomeBack._logs = r && !r.error ? r : null;
                IoWelcomeBack._logsDone = true;
            }
        }, (e: IOErrorEvent): void => {
            if (seq == IoWelcomeBack._seq) {
                IoWelcomeBack._logsDone = true;
            }
        });
        ARCADE.call("siege", [["op", "status"]], (r: any): void => {
            if (seq == IoWelcomeBack._seq) {
                IoWelcomeBack._siege = r && !r.error ? r : null;
                IoWelcomeBack._siegeDone = true;
            }
        });
        IoWelcomeBack._timer = new Timer(250);
        IoWelcomeBack._timer.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            if (seq == IoWelcomeBack._seq) {
                IoWelcomeBack.tick();
            }
        });
        IoWelcomeBack._timer.start();
        return true;
    }

    private static stop(): void {
        if (IoWelcomeBack._timer) {
            IoWelcomeBack._timer.stop();
            IoWelcomeBack._timer = null;
        }
        IoWelcomeBack._watching = false;
    }

    /** The watch: the load done, the answers in (or waited for), the card made and the popups let go. */
    private static tick(): void {
        let now: int = getTimer();
        if (now - IoWelcomeBack._startedAt > IoWelcomeBack.HOLD_MAX_MS) {
            IoWelcomeBack.stop();
            POPUPS.ioRelease(null);
            return;
        }
        if (GLOBAL._catchup || BASE._loading) {
            IoWelcomeBack._sawLoading = true;
            return;
        }
        // (asked at the login, before the yard began to load)
        if (!IoWelcomeBack._sawLoading) {
            return;
        }
        if (!IoWelcomeBack._loadedAt) {
            IoWelcomeBack._loadedAt = now;
            // (not the player's own main yard in build mode (a replay loads in view mode), a Designer draft, a raid
            // under way: no card, and the next yard of theirs may have it)
            if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD || !BASE.isMainYardOrInfernoMainYard || GLOBAL.ioDesignMode() || WMATTACK._inProgress || IoTd.on) {
                IoWelcomeBack.stop();
                POPUPS.ioRelease(null);
                return;
            }
            IoWelcomeBack.ioWatchOutposts();
        }
        let answered: boolean = IoWelcomeBack._logsDone && IoWelcomeBack._siegeDone && (!IoQuests.on || IoQuests.book != null);
        if (!answered && now - IoWelcomeBack._loadedAt < IoWelcomeBack.ANSWER_WAIT_MS) {
            return;
        }
        IoWelcomeBack.stop();
        IoWelcomeBack._done = true;
        let data: any = IoWelcomeBack.gather();
        POPUPS.ioRelease(IoWelcomeBack.wanted(data) ? IoWelcomeBack.build(data) : null);
        if (data.attacks.length || data.attackers.length) {
            IoWelcomeBack.markSeen(data);
        }
    }

    // ---- what the card says
    /** A per-player mark kept in this browser ("ioWbSeen", and the Attack Log's "ioAlSeen"). */
    private static mark(key: string, value: string = null): number {
        try {
            let so: SharedObject = SharedObject.getLocal("bymr_data", "/");
            let name: string = key + LOGIN._playerID;
            if (value != null) {
                so.data[name] = value;
                so.flush();
            }
            return Number(so.data[name]) || 0;
        } catch (e) {
        }
        return 0;
    }

    /** The server's clock now (the logs' `now`, moved on since; else the game's). */
    private static serverNow(): number {
        return IoWelcomeBack._logs && IoWelcomeBack._logs.now ? Number(IoWelcomeBack._logs.now) + (getTimer() - IoWelcomeBack._startedAt) / 1000 : GLOBAL.Timestamp();
    }

    /** Everything the card shows, read from the game as it is now and the answers. */
    private static gather(): any {
        let data: any = { "attacks": [], "more": 0, "attackers": [], "away": BASE._catchupTime | 0, "damaged": 0, "repairing": 0, "injured": 0, "full": 0, "daily": -1, "quests": 0, "siege": null };
        let now: number = IoWelcomeBack.serverNow();
        // the attacks since the player last looked: newer than the card's mark or the Attack Log's; with neither (a new
        // browser), since the first attack not seen yet, or the last day
        let since: number = Math.max(IoWelcomeBack.mark("ioWbSeen"), IoWelcomeBack.mark("ioAlSeen"));
        let unseenFrom: number = 0;
        for (let a of as3.values(BASE._currentAttacks || [])) {
            if (a && !a.seen && Number(a.starttime) > 0 && (unseenFrom == 0 || Number(a.starttime) < unseenFrom)) {
                unseenFrom = Number(a.starttime);
            }
        }
        if (since <= 0) {
            since = unseenFrom > 0 ? unseenFrom - 120 : now - 86400;
        }
        if (IoWelcomeBack._logs) {
            for (let row of as3.values(as3.as(IoWelcomeBack._logs.onme, Array) || [])) {
                let log: any = IoWelcomeBack.parseRow(row);
                if (log.at > since && log.uid != LOGIN._playerID && log.uid > 0) { // (QoL #92: a wild raid, fought while online, isn't news)
                    data.attacks.push(log);
                }
            }
        }
        if (!IoWelcomeBack._logs) {
            // (no logs: the yard's own list of who attacked, as the old popups had it)
            for (let a of as3.values(BASE._attackerArray || [])) {
                data.attackers.push(a);
            }
        }
        let shown: int = Math.min(data.attacks.length, 4) | 0;
        data.more = (data.attacks.length - shown) | 0;
        // the yard
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b.health < b.maxHealth) {
                if (b._repairing == 0) {
                    data.damaged++;
                } else {
                    data.repairing++;
                }
            }
        }
        try {
            let list: any = GLOBAL.player ? GLOBAL.player.monsterList : null;
            let hurt: boolean = false;
            for (let i: int = 0; list && i < list.length && !hurt; i++) {
                if (as3.vget(list, i).needsHeals()) {
                    hurt = true;
                }
            }
            data.injured = hurt ? GLOBAL.player.getNumDamagedCreeps() | 0 : 0;
        } catch (e) {
            data.injured = 0;
        }
        for (let r of (InstanceManager.getInstancesByClass(BRESOURCE) ?? [])) {
            let h: BRESOURCE = r as BRESOURCE;
            if (h._class === "resource" && h._countdownUpgrade.Get() === 0 && h._countdownBuild.Get() === 0 && h._countdownFortify.Get() === 0 && h.health === h.maxHealth && h._stored && h._stored.Get() > 0 && h._stored.Get() >= h.productionCapacity) {
                data.full++;
            }
        }
        // waiting
        try {
            let streak: any = GLOBAL._flags && GLOBAL._flags.io_streak ? JSON.parse(String(GLOBAL._flags.io_streak)) : null;
            if (streak && (streak.collected | 0) != 1) {
                data.daily = streak.offerShiny | 0;
            }
        } catch (e) {
        }
        data.quests = IoQuests.on ? IoQuests.ready | 0 : 0;
        if (IoWelcomeBack._siege) {
            let turns: any = IoSiege.ioTurns(IoWelcomeBack._siege);
            if (turns.n > 0) {
                data.siege = turns;
            }
        }
        return data;
    }

    /** A row of attacklogs/game's `onme` ([id, at, name, uid, type, x, y, level, damage, destroyed, ended, loot, replay, hx, hy]). */
    private static parseRow(row: any): any {
        let loot: any[] = [];
        for (let n of as3.values(as3.as(row[11], Array) || [])) {
            loot.push(Number(n));
        }
        return { "id": row[0] | 0, "at": row[1] | 0, "name": String(row[2]), "uid": row[3] | 0, "type": String(row[4]), "x": row[5] | 0, "y": row[6] | 0, "damage": row[8] | 0, "ended": (row[10] | 0) == 1, "loot": loot, "replay": row.length > 12 ? String(row[12] || "") : "", "hx": row.length > 14 ? row[13] | 0 : -1, "hy": row.length > 14 ? row[14] | 0 : -1 };
    }

    /** The card is shown for an attack, damage, an injury or a duel waiting (not for a reward alone). */
    private static wanted(data: any): boolean {
        return data.attacks.length > 0 || data.attackers.length > 0 || data.damaged > 0 || data.injured > 0 || data.siege != null;
    }

    /** The attacks shown are seen: the card's mark, and the yard's own list (as the Alerts bell marks it). */
    private static markSeen(data: any): void {
        let newest: number = 0;
        for (let l of as3.values(data.attacks)) {
            newest = Math.max(newest, Number(l.at));
        }
        if (newest > 0) {
            IoWelcomeBack.mark("ioWbSeen", String(newest));
        }
        if (BASE._currentAttacks && BASE._currentAttacks.length > 0) {
            for (let a of as3.values(BASE._currentAttacks)) {
                a.seen = true;
            }
            BASE._attacksModified = true;
            BASE.Save();
        }
    }

    // ---- the card
    private static readonly W: int = 560;

    private static readonly ATTACK_H: int = 46;

    private static readonly ROW_H: int = 32;

    /** "your main yard", "your outpost (12, 40)" */
    private static yardText(log: any): string {
        return log.type == "outpost" ? KEYS.Get("io_away_wb_outpost", { "v1": log.x, "v2": log.y }) : KEYS.Get("io_away_wb_main");
    }

    /** "12k Bone, 3k Coal" or "nothing" */
    private static lootText(loot: any[]): string {
        let parts: string[] = [];
        for (let i: int = 0; i < 4; i++) {
            if (Number(loot[i]) >= 1) {
                parts.push(GLOBAL.ioShort(Number(loot[i])) + " " + KEYS.Get(as3.str(GLOBAL._resourceNames[i])));
            }
        }
        return parts.length ? parts.join(", ") : KEYS.Get("io_away_wb_nothing");
    }

    /** Makes the card (a MovieClip drawn round its centre, for POPUPS' queue). */
    public static build(data: any): MovieClip {
        let W: int = IoWelcomeBack.W;
        let attacksShown: int = Math.min(data.attacks.length, 4) | 0;
        let attackers: int = Math.min(data.attackers.length, 4) | 0;
        let yardRows: int = (data.damaged > 0 || data.repairing > 0 ? 1 : 0) + (data.injured > 0 ? 1 : 0) + (data.full > 0 ? 1 : 0);
        let waitRows: int = (data.daily >= 0 ? 1 : 0) + (data.quests > 0 ? 1 : 0) + (data.siege ? 1 : 0);
        let H: int = 78;
        if (attacksShown + attackers > 0) {
            H += 28 + attacksShown * (IoWelcomeBack.ATTACK_H + 4) + attackers * (IoWelcomeBack.ROW_H + 4) + (data.more > 0 ? 18 : 0) + 6;
        }
        if (yardRows > 0) {
            H += 28 + yardRows * (IoWelcomeBack.ROW_H + 4) + 6;
        }
        if (waitRows > 0) {
            H += 28 + waitRows * (IoWelcomeBack.ROW_H + 4) + 6;
        }
        H += 56;
        let left: int = (-W / 2) | 0;
        let top: int = (-H / 2) | 0;
        let mc: MovieClip = new MovieClip();
        mc.name = "ioWelcomeBack";
        let bg: Sprite = as3.as(mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(W, H, Math.PI / 2, left, top);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(left, top, W, H, 22, 22);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        IoKit.rim(mc, "ioWelcomeBackRim", left, top, W, H, bg);
        let title: TextField = as3.as(mc.addChild(CasinoUI.title(KEYS.Get("io_away_wb_title"), 24, W - 90, TextFormatAlign.LEFT)), TextField);
        title.name = "ioWelcomeBackTitle";
        GLOBAL.ioFitText(title, 16);
        title.x = left + 20;
        title.y = top + 12;
        let subText: string = data.away >= 60 ? KEYS.Get("io_away_wb_away", { "v1": GLOBAL.ioDuration(data.away) }) : "";
        let sub: TextField = as3.as(mc.addChild(CasinoUI.label(subText, 11, CasinoUI.ASH, true, W - 44, TextFormatAlign.LEFT)), TextField);
        sub.name = "ioWelcomeBackSub";
        sub.x = left + 22;
        sub.y = top + 49;
        IoWin.closeX(mc, "ioWelcomeBackClose", -left, top, (e: any = null): void => {
            POPUPS.Next();
        });
        let y: int = (top + 76) | 0;
        let rowW: int = (W - 40) | 0;
        // while you were away
        if (attacksShown + attackers > 0) {
            IoWelcomeBack.heading(mc, KEYS.Get("io_away_wb_sec_attacks"), left + 22, y);
            let log: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_away_wb_log"), 110, 22, (e: MouseEvent): void => {
                POPUPS.Next();
                IoAttackLogs.Show();
            }, true, 11)), Sprite);
            log.name = "ioWbAttackLog";
            log.x = -left - 20 - 110;
            log.y = y - 1;
            y += 26;
            for (let i: int = 0; i < attacksShown; i++) {
                IoWelcomeBack.attackRow(mc, data.attacks[i], i, left + 20, y, rowW);
                y += IoWelcomeBack.ATTACK_H + 4;
            }
            for (let i: int = 0; i < attackers; i++) {
                let a: any = data.attackers[i];
                let name: string = String(a.name || "?");
                let ago: string = KEYS.Get("io_away_wb_ago", { "v1": GLOBAL.ioDuration(Math.max(0, BASE._currentTime - (a.lastTime | 0))) });
                let text: string = (a.count | 0) > 1 ? KEYS.Get("io_away_wb_attacker_n", { "v1": name, "v2": a.count | 0, "v3": ago }) : KEYS.Get("io_away_wb_attacker", { "v1": name, "v2": ago });
                IoWelcomeBack.simpleRow(mc, "ioWbAttacker:" + i, text, left + 20, y, rowW, null, null, null);
                y += IoWelcomeBack.ROW_H + 4;
            }
            if (data.more > 0) {
                let more: TextField = as3.as(mc.addChild(CasinoUI.label(KEYS.Get("io_away_wb_more", { "v1": data.more }), 10, CasinoUI.ASH, false, rowW, TextFormatAlign.LEFT)), TextField);
                more.name = "ioWbMore";
                more.x = left + 24;
                more.y = y - 2;
                y += 18;
            }
            y += 6;
        }
        // the yard
        if (yardRows > 0) {
            IoWelcomeBack.heading(mc, KEYS.Get("io_away_wb_sec_yard"), left + 22, y);
            y += 26;
            if (data.damaged > 0) {
                IoWelcomeBack.simpleRow(mc, "ioWbRepair", KEYS.Get("io_away_wb_damaged", { "v1": data.damaged }) + (data.repairing > 0 ? "  ·  " + KEYS.Get("io_away_wb_repairing", { "v1": data.repairing }) : ""), left + 20, y, rowW, KEYS.Get("io_away_wb_repair_btn"), "ioWbRepairAll", (row: any): void => {
                    let n: int = IoWelcomeBack.repairAll();
                    row.done(KEYS.Get("io_away_wb_repair_done", { "v1": n + data.repairing }));
                });
                y += IoWelcomeBack.ROW_H + 4;
            } else if (data.repairing > 0) {
                IoWelcomeBack.simpleRow(mc, "ioWbRepair", KEYS.Get("io_away_wb_repairing", { "v1": data.repairing }), left + 20, y, rowW, null, null, null);
                y += IoWelcomeBack.ROW_H + 4;
            }
            if (data.injured > 0) {
                IoWelcomeBack.simpleRow(mc, "ioWbInjured", KEYS.Get("io_away_wb_injured", { "v1": data.injured }), left + 20, y, rowW, KEYS.Get("io_away_wb_heal_btn"), "ioWbHeal", (row: any): void => {
                    // (the heal's own end closes the popup on screen: the card stays)
                    POPUPS.ioKeepOpen((): void => {
                        BASE.startHealAllHelper();
                    });
                    row.done(KEYS.Get("io_away_wb_heal_done"));
                });
                y += IoWelcomeBack.ROW_H + 4;
            }
            if (data.full > 0) {
                IoWelcomeBack.simpleRow(mc, "ioWbHarvesters", KEYS.Get("io_away_wb_full", { "v1": data.full }), left + 20, y, rowW, KEYS.Get("io_away_wb_bank_btn"), "ioWbBank", (row: any): void => {
                    let n: int = BRESOURCE.ioBankAll(0);
                    row.done(KEYS.Get("io_away_wb_bank_done", { "v1": n }));
                });
                y += IoWelcomeBack.ROW_H + 4;
            }
            y += 6;
        }
        // waiting for you
        if (waitRows > 0) {
            IoWelcomeBack.heading(mc, KEYS.Get("io_away_wb_sec_waiting"), left + 22, y);
            y += 26;
            if (data.daily >= 0) {
                IoWelcomeBack.simpleRow(mc, "ioWbDailyRow", data.daily > 0 ? KEYS.Get("io_away_wb_daily", { "v1": data.daily }) : KEYS.Get("io_away_wb_daily0"), left + 20, y, rowW, KEYS.Get("io_away_wb_daily_btn"), "ioWbDaily", (row: any): void => {
                    POPUPS.Next();
                    BASE.ioOpenDaily();
                });
                y += IoWelcomeBack.ROW_H + 4;
            }
            if (data.quests > 0) {
                IoWelcomeBack.simpleRow(mc, "ioWbQuestsRow", KEYS.Get(data.quests == 1 ? "io_away_wb_quests1" : "io_away_wb_quests", { "v1": data.quests }), left + 20, y, rowW, KEYS.Get("io_away_wb_quests_btn"), "ioWbQuests", (row: any): void => {
                    POPUPS.Next();
                    IoQuestBook.Show();
                });
                y += IoWelcomeBack.ROW_H + 4;
            }
            if (data.siege) {
                let s: any = data.siege;
                let text: string = KEYS.Get(s.n == 1 ? "io_away_wb_siege1" : "io_away_wb_siege", { "v1": s.n });
                if (s.left > 0) {
                    text += "  ·  " + (s.first ? KEYS.Get("io_away_wb_siege_first", { "v1": String(s.first), "v2": GLOBAL.ioDuration(s.left) }) : KEYS.Get("io_away_duel_left", { "v1": GLOBAL.ioDuration(s.left) }));
                }
                IoWelcomeBack.simpleRow(mc, "ioWbSiegeRow", text, left + 20, y, rowW, KEYS.Get("io_away_wb_siege_btn"), "ioWbSiege", (row: any): void => {
                    POPUPS.Next();
                    ArcadeWindow.ShowSiege("duel");
                });
                y += IoWelcomeBack.ROW_H + 4;
            }
        }
        let go: Sprite = as3.as(mc.addChild(CasinoUI.button(KEYS.Get("io_away_wb_continue"), 150, 32, (e: MouseEvent): void => {
            POPUPS.Next();
        }, true, 14)), Sprite);
        go.name = "ioWbContinue";
        go.x = -75;
        go.y = -top - 46;
        IoWelcomeBack.mc = mc;
        return mc;
    }

    private static heading(mc: MovieClip, text: string, x: number, y: number): void {
        let t: TextField = as3.as(mc.addChild(CasinoUI.label(text, 13, CasinoUI.EMBER, true, 300, TextFormatAlign.LEFT)), TextField);
        t.x = x;
        t.y = y;
    }

    /**
     * A row: its text and, with `button`, a button at its right end; `act(row)` gets the click, and `row.done(text)`
     * shows what happened in its place (the button then off).
     */
    private static simpleRow(mc: MovieClip, name: string, text: string, x: number, y: number, w: int, button: string, buttonName: string, act: Function): Sprite {
        let row: Sprite = as3.as(mc.addChild(CasinoUI.panel(w, IoWelcomeBack.ROW_H, 0.9)), Sprite);
        row.name = name;
        row.x = x;
        row.y = y;
        let bw: int = button != null ? 110 : 0;
        let t: TextField = as3.as(row.addChild(CasinoUI.label(text, 12, CasinoUI.GOLD, true, w - bw - 24, TextFormatAlign.LEFT)), TextField);
        t.name = name + "Text";
        GLOBAL.ioFitText(t, 8);
        t.x = 10;
        t.y = 7;
        if (button != null) {
            let b: Sprite = null;
            let handle: any = {
                "done": (said: string): void => {
                    CasinoUI.setText(t, said);
                    t.textColor = CasinoUI.WIN;
                    GLOBAL.ioFitText(t, 8);
                    CasinoUI.enable(b, false);
                }
            };
            b = as3.as(row.addChild(CasinoUI.button(button, bw, 24, (e: MouseEvent): void => {
                act(handle);
            }, true, 12)), Sprite);
            b.name = buttonName;
            b.x = w - bw - 4;
            b.y = 4;
        }
        return row;
    }

    /** An attack's row: who, which yard, when; the damage and the loot lost; Replay and Revenge. */
    private static attackRow(mc: MovieClip, log: any, i: int, x: number, y: number, w: int): void {
        let row: Sprite = as3.as(mc.addChild(CasinoUI.panel(w, IoWelcomeBack.ATTACK_H, 0.9)), Sprite);
        row.name = "ioWbAttack:" + i;
        row.x = x;
        row.y = y;
        let now: number = IoWelcomeBack.serverNow();
        let ago: string = KEYS.Get("io_away_wb_ago", { "v1": GLOBAL.ioDuration(Math.max(0, now - log.at)) });
        let canRevenge: boolean = log.uid > 0 && log.hx >= 0 && log.hy >= 0 && log.uid != LOGIN._playerID;
        let buttons: int = (log.replay ? 1 : 0) + (canRevenge ? 1 : 0);
        let textW: int = (w - 20 - buttons * 86) | 0;
        let one: TextField = as3.as(row.addChild(CasinoUI.label(KEYS.Get("io_away_wb_attack", { "v1": log.name, "v2": IoWelcomeBack.yardText(log), "v3": ago }), 12, CasinoUI.GOLD, true, textW, TextFormatAlign.LEFT)), TextField);
        one.name = "ioWbAttackText:" + i;
        GLOBAL.ioFitText(one, 8);
        one.x = 10;
        one.y = 4;
        let going: boolean = !log.ended && now - log.at < 3600;
        let detail: string = going ? KEYS.Get("io_away_wb_going") : KEYS.Get("io_away_wb_detail", { "v1": log.damage, "v2": IoWelcomeBack.lootText(log.loot) });
        let two: TextField = as3.as(row.addChild(CasinoUI.label(detail, 11, (log.damage >= 50 ? CasinoUI.LOSS : CasinoUI.ASH) >>> 0, false, textW, TextFormatAlign.LEFT)), TextField);
        two.name = "ioWbAttackDetail:" + i;
        GLOBAL.ioFitText(two, 8);
        two.x = 10;
        two.y = 24;
        let bx: int = (w - 4) | 0;
        if (canRevenge) {
            bx -= 82;
            let rev: Sprite = as3.as(row.addChild(CasinoUI.button(KEYS.Get("io_away_wb_revenge"), 80, 26, (e: MouseEvent): void => {
                POPUPS.Next();
                IoMapShare.OpenOwnWorld(log.hx | 0, log.hy | 0);
            }, true, 11)), Sprite);
            rev.name = "ioWbRevenge:" + i;
            rev.x = bx;
            rev.y = 10;
            bx -= 4;
        }
        if (log.replay) {
            bx -= 80;
            let key: string = String(log.replay);
            let rep: Sprite = as3.as(row.addChild(CasinoUI.button(KEYS.Get("io_away_wb_replay"), 80, 26, (e: MouseEvent): void => {
                POPUPS.Next();
                IoReplays.Watch(key, false);
            }, true, 11)), Sprite);
            rep.name = "ioWbReplay:" + i;
            rep.x = bx;
            rep.y = 10;
        }
    }

    /** The repair popup's Repair all: every damaged building not being repaired starts. How many started. */
    public static repairAll(): int {
        let n: int = 0;
        for (let b of (InstanceManager.getInstancesByClass(BFOUNDATION) ?? [])) {
            if (b.health < b.maxHealth && b._repairing == 0) {
                b.Repair();
                n++;
            }
        }
        if (n > 0) {
            SOUNDS.ioPlayFor("repair1", 0.25, 1800);
        }
        return n;
    }

    /** For tests: the card from `data` (gather's shape, the arrays may be left out), shown now. */
    public static ioTestShow(data: any): MovieClip {
        let d: any = { "attacks": [], "more": 0, "attackers": [], "away": 0, "damaged": 0, "repairing": 0, "injured": 0, "full": 0, "daily": -1, "quests": 0, "siege": null };
        for (let k in data) {
            d[k] = data[k];
        }
        let card: MovieClip = IoWelcomeBack.build(d);
        POPUPS.Push(card);
        return card;
    }

    // ---- QoL #634: the outposts, watched while the player plays
    private static _watch: Timer = null;

    /** Each recent attack on an outpost, by log id: what was last said of it ("a" attacked, "w" wrecked, "t" taken). */
    private static _said: any = {};

    /** The first answer only notes what is there (said already, or before this session). */
    private static _watchFirst: boolean = true;

    /** When the watch began, by the server's clock: attacks begun before it aren't news. */
    private static _watchFrom: number = 0;

    /** The outposts with news not looked at yet, by "x,y": "attacked", "wrecked" or "taken" (for the Outposts list). */
    public static ioOutpostAlerts: any = {};

    /** How often the attack logs are asked. */
    private static readonly WATCH_MS: int = 60000;

    /** Starts the watch (once a session; from the first yard of the player's own). */
    public static ioWatchOutposts(): void {
        if (!GLOBAL.INFERNO_ONLY || IoWelcomeBack._watch) {
            return;
        }
        IoWelcomeBack._watchFrom = GLOBAL.Timestamp() - 120;
        IoWelcomeBack._watch = new Timer(IoWelcomeBack.WATCH_MS);
        IoWelcomeBack._watch.addEventListener(TimerEvent.TIMER, (e: TimerEvent): void => {
            IoWelcomeBack.watchAsk();
        });
        IoWelcomeBack._watch.start();
        IoWelcomeBack.watchAsk();
    }

    /** Asks for the last two hours, in a yard of the player's own, with outposts, not loading. */
    private static watchAsk(): void {
        let home: boolean = GLOBAL.mode == GLOBAL.e_BASE_MODE.BUILD || GLOBAL.mode == GLOBAL.e_BASE_MODE.IBUILD;
        if (!home || BASE._loading || GLOBAL._catchup || !LOGIN.token || !MapRoomManager.instance.isInMapRoom2 || !GLOBAL._mapOutpost || GLOBAL._mapOutpost.length == 0) {
            return;
        }
        new URLLoaderApi().load(GLOBAL.serverUrl + "attacklogs/game", [["recent", 1]], (r: any): void => {
            if (r && !r.error) {
                IoWelcomeBack.ioWatchAnswer(r);
            }
        }, (e: IOErrorEvent): void => {});
    }

    /** An answer of attacklogs/game recent=1 ({ now, recent: [{ id, at, name, type, x, y, damage, ended, taken }] }). */
    public static ioWatchAnswer(r: any): void {
        let first: boolean = IoWelcomeBack._watchFirst;
        IoWelcomeBack._watchFirst = false;
        let now: number = r.now ? Number(r.now) : GLOBAL.Timestamp();
        let news: any[] = [];
        for (let l of as3.values(as3.as(r.recent, Array) || [])) {
            if (!l || String(l.type) != "outpost") {
                continue;
            }
            let id: string = String(l.id);
            let was: string = IoWelcomeBack._said[id] ? String(IoWelcomeBack._said[id]) : "";
            let state: string = (l.taken | 0) == 1 ? "t" : ((l.ended | 0) == 1 && (l.damage | 0) >= 90 ? "w" : "a");
            IoWelcomeBack._said[id] = state;
            // (the first answer, and attacks begun before the watch: known already, from the card or before)
            if (first && Number(l.at) < IoWelcomeBack._watchFrom) {
                continue;
            }
            if (state == was || (state == "a" && ((l.ended | 0) == 1 || now - Number(l.at) > 900))) {
                continue;
            }
            if (was == "t" || (was == "w" && state == "a")) {
                continue;
            }
            // (the toast's text is html: the name plain)
            news.push({ "kind": state == "t" ? "taken" : (state == "w" ? "wrecked" : "attacked"), "name": String(l.name).replace(/[<>&]/g, ""), "x": l.x | 0, "y": l.y | 0 });
        }
        if (!news.length) {
            return;
        }
        for (let n of as3.values(news)) {
            IoWelcomeBack.ioOutpostAlerts[n.x + "," + n.y] = n.kind;
        }
        // the most serious news on the toast (taken, then wrecked, then attacked), the others in the count
        let order: any = { "taken": 0, "wrecked": 1, "attacked": 2 };
        news.sort((a: any, b: any): number => order[a.kind] - order[b.kind]);
        let top: any = news[0];
        let text: string = KEYS.Get("io_away_op_" + top.kind, { "v1": top.name, "v2": top.x, "v3": top.y });
        if (news.length > 1) {
            text += "  " + KEYS.Get("io_away_op_others", { "v1": news.length - 1 });
        }
        IoToast.Show(text, 9000, KEYS.Get("io_away_op_btn"), (): void => {
            IoWelcomeBack.ioClearOutpostBadge();
            IoOutpostsPopup.Show();
        });
        IoSocial.ioNotify("outpost", text); // (QoL #195: as a browser notification while the tab is hidden)
        if (top.kind != "wrecked") {
            SOUNDS.Play("wmbhorn", 0.6);
        }
        IoWelcomeBack.ioOutpostBadge();
    }

    /** The red mark on the top bar's Outposts (its count of outposts with news). */
    public static ioOutpostBadge(): void {
        let box: any = null;
        try {
            let top: any = UI2._top;
            box = top && top.mc ? top.mc.mcOutposts : null;
        } catch (e) {
            box = null;
        }
        let n: int = 0;
        for (let k in IoWelcomeBack.ioOutpostAlerts) {
            n++;
        }
        if (!box) {
            return;
        }
        let badge: Sprite = as3.as(box.getChildByName("ioOutpostAlertBadge"), Sprite);
        if (n <= 0) {
            if (badge) {
                badge.visible = false;
            }
            return;
        }
        if (!badge) {
            badge = new Sprite();
            badge.name = "ioOutpostAlertBadge";
            badge.mouseEnabled = false;
            badge.mouseChildren = false;
            let t: TextField = CasinoUI.label("", 9, 0xFFFFFF, true, 30, TextFormatAlign.CENTER);
            t.name = "n";
            badge.addChild(t);
            box.addChild(badge);
            // (the Outposts button looked at: the mark goes)
            if (box.bNext) {
                box.bNext.addEventListener(MouseEvent.CLICK, (e: MouseEvent): void => {
                    IoWelcomeBack.ioClearOutpostBadge();
                });
            }
        }
        let text: TextField = as3.as(badge.getChildByName("n"), TextField);
        text.text = n > 9 ? "9+" : String(n);
        badge.graphics.clear();
        badge.graphics.lineStyle(1, 0xFFE6A0, 1);
        badge.graphics.beginFill(0xC0201A, 1);
        badge.graphics.drawRoundRect(0, 0, 16, 15, 15);
        badge.graphics.endFill();
        text.width = 16;
        text.x = 0;
        text.y = 0;
        let r: Rectangle = box.mcHit ? box.mcHit.getBounds(box) : box.getBounds(box);
        badge.x = Math.round(r.x + r.width - 10);
        badge.y = Math.round(r.y - 4);
        badge.visible = true;
        box.setChildIndex(badge, box.numChildren - 1);
    }

    /** The outposts' news looked at: the mark goes. */
    public static ioClearOutpostBadge(): void {
        IoWelcomeBack.ioOutpostAlerts = {};
        IoWelcomeBack.ioOutpostBadge();
    }

    /** The news of the outpost at (x, y) for the Outposts list's row ("attacked", "wrecked", "taken"), or "". */
    public static ioOutpostAlert(x: int, y: int): string {
        let k: string = x + "," + y;
        return IoWelcomeBack.ioOutpostAlerts[k] ? String(IoWelcomeBack.ioOutpostAlerts[k]) : "";
    }
}

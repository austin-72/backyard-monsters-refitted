import * as as3 from "as3";
import { ASObject, int, uint } from "as3";
import { GradientType, MovieClip, Sprite } from "flash/display";
import { Event, MouseEvent } from "flash/events";
import { GlowFilter } from "flash/filters";
import { Matrix, Rectangle } from "flash/geom";
import { TextField, TextFormatAlign } from "flash/text";
import { getTimer } from "flash/utils";
import { ArcadeWindow, BASE, CASINO, CasinoUI, GLOBAL, IoFmi, IoGauntlet, IoHfo, IoHfoUi, IoKit, IoQuestArt, IoQuests, IoToast, IoTot, KEYS, MUSHROOMS, POPUPSETTINGS, SOUNDS } from "@game";

/**
 * Inferno-only (QoL #105, 15 October): the events calendar. One row for each event and daily reset: what it is
 * doing now, the countdown, what it pays, and Go there; every time on the player's own clock. It reads only what
 * the game has already: the flags the server sends with every poll (io_gauntlet, io_fmi, io_hfo, io_wartbloom,
 * io_streak), the quest book (IoQuests.book) and the Pit's last state (CASINO.state). Opened by Show().
 *
 *  - Moloch's Gauntlet: the flag io_gauntlet (open, closesAt, opensAt, stage, stages; services/events/gauntlet.ts).
 *  - The monthly invasion: the flag io_fmi, only sent to a player who may take part (services/events/fmi.ts).
 *  - The winter event (io_hfo): only once it has started for the player (the flag is sent only then), by its own
 *    title key (hfo_event_title) and its own lines (IoHfoUi.tip); not shown once it is over for them.
 *  - The Wart Bloom: the flag io_wartbloom ({rate, w: [[start, end], ...]}; services/events/wartBloomTimes.ts).
 *  - The daily quests, the daily reward (io_streak), Moloch's Favor (the Pit's free spin, CASINO.state.favor) and
 *    the arcade's dailies (Siege, Hellgate Defense 2, Valgos Golf): all start again at midnight UTC.
 *
 * Rows are kept while the same rows show (their lines change every second); a row coming or going draws them again.
 */
export class IoEventsCalendar extends ASObject {
    static {
        as3.fields(this, { mc: null, _list: null, _rows: null, _sig: "", _last: 0 });
    }

    private static _open: IoEventsCalendar = null;

    private static readonly W: int = 660;

    private static readonly H: int = 580;

    private static readonly ROW_H: int = 42;

    private static readonly ROW_GAP: int = 4;

    /** Building types: the Brimstone Pit and the Devil's Arcade (their rows' Go needs them). */
    private static readonly PIT: int = 141;

    private static readonly ARCADE: int = 142;

    public mc: MovieClip;

    /** The rows' layer. */
    private _list: Sprite;

    /** Each row's fields by event id: {state, reward}. */
    private _rows: any;

    /** The rows shown (ids, whether each has Go, whether each is on): drawn again when it changes. */
    private _sig: string;

    /** When the lines were last brought up to date (getTimer). */
    private _last: int;

    public $ctor(): void {
        super.$ctor();
        this._rows = {};
        let W: int = IoEventsCalendar.W;
        let H: int = IoEventsCalendar.H;
        let left: int = (-W / 2) | 0;
        let top: int = (-H / 2) | 0;
        this.mc = new MovieClip();
        this.mc.name = "ioEv2Window";
        // the Quest Book's frame: obsidian, the leaderboards' painting faintly behind, the kit's rim
        let bg: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        let m: Matrix = new Matrix();
        m.createGradientBox(W, H, Math.PI / 2, left, top);
        bg.graphics.lineStyle(3, 14708778, 1);
        bg.graphics.beginGradientFill(GradientType.LINEAR, [0x1E1210, 0x0C0706], [1, 1], [0, 255], m);
        bg.graphics.drawRoundRect(left, top, W, H, 22, 22);
        bg.graphics.endFill();
        bg.filters = [new GlowFilter(0xFF4A00, 0.55, 18, 18, 2, 2)];
        this.mc.ioOccludes(new Rectangle(left + 12, top + 12, W - 24, H - 24));
        let art: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        art.alpha = 0.4;
        CasinoUI.picture(art, "leaderboards/bg.jpg", left + 6, top + 6, W - 12, H - 12);
        let mask: Sprite = as3.as(this.mc.addChild(new Sprite()), Sprite);
        mask.graphics.beginFill(0);
        mask.graphics.drawRoundRect(left + 6, top + 6, W - 12, H - 12, 18, 18);
        mask.graphics.endFill();
        art.mask = mask;
        IoKit.rim(this.mc, "ioEv2Rim", left, top, W, H, bg);

        let title: TextField = as3.as(this.mc.addChild(CasinoUI.title(KEYS.Get("io_ev2_title"), 30, W - 120, TextFormatAlign.LEFT)), TextField);
        title.name = "ioEv2Title";
        GLOBAL.ioFitText(title, 20);
        title.x = left + 22;
        title.y = top + 14;
        let sub: TextField = as3.as(this.mc.addChild(CasinoUI.label(KEYS.Get("io_ev2_sub", { "v1": IoEventsCalendar.zone() }), 11, CasinoUI.ASH, false, W - 60, TextFormatAlign.LEFT)), TextField);
        sub.name = "ioEv2Sub";
        GLOBAL.ioFitText(sub);
        sub.x = left + 24;
        sub.y = top + 54;

        this._list = as3.as(this.mc.addChild(new Sprite()), Sprite);
        this._list.name = "ioEv2List";
        this._list.x = left + 20;
        this._list.y = top + 78;

        let x: Sprite = as3.as(this.mc.addChild(IoKit.closeButton("ioEv2Close", 14, (e: any): void => {})), Sprite);
        x.x = -left - 24;
        x.y = top + 24;
        x.addEventListener(MouseEvent.CLICK, as3.bind(this, this.close));

        this.refresh();
        this.mc.addEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
        GLOBAL.BlockerAdd(GLOBAL._layerTop);
        GLOBAL.ioBackdropCloses((): void => {
            this.close();
        });
        GLOBAL._layerTop.addChild(this.mc);
        POPUPSETTINGS.AlignToCenter(this.mc);
    }

    /** Opens the calendar (in the player's own yard, building). */
    public static Show(e: MouseEvent = null): void {
        if (!GLOBAL.INFERNO_ONLY) {
            return;
        }
        if (IoEventsCalendar._open && (!IoEventsCalendar._open.mc || !IoEventsCalendar._open.mc.stage)) {
            IoEventsCalendar._open = null;
        }
        if (IoEventsCalendar._open) {
            return;
        }
        if (GLOBAL.mode != GLOBAL.e_BASE_MODE.BUILD) {
            // (the events' flags come only to the player's own yards: elsewhere there is nothing to show)
            IoToast.Show(KEYS.Get("io_ev2_home"), 4000);
            return;
        }
        SOUNDS.Play("click1");
        // (the daily quests' row reads the book: asked for if it is old)
        IoQuests.refresh();
        IoEventsCalendar._open = new IoEventsCalendar();
    }

    public static get isOpen(): boolean {
        return IoEventsCalendar._open != null;
    }

    public static CloseOpen(): void {
        if (IoEventsCalendar._open) {
            IoEventsCalendar._open.close();
        }
        IoEventsCalendar._open = null;
    }

    public close(e: MouseEvent = null): void {
        if (this.mc) {
            this.mc.removeEventListener(Event.ENTER_FRAME, as3.bind(this, this.tick));
            if (this.mc.parent) {
                this.mc.parent.removeChild(this.mc);
                GLOBAL.BlockerRemove();
                SOUNDS.Play("close");
            }
        }
        this.mc = null;
        if (IoEventsCalendar._open == this) {
            IoEventsCalendar._open = null;
        }
    }

    // ---- every second: the lines again; the rows again when they change
    private tick(e: Event): void {
        if (!this.mc || getTimer() - this._last < 1000) {
            return;
        }
        this.refresh();
    }

    private refresh(): void {
        this._last = getTimer();
        let list: any[] = IoEventsCalendar.events();
        let sig: string = list.map((r: any): string => String(r.id) + (r.go ? "+" : "") + (r.live ? "*" : "")).join(",");
        if (sig != this._sig) {
            this._sig = sig;
            this.draw(list);
            return;
        }
        for (let r of list) {
            let fields: any = this._rows[String(r.id)];
            if (!fields) {
                continue;
            }
            let state: TextField = as3.as(fields.state, TextField);
            if (state.text != String(r.line)) {
                state.text = String(r.line);
                state.textColor = r.color >>> 0;
                GLOBAL.ioFitText(state);
            }
            let reward: TextField = as3.as(fields.reward, TextField);
            if (reward.text != String(r.reward)) {
                reward.text = String(r.reward);
                GLOBAL.ioFitHeight(reward, 8);
            }
        }
    }

    private draw(list: any[]): void {
        CasinoUI.removeAll(this._list);
        this._rows = {};
        let w: int = (IoEventsCalendar.W - 40) | 0;
        let h: int = IoEventsCalendar.ROW_H;
        let y: int = 0;
        for (let r of list) {
            let id: string = String(r.id);
            let row: Sprite = new Sprite();
            row.name = "ioEv2Row:" + id;
            row.y = y;
            row.addChild(CasinoUI.panel(w, h, 0.9));
            if (r.live) {
                row.filters = [new GlowFilter(0xFFB040, 0.45, 8, 8, 2, 2)];
            }
            let g: Sprite = as3.as(row.addChild(IoQuestArt.glyph(String(r.icon), 26)), Sprite);
            g.x = 22;
            g.y = (h / 2) | 0;
            let t: TextField = as3.as(row.addChild(CasinoUI.label(String(r.title), 12, CasinoUI.GOLD, true, 296, TextFormatAlign.LEFT)), TextField);
            t.name = "ioEv2Name:" + id;
            GLOBAL.ioFitText(t);
            t.x = 42;
            t.y = 3;
            let s: TextField = as3.as(row.addChild(CasinoUI.label(String(r.line), 10, r.color >>> 0, false, 296, TextFormatAlign.LEFT)), TextField);
            s.name = "ioEv2State:" + id;
            GLOBAL.ioFitText(s);
            s.x = 42;
            s.y = 21;
            let rw: TextField = as3.as(row.addChild(CasinoUI.label(String(r.reward), 9, CasinoUI.ASH, false, (w - 446) | 0, TextFormatAlign.LEFT)), TextField);
            rw.name = "ioEv2Reward:" + id;
            rw.multiline = true;
            rw.wordWrap = true;
            rw.height = h - 6;
            rw.x = 344;
            rw.y = 3;
            GLOBAL.ioFitHeight(rw, 8);
            if (r.go) {
                let action: string = String(r.go);
                let b: Sprite = as3.as(row.addChild(CasinoUI.button(KEYS.Get("io_quest_go"), 90, 26, (ev: MouseEvent): void => {
                    this.close();
                    IoEventsCalendar.go(action);
                }, true, 11)), Sprite);
                b.name = "ioEv2Go:" + id;
                b.x = w - 98;
                b.y = ((h - 26) / 2) | 0;
            }
            this._rows[id] = { "state": s, "reward": rw };
            this._list.addChild(row);
            y = (y + h + IoEventsCalendar.ROW_GAP) | 0;
        }
        if (!list.length) {
            let none: TextField = as3.as(this._list.addChild(CasinoUI.label(KEYS.Get("io_ev2_none"), 12, CasinoUI.ASH, true, w, TextFormatAlign.CENTER)), TextField);
            none.name = "ioEv2None";
            none.y = 40;
        }
    }

    // ---- Go there
    /** Takes the player to an event (the calendar closed first). */
    public static go(action: string): void {
        switch (action) {
            case "gauntlet":
                IoGauntlet.Show();
                break;
            case "invasion":
                IoFmi.ShowWindow();
                break;
            case "tot":
                IoTot.Show();
                break;
            case "winter":
                IoHfoUi.ShowWindow();
                break;
            case "siege":
                ArcadeWindow.ShowSiege("daily");
                break;
            case "hellgate2":
            case "golf":
                ArcadeWindow.ShowGame(action);
                break;
            default:
                // (the quest book's places: "wart", "daily_quests", "daily", "pit")
                IoQuests.go(action);
                break;
        }
    }

    // ---- the rows
    /**
     * Every row to show now, in a fixed order: {id, icon, title, line (what it is doing, the countdown), color (the
     * line's), reward, go (IoEventsCalendar.go's action, or ""), live (on now, or something waiting)}.
     */
    public static events(): any[] {
        let now: number = GLOBAL.Timestamp();
        let out: any[] = [];
        let newDay: number = (Math.floor(now / 86400) + 1) * 86400;
        let row: Function = (id: string, icon: string, title: string, line: string, color: uint, reward: string, go: string, live: boolean): void => {
            out.push({ "id": id, "icon": icon, "title": title, "line": line, "color": color, "reward": reward, "go": go, "live": live });
        };
        let soon: uint = CasinoUI.ASH;
        let on: uint = CasinoUI.WIN;
        let waiting: uint = 0xFFB040;

        // Moloch's Gauntlet
        let g: any = IoGauntlet.flag();
        if (g) {
            let stages: int = g.stages | 0;
            let next: int = Math.max(1, g.stage | 0) | 0;
            if (g.test) {
                row("gauntlet", "skull", KEYS.Get("io_ev2_gauntlet"), KEYS.Get("io_ev2_test"), on, KEYS.Get("io_ev2_gauntlet_reward"), "gauntlet", true);
            } else if (g.open) {
                let left: number = Number(g.closesAt) - now;
                let line: string = stages > 0 && next > stages ? KEYS.Get("io_ev2_gauntlet_alldone") : KEYS.Get("io_ev2_gauntlet_gate", { "v1": next, "v2": stages });
                line = (g.closesAt && left > 0 ? KEYS.Get("io_ev2_on_until", { "v1": GLOBAL.ioDuration(left), "v2": IoEventsCalendar.at(Number(g.closesAt)) }) : KEYS.Get("io_ev2_on")) + "  ·  " + line;
                row("gauntlet", "skull", KEYS.Get("io_ev2_gauntlet"), line, on, KEYS.Get("io_ev2_gauntlet_reward"), "gauntlet", !(stages > 0 && next > stages));
            } else if (Number(g.opensAt) > now) {
                row("gauntlet", "skull", KEYS.Get("io_ev2_gauntlet"), KEYS.Get("io_ev2_starts", { "v1": GLOBAL.ioDuration(Number(g.opensAt) - now), "v2": IoEventsCalendar.at(Number(g.opensAt)) }), soon, KEYS.Get("io_ev2_gauntlet_reward"), "gauntlet", false);
            }
        }

        // (20 October) Trick or Treat: its flag from a few days before it opens till it's over (and while a trick waits)
        let tt: any = IoTot.flag();
        if (tt) {
            let ttName: string = KEYS.Get("io_tot_title");
            let ttReward: string = KEYS.Get("io_ev2_tot_reward", { "v1": tt.shiny | 0, "v2": tt.pumpkins | 0 });
            let doors: int = IoTot.TRIBES_INFO.length;
            let knocked: int = IoTot.knocked();
            let ttGo: string = IoTot.buttonShown() ? "tot" : "";
            let trick: string = IoTot.waitingTrick();
            if (trick) {
                row("tot", "pumpkin", ttName, KEYS.Get("io_tot_tip_trick", { "v1": IoTot.tribeName(trick) }), waiting, ttReward, ttGo, true);
            } else if (tt.test) {
                row("tot", "pumpkin", ttName, KEYS.Get("io_ev2_test"), on, ttReward, ttGo, true);
            } else if (tt.open) {
                row("tot", "pumpkin", ttName, KEYS.Get("io_ev2_on_until", { "v1": GLOBAL.ioDuration(Number(tt.endsAt) - now), "v2": IoEventsCalendar.at(Number(tt.endsAt)) }) + "  ·  " + KEYS.Get("io_tot_cap_n", { "v1": knocked, "v2": doors }), on, ttReward, ttGo, knocked < doors);
            } else if (Number(tt.startsAt) > now) {
                row("tot", "pumpkin", ttName, KEYS.Get("io_ev2_starts", { "v1": GLOBAL.ioDuration(Number(tt.startsAt) - now), "v2": IoEventsCalendar.at(Number(tt.startsAt)) }), soon, ttReward, ttGo, false);
            }
        }

        // the monthly invasion (its flag comes only to a player who may take part)
        let f: any = IoFmi.flag();
        if (f) {
            let kind: int = (f.kind | 0) == 2 ? 2 : 1;
            let name: string = KEYS.Get("io_ev2_invasion", { "v1": kind });
            let reward: string = KEYS.Get("io_ev2_invasion_reward", { "v1": KEYS.Get("bdg_fmitotem" + kind) });
            let waves: int = Math.max(1, f.waves | 0) | 0;
            let won: int = f.won | 0;
            let go: string = IoFmi.buttonShown() ? "invasion" : "";
            if (f.test) {
                row("invasion", "shield", name, KEYS.Get("io_ev2_test"), on, reward, go, true);
            } else if (f.open) {
                let fl: string = KEYS.Get("io_ev2_on_until", { "v1": GLOBAL.ioDuration(Number(f.endsAt) - now), "v2": IoEventsCalendar.at(Number(f.endsAt)) }) + "  ·  " + (won >= waves ? KEYS.Get("io_ev2_invasion_alldone", { "v1": waves }) : KEYS.Get("io_ev2_invasion_wave", { "v1": won + 1, "v2": waves }));
                row("invasion", "shield", name, fl, on, reward, go, won < waves);
            } else if (Number(f.startsAt) > now) {
                row("invasion", "shield", name, KEYS.Get("io_ev2_starts", { "v1": GLOBAL.ioDuration(Number(f.startsAt) - now), "v2": IoEventsCalendar.at(Number(f.startsAt)) }), soon, reward, go, false);
            }
        }

        // the winter event: only once it has started for the player, and not once it is over for them
        let h: any = GLOBAL._flags && GLOBAL._flags.io_hfo ? IoHfo.flag() : null;
        if (h && !(Number(h.done) > 0)) {
            let day: int = h.day | 0;
            // (its own button's lines: towers, the wave, its tries and prize)
            let tip: any[] = IoHfoUi.tip().split("<br>");
            let line: string = tip.length > 1 ? String(tip[1]) : "";
            if (!line && day < 4 && h.ready) {
                // (QoL #108: once its time has come the next day begins in the yard, no visit or reload needed)
                line = Number(h.nextAt) > now ? KEYS.Get("io_hfo2_hud_next_day", { "v1": day + 1, "v2": IoEventsCalendar.at(Number(h.nextAt)) }) : (GLOBAL.INFERNO_ONLY ? KEYS.Get("io_ev3_hud_daydone", { "v1": day + 1 }) : KEYS.Get("io_hfo_hud_daydone"));
            }
            if (!line) {
                line = KEYS.Get("io_ev2_winter_day", { "v1": Math.max(1, day) });
            }
            let current: int = h.current | 0;
            let prize: int = day >= 4 ? IoHfoUi.prize(h, current) : 0;
            row("winter", "moon", KEYS.Get("hfo_event_title"), line, on, prize > 0 ? KEYS.Get("io_hfo2_prize", { "v1": prize }) : "", IoHfo.buttonShown() ? "winter" : "", true);
        }

        // the Wart Bloom
        let bloom: any = IoEventsCalendar.bloomFlag();
        if (bloom) {
            let rate: int = Math.max(1, Number(bloom.rate) || 3) | 0;
            let current: any[] = MUSHROOMS.ioBloomAt(now);
            let bReward: string = KEYS.Get("io_ev2_bloom_reward", { "v1": rate });
            if (current) {
                row("bloom", "wart", KEYS.Get("io_ev2_bloom"), KEYS.Get("io_ev2_on_until", { "v1": GLOBAL.ioDuration(Number(current[1]) - now), "v2": IoEventsCalendar.at(Number(current[1])) }), on, bReward, BASE.isMainYardOrInfernoMainYard ? "wart" : "", true);
            } else {
                let start: number = 0;
                for (let w of as3.values(bloom.w)) {
                    let s: number = Number(w && w[0]);
                    if (s > now && (start == 0 || s < start)) {
                        start = s;
                    }
                }
                if (start > 0) {
                    row("bloom", "wart", KEYS.Get("io_ev2_bloom"), KEYS.Get("io_ev2_starts", { "v1": GLOBAL.ioDuration(start - now), "v2": IoEventsCalendar.at(start) }), soon, bReward, "", false);
                }
            }
        }

        let dayLeft: string = GLOBAL.ioDuration(newDay - now);
        let dayAt: string = IoEventsCalendar.at(newDay);

        // the daily quests (from the book, when the game has it)
        if (IoQuests.on) {
            let daily: any = IoQuests.book ? IoQuests.book.daily : null;
            let line: string = KEYS.Get("io_ev2_newday", { "v1": dayLeft, "v2": dayAt });
            let reward: string = "";
            let live: boolean = true;
            let ready: int = 0;
            if (daily && as3.is(daily.quests, Array)) {
                let total: int = 0;
                let collected: int = 0;
                for (let d of as3.values(daily.quests)) {
                    if (String(d.state) == "ready") {
                        ready++;
                    }
                    if (d.yesterday) {
                        continue;
                    }
                    total++;
                    if (String(d.state) == "claimed") {
                        collected++;
                    }
                }
                if (daily.bonus && String(daily.bonus.state) == "ready") {
                    ready++;
                }
                // (16 October: two of the three at most, so the line keeps its size: with all three it was drawn at 8 px. What
                // is ready first, then how many are done; when nothing is ready, when the next ones come)
                line = ready > 0 ? KEYS.Get("io_ev2_ready", { "v1": ready }) + " · " + KEYS.Get("io_ev2_daily_done", { "v1": collected, "v2": total }) : KEYS.Get("io_ev2_daily_done", { "v1": collected, "v2": total }) + " · " + line;
                live = ready > 0 || collected < total;
                if (daily.bonus && daily.bonus.reward) {
                    reward = KEYS.Get("io_ev2_daily_reward", { "v1": IoQuests.rewardText(daily.bonus.reward) });
                }
            }
            row("dailyquests", "star", KEYS.Get("io_ev2_daily"), line, ready > 0 ? waiting : soon, reward, "daily_quests", live);
        }

        // the daily reward (the login streak: flag io_streak)
        let streak: any = IoEventsCalendar.json(GLOBAL._flags ? GLOBAL._flags.io_streak : null);
        if (streak) {
            let rReward: string = KEYS.Get("io_ev2_reward_reward", { "v1": streak.weekDays | 0 || 7, "v2": streak.streakDays | 0 || 14 });
            if ((streak.collected | 0) == 1) {
                row("reward", "gift", KEYS.Get("io_ev2_reward"), KEYS.Get("io_ev2_reward_done", { "v1": streak.day | 0, "v2": dayLeft, "v3": dayAt }), soon, rReward, "", false);
            } else {
                row("reward", "gift", KEYS.Get("io_ev2_reward"), KEYS.Get("io_ev2_reward_ready", { "v1": Math.max(1, streak.offerDay | 0), "v2": streak.offerShiny | 0 }), waiting, rReward, "daily", true);
            }
        }

        // Moloch's Favor: the Pit's free spin a day (as the Pit last said; not opened yet this session: when it comes)
        let st: any = CASINO.state;
        let favor: any = st ? st.favor : null;
        let hasPit: boolean = IoEventsCalendar.hasBuilding(IoEventsCalendar.PIT);
        if (!(st && (!favor || !favor.enabled || st.shiny_locked))) {
            let fReward: string = favor && (favor.bet | 0) > 0 ? KEYS.Get("io_ev2_favor_reward", { "v1": favor.bet | 0 }) : KEYS.Get("io_ev2_favor_reward_any");
            let fLine: string = null;
            let fColor: uint = soon;
            let fLive: boolean = false;
            if (!hasPit) {
                fLine = KEYS.Get("io_ev2_needs_pit");
            } else if (!favor) {
                fLine = KEYS.Get("io_ev2_newday", { "v1": dayLeft, "v2": dayAt });
            } else if (favor.ready) {
                fLine = KEYS.Get("io_ev2_favor_ready");
                fColor = waiting;
                fLive = true;
            } else {
                fLine = KEYS.Get("io_ev2_favor_used", { "v1": dayLeft, "v2": dayAt });
            }
            row("favor", "dice", KEYS.Get("io_ev2_favor"), fLine, fColor, fReward, hasPit ? "pit" : "", fLive);
        }

        // the arcade's dailies: the same for everyone, new at midnight UTC
        let hasArcade: boolean = IoEventsCalendar.hasBuilding(IoEventsCalendar.ARCADE);
        let arcadeLine: string = hasArcade ? KEYS.Get("io_ev2_arcade_new", { "v1": dayLeft, "v2": dayAt }) : KEYS.Get("io_ev2_needs_arcade");
        row("siege", "catapult", KEYS.Get("io_ev2_siege"), arcadeLine, soon, KEYS.Get("io_ev2_siege_reward"), hasArcade ? "siege" : "", false);
        row("hellgate2", "tower", KEYS.Get("io_ev2_hellgate2"), arcadeLine, soon, KEYS.Get("io_ev2_hellgate2_reward"), hasArcade ? "hellgate2" : "", false);
        row("golf", "flag", KEYS.Get("io_ev2_golf"), arcadeLine, soon, KEYS.Get("io_ev2_golf_reward"), hasArcade ? "golf" : "", false);
        return out;
    }

    // ---- helpers
    /** A flag that is JSON (or already an object), or null. */
    private static json(raw: any): any {
        if (raw == null || raw === "") {
            return null;
        }
        try {
            return as3.is(raw, String) ? JSON.parse(String(raw)) : raw;
        } catch (e) {
        }
        return null;
    }

    /** The flag io_wartbloom: {rate, w: [[start, end], ...]} (Unix seconds), or null. */
    private static bloomFlag(): any {
        let b: any = IoEventsCalendar.json(GLOBAL._flags ? GLOBAL._flags.io_wartbloom : null);
        return b && as3.is(b.w, Array) ? b : null;
    }

    /** The yard shown has a building of this type (finished or not). */
    private static hasBuilding(type: int): boolean {
        for (let b of as3.values(BASE._buildingsAll)) {
            if (b && (b._type | 0) == type) {
                return true;
            }
        }
        return false;
    }

    private static two(n: int): string {
        return (n < 10 ? "0" : "") + n;
    }

    /**
     * A moment on the player's own clock: "21:00" today, "tomorrow 02:00", or "Fri 17 Oct 18:00" (the weekday and
     * month in the browser's own language).
     */
    public static at(sec: number): string {
        let d: Date = new Date(sec * 1000);
        let n: Date = new Date(GLOBAL.Timestamp() * 1000);
        let hm: string = IoEventsCalendar.two(d.getHours()) + ":" + IoEventsCalendar.two(d.getMinutes());
        if (d.toDateString() == n.toDateString()) {
            return hm;
        }
        if (d.toDateString() == new Date(n.getTime() + 86400000).toDateString()) {
            return KEYS.Get("io_ev2_tomorrow", { "v1": hm });
        }
        return d.toLocaleDateString(undefined, { "weekday": "short", "day": "numeric", "month": "short" }) + " " + hm;
    }

    /** The player's time zone as an offset from UTC: "UTC+2", "UTC-5:30", "UTC". */
    public static zone(): string {
        let mins: int = -new Date().getTimezoneOffset() | 0;
        if (mins == 0) {
            return "UTC";
        }
        let a: int = Math.abs(mins) | 0;
        return "UTC" + (mins > 0 ? "+" : "-") + ((a / 60) | 0) + (a % 60 != 0 ? ":" + IoEventsCalendar.two(a % 60) : "");
    }
}

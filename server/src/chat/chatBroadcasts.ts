import { randomBytes } from "crypto";
import { questHeadline } from "../services/quests/questHooks.js";
import { CHANNELS, INFERNO_CHAT_CHANNEL } from "../config/ChatConfig.js";
import { casinoConfig } from "../config/CasinoConfig.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { ChatBroadcastType } from "../enums/Chat.js";
import { postgres, redis } from "../server.js";
import { configuredAdmins } from "../services/admin/admin.js";
import { logger } from "../utils/logger.js";
import { pushMessage } from "./chatHistory.js";
import { ServerMessageType, type HistoryEntry, type ServerMessage } from "./chatProtocol.js";
import { publishToChannel } from "./chatTransport.js";

/**
 * Inferno-only: lines the server writes into Global chat, for everyone (the game draws each kind as its
 * own banner: com/monsters/chat/BYMChat.ts):
 *  - announce:  the admin panel's announcement ("Also post it in chat");
 *  - casino:    a jackpot or big win in the Brimstone Pit (casinoConfig.announce says how big);
 *  - milestone: a player beating Hell Freezes Over, or the month's Moloch's Gauntlet;
 *  - event:     a server event starting or ending (the Wart Bloom: services/events/wartBloom.ts).
 *
 * Each goes into every Global room's history (so players who come later still see it) and to everyone in
 * those rooms now. They come from user 0, so nobody can be messaged or ignored through them. Admins'
 * wins and milestones are not announced (their test mode fakes both).
 */

const GLOBAL_CHANNELS = [...new Set([...Object.values(CHANNELS), INFERNO_CHAT_CHANNEL])];

const LABELS: Record<ChatBroadcastType, string> = {
  [ChatBroadcastType.ANNOUNCE]: "Announcement",
  [ChatBroadcastType.CASINO]: "Brimstone Pit",
  [ChatBroadcastType.MILESTONE]: "Milestone",
  [ChatBroadcastType.EVENT]: "Event",
};

/** Writes a broadcast into every Global room. Never throws (a failed announcement must not fail the action). */
export const broadcastGlobal = async (type: ChatBroadcastType, body: string): Promise<string | null> => {
  const text = String(body ?? "").trim().slice(0, 300);
  if (!text) return null;
  // (26 October: an id ("g...", as players' lines have), so the line can be taken back: retractBroadcast)
  const id = `g${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const entry: HistoryEntry = {
    userId: 0,
    displayName: LABELS[type],
    picSquare: null,
    allianceImage: null,
    body: text,
    messageType: type,
    ts: Date.now(),
    id,
  };
  for (const channel of GLOBAL_CHANNELS) {
    try {
      await pushMessage(channel, entry);
      const message: ServerMessage = { type: ServerMessageType.Message, channel, ...entry };
      publishToChannel(channel, JSON.stringify(message));
    } catch (err) {
      logger.warn(`Chat broadcast (${type}) to ${channel} failed: ${err}`);
    }
  }
  return id;
};

/**
 * (26 October) A broadcast taken back (an arcade call whose player stopped waiting or found a partner, the user's): out
 * of every Global room's history, and off every screen (the line's Deleted, as a moderator's delete).
 */
export const retractBroadcast = async (id: string) => {
  if (!id) return;
  for (const channel of GLOBAL_CHANNELS) {
    try {
      const key = `history:${channel}`;
      for (const raw of await redis.lrange(key, 0, -1)) {
        if (!raw.includes(id)) continue;
        try {
          if (JSON.parse(raw).id !== id) continue;
        } catch {
          continue;
        }
        await redis.lrem(key, 1, raw);
        break;
      }
      publishToChannel(channel, JSON.stringify({ type: ServerMessageType.Deleted, channel, id }));
    } catch (err) {
      logger.warn(`Chat broadcast ${id} not taken back from ${channel}: ${err}`);
    }
  }
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** A player's name for a broadcast, or null for admins and unknown players. */
const announceableName = async (userid: number): Promise<string | null> => {
  const rows = await postgres.em
    .getConnection()
    .execute<{ username: string }[]>(`SELECT username FROM bym."user" WHERE userid = ?`, [userid]);
  const name = rows[0]?.username;
  if (!name) return null;
  const admins = configuredAdmins().map((a) => a.toLowerCase());
  return admins.includes(name.toLowerCase()) ? null : name;
};

/** (26 October) A player's wins of the last `recordHours`: "payout:multiplier:time", scored by their time. */
const recordKey = (userid: number) => `casino:records:${userid}`;

/** The most wins kept for a player (the newest): a fast game played all day stays small. */
const RECORDS_KEPT = 5000;

/** A win kept among the player's (one too small to announce can still be the one to beat). */
const keepWin = async (key: string, payout: number, multiplier: number, now: number, hours: number): Promise<void> => {
  await redis.send("ZADD", [key, String(now), `${payout}:${Math.round(multiplier * 100) / 100}:${now}`]);
  await redis.send("ZREMRANGEBYRANK", [key, "0", String(-RECORDS_KEPT - 1)]);
  await redis.expire(key, hours * 3600 + 60);
};

/**
 * Whether this win beats the player's others of the last `hours` (by multiplier or by Shiny), and it is kept among
 * them. Without Redis: announced (a record can't be told).
 */
const isRecord = async (userid: number, payout: number, multiplier: number, hours: number): Promise<boolean> => {
  const key = recordKey(userid);
  const now = Date.now();
  try {
    await redis.send("ZREMRANGEBYSCORE", [key, "-inf", String(now - hours * 3600_000)]);
    const kept = ((await redis.send("ZRANGE", [key, "0", "-1"])) ?? []) as string[];
    let best = 0;
    let bestX = 0;
    for (const k of kept) {
      const [p, x] = String(k).split(":").map(Number);
      if (p > best) best = p;
      if (x > bestX) bestX = x;
    }
    await keepWin(key, payout, multiplier, now, hours);
    return payout > best || multiplier > bestX;
  } catch (err) {
    logger.warn(`Casino records for #${userid} not read: ${err}`);
    return true;
  }
};

/**
 * A bet was paid. 26 October, the user's: announced in Global chat only when it pays at least `minPayout` Shiny at
 * `minMultiplier` times its stake or more (a jackpot as well), and it is that player's record of the last
 * `recordHours` (among all their wins, announced or not), by multiplier or by Shiny (casinoConfig.announce).
 * Fire and forget: called where the payout is written, it never delays or fails the bet.
 */
export const noteCasinoWin = (win: { userid: number; game: string; stake: number; payout: number; jackpot?: boolean }) => {
  if (!infernoOnlyConfig.enabled) return;
  const rules = casinoConfig.announce;
  if (!rules || !rules.enabled) return;
  const { userid, game, stake, payout } = win;
  if (!(payout > 0) || !(stake > 0)) return;
  const multiplier = payout / stake;
  if (payout < rules.minPayout || multiplier < rules.minMultiplier) {
    // (not announced, but kept: a later win must beat it too)
    const now = Date.now();
    void (async () => {
      await redis.send("ZREMRANGEBYSCORE", [recordKey(userid), "-inf", String(now - rules.recordHours * 3600_000)]);
      await keepWin(recordKey(userid), payout, multiplier, now, rules.recordHours);
    })().catch(() => 0);
    return;
  }
  const tier = multiplier >= rules.epicWin ? "EPIC WIN" : multiplier >= rules.megaWin ? "MEGA WIN" : multiplier >= rules.bigWin ? "BIG WIN" : null;
  void (async () => {
    if (!(await isRecord(userid, payout, multiplier, rules.recordHours))) return;
    const name = await announceableName(userid);
    if (!name) return;
    const gameName = game === "favor" ? "Moloch's Favor" : casinoConfig.lobby.find((g) => g.id === game)?.name ?? game;
    const times = multiplier >= 2 ? ` (x${multiplier >= 100 ? fmt(multiplier) : multiplier.toFixed(multiplier >= 10 ? 0 : 1)})` : "";
    const body = win.jackpot
      ? `${name} hit the JACKPOT on ${gameName}: ${fmt(payout)} Shiny!`
      : tier
        ? `${tier}! ${name} won ${fmt(payout)} Shiny on ${gameName}${times}!`
        : `${name} won ${fmt(payout)} Shiny on ${gameName}${times}!`;
    await broadcastGlobal(ChatBroadcastType.CASINO, body);
    questHeadline(userid);
  })().catch((err) => logger.warn(`Casino announcement failed: ${err}`));
};

/** A server-wide milestone by a player ("#name" in the text is replaced with their name). Fire and forget. */
export const noteMilestone = (userid: number, text: string) => {
  if (!infernoOnlyConfig.enabled) return;
  void (async () => {
    const name = await announceableName(userid);
    if (!name) return;
    await broadcastGlobal(ChatBroadcastType.MILESTONE, text.replace("#name", name));
  })().catch((err) => logger.warn(`Milestone announcement failed: ${err}`));
};

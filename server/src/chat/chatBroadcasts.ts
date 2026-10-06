import { CHANNELS, INFERNO_CHAT_CHANNEL } from "../config/ChatConfig.js";
import { casinoConfig } from "../config/CasinoConfig.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { ChatBroadcastType } from "../enums/Chat.js";
import { postgres } from "../server.js";
import { configuredAdmins } from "../services/admin/admin.js";
import { logger } from "../utils/logger.js";
import { pushMessage } from "./chatHistory.js";
import { ServerMessageType, type HistoryEntry, type ServerMessage } from "./chatProtocol.js";
import { publishToChannel } from "./chatTransport.js";

/**
 * Inferno-only: lines the server writes into Global chat, for everyone (the game draws each kind as its
 * own banner: com/monsters/chat/BYMChat.as):
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
export const broadcastGlobal = async (type: ChatBroadcastType, body: string) => {
  const text = String(body ?? "").trim().slice(0, 300);
  if (!text) return;
  const entry: HistoryEntry = {
    userId: 0,
    displayName: LABELS[type],
    picSquare: null,
    allianceImage: null,
    body: text,
    messageType: type,
    ts: Date.now(),
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

const lastCasino = new Map<number, number>();

/**
 * A bet was paid: a jackpot, a BIG / MEGA / EPIC WIN, or a big enough win (casinoConfig.announce) is
 * announced in Global chat.
 * Fire and forget: called where the payout is written, it never delays or fails the bet.
 */
export const noteCasinoWin = (win: { userid: number; game: string; stake: number; payout: number; jackpot?: boolean }) => {
  if (!infernoOnlyConfig.enabled) return;
  const rules = casinoConfig.announce;
  if (!rules || !rules.enabled) return;
  const { userid, game, stake, payout } = win;
  if (!(payout > 0) || !(stake > 0)) return;
  const multiplier = payout / stake;
  const tier = multiplier >= rules.epicWin ? "EPIC WIN" : multiplier >= rules.megaWin ? "MEGA WIN" : multiplier >= rules.bigWin ? "BIG WIN" : null;
  const big = tier !== null || payout - stake >= rules.minProfit || multiplier >= rules.minMultiplier;
  // (anything but a jackpot only when it pays more than minPayout, 500 Shiny)
  if (!win.jackpot && !(big && payout > rules.minPayout)) return;
  const now = Date.now();
  // (a jackpot, a MEGA or an EPIC WIN always; anything else not straight after this player's last)
  const always = win.jackpot || tier === "EPIC WIN" || tier === "MEGA WIN";
  if (!always && now - (lastCasino.get(userid) ?? 0) < rules.gapSeconds * 1000) return;
  lastCasino.set(userid, now);
  void (async () => {
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

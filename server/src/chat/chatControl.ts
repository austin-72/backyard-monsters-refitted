import { ChatControlType } from "../enums/Chat.js";
import { redis } from "../server.js";
import { logger } from "../utils/logger.js";

export const CHAT_CONTROL_CHANNEL = "chat:control";

export type ChatControlMessage =
  | { type: ChatControlType.AllianceEvict; userId: number }
  | { type: ChatControlType.RefreshUser; userId: number }
  | { type: ChatControlType.Announce; body: string }
  | { type: ChatControlType.Muted; userId: number; minutes: number; reason: string };

/**
 * Forces a player out of their alliance chat channel.
 *
 * Membership is written by the API process while the channel roster lives in the
 * chat process, so a player kicked or removed mid-session would otherwise keep
 * reading their old alliance's messages until they happened to disconnect.
 *
 * @param {number} userId - The player to evict.
 */
export const disconnectAllianceChat = async (userId: number) => {
  const message: ChatControlMessage = { type: ChatControlType.AllianceEvict, userId };

  await redis
    .publish(CHAT_CONTROL_CHANNEL, JSON.stringify(message))
    .catch((err) => logger.error(`Chat control publish failed for user ${userId}: ${err}`));
};

/**
 * Inferno-only: a connected player's chat name and role are worked out again (the admin panel's chat
 * moderator switch), and the game is told its new role.
 *
 * @param {number} userId - The player.
 */
export const refreshChatUser = async (userId: number) => {
  const message: ChatControlMessage = { type: ChatControlType.RefreshUser, userId };
  await redis
    .publish(CHAT_CONTROL_CHANNEL, JSON.stringify(message))
    .catch((err) => logger.error(`Chat control publish failed for user ${userId}: ${err}`));
};

/**
 * Inferno-only (QoL #262): a connected player is told at once that they were muted, for how long and why.
 *
 * @param {number} userId - The player.
 */
export const tellMuted = async (userId: number, minutes: number, reason: string) => {
  const message: ChatControlMessage = { type: ChatControlType.Muted, userId, minutes, reason };
  await redis
    .publish(CHAT_CONTROL_CHANNEL, JSON.stringify(message))
    .catch((err) => logger.error(`Chat control publish failed for user ${userId}: ${err}`));
};

import type { AllianceMessageType } from "../enums/Alliance.js";
import type { ChatBroadcastType } from "../enums/Chat.js";

export enum ClientMessageType {
  Auth = "auth",
  Join = "join",
  Say = "say",
  Leave = "leave",
  /** Inferno-only, admins and chat moderators: a line removed for everyone. */
  Delete = "delete",
  /** Inferno-only, admins and chat moderators: a player muted (minutes 0: unmuted). */
  Mute = "mute",
  GetIgnore = "getignore",
  Ignore = "ignore",
  Unignore = "unignore",
  UpdateName = "updatename",
  Ping = "ping",
}

export enum ServerMessageType {
  AuthOk = "auth_ok",
  AuthFail = "auth_fail",
  Joined = "joined",
  Message = "message",
  UserEnter = "user_enter",
  UserExit = "user_exit",
  IgnoreList = "ignore_list",
  /** Inferno-only: the player is no longer in that alliance channel (left, kicked, or moved to another). */
  AllianceLeft = "alliance_left",
  /** Inferno-only: a line removed by a moderator (`id`). */
  Deleted = "deleted",
  /** Inferno-only: a line for this player only (a moderator's action done). */
  Notice = "notice",
  Error = "error",
}

export enum ErrorCode {
  InvalidJson = "invalid_json",
  AlreadyAuthenticated = "already_authenticated",
  RateLimited = "rate_limited",
  NotAuthenticated = "not_authenticated",
  InvalidChannel = "invalid_channel",
  NotInChannel = "not_in_channel",
  ServerError = "server_error",
  /** Inferno-only, with `minutes`: muted from the admin panel. */
  Muted = "muted",
  /** Inferno-only ignore list answers, with `name`. */
  UserNotFound = "user_not_found",
  CannotIgnoreSelf = "cannot_ignore_self",
  IgnoreListFull = "ignore_list_full",
  NotIgnored = "not_ignored",
  /** Inferno-only: a moderation action by someone who may not, or on someone it can't be done to. */
  NotAllowed = "not_allowed",
}

/** Inferno-only: who a line's speaker is (the game shows a badge). */
export type ChatRole = "admin" | "mod";

export enum AuthFailReason {
  InvalidToken = "invalid_token",
  UserNotFound = "user_not_found",
}

export interface HistoryEntry {
  userId: number;
  displayName: string;
  picSquare: string | null;
  allianceImage: number | null;
  body: string;
  messageType: AllianceMessageType | ChatBroadcastType;
  /** Epoch milliseconds. */
  ts: number;
  /** Inferno-only: the line's id ("g…" in a Global room's history, "a<row id>" in an alliance's feed). */
  id?: string;
  /** Inferno-only: the speaker's staff role, when they have one. */
  role?: ChatRole;
}

export interface IgnoreEntry {
  target: string;
  displayname: string;
}

export type ClientMessage =
  | { type: ClientMessageType.Auth; userId: number; token: string }
  | { type: ClientMessageType.Join; channel: string }
  | { type: ClientMessageType.Say; channel: string; message: string }
  | { type: ClientMessageType.Leave; channel: string }
  | { type: ClientMessageType.Delete; channel: string; id: string }
  | { type: ClientMessageType.Mute; targetId?: string; targetName?: string; minutes: number }
  | { type: ClientMessageType.GetIgnore; action?: string }
  | { type: ClientMessageType.Ignore; targetId?: string; targetName?: string }
  | { type: ClientMessageType.Unignore; targetId?: string; targetName?: string }
  | { type: ClientMessageType.UpdateName }
  | { type: ClientMessageType.Ping };

export type ServerMessage =
  | { type: ServerMessageType.AuthOk; userId: number; displayName: string; role?: ChatRole | null; refresh?: boolean }
  | { type: ServerMessageType.AuthFail; reason: AuthFailReason }
  | { type: ServerMessageType.Joined; channel: string; history: HistoryEntry[] }
  | { type: ServerMessageType.Message; channel: string; messageType: AllianceMessageType | ChatBroadcastType; userId: number; displayName: string; picSquare: string | null; allianceImage: number | null; body: string; ts: number; id?: string; role?: ChatRole }
  | { type: ServerMessageType.Deleted; channel: string; id: string }
  | { type: ServerMessageType.Notice; text: string }
  | { type: ServerMessageType.UserEnter; channel: string; userId: number; displayName: string }
  | { type: ServerMessageType.UserExit; channel: string; userId: number }
  | { type: ServerMessageType.IgnoreList; list: IgnoreEntry[]; action?: "show" | "sync" | "add" | "remove"; target?: string; targetName?: string }
  | { type: ServerMessageType.AllianceLeft; channel: string }
  | { type: ServerMessageType.Error; code: ErrorCode; name?: string; minutes?: number };

interface Sender { send(data: string): void; }

/**
 * Serialises a {@link ServerMessage} to JSON and sends it over the WebSocket.
 * @param {Sender} ws - The WebSocket connection to send the message on.
 * @param {ServerMessage} msg - The typed server message to send.
 */
export const send = (ws: Sender, msg: ServerMessage): void => ws.send(JSON.stringify(msg));

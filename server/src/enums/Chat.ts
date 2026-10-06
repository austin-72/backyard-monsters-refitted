/**
 * What kind of room a channel is, which decides where its messages are stored
 * and which name form they carry.
 *
 * @enum {string}
 */
export enum ChannelType {
  Alliance = "alliance",
  Global = "global",
}

/**
 * A command published on the chat control channel, telling the gateway to act on
 * a connection rather than deliver a message.
 *
 * @enum {string}
 */
export enum ChatControlType {
  /**
   * A player's alliance changed (left, kicked, joined, created): the gateway checks which alliance channel
   * they belong in now and moves them (chatGateway.reconcileAlliance).
   */
  AllianceEvict = "alliance_evict",
  /** Inferno-only: a player's name or staff role changed (the admin panel's chat moderator switch). */
  RefreshUser = "refresh_user",
  /** Inferno-only admin panel: a line shown to everyone connected to chat. */
  Announce = "announce",
}

/**
 * Inferno-only: lines the server writes into every Global room (kept in its history): an admin
 * announcement, a big win or jackpot in the Brimstone Pit, a server-wide milestone, an event starting or ending
 * (chat/chatBroadcasts.ts).
 * They travel as a message's `messageType`, from user 0.
 *
 * @enum {string}
 */
export enum ChatBroadcastType {
  ANNOUNCE = "announce",
  CASINO = "casino",
  MILESTONE = "milestone",
  /** A server event starting or ending (the Wart Bloom). */
  EVENT = "event",
}

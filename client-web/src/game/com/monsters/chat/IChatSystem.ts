import * as as3 from "as3";
import { Vector, int } from "as3";
import { IEventDispatcher } from "flash/events";
import { Channel, IAuthenticationSystem } from "@game";

/**
 * Interface for chat system implementations.
 * Abstracts the underlying chat protocol (SmartFoxServer, WebSocket, etc.)
 */
export interface IChatSystem extends IEventDispatcher {
    // Connection management
    connect(): boolean;
    disconnect(): void;
    readonly isConnected: boolean;

    // Authentication
    login(auth: IAuthenticationSystem): void;
    logout(): void;
    readonly isLoggedIn: boolean;

    // Room/Channel management
    join(channel: Channel, password?: string, createIfMissing?: boolean): void;
    leave(channel: Channel, autocleanup?: boolean): void;
    readonly roomNames: Vector<string>;

    // Messaging
    say(channel: Channel, message: string): void;
    adminMessage(message: string): void;

    // User management
    setDisplayNameUserVar(displayName: string): void;
    updateDisplayName(channel: Channel, userId: string, displayName: string): void;
    updateDisplayNameDirect(channel: Channel, recipientId: string, userId: string, displayName: string): void;
    readonly numUsers: int;

    // Ignore list management
    showIgnore(): void;
    getIgnore(): void;
    ignore(target: string, displayName: string): void;
    unignore(target: string): void;

    // Utility
    list(filter?: string): void;
    members(channel: Channel): void;
    error(code: string, message: string): void;

    /** Inferno-only: a moderation request ("delete": channel, id; "mute": targetId or targetName, minutes). */
    moderate(action: string, params: any): void;
}
export const IChatSystem = as3.iface("com.monsters.chat::IChatSystem", [IEventDispatcher]);

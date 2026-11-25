/**
 * Bun has the "ws" package built in (no install), but not its types: this is the part the Devil's Arcade's
 * socket uses (services/arcade/hub.ts), for `bun run typecheck`.
 */
declare module "ws" {
  import type { IncomingMessage } from "http";
  import type { Duplex } from "stream";

  export class WebSocket {
    send(data: string | ArrayBufferLike | Uint8Array): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
    ping(data?: unknown): void;
    on(event: "message", listener: (data: unknown, isBinary: boolean) => void): this;
    on(event: "close", listener: (code: number, reason: unknown) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "pong", listener: () => void): this;
    readonly readyState: number;
  }

  export class WebSocketServer {
    constructor(options: { noServer?: boolean; maxPayload?: number; port?: number });
    handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, callback: (ws: WebSocket) => void): void;
    close(): void;
  }
}

import type { TCPSocketListenOptions } from "bun";
import { logger } from "../utils/logger.js";
import { initGateway, handleOpen, handleMessage, handleClose } from "./chatGateway.js";
import { type SocketData } from "./chatState.js";

const POLICY_PORTS = process.env.CHAT_POLICY_PORTS ?? process.env.CHAT_WS_PORT;

const POLICY = Buffer.from(
  '<cross-domain-policy>' +
  `<allow-access-from domain="*" to-ports="${POLICY_PORTS}" secure="false"/>` +
  '</cross-domain-policy>\0'
);

const POLICY_REQUEST = "<policy-file-request/>";

const DEFAULT_SOCKET_DATA = { userId: null, displayName: "", lastMsgAt: 0 };

const POLICY_TIMEOUT_MS = 3000;

/**
 * Flash Player requires a socket policy before allowing raw socket connections.
 * It probes port 843 first, sending "<policy-file-request/>" and expecting the
 * policy XML back. Without this, any SWF not in the local-trusted sandbox is blocked.
 */
const startPolicyServer = () => {
  const HOSTNAME = "0.0.0.0";
  const PORT = 843;

  try {
    const options: TCPSocketListenOptions<ReturnType<typeof setTimeout> | null> = {
      hostname: HOSTNAME,
      port: PORT,
      socket: {
        open: (socket) => {
          socket.data = setTimeout(() => socket.end(), POLICY_TIMEOUT_MS);
        },
        data: (socket, data) => {
          if (socket.data) clearTimeout(socket.data);
          if (data.toString().includes(POLICY_REQUEST)) socket.write(POLICY);
          socket.end();
        },
        close: (socket) => {
          if (socket.data) clearTimeout(socket.data);
        },
        error: (_, err) => logger.warn(`Socket policy server error: ${err.message}`),
      },
    };

    Bun.listen(options);
    logger.info(`Flash socket policy server listening on port ${PORT}`);
  } catch (err) {
    logger.warn(`Could not start socket policy server on port ${PORT}: ${err}`);
  }
};

/**
 * Initialises the chat subsystem: Redis pub/sub gateway, Flash socket policy server, 
 * and WebSocket server.
 */
/** (18 October) Uncaught exceptions in a minute after which the server stops. */
const EXCEPTIONS_TO_STOP = 20;

export const startChatServer = () => {
  const PORT = Number(process.env.CHAT_WS_PORT);

  process.on("unhandledRejection", (reason) => {
    logger.error(`Unhandled rejection in chat process: ${reason}`);
  });

  // (18 October, SUSPECTED-BUGS.md: chat runs in the game server's process, so this swallowed every uncaught
  // exception of the whole server and let it carry on in whatever state it was left) logged; and a server throwing
  // them over and over (EXCEPTIONS_TO_STOP in a minute) stops, to be started again clean (Docker restarts it)
  const thrown: number[] = [];
  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught exception in the server: ${err.stack ?? err}`);
    const now = Date.now();
    thrown.push(now);
    while (thrown.length && now - thrown[0] > 60_000) thrown.shift();
    if (thrown.length >= EXCEPTIONS_TO_STOP) {
      logger.error(`${thrown.length} uncaught exceptions in a minute: the server stops, to start again clean`);
      process.exit(1);
    }
  });

  initGateway();
  startPolicyServer();

  const options = {
    port: PORT,
    fetch: (req: Request, server: Bun.Server<SocketData>) => {
      if (server.upgrade(req, { data: DEFAULT_SOCKET_DATA })) return undefined;
      return new Response("WebSocket only", { status: 426 });
    },
    websocket: {
      open: handleOpen,
      message: handleMessage,
      close: handleClose,
      idleTimeout: 120,
    },
  };

  Bun.serve<SocketData>(options);

  logger.info(`Chat WebSocket server listening on port ${PORT}`);
};

import { RedisClient } from "bun";

/**
 * Tells the games a restart is coming (16 October; services/admin/restartNotice.ts): every answer the running server
 * gives says so (X-Io-Restart) for the next <seconds> (default 60), and the games hold their requests until the
 * server answers again. Say it, then restart within a few seconds; the new server forgets it when it starts.
 *
 *   bun run restart:announce [seconds]      (from the server directory; `0` takes it back)
 *
 * PM2 and Docker stopping the server say it by themselves (for the few seconds the server goes on answering): this is
 * for a restart that takes longer to begin, or when the games should hold off from now.
 */
const seconds = Math.max(0, Math.min(600, Number(process.argv[2] ?? 60) || 0));
const redis = new RedisClient(process.env.REDIS_URL);
await redis.connect();
if (seconds > 0) {
  await redis.send("SET", ["io:restart:until", String(Date.now() + seconds * 1000), "EX", String(seconds + 15)]);
  console.log(`The games are told the server restarts within ${seconds} s (they hold their requests until it answers again).`);
} else {
  await redis.send("DEL", ["io:restart:until"]);
  console.log("The restart notice is taken back.");
}
redis.close();

import { logger } from "../../utils/logger.js";

/**
 * Inferno-only (15 October, QoL #268): short alerts to a Discord channel's webhook (ALERT_WEBHOOK_URL in .env; none
 * when it is empty): a new kind of bug, a new cheat report, a bug back after being fixed, planned maintenance going
 * on. At most one alert of a kind every 10 minutes (with how many were held back), so a storm stays one line.
 * Never with a player's private details: names and counts only.
 */
const LAST = new Map<string, { at: number; held: number }>();
const GAP_MS = 10 * 60_000;

export const alertsOn = () => !!process.env.ALERT_WEBHOOK_URL;

export const sendAlert = (kind: string, text: string): void => {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const now = Date.now();
  const last = LAST.get(kind);
  if (last && now - last.at < GAP_MS) {
    last.held++;
    return;
  }
  const held = last?.held ?? 0;
  LAST.set(kind, { at: now, held: 0 });
  const content = `**Inferno Map Room 2** · ${text}${held ? ` (and ${held} more of these in the last 10 minutes)` : ""}`.slice(0, 1900);
  void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) })
    .then((r) => {
      if (!r.ok) logger.warn(`Alert to the webhook refused: HTTP ${r.status}`);
    })
    .catch((err) => logger.warn(`Alert to the webhook not sent: ${err}`));
};

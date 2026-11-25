import mikroOrmConfig from "../mikro-orm.config.js";

import { MikroORM } from "@mikro-orm/core";
import { dispose } from "@logtape/logtape";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Inferno-only (25 November): the players' bug reports and suggestions from the game's right-click menu
 * (bym.player_feedback, services/feedback/playerFeedback.ts), written out to read and review, and a report's status
 * and answer set from the command line. From the server directory (in Docker: `docker compose exec -T web bun run
 * feedback ...`):
 *
 *   bun run feedback [open|new|all|closed|planned|...] [bug|idea]
 *        writes logs/feedback/feedback.md (every report: who, admin or not, what they wrote, what they highlighted,
 *        where they were, their last clicks) and each report's pictures beside it (<id>-shot.jpg: the screenshot with
 *        the highlight drawn on it; <id>-picture.<ext>: one the player added). The folder is emptied first. Default:
 *        open (new, seen and planned). logs/ is the host's server/logs in Docker.
 *   bun run feedback set <id> <new|seen|planned|done|declined> ["the answer the player sees"]
 *        as the panel's Feedback tab does (a new answer, or planned/done/declined, shows as new to the player).
 *   bun run feedback seen <id> [<id> ...]   new ones marked seen (read, no answer yet).
 *
 * Prints a short list too. Never sends anything anywhere.
 */

const OUT = fileURLToPath(new URL("../../logs/feedback", import.meta.url));
const STATUSES = ["new", "seen", "planned", "done", "declined"];

type Conn = { execute: (q: string, p?: unknown[], m?: "all") => Promise<unknown> };
const rows = async <T>(conn: Conn, q: string, p: unknown[] = []) => (await conn.execute(q, p, "all")) as T[];

const typeOf = (b64: string) => (b64.startsWith("/9j/") ? "jpg" : b64.startsWith("iVBOR") ? "png" : "webp");

const write = async (conn: Conn, which: string, kind: string) => {
  const statuses = which === "open" ? ["new", "seen", "planned"] : which === "closed" ? ["done", "declined"] : which === "all" ? STATUSES : [which];
  if (!statuses.every((s) => STATUSES.includes(s))) throw new Error(`Which reports: open, closed, all, or one of ${STATUSES.join(", ")}.`);
  const params: unknown[] = [...statuses];
  let where = `status IN (${statuses.map(() => "?").join(", ")})`;
  if (kind === "bug" || kind === "idea") {
    where += " AND kind = ?";
    params.push(kind);
  }
  const list = await rows<any>(conn, `SELECT * FROM bym.player_feedback WHERE ${where} ORDER BY created_at ASC LIMIT 500`, params);
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) rmSync(path.join(OUT, f), { force: true });
  const md: string[] = [
    `# Player feedback: ${which}${kind ? ` (${kind})` : ""}`,
    "",
    `${list.length} report(s), oldest first, written ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. Pictures beside this file.`,
    "",
  ];
  for (const r of list) {
    const pics: string[] = [];
    if (r.shot) {
      const f = `${r.id}-shot.${typeOf(r.shot)}`;
      writeFileSync(path.join(OUT, f), Buffer.from(r.shot, "base64"));
      pics.push(f);
    }
    if (r.picture) {
      const f = `${r.id}-picture.${typeOf(r.picture)}`;
      writeFileSync(path.join(OUT, f), Buffer.from(r.picture, "base64"));
      pics.push(f);
    }
    const h = r.highlight?.pic ? ` (box in the picture: ${r.highlight.pic.join(", ")})` : "";
    md.push(
      `## #${r.id} · ${r.kind === "bug" ? "Bug" : "Suggestion"} · ${r.status} · ${r.username} (#${r.userid})${r.staff_role ? ` · **ADMIN (${r.staff_role})**` : ""}`,
      "",
      `- Sent: ${new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC, build ${r.build || "?"}${r.how_often ? `, happens: ${r.how_often}` : ""}`,
      `- Highlighted: ${r.subject || "(nothing: the whole screen)"}${h}`,
      ...(r.target ? [`- In the game: \`${r.target}\``] : []),
      `- Where: ${r.place || "?"}`,
      `- Pictures: ${pics.length ? pics.join(", ") : "none"}`,
      ...(r.reply ? [`- Answered${r.handled_by ? ` by ${r.handled_by}` : ""}: ${r.reply}`] : []),
      ...(r.note ? [`- Admin note: ${r.note}`] : []),
      "",
      "> " + String(r.text).replace(/\r?\n/g, "\n> "),
      "",
      "<details><summary>Last clicks, popups, requests and log</summary>",
      "",
      "```",
      String(r.context || "(none)"),
      `client: ${r.client}`,
      "```",
      "</details>",
      ""
    );
    console.log(`#${r.id} ${r.kind} ${r.status} ${r.username}${r.staff_role ? " [admin]" : ""}: ${String(r.text).replace(/\s+/g, " ").slice(0, 90)}`);
  }
  writeFileSync(path.join(OUT, "feedback.md"), md.join("\n"));
  console.log(`\n${list.length} report(s) written to ${path.join(OUT, "feedback.md")}`);
};

const setStatus = async (conn: Conn, id: number, status: string, answer?: string) => {
  if (!Number.isInteger(id) || id <= 0) throw new Error("Which report: its number.");
  if (!STATUSES.includes(status)) throw new Error(`Status: one of ${STATUSES.join(", ")}.`);
  const now = (await rows<any>(conn, `SELECT status, reply FROM bym.player_feedback WHERE id = ?`, [id]))[0];
  if (!now) throw new Error(`No report #${id}.`);
  const sets = ["status = ?", "updated_at = now()", "handled_by = coalesce(handled_by, 'server')"];
  const params: unknown[] = [status];
  let news = status !== now.status && ["planned", "done", "declined"].includes(status);
  if (answer !== undefined && answer.trim() !== now.reply) {
    sets.push("reply = ?", "reply_at = now()");
    params.push(answer.trim().slice(0, 2000));
    if (answer.trim()) news = true;
  }
  if (news) sets.push("reply_seen = false");
  params.push(id);
  await conn.execute(`UPDATE bym.player_feedback SET ${sets.join(", ")} WHERE id = ?`, params);
  console.log(`#${id}: ${now.status} -> ${status}${answer !== undefined ? ", answer set" : ""}`);
};

(async () => {
  const [cmd = "open", ...rest] = process.argv.slice(2);
  try {
    const orm = await MikroORM.init(mikroOrmConfig);
    try {
      const conn = orm.em.fork().getConnection() as unknown as Conn;
      if (cmd === "set") await setStatus(conn, Number(rest[0]), String(rest[1] ?? ""), rest[2]);
      else if (cmd === "seen") {
        for (const id of rest.map(Number)) {
          await conn.execute(`UPDATE bym.player_feedback SET status = 'seen', updated_at = now() WHERE id = ? AND status = 'new'`, [id]);
        }
        console.log(`Marked seen: ${rest.join(", ")}`);
      } else await write(conn, cmd, rest[0] ?? "");
    } finally {
      await orm.close();
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
  await dispose();
  process.exit();
})();

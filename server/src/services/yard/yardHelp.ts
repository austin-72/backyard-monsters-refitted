import type { User } from "../../database/models/user.model.js";
import { BaseType } from "../../enums/Base.js";
import { infernoOnlyConfig } from "../../config/InfernoOnlyConfig.js";
import { postgres } from "../../server.js";
import { isTestMode } from "../admin/testMode.js";

/**
 * Inferno-only (27 November, 72's suggestion): a visitor "helps out" with a building being built, upgraded or calcified
 * in another player's yard (main or outpost): 5% off what is left of it (the overworld's old Help, its 5% and its 5
 * helpers a job: BFOUNDATION.HelpB). Each player once a job, ever: a job is the building, what is done to it and the
 * level it leads to. The help is kept here (bym.io_yard_help); the owner's game takes it off when it has the yard
 * open (on its load, or asking every couple of minutes: IoYardHelp) and says who helped, as only it holds the
 * building's countdowns as they are now.
 */
export const HELP_SHARE = 0.05;
/** Helpers a job at most (as the overworld's Help had it). */
export const HELPERS_MOST = 5;
/** A help the owner's game hasn't taken in this long is dropped (the job is long over). */
const HELP_KEPT_DAYS = 30;

export class YardHelpError extends Error {}

export const yardHelpEnabled = () => infernoOnlyConfig.enabled;

type Em = typeof postgres.em;
const sql = async <T = Record<string, unknown>>(query: string, params: unknown[] = [], em: Em = postgres.em) =>
  (await em.getConnection().execute(query, params, "all")) as T[];

const parse = (raw: unknown): Record<string, any> => {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  return v && typeof v === "object" ? (v as Record<string, any>) : {};
};

/** A building's job in a save's buildingdata: [kind, the level it leads to], or null when it has none. */
export const jobOf = (b: Record<string, any> | null | undefined): [string, number] | null => {
  if (!b) return null;
  const lvl = Math.max(0, Math.floor(Number(b.l) || 0));
  if (Number(b.cB) > 0) return ["build", Math.max(1, lvl)];
  if (Number(b.cU) > 0) return ["upgrade", lvl + 1];
  if (Number(b.cF) > 0) return ["fortify", Math.max(0, Math.floor(Number(b.fort) || 0)) + 1];
  return null;
};

/** A visitor helps with building `bidRaw` of yard `baseidRaw`. Answers the job helped. */
export const helpBuilding = async (user: User, baseidRaw: unknown, bidRaw: unknown): Promise<{ kind: string; lvl: number; helpers: number }> => {
  if (!yardHelpEnabled()) throw new YardHelpError("Helping isn't on here.");
  if (await isTestMode(user)) throw new YardHelpError("Not in admin test mode.");
  const baseid = String(baseidRaw ?? "");
  const bid = Math.floor(Number(bidRaw));
  if (!/^\d{1,20}$/.test(baseid) || baseid === "0" || !Number.isFinite(bid) || bid < 0) throw new YardHelpError("That building could not be found.");
  const rows = await sql<{ userid: number; saveuserid: number; buildingdata: unknown }>(
    `SELECT userid, saveuserid, buildingdata FROM bym.save WHERE baseid = ? AND type IN (?, ?) LIMIT 1`, [baseid, BaseType.MAIN, BaseType.OUTPOST]);
  const save = rows[0];
  if (!save) throw new YardHelpError("That yard could not be found.");
  const owner = Number(save.saveuserid || save.userid) || 0;
  if (owner <= 0) throw new YardHelpError("Only players' yards can be helped.");
  if (owner === user.userid) throw new YardHelpError("That's your own yard.");
  const job = jobOf(parse(save.buildingdata)[String(bid)]);
  if (!job) throw new YardHelpError("That building isn't being built, upgraded or calcified now.");
  const [kind, lvl] = job;
  const done = await sql<{ n: string }>(`SELECT count(*) AS n FROM bym.io_yard_help WHERE baseid = ? AND buildingid = ? AND kind = ? AND lvl = ?`, [baseid, bid, kind, lvl]);
  const helpers = Number(done[0]?.n ?? 0) || 0;
  const mine = await sql(`SELECT 1 FROM bym.io_yard_help WHERE baseid = ? AND buildingid = ? AND kind = ? AND lvl = ? AND helper_userid = ?`, [baseid, bid, kind, lvl, user.userid]);
  if (mine.length) throw new YardHelpError("You've helped with this one already.");
  if (helpers >= HELPERS_MOST) throw new YardHelpError(`${HELPERS_MOST} players have helped with this one already.`);
  const put = await sql(
    `INSERT INTO bym.io_yard_help (baseid, buildingid, kind, lvl, helper_userid, helper_name, owner_userid) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING RETURNING id`, [baseid, bid, kind, lvl, user.userid, String(user.username ?? ""), owner]);
  if (!put.length) throw new YardHelpError("You've helped with this one already.");
  return { kind, lvl, helpers: helpers + 1 };
};

/** The helps the owner's game hasn't taken yet, for one of their yards. */
export const pendingHelp = async (owner: number, baseid: unknown) => {
  const id = String(baseid ?? "");
  if (!yardHelpEnabled() || !owner || !/^\d{1,20}$/.test(id)) return [];
  const rows = await sql<{ id: number; buildingid: number; kind: string; lvl: number; helper_userid: number; helper_name: string }>(
    `SELECT id, buildingid, kind, lvl, helper_userid, helper_name FROM bym.io_yard_help
      WHERE owner_userid = ? AND baseid = ? AND NOT applied AND created_at > now() - make_interval(days => ?) ORDER BY id LIMIT 200`, [owner, id, HELP_KEPT_DAYS]);
  return rows.map((r) => ({ id: Number(r.id), bid: Number(r.buildingid), kind: r.kind, lvl: Number(r.lvl), from: Number(r.helper_userid), name: r.helper_name }));
};

/** Those taken (or found stale: the job over) by the owner's game. */
export const ackHelp = async (owner: number, idsRaw: unknown): Promise<number> => {
  const ids = String(idsRaw ?? "").split(",").map((s) => Math.floor(Number(s))).filter((n) => Number.isFinite(n) && n > 0).slice(0, 200);
  if (!ids.length || !owner) return 0;
  const done = await sql(`UPDATE bym.io_yard_help SET applied = true WHERE owner_userid = ? AND id IN (${ids.map(() => "?").join(",")}) RETURNING id`, [owner, ...ids]);
  return done.length;
};

/** The jobs a visitor has helped with in a yard: "<building>:<kind>:<level>". */
export const helpedBy = async (viewer: number, baseid: unknown): Promise<string[]> => {
  const id = String(baseid ?? "");
  if (!yardHelpEnabled() || !viewer || !/^\d{1,20}$/.test(id)) return [];
  const rows = await sql<{ buildingid: number; kind: string; lvl: number }>(
    `SELECT buildingid, kind, lvl FROM bym.io_yard_help WHERE baseid = ? AND helper_userid = ? AND created_at > now() - make_interval(days => ?)`, [id, viewer, HELP_KEPT_DAYS]);
  return rows.map((r) => `${r.buildingid}:${r.kind}:${r.lvl}`);
};

/** The table, where the migrations are not run at start (production: Docker's db-init runs them; this in case). */
export const ensureYardHelp = async (): Promise<void> => {
  await sql(`CREATE TABLE IF NOT EXISTS bym.io_yard_help (
      id SERIAL PRIMARY KEY, baseid TEXT NOT NULL, buildingid INTEGER NOT NULL, kind TEXT NOT NULL, lvl INTEGER NOT NULL DEFAULT 0,
      helper_userid INTEGER NOT NULL, helper_name TEXT NOT NULL DEFAULT '', owner_userid INTEGER NOT NULL,
      applied BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await sql(`CREATE UNIQUE INDEX IF NOT EXISTS io_yard_help_once ON bym.io_yard_help (baseid, buildingid, kind, lvl, helper_userid)`);
  await sql(`CREATE INDEX IF NOT EXISTS io_yard_help_owner ON bym.io_yard_help (owner_userid, applied)`);
};

import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { isAdmin } from "../../services/admin/admin.js";
import {
  checkDesign,
  closeDesigns,
  copyFrom,
  DesignError,
  designTools,
  exportDesigns,
  importDesigns,
  listDesigns,
  openDesign,
  publishDesign,
  replaceOnMap,
  storedCounts,
  resetDesign,
  setDefenders,
  setKitInfo,
  useVersion,
  type Kind,
} from "../../services/admin/designs.js";

const KINDS = new Set<string>(["kit", "tribe", "moloch"]);

/**
 * POST admin/design (from the game, logged in, admins only): the Designer (services/admin/designs.ts).
 * Body: action = list | open (kind, key) | save (baseid) | reset (kind, key) | replace (kind, key) | close |
 * defenders (baseid, monsters: JSON {id: how many}, levels: JSON {id: level}).
 * 15 October (QoL #412-#420): check (baseid: what Save would change, and whether someone saved meanwhile) |
 * save (baseid, force=1: over a newer save; without it a newer save answers {conflict: 1, by, at}) |
 * tools (baseid: kept versions, layouts to start from, a kit's name and price) | useversion (kind, key, id) |
 * copyfrom (baseid, fromkind, fromkey, what = buildings | monsters) | kitinfo (key, name, price: "auto" or JSON
 * {r1, r2, r3, shiny}) | export | import (file: the designs file's text, apply = 1 to put it in use, else a look).
 * Answers {error: 0, ...} or {error: "message"} (shown in the game).
 */
export const adminDesign: KoaController = async (ctx) => {
  const user: User = ctx.authUser;
  const body = (ctx.request.body ?? {}) as Record<string, unknown>;
  const action = String(body.action ?? "list");

  ctx.status = Status.OK;
  if (!isAdmin(user)) {
    ctx.body = { error: "Admins only." };
    return;
  }

  const kind = String(body.kind ?? "");
  const key = String(body.key ?? "");
  const checkKind = () => {
    if (!KINDS.has(kind)) throw new DesignError(`Unknown kind of layout: ${kind}.`);
    return kind as Kind;
  };

  try {
    switch (action) {
      case "list":
        ctx.body = { error: 0, ...listDesigns() };
        return;
      case "open":
        ctx.body = { error: 0, ...(await openDesign(user, checkKind(), key, String(body.resume ?? ""))) };
        return;
      case "save":
        ctx.body = { error: 0, ...(await publishDesign(user, String(body.baseid ?? ""), String(body.force ?? "") === "1")) };
        return;
      // (15 October, QoL #412-#420)
      case "check":
        ctx.body = { error: 0, ...(await checkDesign(user, String(body.baseid ?? ""))) };
        return;
      case "tools":
        ctx.body = { error: 0, ...(await designTools(user, String(body.baseid ?? ""))) };
        return;
      case "useversion":
        ctx.body = { error: 0, ...(await useVersion(user, checkKind(), key, String(body.id ?? "").slice(0, 20))) };
        return;
      case "copyfrom": {
        const fromKind = String(body.fromkind ?? "");
        if (!KINDS.has(fromKind)) throw new DesignError(`Unknown kind of layout: ${fromKind}.`);
        ctx.body = { error: 0, ...(await copyFrom(user, String(body.baseid ?? ""), fromKind as Kind, String(body.fromkey ?? ""), String(body.what ?? ""))) };
        return;
      }
      case "kitinfo":
        ctx.body = { error: 0, ...(await setKitInfo(user, key, body.name, body.price)) };
        return;
      case "export":
        ctx.body = { error: 0, ...exportDesigns() };
        return;
      case "import":
        ctx.body = { error: 0, ...(await importDesigns(user, body.file, String(body.apply ?? "") === "1")) };
        return;
      case "reset":
        ctx.body = { error: 0, ...(await resetDesign(user, checkKind(), key)) };
        return;
      case "replace":
        ctx.body = { error: 0, ...(await replaceOnMap(user, checkKind(), key, String(body.untouched ?? "") === "1")) };
        return;
      case "storedcount":
        ctx.body = { error: 0, ...(await storedCounts(checkKind(), key)) };
        return;
      case "defenders": {
        const json = (v: unknown) => {
          try {
            return typeof v === "string" ? JSON.parse(v) : v;
          } catch {
            throw new DesignError("Those monsters could not be read.");
          }
        };
        ctx.body = { error: 0, ...(await setDefenders(user, String(body.baseid ?? ""), json(body.monsters), json(body.levels))) };
        return;
      }
      case "close":
        ctx.body = { error: 0, closed: await closeDesigns(user) };
        return;
      default:
        throw new DesignError(`Unknown action ${action}.`);
    }
  } catch (err) {
    ctx.body = { error: err instanceof DesignError ? err.message : `Designer: ${(err as Error).message}` };
  }
};

import type { KoaController } from "../../utils/KoaController.js";
import { User } from "../../database/models/user.model.js";
import { Status } from "../../enums/StatusCodes.js";
import { isAdmin } from "../../services/admin/admin.js";
import {
  closeDesigns,
  DesignError,
  listDesigns,
  openDesign,
  publishDesign,
  replaceOnMap,
  resetDesign,
  setDefenders,
  type Kind,
} from "../../services/admin/designs.js";

const KINDS = new Set<string>(["kit", "tribe", "moloch"]);

/**
 * POST admin/design (from the game, logged in, admins only): the Designer (services/admin/designs.ts).
 * Body: action = list | open (kind, key) | save (baseid) | reset (kind, key) | replace (kind, key) | close |
 * defenders (baseid, monsters: JSON {id: how many}, levels: JSON {id: level}).
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
        ctx.body = { error: 0, ...(await openDesign(user, checkKind(), key)) };
        return;
      case "save":
        ctx.body = { error: 0, ...(await publishDesign(user, String(body.baseid ?? ""))) };
        return;
      case "reset":
        ctx.body = { error: 0, ...(await resetDesign(user, checkKind(), key)) };
        return;
      case "replace":
        ctx.body = { error: 0, ...(await replaceOnMap(user, checkKind(), key)) };
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

import type { Context } from "koa";
import { SaveKeys } from "../../../../enums/SaveKeys.js";
import { Save } from "../../../../database/models/save.model.js";

interface AcademyRequestBody {
  [SaveKeys.ACADEMY]?: string;
}

interface AcademyData {
  [monster: string]: {
    level?: number;
  };
}

export const academyHandler = (ctx: Context, save: Save) => {
  const body = ctx.request.body as AcademyRequestBody;
  const saveData = body[SaveKeys.ACADEMY];

  if (saveData) {
    // (13 October: not JSON, or not an object ("null"): nothing, not a server error)
    let academyData: AcademyData;
    try {
      academyData = JSON.parse(saveData);
    } catch {
      return;
    }
    if (!academyData || typeof academyData !== "object") return;

    for (const [monster, monsterData] of Object.entries(academyData)) {
      if (monsterData && typeof monsterData.level === "number") {
        academyData[monster].level = Math.min(monsterData.level, 6);
      }
    }

    save.academy = academyData;
  }
};

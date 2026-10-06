import { readFileSync } from "fs";
import path from "path";

/** The admin panel page (panel.html next to this file), read once at startup. */
export const ADMIN_PANEL_HTML = readFileSync(path.join(import.meta.dirname, "panel.html"), "utf8");

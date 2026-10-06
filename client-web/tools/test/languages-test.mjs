// The game's texts (server/public/gamestage/assets/*.json; client/scripts/KEYS.as):
//  - every language file is valid JSON and has every key english.json has (the game has no fallback to English:
//    a key missing in French shows French players the key itself)
//  - and keeps the places the game fills in (#v1#, #fname#, ...)
//  - bold and font tags closed in every text
//  - every text the game asks for by a plain key, KEYS.Get("..."), is in english.json or KEYS.IO_FALLBACK
//    (keys built at run time, "newmap_g" + n, are not checked)
//   node tools/test/languages-test.mjs   (no server needed; run from client-web)
// Prints one line per check; every line must end in "ok".
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const root = new URL("../../../", import.meta.url).pathname;
const check = (name, ok, detail = "") => console.log(`${name}: ${ok ? "ok" : "FAILED"} ${detail}`);
const dir = join(root, "server/public/gamestage/assets");
const load = (lang) => JSON.parse(readFileSync(join(dir, `${lang}.json`), "utf8"));
const en = load("english");
for (const lang of ["french", "spanish", "portuguese"]) {
  let data = null, err = "";
  try { data = load(lang); } catch (e) { err = String(e); }
  const missing = data ? Object.keys(en).filter((k) => !(k in data)) : [];
  check(`${lang}: valid, and every key english.json has`, !!data && missing.length === 0, err || `${missing.length} missing ${missing.slice(0, 12).join(", ")}`);
  // the #v1#-style places the game fills in, each kept (a translated or broken one shows as typed, the number
  // missing); three overworld feed posts excepted
  const ph = (t) => new Set(typeof t === "string" ? t.match(/#[a-z0-9_]+#/gi) || [] : []);
  const lost = data ? Object.keys(en).filter((k) => k in data && !["mon_crabatronstreambody", "lab_octostream_unlock"].includes(k) && [...ph(en[k])].some((p) => !ph(data[k]).has(p))) : [];
  check(`${lang}: every text keeps the places the game fills in (#v1# ...)`, lost.length === 0, lost.slice(0, 12).join(", "));
  // (io_plural_suffix: English adds an "s" to a building's name for its plural; the other languages add nothing)
  const empty = data ? Object.keys(en).filter((k) => k !== "io_plural_suffix" && typeof en[k] === "string" && en[k].trim() && typeof data[k] === "string" && !data[k].trim()) : [];
  check(`${lang}: no text left empty`, empty.length === 0, empty.slice(0, 12).join(", "));
}
// bold and font tags closed (an unclosed <b> makes the rest of the window bold); two old overworld texts excepted
for (const lang of ["english", "french", "spanish", "portuguese"]) {
  const data = load(lang), n = (t, re) => (t.match(re) || []).length;
  const bad = Object.keys(data).filter((k) => typeof data[k] === "string" && !["wmi_extension", "dc_cancel_confirmation"].includes(k) && (n(data[k], /<b>/gi) !== n(data[k], /<\/b>/gi) || n(data[k], /<font\b/gi) !== n(data[k], /<\/font>/gi)));
  check(`${lang}: bold and font tags closed`, bad.length === 0, bad.slice(0, 12).join(", "));
}
const keysAs = readFileSync(join(root, "client/scripts/KEYS.as"), "utf8");
const fallback = new Set([...keysAs.slice(keysAs.indexOf("IO_FALLBACK"), keysAs.indexOf("};", keysAs.indexOf("IO_FALLBACK"))).matchAll(/"([^"]+)":/g)].map((m) => m[1]));
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (!/^(_assets|hurlant)$/.test(f)) walk(p); } else if (f.endsWith(".as")) files.push(p); } };
walk(join(root, "client/scripts"));
const asked = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/KEYS\.Get\("([^"]+)"\s*[,)]/g)) if (!asked.has(m[1])) asked.set(m[1], f.slice(root.length));
}
// keys of the stock game the Inferno never reaches (overworld-only features); listed so a new miss stands out
// (the Champion Cage's "not built", Map Room 1's attack confirmation, Map Room 3's upgrade)
const STOCK_UNREACHED = new Set(["cage_notbuilt", "map_msg_atatckconfirm", "nwm_loading", ...(process.env.IGNORE || "").split(",").filter(Boolean)]);
const missing = [...asked].filter(([k]) => !(k in en) && !fallback.has(k) && !STOCK_UNREACHED.has(k));
console.log(`(${asked.size} plain keys asked for in ${files.length} files)`);
check("every plain key the game asks for is in english.json or KEYS.IO_FALLBACK", missing.length === 0, missing.slice(0, 40).map(([k, f]) => `${k} (${f})`).join(", "));

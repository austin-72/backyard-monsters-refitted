// Puts back the account sim.mjs used, from account-backup-<userid>.json (after a run that was stopped).
//   EMAIL=... PGPASSWORD=... node tools/hfo-balance/restore.mjs
import { sql } from "./common.mjs";
import { readFileSync } from "node:fs";
const uid = Number(sql(`SELECT userid FROM bym."user" WHERE email = '${process.env.EMAIL}'`));
const s = JSON.parse(readFileSync(new URL(`./account-backup-${uid}.json`, import.meta.url).pathname, "utf8"));
const q = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
sql(`UPDATE bym.save SET buildingdata = ${q(s.b)}, buildinghealthdata = ${s.h === null ? "NULL" : q(s.h)}, monsters = ${s.m === null ? "NULL" : q(s.m)}, lockerdata = ${q(s.k)}, academy = ${s.a === null ? "NULL" : q(s.a)}, credits = ${Number(s.c)} WHERE userid = ${uid} AND type = 'main' RETURNING userid`);
sql(`UPDATE bym."user" SET hfo = ${s.hfo === null ? "NULL" : q(s.hfo)} WHERE userid = ${uid} RETURNING userid`);
sql(`DELETE FROM bym.hfo_claim WHERE userid = ${uid}`);
console.log("restored", uid);

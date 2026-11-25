import { parseArgs } from "node:util";
import { createPublicKey } from "node:crypto";

import { decodeSaveCode } from "../services/saveTransfer/saveCode.js";
import { computeKeyId } from "../services/saveTransfer/saveSigningKeys.js";
import { extractTownHall } from "../utils/extractTownHall.js";
import type { JsonObject } from "../types/JsonObject.js";

/**
 * Tests save transfer against running servers, without the launcher or the game client.
 *
 *   bun run save:transfer export  --server <url> --email <email> --password <password> [--out <file>]
 *   bun run save:transfer inspect --file <file> (--server <url> | --key <public key>)
 *   bun run save:transfer import  --server <url> --file <file> --username <name> --email <email> --password <password>
 *
 * export   Signs in and saves the account's save code to a file, like the launcher's Export save button.
 * inspect  Verifies a save code against a server's public key and prints what it contains. Changes nothing.
 * import   Registers a new account with the save code, like the game's register screen.
 *
 * --server is a server's base URL, e.g. http://localhost:3001. --api-version defaults to v1, which
 * works while version management is off; otherwise pass the game version the server expects.
 */

const USAGE = `Usage:
  bun run save:transfer export  --server <url> --email <email> --password <password> [--out <file>]
  bun run save:transfer inspect --file <file> (--server <url> | --key <public key>)
  bun run save:transfer import  --server <url> --file <file> --username <name> --email <email> --password <password>`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    server: { type: "string" },
    "api-version": { type: "string", default: "v1" },
    email: { type: "string" },
    password: { type: "string" },
    username: { type: "string" },
    file: { type: "string" },
    out: { type: "string" },
    key: { type: "string" },
  },
});

/**
 * Stops with a message.
 *
 * @param {string} message - What went wrong.
 * @returns {never}
 */
const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

/**
 * Reads a required option.
 *
 * @param {keyof typeof values} name - The option name.
 * @returns {string} Its value.
 */
const required = (name: keyof typeof values): string => (values[name] as string | undefined) ?? fail(`Missing --${name}\n\n${USAGE}`);

const server = () => required("server").replace(/\/+$/, "");

const apiVersion = values["api-version"]!;

/**
 * Calls a versioned API route.
 *
 * @param {string} method - The HTTP method.
 * @param {string} path - The route after /api/<version>, e.g. "/player/register".
 * @param {object} [options] - A JSON body and a bearer token.
 * @returns {Promise<{ status: number; data: any }>} The status and parsed JSON body.
 */
const api = async (method: string, path: string, { body, token }: { body?: object; token?: string } = {}) => {
  const response = await fetch(`${server()}/api/${apiVersion}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ error: `HTTP ${response.status}, not JSON` }));

  if (data?.code === "GAME_OUTDATED") {
    fail(`${server()} does not accept API version "${apiVersion}". Pass the game version it expects, e.g. --api-version v1.9.4-beta`);
  }

  return { status: response.status, data };
};

/**
 * Prints the useful parts of a verified save code.
 *
 * @param {ReturnType<typeof decodeSaveCode>} payload - The verified payload.
 * @param {number} length - The code's length in characters.
 */
const describe = (payload: ReturnType<typeof decodeSaveCode>, length: number) => {
  const { main, inferno } = payload.saves;

  console.log(`  From:        ${payload.issuer.name} (key ${payload.issuer.keyId})`);
  console.log(`  Account:     ${payload.account.username} (user id ${payload.account.userid})`);
  console.log(`  Exported:    ${payload.exportedAt} (export ${payload.exportId})`);
  console.log(`  Town Hall:   ${extractTownHall((main.buildingdata ?? {}) as JsonObject)?.l ?? "none"}`);
  console.log(`  Level:       ${main.level ?? "?"}, Shiny ${main.credits ?? "?"}, map room ${main.mapversion ?? "?"}`);
  console.log(`  Inferno:     ${inferno ? "included" : "none"}`);
  console.log(`  Code length: ${length.toLocaleString()} characters`);
};

const commands: Record<string, () => Promise<void>> = {
  async export() {
    const login = await api("POST", "/player/getinfo", {
      body: { email: required("email"), password: required("password"), sessionType: "website" },
    });

    if (!login.data.token) fail(`Sign-in failed: ${login.data.error ?? login.status}`);

    const exported = await api("GET", "/player/save/export", { token: login.data.token });

    if (!exported.data.code) fail(`Export failed: ${exported.data.error ?? exported.status}`);

    // The name comes from the server's response, so keep it to characters that can't leave this folder
    const safe = (text: unknown) => String(text).replace(/[^a-zA-Z0-9_-]/g, "_");
    const out = values.out ?? `bym-save-${safe(login.data.username)}-${safe(String(exported.data.exportedAt).slice(0, 10))}.bymsave`;

    await Bun.write(out, exported.data.code);
    console.log(`Saved ${login.data.username}'s save code to ${out} (${exported.data.code.length.toLocaleString()} characters)`);
  },

  async inspect() {
    const code = await Bun.file(required("file")).text();

    let key = values.key;

    if (!key) {
      const { data } = await api("GET", "/saveexport/key");

      if (!data.publicKey) fail(`${server()} has no save export key set up.`);

      key = data.publicKey as string;
    }

    process.env.SAVE_IMPORT_SOURCE_KEYS = key;

    const keyId = computeKeyId(createPublicKey({ key: Buffer.from(key, "base64"), format: "der", type: "spki" }));

    try {
      const payload = decodeSaveCode(code);

      console.log(`Valid save code, signed by key ${keyId}:`);
      describe(payload, code.trim().length);
    } catch (err) {
      fail(`Not valid for key ${keyId}: ${(err as Error).message}`);
    }
  },

  async import() {
    const saveCode = await Bun.file(required("file")).text();

    const { status, data } = await api("POST", "/player/register", {
      body: { username: required("username"), email: required("email"), password: required("password"), saveCode },
    });

    if (!data.user) fail(`Import refused: ${data.error ?? `HTTP ${status} ${JSON.stringify(data)}`}`);

    const imported = data.importedSave;

    console.log(`Registered ${data.user.username} (user id ${data.user.userid}) on ${server()}`);
    console.log(imported ? `Imported ${imported.username}'s yard from ${imported.from} (Town Hall ${imported.townHallLevel ?? "none"})` : "No save was imported.");
  },
};

const command = commands[positionals[0] ?? ""] ?? fail(USAGE);

await command();

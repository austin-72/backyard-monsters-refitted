# Save transfer

Players can carry their progress from the main server to a custom server:

1. On the main server, the player clicks **Export save** on the launcher's Account page. They get a save code: one line of text, signed by the main server, saved to their Downloads folder and ready to copy.
2. On the custom server, they paste the code into the **Save code** field on the game's register screen. The new account starts with their yard.

Each main-server account can be imported **once** per custom server, ever. The custom server records the account's user id from the code and refuses any later code for the same user id. A fresh export doesn't help, because it carries the same user id.

## What is transferred

| Carried over | Left behind |
| --- | --- |
| Buildings, research, academy, monsters, champions | Map room world, position, outposts, captured MR3 resources |
| Resources, inventory, store items, Shiny | Alliance, mail, gifts, friends |
| Quests, achievements, stats, tutorial progress | In-flight attacks and reports |
| Inferno yard, MR2 unlock, building timers | Wild monster tribe status (regenerates) |
| Krallen tier and win streak | |

The imported yard starts on Map Room 1; the player joins Map Room 2 or 3 in game. Resources above the normal cap (possible on Map Room 3) are brought down to it, as when leaving Map Room 3. The full list of fields is `PortableSaveSchema` in `src/schemas/SaveTransferSchemas.ts`.

Codes never contain an email address, password hash or Discord details. They contain the player's user id and username on the main server.

## Setting up the main server (exporting)

```sh
bun run keys:save-export
```

Put the printed `SAVE_EXPORT_PRIVATE_KEY` in `.env` and keep it secret: anyone holding it can forge codes from your server. New installs get one automatically from `bun run build`. Optionally set `SAVE_EXPORT_ISSUER` to the name shown when a code is imported (defaults to `SERVER_URL`).

The public key is served at `GET /api/v1/saveexport/key` (the version in the path is not checked):

```json
{ "error": 0, "format": "bymr-save", "version": 1, "enabled": true,
  "issuer": "https://api.bymrefitted.com", "algorithm": "Ed25519",
  "keyId": "c7c1abfccdf3f7be", "publicKey": "MCowBQYDK2VwAyEA..." }
```

## Setting up a custom server (importing)

Imports are **off by default**. To turn them on:

```env
SAVE_IMPORT='enabled'
SAVE_IMPORT_SOURCE_KEYS=MCowBQYDK2VwAyEA...
```

`SAVE_IMPORT_SOURCE_KEYS` is the main server's `publicKey` from the route above. If the main server ever rotates its key, list the old and new keys separated by commas. Only list keys belonging to that one server: imports are counted by user id alone, and user ids are only unique within one server.

With imports on, the game's register screen shows an optional **Save code** field (the server reports `saveImport: true` from `/init`). With them off, the field is hidden and the server refuses any code it is sent.

Each import is recorded in `bym.save_import`, keyed by the main-server user id. Rows are never removed, including when the account created by the import is deleted. To let someone import again, delete their row by hand.

## Testing without the launcher or the game

`bun run save:transfer` does each step against running servers:

```sh
# Export a player's save code from the main server (what the launcher's button does)
bun run save:transfer export --server http://localhost:3001 --email a@example.com --password 'pass!word1' --out a.bymsave

# Check a code against a server's key and print what's in it. Changes nothing.
bun run save:transfer inspect --file a.bymsave --server http://localhost:3001

# Register on a custom server with the code (what the register screen does)
bun run save:transfer import --server http://localhost:3002 --file a.bymsave --username newname --email b@example.com --password 'pass!word1'
```

Running the same `import` again, with another export of the same account, or as a different new account, is refused. That's the main thing to confirm.

To test both sides on one machine, run two servers with different `PORT`, `DB_NAME` and `REDIS_URL`. Give the second one `SAVE_IMPORT='enabled'` and the first one's public key.

Registration is limited to 3 per minute per IP outside production, so leave a minute between a few test imports.

If the server has version management on, add `--api-version` with the game version it expects (for example `--api-version v1.9.4-beta`).

## Security notes

- **A save code works like a password for that yard.** Whoever holds it can import it. If someone else imports a player's code on a custom server first, that player's one import there is used up. Players should only paste a code into a server they mean to join, and not post it publicly. Custom servers see every code pasted into them, so a dishonest one could reuse a code on another custom server.
- **Codes don't expire.** A player can export today and import months later. The cost is that an old, leaked code stays usable until its account has been imported on a given server.
- **The signature proves where a yard came from, not that it was earned fairly.** A yard that was cheated on the main server exports like any other. Banned players can't export.
- **The private key is the whole trust model.** If `SAVE_EXPORT_PRIVATE_KEY` leaks, anyone can forge codes. Generate a new key, and have importing servers replace the old public key.
- **Importing servers should fetch the public key over HTTPS**, or get it from the main server's operator directly.

## Routes

| Route | Description |
| --- | --- |
| `GET /api/:apiVersion/saveexport/key` | Public. The signing key. |
| `GET /api/:apiVersion/player/save/export` | Needs a `Bearer` token. Returns `{ code, exportedAt }`. 10 per hour per player. |
| `POST /api/:apiVersion/player/register` | Accepts an optional `saveCode` field. On success with a code, the response includes `importedSave: { from, username, townHallLevel }`. |
| `POST /init` | Includes `saveImport: true/false`. |

Save code errors from the register route are sent with HTTP 200 and an `error` message, like other errors meant for the game client, so every Flash runtime can show them.

## The save code (version 1)

```
bymr-save.1.<keyId>.<payload>.<signature>
```

- `keyId`: the first 16 hex characters of the SHA-256 of the signing key's SPKI DER encoding.
- `payload`: base64url of the gzipped JSON payload.
- `signature`: base64url Ed25519 signature of everything before the last `.`.

Every character is a letter, digit, `-`, `_` or `.`, so the code survives copying, pasting and form posts. Whitespace is ignored on import, so a code a text editor has wrapped onto several lines still works.

The decompressed payload holds `format`, `version`, `exportId` (unique per export), `exportedAt`, `issuer { name, keyId }`, `account { userid, username, timeplayed, stats }` and `saves { main, inferno }` (`inferno` is `null` if the player never descended).

The importing server checks, in order:

1. The code's shape and version.
2. That `keyId` is one of `SAVE_IMPORT_SOURCE_KEYS`.
3. The signature.

Only then does it decompress and validate the payload, check `save_import` for the user id, and create the account and yard in one transaction. See `decodeSaveCode` in `src/services/saveTransfer/saveCode.ts`.

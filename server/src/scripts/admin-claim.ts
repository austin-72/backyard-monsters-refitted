import mikroOrmConfig from "../mikro-orm.config.js";

import { MikroORM } from "@mikro-orm/core";
import { dispose } from "@logtape/logtape";
import { User } from "../database/models/user.model.js";
import { Save } from "../database/models/save.model.js";
import { Alliance } from "../database/models/alliance.model.js";
import { infernoOnlyConfig } from "../config/InfernoOnlyConfig.js";
import { logger } from "../utils/logger.js";

/**
 * Gives a reserved admin name (infernoOnlyConfig.admins) to an account, which makes it an admin.
 *
 * The admin names are reserved: nobody can register one or rename to one from the game (in any
 * capitals), so a stranger can't claim an admin name before you do. To make your account an admin,
 * register it as usual under any name, then, from the server directory:
 *
 *   bun run admin:claim <account> <admin name>
 *
 * <account> is the account's current username (exact) or its user id; <admin name> must be written
 * exactly as it is in the config. The account is renamed (its yards and an alliance it leads too); a
 * running server sees the new name on the account's next request, no restart needed.
 */

const claimLogger = logger.getChild("admin-claim");

const claim = async (orm: MikroORM, account: string | undefined, name: string | undefined) => {
  if (!account || !name) throw new Error("Usage: bun run admin:claim <account> <admin name>");
  if (!infernoOnlyConfig.admins.map((n) => n.trim()).includes(name)) {
    throw new Error(`"${name}" is not in the config's admins (${infernoOnlyConfig.admins.join(", ") || "none"}). Write it exactly.`);
  }

  const em = orm.em.fork();
  const user = /^\d+$/.test(account)
    ? await em.findOne(User, { userid: Number(account) })
    : await em.findOne(User, { username: account });
  if (!user) throw new Error(`No account "${account}".`);
  if (user.username === name) {
    claimLogger.info("Account #{id} is already {name}: nothing to do.", { id: user.userid, name });
    return;
  }

  const clash = await em
    .getConnection()
    .execute<{ userid: number; username: string }[]>(
      `SELECT userid, username FROM bym."user" WHERE lower(username) = lower(?) AND userid <> ? LIMIT 1`,
      [name, user.userid]
    );
  if (clash.length) {
    throw new Error(`Account #${clash[0].userid} is already called "${clash[0].username}". Rename or remove it first.`);
  }

  const previous = user.username;
  await em.transactional(async (tx) => {
    await tx.nativeUpdate(User, { userid: user.userid }, { username: name });
    await tx.nativeUpdate(Save, { saveuserid: user.userid }, { name });
    await tx.nativeUpdate(Alliance, { leader_userid: user.userid }, { leader_name: name });
  });

  claimLogger.info("Account #{id} renamed {previous} -> {name}: it is an admin now.", { id: user.userid, previous, name });
};

(async () => {
  const [account, name] = process.argv.slice(2);

  try {
    const orm = await MikroORM.init(mikroOrmConfig);
    try {
      await claim(orm, account, name);
    } finally {
      await orm.close();
    }
  } catch (error) {
    claimLogger.error("{message}", { message: (error as Error).message });
    process.exitCode = 1;
  }

  await dispose();
  process.exit();
})();

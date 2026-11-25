import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { alertsOn, sendAlert } from "./alerts.js";

/**
 * Inferno-only (QoL #270): the backups as the panel shows them: the newest backup's name, time and size, how many
 * are kept, and the failure note the backup service leaves (LAST-BACKUP-FAILED.txt). The folder is BACKUP_STATUS_DIR,
 * or `backups` beside the server (Docker binds the host's backup folder there, read only).
 */
export const backupStatus = () => {
  const dir = process.env.BACKUP_STATUS_DIR || path.join(process.cwd(), "backups");
  try {
    const files = readdirSync(dir).filter((f) => /\.dump$/.test(f));
    const dumps = files
      .map((f) => {
        const st = statSync(path.join(dir, f));
        return { name: f, at: st.mtimeMs, size: st.size };
      })
      .sort((a, b) => b.at - a.at);
    let failed: string | null = null;
    try {
      failed = readFileSync(path.join(dir, "LAST-BACKUP-FAILED.txt"), "utf8").slice(0, 500);
    } catch {
      failed = null;
    }
    return { found: true, count: dumps.length, newest: dumps[0] ?? null, failed };
  } catch {
    return { found: false, count: 0, newest: null, failed: null };
  }
};

/**
 * Inferno-only (QoL #250): every backup in the folder, newest first (name, time, size), for the player card's list of
 * copies. Each is a dump of the whole database; nothing is read from inside them.
 */
export const listBackups = () => {
  const dir = process.env.BACKUP_STATUS_DIR || path.join(process.cwd(), "backups");
  try {
    return {
      found: true,
      files: readdirSync(dir)
        .filter((f) => /\.dump$/.test(f))
        .map((f) => {
          const st = statSync(path.join(dir, f));
          return { name: f, at: st.mtimeMs, size: st.size };
        })
        .sort((a, b) => b.at - a.at),
    };
  } catch {
    return { found: false, files: [] as { name: string; at: number; size: number }[] };
  }
};

/** Over this old, the newest backup is late (the backup service runs daily). */
export const BACKUP_LATE_MS = 26 * 3_600_000;

/**
 * QoL #268: once an hour, an alert when the last backup failed or the newest is over a day old (only with the
 * webhook set and the folder there: a server without backups set up says nothing).
 */
export const startBackupWatch = (): void => {
  if (!alertsOn()) return;
  const look = () => {
    const b = backupStatus();
    if (!b.found) return;
    if (b.failed) sendAlert("backup", `The last backup failed: ${b.failed.split("\n")[0].slice(0, 200)}`);
    else if (!b.newest) sendAlert("backup", "There are no backups in the backup folder.");
    else if (Date.now() - b.newest.at > BACKUP_LATE_MS) sendAlert("backup", `The newest backup is ${Math.round((Date.now() - b.newest.at) / 3_600_000)} hours old.`);
  };
  setTimeout(look, 60_000).unref();
  setInterval(look, 3_600_000).unref();
};

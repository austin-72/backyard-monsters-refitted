import { ASObject, int } from "as3";
import { GLOBAL, IoFormat, KEYS } from "@game";

export class TimeUtils extends ASObject {
    public $ctor(): void {
        super.$ctor();
    }

    /**
     * Renders how long ago a timestamp was, as "19 hours ago", using the same
     * localised units the mailbox uses. Extracted from InboxMessage so the
     * alliance shout rows can share it - the original rendered both through
     * one relative-time helper.
     *
     * @param timestamp Seconds since epoch, as GLOBAL.Timestamp() returns.
     * @return The localised distance string.
     */
    public static TimeDistance(timestamp: number): string {
        let unitKey: string = null;
        // (Inferno-only, QoL #572: the game's one "time ago" (IoFormat.ago): months and years where it said "26
        // weeks ago", in the player's language)
        if (GLOBAL.INFERNO_ONLY) {
            return timestamp > 0 ? IoFormat.ago(timestamp) : "";
        }
        let elapsed: int = (GLOBAL.Timestamp() - timestamp) | 0;
        let amount: int = 0;

        // GLOBAL.Timestamp() is the last base-processing time rather than a live
        // clock, so anything stamped server-side just now can read as the future.
        if (elapsed < 0) {
            elapsed = 0;
        }

        if (elapsed < 60) {
            unitKey = (amount = elapsed) == 1 ? "mail_time_second" : "mail_time_seconds";
        } else if (elapsed < 60 * 60) {
            unitKey = (amount = (elapsed / 60) | 0) == 1 ? "mail_time_minute" : "mail_time_minutes";
        } else if (elapsed < 60 * 60 * 24) {
            unitKey = (amount = (elapsed / 60 / 60) | 0) == 1 ? "mail_time_hour" : "mail_time_hours";
        } else if (elapsed < 60 * 60 * 24 * 7) {
            unitKey = (amount = (elapsed / 60 / 60 / 24) | 0) == 1 ? "mail_time_day" : "mail_time_days";
        } else if (elapsed < 60 * 60 * 24 * 7 * 31) {
            unitKey = (amount = (elapsed / 60 / 60 / 24 / 7) | 0) == 1 ? "mail_time_week" : "mail_time_weeks";
        } else {
            unitKey = (amount = (elapsed / 60 / 60 / 24 / 7 / 31) | 0) == 1 ? "mail_time_month" : "mail_time_months";
        }

        return KEYS.Get("mail_time_ago", { "v1": amount, "v2": KEYS.Get(unitKey) });
    }
}

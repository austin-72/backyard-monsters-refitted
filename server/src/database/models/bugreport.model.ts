import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/es";
import { type Opt } from "@mikro-orm/core";

/**
 * Inferno-only automatic bug reports from the game client (services/admin/bugReports.ts). One row per
 * distinct problem: identical errors are grouped by `fingerprint` and counted.
 */
@Entity({ tableName: "bug_report" })
export class BugReport {
  @PrimaryKey({ type: "number", autoincrement: true })
  id!: number;

  @Property({ type: "string", length: 40, unique: true })
  fingerprint!: string;

  /** The error, first line: what the admin panel lists. */
  @Property({ type: "string", length: 500 })
  title!: string;

  /** The full error as last reported (message, stack, context). */
  @Property({ type: "text" })
  details!: string;

  /** Game state and recent log lines from the last report. */
  @Property({ type: "text", default: "" })
  context: Opt<string> = "";

  @Property({ type: "number", default: 1 })
  count: Opt<number> = 1;

  @Property({ type: "json", nullable: true })
  users?: number[] | null;

  @Property({ type: "number", default: 0 })
  user_count: Opt<number> = 0;

  @Property({ type: "string", length: 32, default: "" })
  last_build: Opt<string> = "";

  @Property({ type: Date })
  first_seen: Opt<Date> = new Date();

  @Property({ type: Date })
  last_seen: Opt<Date> = new Date();

  /** "open" or "fixed". A fixed problem that is reported again goes back to "open". */
  @Property({ type: "string", length: 8, default: "open" })
  status: Opt<string> = "open";

  @Property({ type: Date, nullable: true })
  fixed_at?: Date | null;
}

import { Migration } from "@mikro-orm/migrations";

/**
 * Inferno-only (16 October, QoL #261): an admin role kept on the account (services/admin/admin.ts, adminRole): "owner",
 * "admin" or "support" (the panel read only), or none. The names in InfernoOnlyConfig.admins stay owners whatever
 * this says. services/user/sessionStore.ts (ensureSessionTable) adds the column at start too, for a server whose
 * migrations are run by hand: the User entity reads it.
 */
export class AdminRoles extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE bym."user" ADD COLUMN IF NOT EXISTS admin_role varchar(16) NULL;`);
    this.addSql(`ALTER TABLE bym."user" DROP CONSTRAINT IF EXISTS user_admin_role_check;`);
    this.addSql(`ALTER TABLE bym."user" ADD CONSTRAINT user_admin_role_check CHECK (admin_role IS NULL OR admin_role IN ('owner', 'admin', 'support'));`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE bym."user" DROP CONSTRAINT IF EXISTS user_admin_role_check;`);
    this.addSql(`ALTER TABLE bym."user" DROP COLUMN IF EXISTS admin_role;`);
  }
}

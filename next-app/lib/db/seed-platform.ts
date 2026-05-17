/**
 * Seed idempotente de la organización plataforma.
 *
 * Garantiza:
 * 1. Existe la org plataforma (slug = "docentix").
 * 2. Todo usuario con `user.role = "super_admin"` es `owner` activo de la org.
 * 3. `user.lastActiveOrganizationId` apunta a la org plataforma para esos supers.
 *
 * Uso: `pnpm db:seed-platform` (requiere `DATABASE_URL` cargada — usa dotenv-flow
 * o equivalente en tu entorno; el cliente db.ts lee `process.env.DATABASE_URL`).
 */

import { sql } from "drizzle-orm";

import { db } from "./client";
import { user } from "./schema";
import {
  PLATFORM_ORG_NAME,
  PLATFORM_ORG_SLUG,
  ensurePlatformMembershipAndSetLastActive,
  getOrCreatePlatformOrg,
} from "../auth/platform-org";

async function main() {
  console.log("[seed-platform] iniciando...");

  const org = await getOrCreatePlatformOrg();
  console.log(
    `[seed-platform] org=${org.id} slug=${PLATFORM_ORG_SLUG} name="${PLATFORM_ORG_NAME}"`,
  );

  const supers = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(sql`${user.role} = 'super_admin'`);

  let enrolled = 0;
  for (const s of supers) {
    await ensurePlatformMembershipAndSetLastActive(s.id);
    enrolled += 1;
    console.log(`[seed-platform]   enrolado super=${s.email}`);
  }

  // Cualquier super con lastActiveOrganizationId nulo o desfasado queda
  // alineado por ensurePlatformMembershipAndSetLastActive. Esta línea cubre el
  // caso defensivo (debería ser no-op tras el loop).
  await db
    .update(user)
    .set({ lastActiveOrganizationId: org.id })
    .where(
      sql`${user.role} = 'super_admin' AND ${user.lastActiveOrganizationId} IS NULL`,
    );

  console.log(
    `[seed-platform] listo. org=${org.id} supers procesados=${enrolled}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-platform] error:", err);
    process.exit(1);
  });

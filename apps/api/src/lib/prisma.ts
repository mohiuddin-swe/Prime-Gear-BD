import { createPrismaClient } from "@primegear/db";

let client: ReturnType<typeof createPrismaClient> | undefined;

/** Lazy so importing the app never opens a DB connection (health check, tests). */
export function getPrisma() {
  return (client ??= createPrismaClient());
}

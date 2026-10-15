import { logger } from "../lib/logger";
import { getPrisma } from "../lib/prisma";
import { reindexAll } from "../services/search.service";

try {
  const count = await reindexAll();
  logger.info({ count }, "search reindex complete");
} catch (err) {
  logger.error({ err }, "search reindex failed");
  process.exitCode = 1;
} finally {
  await getPrisma().$disconnect();
}

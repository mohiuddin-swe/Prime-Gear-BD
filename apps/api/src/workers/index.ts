import { logger } from "../lib/logger";
import { createExampleWorker } from "./example.worker";
import { createSearchSyncWorker } from "./search-sync.worker";

const workers = [createExampleWorker(), createSearchSyncWorker()];

for (const w of workers) {
  w.on("failed", (job, err) => logger.error({ queue: w.name, jobId: job?.id, err }, "job failed"));
}
logger.info(`Workers started: ${workers.map((w) => w.name).join(", ")}`);

async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

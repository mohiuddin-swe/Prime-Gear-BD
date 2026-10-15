import { Worker } from "bullmq";
import { logger } from "../lib/logger";
import { QUEUE_NAMES, type SearchSyncJob } from "../queues";
import { createQueueConnection } from "../queues/connection";
import { syncProduct } from "../services/search.service";

export function createSearchSyncWorker() {
  return new Worker<SearchSyncJob>(
    QUEUE_NAMES.searchSync,
    async (job) => {
      const result = await syncProduct(job.data.productId);
      logger.info({ jobId: job.id, productId: job.data.productId, result }, "search sync");
      return result;
    },
    { connection: createQueueConnection(), concurrency: 5 },
  );
}
